import { toast } from 'sonner';

/**
 * Shares via Web Share API when available; otherwise copies `url` to the clipboard.
 */
export async function shareOrCopyAppLink(options: {
  title: string;
  url: string;
  copiedToast?: string;
}): Promise<void> {
  const { title, url, copiedToast = 'Link copied to clipboard' } = options;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (navigator.share) {
      await navigator.share({ title, text: title, url });
      return;
    }
  } catch {
    // User cancelled share sheet, or share failed — try clipboard.
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success(copiedToast);
  } catch (e) {
    console.error(e);
    toast.error('Could not copy link');
  }
}

export function albumPublicUrl(albumId: string): string {
  if (typeof window === 'undefined') {
    return `/app/library/albums/${albumId}`;
  }
  const origin = window.location.origin.replace(/\/$/, '');
  return `${origin}/app/library/albums/${albumId}`;
}
