import { SongCard } from '@/components/library/SongCard';
import { usePlaylistEditDraft } from '@/components/playlists/playlist-edit-draft.context';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVerticalIcon } from '@phosphor-icons/react';
import type { LibraryPlaylistTrackRow } from './playlist-edit-draft.context';

function SortablePlaylistTrackRow({ row, index }: { row: LibraryPlaylistTrackRow; index: number }) {
  const track = row.track;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const isProcessing =
    track.audioFiles?.some((f) => f.status === 'pending' || f.status === 'processing') ?? false;
  const isFailed =
    (track.audioFiles?.length ?? 0) > 0 &&
    track.audioFiles?.every((f) => f.status === 'failed') === true;
  const trackArtworkUrl =
    track.album?.cover?.url != null && track.album.cover.url !== ''
      ? track.album.cover.url
      : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex items-stretch gap-1 rounded-xl', isDragging && 'z-10')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-stone-500 hover:text-stone-300 active:cursor-grabbing"
        aria-label="Reorder track"
      >
        <DotsSixVerticalIcon size={22} weight="bold" />
      </button>
      <div className="min-w-0 flex-1">
        <SongCard
          id={track.id}
          trackNumber={index + 1}
          title={track.title}
          artists={track.artists}
          duration={track.duration}
          explicit={track.explicit}
          isProcessing={isProcessing}
          isFailed={isFailed}
          artworkUrl={trackArtworkUrl}
        />
      </div>
    </div>
  );
}

export function PlaylistEditTrackList() {
  const { orderedTrackRows, draftTrackIds, reorderTracksFromDragEnd } = usePlaylistEditDraft();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    reorderTracksFromDragEnd(event);
  };

  if (orderedTrackRows.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-2xl bg-stone-900/10 mx-6">
        <p className="text-muted-foreground text-sm font-medium">No tracks in this playlist yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-0 md:px-2">
      <div className="flex items-center justify-between px-6 md:px-8">
        <h3 className="text-xl font-bold text-white/90">Tracks</h3>
      </div>
      <div className="px-6 md:px-8">
        <div className="grid grid-cols-[2.5rem_3rem_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5 mb-2">
          <div />
          <div className="text-center">#</div>
          <div>Title</div>
          <div className="pr-2">Time</div>
        </div>
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <SortableContext items={draftTrackIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {orderedTrackRows.map((row, i) => (
                <SortablePlaylistTrackRow key={row.track.id} row={row} index={i} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
