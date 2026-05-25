import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export type FilterSection = 'general' | 'artist' | 'album' | 'track' | 'playlist';

interface SearchFiltersProps {
  search: any;
  navigate: any;
  visibleSections?: FilterSection[];
}

export function SearchFilters({
  search,
  navigate,
  visibleSections = ['general', 'artist', 'album', 'track', 'playlist'],
}: SearchFiltersProps) {
  const isSectionVisible = (section: FilterSection) => visibleSections.includes(section);

  return (
    <div className="p-6 bg-stone-900/50 border border-white/10 rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-2 duration-200 w-min-xl">
      {/* General Filter */}
      {isSectionVisible('general') && (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase text-muted-foreground">General</span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="verified-only"
                checked={
                  !!(
                    search.filters?.artist?.verified ||
                    search.filters?.track?.verified ||
                    search.filters?.album?.verified
                  )
                }
                onCheckedChange={(checked) =>
                  navigate({
                    search: (prev: any) => ({
                      ...prev,
                      page: 1,
                      filters: {
                        ...prev.filters,
                        artist: {
                          ...prev.filters?.artist,
                          verified: checked === true ? true : undefined,
                        },
                        track: {
                          ...prev.filters?.track,
                          verified: checked === true ? true : undefined,
                        },
                        album: {
                          ...prev.filters?.album,
                          verified: checked === true ? true : undefined,
                        },
                      },
                    }),
                  })
                }
              />
              <Label htmlFor="verified-only" className="cursor-pointer hover:text-white text-sm">
                Verified Only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="no-explicit"
                checked={search.filters?.track?.explicit === false}
                onCheckedChange={(checked) =>
                  navigate({
                    search: (prev: any) => ({
                      ...prev,
                      page: 1,
                      filters: {
                        ...prev.filters,
                        track: {
                          ...prev.filters?.track,
                          explicit: checked === true ? false : undefined,
                        },
                      },
                    }),
                  })
                }
              />
              <Label htmlFor="no-explicit" className="cursor-pointer hover:text-white text-sm">
                No Explicit Content
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Track Filters */}
      {isSectionVisible('track') &&
        (!search.filters?.categories || search.filters.categories.includes('track')) && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Track Filters
            </span>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Duration (s)</span>
                <span>{search.filters?.track?.durationTo || 1200}s</span>
              </div>
              <Slider
                value={search.filters?.track?.durationTo || 1200}
                min={0}
                max={1200}
                step={10}
                onChange={(val) =>
                  navigate({
                    search: (prev: any) => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        track: { ...prev.filters?.track, durationTo: val },
                      },
                    }),
                  })
                }
              />
            </div>
          </div>
        )}

      {/* Album Filters */}
      {isSectionVisible('album') &&
        (!search.filters?.categories || search.filters.categories.includes('album')) && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Album Type
            </span>
            <Select
              value={search.filters?.album?.type || 'none'}
              onValueChange={(val) =>
                navigate({
                  search: (prev: any) => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      album: {
                        ...prev.filters?.album,
                        type: val === 'none' ? undefined : (val as any),
                      },
                    },
                  }),
                })
              }
            >
              <SelectTrigger className="w-full bg-stone-900 border-white/10">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Types</SelectItem>
                <SelectItem value="album">Album</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="ep">EP</SelectItem>
                <SelectItem value="compilation">Compilation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
    </div>
  );
}
