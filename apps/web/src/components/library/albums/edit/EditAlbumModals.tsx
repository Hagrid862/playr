import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface EditAlbumModalsProps {
  isFormatModalOpen: boolean;
  setIsFormatModalOpen: (open: boolean) => void;
  isMultipleFilesModalOpen: boolean;
  setIsMultipleFilesModalOpen: (open: boolean) => void;
}

export function EditAlbumModals({
  isFormatModalOpen,
  setIsFormatModalOpen,
  isMultipleFilesModalOpen,
  setIsMultipleFilesModalOpen,
}: EditAlbumModalsProps) {
  return (
    <>
      <Dialog open={isFormatModalOpen} onOpenChange={setIsFormatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalid File Format</DialogTitle>
            <DialogDescription>
              Please upload an image file (e.g. JPG, PNG, WEBP) for the album cover.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMultipleFilesModalOpen} onOpenChange={setIsMultipleFilesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Too Many Files</DialogTitle>
            <DialogDescription>
              Please upload only one image file at a time for the album cover.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
