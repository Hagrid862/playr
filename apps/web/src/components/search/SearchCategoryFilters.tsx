import { Button } from '@/components/ui/button';
import { type SearchCategory } from '@repo/contracts';

interface SearchCategoryFiltersProps {
  selectedCategories: SearchCategory[];
  onToggle: (category: SearchCategory) => void;
  lockedCategory?: SearchCategory;
  className?: string;
}

const CATEGORIES: SearchCategory[] = ['artist', 'album', 'track', 'playlist', 'genre'];

export function SearchCategoryFilters({
  selectedCategories,
  onToggle,
  lockedCategory,
  className,
}: SearchCategoryFiltersProps) {
  const categoriesToShow = lockedCategory ? [lockedCategory] : CATEGORIES;

  return (
    <div className={className}>
      {categoriesToShow.map((cat) => (
        <Button
          key={cat}
          variant={selectedCategories.includes(cat) ? 'secondary' : 'outline'}
          onClick={() => !lockedCategory && onToggle(cat)}
          className="capitalize"
          disabled={!!lockedCategory}
        >
          {cat}s
        </Button>
      ))}
    </div>
  );
}
