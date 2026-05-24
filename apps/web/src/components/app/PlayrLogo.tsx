import { cn } from '@/lib/utils';

export function PlayrLogo({ className }: { className?: string }) {
  return (
    <div className={cn('font-bold text-4xl tracking-tighter flex items-center gap-1.5', className)}>
      <span className="text-primary">Playr</span>
    </div>
  );
}
