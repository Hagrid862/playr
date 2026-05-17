import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/shared/services/prisma.service';
import type { SearchQuery, SearchResultsResponse } from '@repo/contracts';
import { AlbumType, Visibility } from '@repo/db';

interface RawSearchResult {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'track' | 'playlist' | 'genre';
  visibility: Visibility;
  albumType: AlbumType | null;
  score: number;
  coverUrl: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  releaseDate: Date | null;
  duration: number | null;
  listenedCount: number | null;
  isPublic: boolean | null;
  isCollaborative: boolean | null;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    userId: string | null,
    searchQuery: SearchQuery,
  ): Promise<SearchResultsResponse> {
    if (!searchQuery.query || searchQuery.query.trim().length < 2) {
      throw new BadRequestException('Query is too short or invalid');
    }

    const trimmedQuery = searchQuery.query.trim();
    const searchPattern = `%${trimmedQuery}%`;
    const filters = searchQuery.filters;
    const orderBy = searchQuery.orderBy;
    const page = searchQuery.page;
    const pageSize = searchQuery.pageSize;
    const offset = (page - 1) * pageSize;
    const isAuthenticated = userId !== null;

    // ── Determine which entity types to query ─────────────────────
    const targetTypes = filters?.types ?? ['artist', 'album', 'track', 'playlist', 'genre'];

    // ── Build per-entity WHERE clauses ─────────────────────────────
    const artistFilters: string[] = [];
    const albumFilters: string[] = [];
    const trackFilters: string[] = [];
    const playlistFilters: string[] = [];
    const genreFilters: string[] = [];

    // Unauthenticated users only see public content
    if (!isAuthenticated) {
      artistFilters.push(`a.visibility = 'public'`);
      albumFilters.push(`al.visibility = 'public'`);
      trackFilters.push(`t.visibility = 'public'`);
      playlistFilters.push(`p."isPublic" = true`);
      // Genres are public by default in this context
    }

    if (filters?.visibility) {
      artistFilters.push(`a.visibility = '${filters.visibility}'`);
      albumFilters.push(`al.visibility = '${filters.visibility}'`);
      trackFilters.push(`t.visibility = '${filters.visibility}'`);
    }

    if (filters?.artist?.verified !== undefined) {
      artistFilters.push(`a.verified = ${filters.artist.verified}`);
    }
    if (filters?.artist?.isCommunity !== undefined) {
      artistFilters.push(`a."isCommunity" = ${filters.artist.isCommunity}`);
    }

    if (filters?.album?.type) {
      albumFilters.push(`al.type = '${filters.album.type}'`);
    }
    if (filters?.album?.releaseDateFrom) {
      albumFilters.push(`al."releaseDate" >= '${filters.album.releaseDateFrom}'`);
    }
    if (filters?.album?.releaseDateTo) {
      albumFilters.push(`al."releaseDate" <= '${filters.album.releaseDateTo}'`);
    }

    if (filters?.track?.explicit !== undefined) {
      trackFilters.push(`t.explicit = ${filters.track.explicit}`);
    }
    if (filters?.track?.durationFrom !== undefined) {
      trackFilters.push(`t.duration >= ${filters.track.durationFrom}`);
    }
    if (filters?.track?.durationTo !== undefined) {
      trackFilters.push(`t.duration <= ${filters.track.durationTo}`);
    }
    if (filters?.track?.minListenedCount !== undefined) {
      trackFilters.push(`t."listenedCount" >= ${filters.track.minListenedCount}`);
    }

    if (filters?.playlist?.isPublic !== undefined) {
      playlistFilters.push(`p."isPublic" = ${filters.playlist.isPublic}`);
    }
    if (filters?.playlist?.isCollaborative !== undefined) {
      playlistFilters.push(`p."isCollaborative" = ${filters.playlist.isCollaborative}`);
    }

    const artistWhere = artistFilters.length ? `AND ${artistFilters.join(' AND ')}` : '';
    const albumWhere = albumFilters.length ? `AND ${albumFilters.join(' AND ')}` : '';
    const trackWhere = trackFilters.length ? `AND ${trackFilters.join(' AND ')}` : '';
    const playlistWhere = playlistFilters.length ? `AND ${playlistFilters.join(' AND ')}` : '';
    const genreWhere = genreFilters.length ? `AND ${genreFilters.join(' AND ')}` : '';

    // ── Build ORDER BY clause ─────────────────────────────────────
    let orderByClause = 'score DESC';
    if (orderBy) {
      const dir = orderBy.direction.toUpperCase();
      switch (orderBy.field) {
        case 'name':
          orderByClause = `name ${dir}`;
          break;
        case 'createdAt':
          orderByClause = `"createdAt" ${dir}`;
          break;
        case 'releaseDate':
          orderByClause = `"releaseDate" ${dir} NULLS LAST`;
          break;
        case 'duration':
          orderByClause = `duration ${dir}`;
          break;
        case 'listenedCount':
          orderByClause = `"listenedCount" ${dir}`;
          break;
        case 'isPublic':
          orderByClause = `"isPublic" ${dir}`;
          break;
        case 'isCollaborative':
          orderByClause = `"isCollaborative" ${dir}`;
          break;
        case 'relevance':
        default:
          orderByClause = 'score DESC';
          break;
      }
    }

    // ── Build UNION ALL query ─────────────────────────────────────
    const queryParts: Prisma.Sql[] = [];
    let needsUnionAll = false;

    if (targetTypes.includes('artist')) {
      queryParts.push(Prisma.sql`
        SELECT a.id, a.name, 'artist' as type,
          a.visibility, NULL::"AlbumType" as "albumType",
          similarity(a.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          avatar.url as "avatarUrl",
          a."createdAt", NULL::timestamp as "releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative"
        FROM "artists" a
        LEFT JOIN "images" avatar ON a."avatarId" = avatar.id
        WHERE (similarity(a.name, ${trimmedQuery}) > 0.1 OR a.name ILIKE ${searchPattern})
          AND a."deletedAt" IS NULL
          ${Prisma.raw(artistWhere)}
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('album')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT al.id, al.name, 'album' as type,
          al.visibility, al.type as "albumType",
          similarity(al.name, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl",
          al."createdAt", al."releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative"
        FROM "albums" al
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE (similarity(al.name, ${trimmedQuery}) > 0.1 OR al.name ILIKE ${searchPattern})
          AND al."deletedAt" IS NULL
          ${Prisma.raw(albumWhere)}
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('track')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT t.id, t.title as name, 'track' as type,
          t.visibility, NULL::"AlbumType" as "albumType",
          similarity(t.title, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl",
          t."createdAt", NULL::timestamp as "releaseDate",
          t.duration, t."listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative"
        FROM "tracks" t
        LEFT JOIN "albums" al ON t."albumId" = al.id
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE (similarity(t.title, ${trimmedQuery}) > 0.1 OR t.title ILIKE ${searchPattern})
          AND t."deletedAt" IS NULL
          ${Prisma.raw(trackWhere)}
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('playlist')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT p.id, p.name, 'playlist' as type,
          CASE WHEN p."isPublic" THEN 'public'::"Visibility" ELSE 'private'::"Visibility" END as visibility,
          NULL::"AlbumType" as "albumType",
          similarity(p.name, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl",
          p."createdAt", NULL::timestamp as "releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          p."isPublic", p."isCollaborative"
        FROM "playlists" p
        LEFT JOIN "images" cover ON p."coverId" = cover.id
        WHERE (p.name % ${trimmedQuery} OR p.name ILIKE ${searchPattern})
          AND p."deletedAt" IS NULL
          ${Prisma.raw(playlistWhere)}
      `);
      needsUnionAll = true;
    }

    if (targetTypes.includes('genre')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT g.id, g.name, 'genre' as type,
          'public'::"Visibility" as visibility, NULL::"AlbumType" as "albumType",
          similarity(g.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          NULL::text as "avatarUrl",
          g."createdAt", NULL::timestamp as "releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative"
        FROM "genres" g
        WHERE (g.name % ${trimmedQuery} OR g.name ILIKE ${searchPattern})
          AND g."deletedAt" IS NULL
          ${Prisma.raw(genreWhere)}
      `);
    }

    if (queryParts.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        filters: filters ?? null,
        orderBy: orderBy ?? null,
      };
    }

    const combinedQuery = Prisma.join(queryParts, '');

    // ── Count total matching rows ─────────────────────────────────
    const countResult = await this.prisma.extended.$queryRaw<{ total: bigint }[]>`
      WITH unified AS (${combinedQuery})
      SELECT COUNT(*) as total FROM unified
    `;
    const total = Number(countResult[0]?.total ?? 0);

    // ── Fetch paginated results ───────────────────────────────────
    const results = await this.prisma.extended.$queryRaw<RawSearchResult[]>`
      WITH unified AS (${combinedQuery})
      SELECT id, name, type, visibility, "albumType", score, "coverUrl", "avatarUrl",
             "createdAt", "releaseDate", duration, "listenedCount", "isPublic", "isCollaborative"
      FROM unified
      ORDER BY ${Prisma.raw(orderByClause)}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    return {
      data: results.map((r: RawSearchResult) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        visibility: r.visibility,
        albumType: r.albumType,
        score: r.score,
        coverUrl: r.coverUrl,
        avatarUrl: r.avatarUrl,
      })),
      total,
      page,
      pageSize,
      filters: filters ?? null,
      orderBy: orderBy ?? null,
    };
  }
}
