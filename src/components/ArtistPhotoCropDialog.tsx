import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Crop, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface ArtistPhotoCropDialogProps {
  file: File | null;
  imageUrl: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}

const MAX_OUTPUT_WIDTH = 1600;
const OUTPUT_ASPECT = 4 / 3;

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

async function createCroppedFile(file: File, imageUrl: string, crop: Area) {
  const image = await loadImage(imageUrl);
  const scale = Math.min(1, MAX_OUTPUT_WIDTH / crop.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare image crop');

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      result => result ? resolve(result) : reject(new Error('Unable to create cropped image')),
      'image/jpeg',
      0.9,
    );
  });
  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'artist-photo';
  return new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
}

export function ArtistPhotoCropDialog({
  file,
  imageUrl,
  open,
  onCancel,
  onConfirm,
}: ArtistPhotoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const isAnimatedGif = file?.type === 'image/gif';

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!file) return;
    if (isAnimatedGif) {
      setProcessing(true);
      try {
        await onConfirm(file);
      } finally {
        setProcessing(false);
      }
      return;
    }
    if (!croppedArea) return;

    setProcessing(true);
    try {
      const croppedFile = await createCroppedFile(file, imageUrl, croppedArea);
      await onConfirm(croppedFile);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onCancel()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl gap-5 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">CROP PHOTO</DialogTitle>
          <DialogDescription>
            {isAnimatedGif
              ? 'Animated GIFs keep their animation and use centered 4:3 framing.'
              : 'Move and zoom the photo inside the frame.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={OUTPUT_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              showGrid={!isAnimatedGif}
              restrictPosition
              zoomWithScroll={!isAnimatedGif}
            />
          )}
          {isAnimatedGif && <div className="absolute inset-0 z-10" aria-hidden="true" />}
        </div>

        {!isAnimatedGif && (
          <div className="flex items-center gap-3">
            <ZoomIn className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Label htmlFor="artist-photo-zoom" className="sr-only">Zoom</Label>
            <Slider
              id="artist-photo-zoom"
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={value => setZoom(value[0] ?? 1)}
              aria-label="Photo zoom"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!file || processing}>
            <Crop className="h-4 w-4" />
            {processing ? 'Cropping...' : isAnimatedGif ? 'Use GIF' : 'Crop & Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}