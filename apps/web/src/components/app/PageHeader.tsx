import { Separator } from '@/components/ui/separator';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useRouter } from '@tanstack/react-router';
import { ReactNode } from 'react';
import { Button } from '../ui/button';

export function PageHeader({
  title,
  description,
  actions,
  showBackButton = false,
  onBackClick,
  centerActions = false,
  children,
}: {
  title: string | ReactNode;
  description?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
  centerActions?: boolean;
  children?: ReactNode;
  /** When set, invoked instead of default `router.history.back()` */
  onBackClick?: () => void;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
      return;
    }
    router.history.back();
  };

  return (
    <div className="flex flex-col gap-2">
      {centerActions ? (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          {/* Left: title + optional back button */}
          <div className="flex gap-2 items-center flex-shrink-0">
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeftIcon />
              </Button>
            )}
            <div className="flex gap-4 items-center">
              {typeof title === 'string' ? (
                <h1 className="text-3xl font-semibold">{title}</h1>
              ) : (
                title
              )}
              {description && (
                <div className="h-6 w-px bg-white/10" />
              )}
              {description && <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{description}</p>}
            </div>
          </div>
          {/* Center: children */}
          <div className="flex items-center justify-center w-full">{children}</div>
          {/* Right: actions */}
          <div className="flex-shrink-0 w-[180px] flex justify-end">{actions}</div>
        </div>
      ) : (
        <div className="flex items-center justify-between mr-2">
          <div className="flex gap-2 items-center">
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeftIcon />
              </Button>
            )}
            <div className="flex gap-4 items-center">
              {typeof title === 'string' ? (
                <h1 className="text-3xl font-semibold">{title}</h1>
              ) : (
                title
              )}
              {description && (
                <div className="h-6 w-px bg-white/10" />
              )}
              {description && <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <Separator />
    </div>
  );
}
