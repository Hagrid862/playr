import { ReactNode } from 'react';
import { Button } from '../ui/button';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useRouter } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';

interface SubHeaderProps {
  title: string | ReactNode;
  actions?: ReactNode;
  search?: ReactNode;
  children?: ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  actionsAlignment?: 'left' | 'space-between';
}

export function SubHeader({
  title,
  actions,
  search,
  children,
  showBackButton = false,
  onBackClick,
  actionsAlignment = 'left',
}: SubHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
      return;
    }
    router.history.back();
  };

  return (
    <div data-testid="sub-header" className="flex items-center justify-between px-4 h-min mb-4">
      <div className="flex items-center gap-4 min-w-0">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 h-7 w-7"
            data-testid="sub-header-back"
            aria-label="Go back"
          >
            <ArrowLeftIcon size={16} />
          </Button>
        )}
        <div className="flex items-center gap-3 min-w-0">
          {typeof title === 'string' ? (
            <h2
              className="text-lg font-semibold text-stone-200 truncate"
              data-testid="sub-header-title"
            >
              {title}
            </h2>
          ) : (
            <div data-testid="sub-header-title-custom">{title}</div>
          )}
          {search && <div data-testid="sub-header-search">{search}</div>}
        </div>
      </div>

      <div
        className={cn('flex items-center gap-2', {
          'justify-content': actionsAlignment === 'space-between',
        })}
        data-testid="sub-header-actions"
      >
        {actions}
        {children}
      </div>
    </div>
  );
}
