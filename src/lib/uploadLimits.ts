// Single source of truth for upload limits.
// These MUST stay in sync with the storage bucket configuration
// (file_size_limit / allowed_mime_types) enforced server-side.

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ATTACHMENT_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  'application/pdf',
] as const;

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
] as const;

/** artist-media audio samples: 20 MB */
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;

/** artist-media & venue-media: images only, 5 MB */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
/** message-attachments: images + PDF, 10 MB */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';
export const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf';

const IMAGE_TYPE_MESSAGE = 'Only JPG, PNG, WebP, and GIF images are supported.';
const ATTACHMENT_TYPE_MESSAGE = 'Only JPG, PNG, WebP, GIF, and PDF files are supported.';
const AUDIO_TYPE_MESSAGE = 'Only MP3, WAV, M4A, AAC, OGG, and FLAC audio files are supported.';

function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLimit(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Validates a file against the given limits.
 * Returns a human-readable error message, or null when the file is acceptable.
 */
export function validateUpload(
  file: File,
  opts: { maxBytes: number; allowedTypes: readonly string[]; kind: 'image' | 'attachment' | 'audio' }
): string | null {
  const type = (file.type || '').toLowerCase();
  const isAllowed = opts.allowedTypes.includes(type);

  if (!isAllowed) {
    if (opts.kind === 'image') return IMAGE_TYPE_MESSAGE;
    if (opts.kind === 'audio') return AUDIO_TYPE_MESSAGE;
    return ATTACHMENT_TYPE_MESSAGE;
  }

  if (file.size > opts.maxBytes) {
    return `That file is ${formatMB(file.size)} — the maximum is ${formatLimit(opts.maxBytes)}. Please choose a smaller file.`;
  }

  return null;
}

/** Validate an image destined for artist-media / venue-media. */
export function validateImageUpload(file: File): string | null {
  return validateUpload(file, {
    maxBytes: MEDIA_MAX_BYTES,
    allowedTypes: IMAGE_MIME_TYPES,
    kind: 'image',
  });
}

/** Validate a message attachment. */
export function validateAttachmentUpload(file: File): string | null {
  return validateUpload(file, {
    maxBytes: ATTACHMENT_MAX_BYTES,
    allowedTypes: ATTACHMENT_MIME_TYPES,
    kind: 'attachment',
  });
}

/** Validate an audio sample destined for artist-media. */
export function validateAudioUpload(file: File): string | null {
  return validateUpload(file, {
    maxBytes: AUDIO_MAX_BYTES,
    allowedTypes: AUDIO_MIME_TYPES,
    kind: 'audio',
  });
}

/** Friendly message for the DB-enforced message rate limit. */
export const RATE_LIMIT_MESSAGE =
  "You've hit the limit of 100 messages per hour. Please try again later.";

export function isRateLimitError(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message ?? '';
  return msg.toLowerCase().includes('rate limit');
}
