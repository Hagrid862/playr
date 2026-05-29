/** Shared pagination cursor for library list infinite queries. */
export function getLibraryInfiniteNextPageParam(lastPage: {
  data?: { page: number; limit: number; total: number } | null;
}): number | undefined {
  const d = lastPage.data;
  if (!d) return undefined;
  const { page, limit: pageLimit, total } = d;
  return page * pageLimit < total ? page + 1 : undefined;
}
