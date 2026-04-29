import { TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCallback, useEffect, useState } from 'react';

type CreateLibraryArtistNameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with trimmed name when user confirms. */
  onConfirm: (name: string) => void;
};

export function CreateLibraryArtistNameModal({
  open,
  onOpenChange,
  onConfirm,
}: CreateLibraryArtistNameModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
    }
  }, [open]);

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  }, [name, onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New artist</DialogTitle>
          <DialogDescription>
            This artist will be saved when you create the album. You can add more details later from
            the library.
          </DialogDescription>
        </DialogHeader>
        <TextField
          label="Artist name"
          placeholder="e.g. The Band"
          value={name}
          onChange={setName}
          onBlur={() => {}}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!name.trim()}>
            Add artist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
