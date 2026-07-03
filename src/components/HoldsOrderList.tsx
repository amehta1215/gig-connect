import { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface HoldItem {
  id: string;
  artist_name: string;
  hold_priority: number;
}

interface HoldsOrderListProps {
  holds: HoldItem[];
  newArtistName: string;
  onOrderChange: (newPriority: number, orderedExistingIds: string[]) => void;
}

export default function HoldsOrderList({ holds, newArtistName, onOrderChange }: HoldsOrderListProps) {
  // Combine existing holds with the new artist
  const [items, setItems] = useState<{ id: string; name: string; isNew: boolean }[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const sortedHolds = [...holds].sort((a, b) => a.hold_priority - b.hold_priority);
    const existingItems = sortedHolds.map(h => ({
      id: h.id,
      name: h.artist_name,
      isNew: false,
    }));
    // Add new artist at the end by default
    setItems([...existingItems, { id: 'new', name: newArtistName, isNew: true }]);
  }, [holds, newArtistName]);

  useEffect(() => {
    // Find the new artist's position and report it
    const newIndex = items.findIndex(item => item.isNew);
    if (newIndex !== -1) {
      const orderedExistingIds = items.filter(i => !i.isNew).map(i => i.id);
      onOrderChange(newIndex + 1, orderedExistingIds); // 1-based priority
    }
  }, [items, onOrderChange]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Drag to reorder hold priority:
      </p>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-2 border border-border cursor-grab active:cursor-grabbing transition-colors ${
              item.isNew ? 'bg-primary/10 border-primary' : 'bg-secondary'
            } ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-display text-muted-foreground w-6">
              #{index + 1}
            </span>
            <span className={`text-sm ${item.isNew ? 'text-primary font-medium' : 'text-foreground'}`}>
              {item.name}
              {item.isNew && <span className="ml-2 text-xs text-primary">(New)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
