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
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
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
      <div className="flex items-center justify-between mr-2">
        <div className="flex gap-2 items-center">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeftIcon />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-semibold">{title}</h1>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <Separator />
    </div>
  );
}
