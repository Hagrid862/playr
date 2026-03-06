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

interface CreateAlbumModalsProps {
  isFormatModalOpen: boolean;
  setIsFormatModalOpen: (open: boolean) => void;
  isMultipleFilesModalOpen: boolean;
  setIsMultipleFilesModalOpen: (open: boolean) => void;
}

export function CreateAlbumModals({
  isFormatModalOpen,
  setIsFormatModalOpen,
  isMultipleFilesModalOpen,
  setIsMultipleFilesModalOpen,
}: CreateAlbumModalsProps) {
  return (
    <>
      <Dialog open={isMultipleFilesModalOpen} onOpenChange={setIsMultipleFilesModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Too Many Files</DialogTitle>
            <DialogDescription>
              You can only upload one cover image at a time. Please drop exactly one image file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={() => setIsMultipleFilesModalOpen(false)}>OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormatModalOpen} onOpenChange={setIsFormatModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Invalid File Format</DialogTitle>
            <DialogDescription>
              The file you dropped is not a supported image format. Please upload an image file.
              Supported formats typically include JPG, PNG, WEBP, etc.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={() => setIsFormatModalOpen(false)}>OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
