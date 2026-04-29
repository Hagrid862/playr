import { TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TrashIcon } from '@phosphor-icons/react';
import type { BulkTrackCardProps } from './BulkTrackUploadForm.types';

export function BulkTrackCard({ track, onUpdate, onRemove }: BulkTrackCardProps) {
  return (
    <Card className="m-px">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b pb-3">
        <CardTitle className="text-sm font-medium truncate" title={track.file.name}>
          {track.file.name}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove track"
        >
          <TrashIcon size={16} />
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <TextField
          label="Track Title"
          placeholder="e.g. Smells Like Teen Spirit"
          value={track.title}
          onChange={(value) => onUpdate({ title: value })}
          onBlur={() => {}}
        />
        <div className="flex gap-4">
          <div className="w-24">
            <TextField
              label="Disk No."
              placeholder="1"
              type="number"
              value={String(track.diskNumber)}
              onChange={(value) => onUpdate({ diskNumber: Number(value) || 1 })}
              onBlur={() => {}}
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Track No."
              placeholder="1"
              type="number"
              value={String(track.trackNumber)}
              onChange={(value) => onUpdate({ trackNumber: Number(value) || 1 })}
              onBlur={() => {}}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`explicit-${track.id}`}
            checked={track.explicit}
            onCheckedChange={(checked) => onUpdate({ explicit: !!checked })}
          />
          <Label htmlFor={`explicit-${track.id}`}>Explicit Content</Label>
        </div>
      </CardContent>
    </Card>
  );
}
