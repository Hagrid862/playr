import { HandWavingIcon, MusicNotesIcon, UsersThreeIcon, HeartIcon } from '@phosphor-icons/react';

const features = [
  {
    icon: MusicNotesIcon,
    text: 'Stream millions of songs in high quality',
  },
  {
    icon: UsersThreeIcon,
    text: 'Join a community of music lovers',
  },
  {
    icon: HeartIcon,
    text: 'Create and share your perfect playlists',
  },
];

export function RegisterWelcomePanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-primary/20 via-primary/10 to-background p-8 flex-col justify-center items-center text-center">
      <HandWavingIcon className="size-16 text-primary mb-6" weight="duotone" />
      <h2 className="text-3xl font-bold mb-4">Welcome to Playr!</h2>
      <p className="text-muted-foreground text-lg mb-8">
        The best place to share, discover, and connect through music.
      </p>
      <div className="space-y-4 text-left w-full max-w-xs">
        {features.map((feature) => (
          <div key={feature.text} className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <feature.icon className="size-5 text-primary" weight="duotone" />
            </div>
            <p className="text-sm text-muted-foreground">{feature.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
