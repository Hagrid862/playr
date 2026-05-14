import {BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import { PrismaService } from '@/shared/services/prisma.service';
import { LiveSearchResults } from '@repo/contracts';
import { AlbumType } from '@repo/db';

interface RawSearchResult {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'track';
  verified: boolean | null;
  albumType: AlbumType | null;
  score: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async liveSearch(query: string, userId?: string): Promise<LiveSearchResults> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required. Public and community visibilities are not implemented yet');
    }

    if (!query || query.trim().length < 4) {
      throw new BadRequestException('Query is too short or invalid');
    }

    const trimmedQuery = query.trim();
    const searchPattern = `%${trimmedQuery}%`;


    /**
     * We use a raw query to perform a unified fuzzy search across Artists, Albums, and Tracks.
     * Visibility filtering:
     * - 'public' is visible to everyone.
     * - 'community' is visible to any logged-in user.
     * - 'private' is only visible to users with explicit access in the corresponding access tables.
     */
    const results = await this.prisma.extended.$queryRaw<RawSearchResult[]>`
      WITH unified_search AS (
        SELECT id, name, 'artist' as type, verified, NULL as "albumType", similarity(name, ${trimmedQuery}) as score
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
        
        SELECT id, name, 'album' as type, NULL as verified, type as "albumType", similarity(name, ${trimmedQuery}) as score
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
        
        SELECT id, title as name, 'track' as type, NULL as verified, NULL as "albumType", similarity(title, ${trimmedQuery}) as score
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
      )
      SELECT id, name, type, verified, "albumType", score
      FROM unified_search
      ORDER BY score DESC
      LIMIT 8
    `;

    const artists = results.filter((r: RawSearchResult) => r.type === 'artist')
      .map((r: RawSearchResult) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        verified: !!r.verified,
    }));
    
    const albums = results.filter((r: RawSearchResult) => r.type === 'album')
      .map((r: RawSearchResult) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        albumType: r.albumType,
    }));
    
    const tracks = results.filter((r: RawSearchResult) => r.type === 'track')
      .map((r: RawSearchResult) => ({
        id: r.id,
        name: r.name,
        type: r.type,
    }));

    return {
      artists,
      albums,
      tracks,
    };
  }
}