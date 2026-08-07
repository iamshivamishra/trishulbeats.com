"use client";

import { useCallback, useMemo, useState } from "react";
import { Music, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAudioActions } from "@/components/AudioPlayerContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  type BeatSlot,
  type UploadedAsset,
  createEmptySlot,
  createExistingSlot,
  uploadPendingBeats,
} from "./pack-beat-uploader-types";
import { PackTrackCard } from "./PackTrackCard";
import { PackEditBeatDialog } from "./PackEditBeatDialog";

export type { BeatSlot, UploadedAsset };
export { createEmptySlot, createExistingSlot, uploadPendingBeats };

interface Props {
  slots: BeatSlot[];
  onChange: (slots: BeatSlot[]) => void;
  disabled?: boolean;
  producerId: string;
}

export default function PackBeatUploader({ slots, onChange, disabled, producerId }: Props) {
  const { currentBeat, isPlaying, playBeat } = useAudioActions();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    slots.length > 0 && slots[slots.length - 1].status === "pending" ? slots.length - 1 : null
  );
  const [editDialogIndex, setEditDialogIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortableIds = useMemo(() => slots.map((s) => s.clientId), [slots]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = slots.findIndex((s) => s.clientId === active.id);
      const newIndex = slots.findIndex((s) => s.clientId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onChange(arrayMove(slots, oldIndex, newIndex));

      if (expandedIndex !== null) {
        if (expandedIndex === oldIndex) setExpandedIndex(newIndex);
        else if (oldIndex < expandedIndex && newIndex >= expandedIndex) setExpandedIndex(expandedIndex - 1);
        else if (oldIndex > expandedIndex && newIndex <= expandedIndex) setExpandedIndex(expandedIndex + 1);
      }
    },
    [slots, onChange, expandedIndex]
  );

  const updateSlot = useCallback(
    (index: number, patch: Partial<BeatSlot>) => {
      onChange(slots.map((s, i) => {
        if (i !== index) return s;
        const updated = { ...s, ...patch };
        if (s.existing && s.status === "uploaded" && !("dirty" in patch) && !("saving" in patch)) {
          updated.dirty = true;
        }
        return updated;
      }));
    },
    [slots, onChange]
  );

  const removeSlot = useCallback(
    (index: number) => {
      onChange(slots.filter((_, i) => i !== index));
      if (expandedIndex === index) setExpandedIndex(null);
      else if (expandedIndex !== null && expandedIndex > index) setExpandedIndex(expandedIndex - 1);
    },
    [slots, onChange, expandedIndex]
  );

  const addSlot = () => {
    const newSlots = [...slots, createEmptySlot()];
    onChange(newSlots);
    setExpandedIndex(newSlots.length - 1);
    setEditDialogIndex(newSlots.length - 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Beats in This Pack
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">
            ({slots.length} {slots.length === 1 ? "beat" : "beats"} · drag to reorder)
          </span>
        </Label>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={addSlot} disabled={disabled}>
          <Plus className="h-3 w-3" /> Add Beat
        </Button>
      </div>

      {slots.length === 0 && (
        <button
          type="button"
          onClick={addSlot}
          disabled={disabled}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/10 py-12 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
            <Music className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No beats added yet</p>
            <p className="mt-0.5 text-xs">Click to add your first beat to this pack</p>
          </div>
        </button>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {slots.map((slot, index) => (
              <PackTrackCard
                key={slot.clientId}
                slot={slot}
                index={index}
                isExpanded={expandedIndex === index}
                isCurrentlyPlaying={currentBeat?.id === slot.beatId && isPlaying}
                onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                onEdit={() => setEditDialogIndex(index)}
                onRemove={() => removeSlot(index)}
                onPlay={() => playBeat({ id: slot.beatId!, title: slot.title, producerName: "You", previewUrl: slot.previewUrl })}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editDialogIndex !== null && slots[editDialogIndex] && (
        <PackEditBeatDialog
          slot={slots[editDialogIndex]}
          open
          producerId={producerId}
          onOpenChange={(o) => { if (!o) setEditDialogIndex(null); }}
          onComplete={(patch) => {
            updateSlot(editDialogIndex, patch);
            setEditDialogIndex(null);
          }}
        />
      )}
    </div>
  );
}
