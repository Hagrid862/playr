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

interface CreateTrackFormModalsProps {
  isFormatModalOpen: boolean;
  setIsFormatModalOpen: (open: boolean) => void;
  isMultipleFilesModalOpen: boolean;
  setIsMultipleFilesModalOpen: (open: boolean) => void;
}

export function CreateTrackFormModals({
  isFormatModalOpen,
  setIsFormatModalOpen,
  isMultipleFilesModalOpen,
  setIsMultipleFilesModalOpen,
}: CreateTrackFormModalsProps) {
  return (
    <>
      <Dialog open={isMultipleFilesModalOpen} onOpenChange={setIsMultipleFilesModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Too Many Files</DialogTitle>
            <DialogDescription>
              You can only upload one audio track at a time. Please drop exactly one audio file.
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
              The file you dropped is not a supported audio format. Please upload an audio file.
              Supported formats typically include MP3, WAV, FLAC, AAC, etc.
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
