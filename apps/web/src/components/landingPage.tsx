import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
  PlaylistIcon,
  CompassIcon,
  UsersThreeIcon,
  ChatCircleIcon,
  MicrophoneStageIcon,
  HeadphonesIcon,
  PlayCircleIcon,
} from '@phosphor-icons/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4 mx-auto">
          {/* Logo */}
          <div className="mr-6 flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">Playr</span>
          </div>

          {/* Navigation */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-125 gap-1 p-2 md:grid-cols-2 lg:w-160 lg:grid-cols-3">
                    <li>
                      <NavigationMenuLink href="/features/streaming" className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <HeadphonesIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Streaming</span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Lossless audio quality
                          </p>
                        </div>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink href="/features/playlists" className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <PlaylistIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Playlists</span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Create &amp; share playlists
                          </p>
                        </div>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink href="/features/discover" className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <CompassIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Discover</span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Find music you&apos;ll love
                          </p>
                        </div>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink href="/features/artists" className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <MicrophoneStageIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Artists</span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Connect with artists
                          </p>
                        </div>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink href="/features/community" className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <UsersThreeIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Community</span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Community library
                          </p>
                        </div>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink href="/features/social" className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <ChatCircleIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Social</span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Share with friends
                          </p>
                        </div>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink href="/about" className={navigationMenuTriggerStyle()}>
                  About
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right side - Auth buttons */}
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/auth/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign in
            </a>
            <a
              href="/auth/register"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero section placeholder */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="flex flex-row gap-4 items-center justify-center text-7xl font-bold mb-8">
            <PlayCircleIcon className="fill-primary" weight="fill" />
            <span className="text-primary">Playr</span>
          </h1>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Your music, your way
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Stream your favorite songs, create playlists, and discover new music.
          </p>
        </div>
      </main>
    </div>
  );
}
