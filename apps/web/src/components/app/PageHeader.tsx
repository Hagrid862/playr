import { Separator } from '@/components/ui/separator';
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
}: {
  actions?: ReactNode;
  hideSearch?: boolean;
  title?: string;
  description?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.history.back();
    }
  };

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 px-4">
        {/* Left: Logo/Back Button */}
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
              <ArrowLeftIcon />
            </Button>
          )}
          <PlayrLogo className="text-emerald-500" />
        </div>

        {/* Center: Search / Title */}
        <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto gap-1">
          {title ? (
            <div className="text-center">
              <h1 className="text-lg font-bold">{title}</h1>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          ) : (
            !hideSearch && <SearchInput />
          )}
        </div>

        {/* Right: global actions */}
        <div className="flex justify-end items-center gap-2">{actions}</div>
      </div>
      <Separator />
    </div>
  );
}
