import { PlayCircleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function GuestOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-[12px] animate-in fade-in duration-500">
      <div className="max-w-4xl w-full bg-stone-900/95 border border-white/10 rounded-lg p-8 md:p-20 shadow-[0_0_100px_rgba(0,0,0,0.5)] text-center flex flex-col items-center gap-10 md:gap-16 ring-1 ring-white/5">
        <div className="flex flex-col items-center gap-6 md:gap-10">
          <div className="flex items-center gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
            <PlayCircleIcon
              className="fill-primary size-16 md:size-24 drop-shadow-[0_0_20px_theme(colors.primary/40%)]"
              weight="fill"
            />
            <h1 className="text-5xl md:text-8xl font-bold text-primary tracking-tighter">Playr</h1>
          </div>

          <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            <h2 className="text-3xl md:text-5xl font-bold text-stone-100 tracking-tight leading-tight">
              Your music, your way
            </h2>
            <p className="text-stone-400 text-lg md:text-2xl max-w-xl mx-auto leading-relaxed">
              Stream your favorite songs, create playlists, and discover new music in your personal
              lossless library.
            </p>
            <p className="text-stone-400 text-lg md:text-2xl max-w-xl mx-auto leading-relaxed">
              Join now!
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
          <Button
            asChild
            size="lg"
            className="flex-1 text-xl h-16 md:h-20 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-1"
          >
            <Link to="/auth/register">Get Started</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="flex-1 text-xl h-16 md:h-20 rounded-lg bg-stone-800/30 border-white/10 hover:bg-stone-800/60 transition-all hover:-translate-y-1"
          >
            <Link to="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
