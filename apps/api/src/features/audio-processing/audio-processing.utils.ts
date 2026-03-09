/**
 * Check if the user can update the track's duration (owner or editor).
 */
export function canUserUpdateTrackDuration(
  track: { access?: { userId: string; role: string }[] },
  userId: string,
): boolean {
  return (
    track.access?.some((a) => a.userId === userId && (a.role === 'owner' || a.role === 'editor')) ??
    false
  );
}
