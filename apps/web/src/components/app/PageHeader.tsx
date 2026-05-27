import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { SearchInput } from '../search/SearchInput';
import { PlayrLogo } from './PlayrLogo';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useRouter } from '@tanstack/react-router';

export function PageHeader({
  actions,
  hideSearch = false,
  title,
  description,
  showBackButton,
  onBackClick,
  mobileSearchExpanded = false,
  onMobileSearchToggle,
}: {
  actions?: ReactNode;
  hideSearch?: boolean;
  title?: string;
  description?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  mobileSearchExpanded?: boolean;
  onMobileSearchToggle?: () => void;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.history.back();
    }
  };

  const showSearch = !hideSearch && !title;

  return (
    <div className={cn('flex flex-col py-2 relative z-10 bg-stone-950', mobileSearchExpanded && 'max-md:hidden')}>
      {/* ── Desktop layout ── */}
      <div className="hidden md:grid grid-cols-[1fr_2fr_1fr] items-center gap-4 px-4">
        {/* Left: Logo/Back Button */}
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
              <ArrowLeftIcon />
            </Button>
          )}
          <PlayrLogo className="text-emerald-500 shrink-0" />
        </div>

        {/* Center: Search / Title */}
        <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto gap-1">
          {title ? (
            <div className="text-center">
              <h1 className="text-lg font-bold">{title}</h1>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          ) : (
            showSearch && <SearchInput />
          )}
        </div>

        {/* Right: global actions */}
        <div className="flex justify-end items-center gap-2">{actions}</div>
      </div>

      {/* ── Mobile layout: hidden when search overlay is open ── */}
      {!mobileSearchExpanded && (
        <div className="md:hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 min-h-10">
            {/* Left side */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="shrink-0"
                >
                  <ArrowLeftIcon />
                </Button>
              )}
              <PlayrLogo className="text-emerald-500 shrink-0" />
              {title && (
                <div className="truncate min-w-0">
                  <h1 className="text-lg font-bold truncate">{title}</h1>
                  {description && (
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 shrink-0">
              {showSearch && (
                <SearchInput
                  mobile
                  mobileExpanded={false}
                  onMobileToggle={onMobileSearchToggle}
                />
              )}
              {actions}
            </div>
          </div>
        </div>
      )}

      <Separator className="mt-2 mb-2" />
    </div>
  );
}
