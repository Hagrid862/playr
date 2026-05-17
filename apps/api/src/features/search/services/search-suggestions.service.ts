import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/shared/services/prisma.service';
import type { LibrarySearchSuggestionsResults, SearchSuggestionsResults } from '@repo/contracts';
import { AlbumType, Visibility } from '@repo/db';
import { FUZZY_SEARCH_SIMILARITY } from '@/features/search/constants/search.constants';

interface RawSearchResult {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'track' | 'playlist' | 'genre';
  visibility: Visibility;
  albumType: AlbumType | null;
  score: number;
  coverUrl: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class SearchSuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchSuggestions(query: string, userId?: string): Promise<SearchSuggestionsResults> {
    if (!userId) {
      throw new UnauthorizedException(
        'User token is required. Public and community visibilities are not implemented yet',
      );
    }

    if (!query || query.trim().length < 3) {
      throw new BadRequestException('Query is too short or invalid');
    }

    const trimmedQuery = query.trim();
    const searchPattern = `%${trimmedQuery}%`;

    const results = await this.prisma.extended.$queryRaw<RawSearchResult[]>`
      WITH unified_search AS (
        SELECT a.id, a.name, 'artist' as type, a.visibility, NULL as "albumType", similarity(a.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          avatar.url as "avatarUrl"
        FROM "artists" a
        LEFT JOIN "images" avatar ON a."avatarId" = avatar.id
        WHERE (similarity(a.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR a.name ILIKE ${searchPattern})
        AND a."deletedAt" IS NULL
        AND (
          a.visibility = 'public'
          OR (${userId}::text IS NOT NULL AND (
            a.visibility = 'community'
            OR EXISTS (SELECT 1 FROM "artist_access" aa WHERE aa."artistId" = a.id AND aa."userId" = ${userId})
          ))
        )

        UNION ALL

        SELECT al.id, al.name, 'album' as type, al.visibility, al.type as "albumType", similarity(al.name, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl"
        FROM "albums" al
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE (similarity(al.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR al.name ILIKE ${searchPattern})
        AND al."deletedAt" IS NULL
        AND (
          al.visibility = 'public'
          OR (${userId}::text IS NOT NULL AND (
            al.visibility = 'community'
            OR EXISTS (SELECT 1 FROM "album_access" ala WHERE ala."albumId" = al.id AND ala."userId" = ${userId})
          ))
        )

        UNION ALL

        SELECT t.id, t.title as name, 'track' as type, t.visibility, NULL as "albumType", similarity(t.title, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl"
        FROM "tracks" t
        LEFT JOIN "albums" al ON t."albumId" = al.id
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE (similarity(t.title, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR t.title ILIKE ${searchPattern})
        AND t."deletedAt" IS NULL
        AND (
          t.visibility = 'public'
          OR (${userId}::text IS NOT NULL AND (
            t.visibility = 'community'
            OR EXISTS (SELECT 1 FROM "track_access" ta WHERE ta."trackId" = t.id AND ta."userId" = ${userId})
          ))
        )

        UNION ALL

         SELECT p.id, p.name, 'playlist' as type,
           CASE WHEN p."isPublic" = true THEN 'public'::"Visibility" ELSE 'private'::"Visibility" END as visibility,
           NULL as "albumType", similarity(p.name, ${trimmedQuery}) as score,
           cover.url as "coverUrl",
           NULL::text as "avatarUrl"
        FROM "playlists" p
        LEFT JOIN "images" cover ON p."coverId" = cover.id
        WHERE (p.name % ${trimmedQuery} OR p.name ILIKE ${searchPattern})
        AND p."deletedAt" IS NULL
        AND (
          p."isPublic" = true
          OR (${userId}::text IS NOT NULL AND EXISTS (
            SELECT 1 FROM "libraries" l WHERE l.id = p."libraryId" AND l."userId" = ${userId}
          ))
        )

        UNION ALL

        SELECT g.id, g.name, 'genre' as type, 'public'::"Visibility" as visibility, NULL as "albumType", similarity(g.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          NULL::text as "avatarUrl"
        FROM "genres" g
        WHERE (similarity(g.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR g.name ILIKE ${searchPattern})
        AND g."deletedAt" IS NULL
      )
      SELECT id, name, type, visibility, "albumType", score, "coverUrl", "avatarUrl"
      FROM unified_search
      ORDER BY score DESC
      LIMIT 8
    `;

    return results.map((r: RawSearchResult) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      coverURL: r.coverUrl,
      avatarURL: r.avatarUrl,
      visibility: r.visibility,
      ...(r.albumType ? { albumType: r.albumType } : {}),
    }));
  }

  async librarySearchSuggestions(
    userId: string,
    query: string,
    types?: ('artist' | 'album' | 'track' | 'playlist' | 'genre')[],
  ): Promise<LibrarySearchSuggestionsResults> {
    if (!query || query.trim().length < 3) {
      throw new BadRequestException('Query is too short or invalid');
    }

    const trimmedQuery = query.trim();
    const searchPattern = `%${trimmedQuery}%`;
    const targetTypes = types ?? ['artist', 'album', 'track', 'playlist', 'genre'];

    const queryParts: Prisma.Sql[] = [];
    let needsUnionAll = false;

    if (targetTypes.includes('artist')) {
      queryParts.push(Prisma.sql`
        SELECT la."artistId" as id, a.name, 'artist' as type, 'private'::"Visibility" as visibility, NULL as "albumType", similarity(a.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          avatar.url as "avatarUrl"
        FROM "library_artists" la
        JOIN "artists" a ON la."artistId" = a.id
        LEFT JOIN "images" avatar ON a."avatarId" = avatar.id
        WHERE la."libraryId" = (SELECT id FROM user_library)
        AND (similarity(a.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR a.name ILIKE ${searchPattern})
        AND a."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('album')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT lb."albumId" as id, al.name, 'album' as type, 'private'::"Visibility" as visibility, al.type as "albumType", similarity(al.name, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl"
        FROM "library_albums" lb
        JOIN "albums" al ON lb."albumId" = al.id
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE lb."libraryId" = (SELECT id FROM user_library)
        AND (similarity(al.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR al.name ILIKE ${searchPattern})
        AND al."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('track')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT lt."trackId" as id, t.title as name, 'track' as type, 'private'::"Visibility" as visibility, NULL as "albumType", similarity(t.title, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl"
        FROM "library_tracks" lt
        JOIN "tracks" t ON lt."trackId" = t.id
        LEFT JOIN "albums" al ON t."albumId" = al.id
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE lt."libraryId" = (SELECT id FROM user_library)
        AND (similarity(t.title, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR t.title ILIKE ${searchPattern})
        AND t."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('playlist')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT p.id, p.name, 'playlist' as type, 'private'::"Visibility" as visibility, NULL as "albumType", similarity(p.name, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl"
        FROM "playlists" p
        LEFT JOIN "images" cover ON p."coverId" = cover.id
        WHERE p."libraryId" = (SELECT id FROM user_library)
        AND (similarity(p.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR p.name ILIKE ${searchPattern})
        AND p."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('genre')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT g.id, g.name, 'genre' as type, 'private'::"Visibility" as visibility, NULL as "albumType", similarity(g.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          NULL::text as "avatarUrl"
        FROM "genres" g
        WHERE (g."libraryId" = (SELECT id FROM user_library) OR g."libraryId" IS NULL)
        AND (similarity(g.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR g.name ILIKE ${searchPattern})
        AND g."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (queryParts.length === 0) {
      return [];
    }

    const combinedQuery = Prisma.join(queryParts, '');

    const results = await this.prisma.extended.$queryRaw<RawSearchResult[]>`
      WITH user_library AS (
        SELECT id FROM "libraries" WHERE "userId" = ${userId}
      ),
      library_items AS (
        ${combinedQuery}
      )
      SELECT id, name, type, visibility, "albumType", score, "coverUrl", "avatarUrl"
      FROM library_items
      ORDER BY score DESC
      LIMIT 20
    `;

    return results.map((r: RawSearchResult) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      coverURL: r.coverUrl,
      avatarURL: r.avatarUrl,
      visibility: r.visibility,
      ...(r.albumType ? { albumType: r.albumType } : {}),
    }));
  }
}
