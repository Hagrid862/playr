import { Separator } from '@/components/ui/separator';
import { ReactNode } from 'react';
import { SearchInput } from '../search/SearchInput';
import { PlayrLogo } from './PlayrLogo';

export function PageHeader({
  actions,
  hideSearch = false,
}: {
  actions?: ReactNode;
  hideSearch?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 px-4">
        {/* Left: Logo */}
        <div className="flex items-center">
          <PlayrLogo className="text-emerald-500" />
        </div>

        {/* Center: Search */}
        <div className="flex items-center justify-center w-full max-w-xl mx-auto gap-2">
          {!hideSearch && <SearchInput />}
        </div>

        {/* Right: global actions */}
        <div className="flex justify-end items-center gap-2">{actions}</div>
      </div>
      <Separator />
    </div>
  );
}
