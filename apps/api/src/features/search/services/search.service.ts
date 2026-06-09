import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/shared/services/prisma.service';
import type { LibrarySearchSuggestionsResults, SearchSuggestionsResults } from '@repo/contracts';
import { AlbumType, Visibility } from '@repo/db';

interface RawSearchResult {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'track' | 'playlist' | 'genre';
  visibility: Visibility;
  albumType: AlbumType | null;
  score: number;
}

@Injectable()
export class SearchService {
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
        SELECT id, name, 'artist' as type, visibility, NULL as "albumType", similarity(name, ${trimmedQuery}) as score
        FROM "artists"
        WHERE (similarity(name, ${trimmedQuery}) > 0.15 OR name ILIKE ${searchPattern})
        AND "deletedAt" IS NULL
        AND (
          visibility = 'public'
          OR (${userId}::text IS NOT NULL AND (
            visibility = 'community'
            OR EXISTS (SELECT 1 FROM "artist_access" aa WHERE aa."artistId" = "artists".id AND aa."userId" = ${userId})
          ))
        )
        
        UNION ALL
        
        SELECT id, name, 'album' as type, visibility, type as "albumType", similarity(name, ${trimmedQuery}) as score
        FROM "albums"
        WHERE (similarity(name, ${trimmedQuery}) > 0.15 OR name ILIKE ${searchPattern})
        AND "deletedAt" IS NULL
        AND (
          visibility = 'public'
          OR (${userId}::text IS NOT NULL AND (
            visibility = 'community'
            OR EXISTS (SELECT 1 FROM "album_access" ala WHERE ala."albumId" = "albums".id AND ala."userId" = ${userId})
          ))
        )
        
        UNION ALL
        
        SELECT id, title as name, 'track' as type, visibility, NULL as "albumType", similarity(title, ${trimmedQuery}) as score
        FROM "tracks"
        WHERE (similarity(title, ${trimmedQuery}) > 0.15 OR title ILIKE ${searchPattern})
        AND "deletedAt" IS NULL
        AND (
          visibility = 'public'
          OR (${userId}::text IS NOT NULL AND (
            visibility = 'community'
            OR EXISTS (SELECT 1 FROM "track_access" ta WHERE ta."trackId" = "tracks".id AND ta."userId" = ${userId})
          ))
        )

        UNION ALL

        SELECT p.id, p.name, 'playlist' as type,
          CASE WHEN p."isPublic" = true THEN 'public' ELSE 'private' END as visibility,
          NULL as "albumType", similarity(p.name, ${trimmedQuery}) as score
        FROM "playlists" p
        WHERE (p.name % ${trimmedQuery} OR p.name ILIKE ${searchPattern})
        AND p."deletedAt" IS NULL
        AND (
          p."isPublic" = true
          OR (${userId}::text IS NOT NULL AND EXISTS (
            SELECT 1 FROM "libraries" l WHERE l.id = p."libraryId" AND l."userId" = ${userId}
          ))
        )
      )
      SELECT id, name, type, visibility, "albumType", score
      FROM unified_search
      ORDER BY score DESC
      LIMIT 8
    `;

    return results.map((r: RawSearchResult) => ({
      id: r.id,
      name: r.name,
      type: r.type as 'artist' | 'album' | 'track' | 'playlist',
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
        SELECT la."artistId" as id, a.name, 'artist' as type, 'private' as visibility, NULL as "albumType", similarity(a.name, ${trimmedQuery}) as score
        FROM "library_artists" la
        JOIN "artists" a ON la."artistId" = a.id
        WHERE la."libraryId" = (SELECT id FROM user_library)
        AND (a.name % ${trimmedQuery} OR a.name ILIKE ${searchPattern})
        AND a."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('album')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT lb."albumId" as id, al.name, 'album' as type, 'private' as visibility, al.type as "albumType", similarity(al.name, ${trimmedQuery}) as score
        FROM "library_albums" lb
        JOIN "albums" al ON lb."albumId" = al.id
        WHERE lb."libraryId" = (SELECT id FROM user_library)
        AND (al.name % ${trimmedQuery} OR al.name ILIKE ${searchPattern})
        AND al."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('track')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT lt."trackId" as id, t.title as name, 'track' as type, 'private' as visibility, NULL as "albumType", similarity(t.title, ${trimmedQuery}) as score
        FROM "library_tracks" lt
        JOIN "tracks" t ON lt."trackId" = t.id
        WHERE lt."libraryId" = (SELECT id FROM user_library)
        AND (t.title % ${trimmedQuery} OR t.title ILIKE ${searchPattern})
        AND t."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('playlist')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT p.id, p.name, 'playlist' as type, 'private' as visibility, NULL as "albumType", similarity(p.name, ${trimmedQuery}) as score
        FROM "playlists" p
        WHERE p."libraryId" = (SELECT id FROM user_library)
        AND (p.name % ${trimmedQuery} OR p.name ILIKE ${searchPattern})
        AND p."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('genre')) {
      if (needsUnionAll) {
        queryParts.push(Prisma.sql` UNION ALL `);
      }
      queryParts.push(Prisma.sql`
        SELECT g.id, g.name, 'genre' as type,
          CASE WHEN g."libraryId" IS NULL THEN 'public' ELSE 'private' END as visibility,
          NULL as "albumType", similarity(g.name, ${trimmedQuery}) as score
        FROM "genres" g
        WHERE (g."libraryId" = (SELECT id FROM user_library) OR g."libraryId" IS NULL)
        AND (g.name % ${trimmedQuery} OR g.name ILIKE ${searchPattern})
        AND g."deletedAt" IS NULL
      `);
    }

    if (queryParts.length === 0) {
      queryParts.push(Prisma.sql`SELECT NULL as id, NULL as name, NULL as type, NULL as visibility, NULL as "albumType", 0 as score WHERE 1=0`);
    }

    const combinedQuery = Prisma.join(queryParts, '');

    const results = await this.prisma.extended.$queryRaw<RawSearchResult[]>`
      WITH user_library AS (
        SELECT id FROM "libraries" WHERE "userId" = ${userId}
      ),
      library_items AS (
        ${combinedQuery}
      )
      SELECT id, name, type, visibility, "albumType", score
      FROM library_items
      ORDER BY score DESC
      LIMIT 20
    `;

    return results.map((r: RawSearchResult) => ({
      id: r.id,
      name: r.name,
      type: r.type as 'artist' | 'album' | 'track' | 'playlist' | 'genre',
      ...(r.albumType ? { albumType: r.albumType } : {}),
    }));
  }
}
