import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/shared/services/prisma.service';
import type { LibrarySearchResultsResponse, SearchQuery, SearchResultsResponse } from '@repo/contracts';
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
  createdAt: Date;
  releaseDate: Date | null;
  duration: number | null;
  listenedCount: number | null;
  isPublic: boolean | null;
  isCollaborative: boolean | null;
  explicit: boolean | null;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string | null, searchQuery: SearchQuery): Promise<SearchResultsResponse> {
    let loggedIn = false;

    if (!userId) {
      throw new UnauthorizedException(
        'User token is required. Public and community visibilities are not implemented yet',
      );
    }

    loggedIn = true;

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

    // ── Determine which entity categories to query ─────────────────────
    const targetCategories = filters?.categories ?? ['artist', 'album', 'track', 'playlist', 'genre'];

    // ── Build per-entity WHERE clauses ─────────────────────────────
    const artistConditions: Prisma.Sql[] = [
      Prisma.sql`(similarity(a.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR a.name ILIKE ${searchPattern})`,
      Prisma.sql`a."deletedAt" IS NULL`,
    ];
    const albumConditions: Prisma.Sql[] = [
      Prisma.sql`(similarity(al.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR al.name ILIKE ${searchPattern})`,
      Prisma.sql`al."deletedAt" IS NULL`,
    ];
    const trackConditions: Prisma.Sql[] = [
      Prisma.sql`(similarity(t.title, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR t.title ILIKE ${searchPattern})`,
      Prisma.sql`t."deletedAt" IS NULL`,
    ];
    const playlistConditions: Prisma.Sql[] = [
      Prisma.sql`(similarity(p.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR p.name ILIKE ${searchPattern})`,
      Prisma.sql`p."deletedAt" IS NULL`,
    ];
    const genreConditions: Prisma.Sql[] = [
      Prisma.sql`(similarity(g.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR g.name ILIKE ${searchPattern})`,
      Prisma.sql`g."deletedAt" IS NULL`,
    ];

    // ── Visibility & Ownership Checks ──────────────────────────────
    if (!isAuthenticated) {
      artistConditions.push(Prisma.sql`a.visibility = 'public'`);
      albumConditions.push(Prisma.sql`al.visibility = 'public'`);
      trackConditions.push(Prisma.sql`t.visibility = 'public'`);
      playlistConditions.push(Prisma.sql`p."isPublic" = true`);
    } else {
      artistConditions.push(
        Prisma.sql`(a.visibility = 'public' OR EXISTS (SELECT 1 FROM "artist_access" aa WHERE aa."artistId" = a.id AND aa."userId" = ${userId}))`,
      );
      albumConditions.push(
        Prisma.sql`(al.visibility = 'public' OR EXISTS (SELECT 1 FROM "album_access" ala WHERE ala."albumId" = al.id AND ala."userId" = ${userId}))`,
      );
      trackConditions.push(
        Prisma.sql`(t.visibility = 'public' OR EXISTS (SELECT 1 FROM "track_access" ta WHERE ta."trackId" = t.id AND ta."userId" = ${userId}))`,
      );
      playlistConditions.push(
        Prisma.sql`(p."isPublic" = true OR EXISTS (SELECT 1 FROM "libraries" l WHERE l.id = p."libraryId" AND l."userId" = ${userId}) OR (p."artistId" IS NOT NULL AND EXISTS (SELECT 1 FROM "artist_access" aa WHERE aa."artistId" = p."artistId" AND aa."userId" = ${userId})))`,
      );
    }

    // ── Apply filters from searchQuery ─────────────────────────────
    if (filters?.visibility) {
      const vis = filters.visibility;
      artistConditions.push(Prisma.sql`a.visibility = ${vis}::"Visibility"`);
      albumConditions.push(Prisma.sql`al.visibility = ${vis}::"Visibility"`);
      trackConditions.push(Prisma.sql`t.visibility = ${vis}::"Visibility"`);

      if (vis === 'public') {
        playlistConditions.push(Prisma.sql`p."isPublic" = true`);
      } else if (vis === 'private') {
        playlistConditions.push(Prisma.sql`p."isPublic" = false`);
      }
    }

    if (filters?.artist?.verified !== undefined) {
      artistConditions.push(Prisma.sql`a.verified = ${filters.artist.verified}`);
    }
    if (filters?.artist?.isCommunity !== undefined) {
      artistConditions.push(Prisma.sql`a."isCommunity" = ${filters.artist.isCommunity}`);
    }

    if (filters?.album?.type) {
      albumConditions.push(Prisma.sql`al.type = ${filters.album.type}::"AlbumType"`);
    }
    if (filters?.album?.releaseDateFrom) {
      albumConditions.push(Prisma.sql`al."releaseDate" >= ${new Date(filters.album.releaseDateFrom)}`);
    }
    if (filters?.album?.releaseDateTo) {
      albumConditions.push(Prisma.sql`al."releaseDate" <= ${new Date(filters.album.releaseDateTo)}`);
    }

    if (filters?.track?.explicit !== undefined) {
      trackConditions.push(Prisma.sql`t.explicit = ${filters.track.explicit}`);
    }
    if (filters?.track?.durationFrom !== undefined) {
      trackConditions.push(Prisma.sql`t.duration >= ${filters.track.durationFrom}`);
    }
    if (filters?.track?.durationTo !== undefined) {
      trackConditions.push(Prisma.sql`t.duration <= ${filters.track.durationTo}`);
    }
    if (filters?.track?.minListenedCount !== undefined) {
      trackConditions.push(Prisma.sql`t."listenedCount" >= ${filters.track.minListenedCount}`);
    }

    if (filters?.playlist?.isPublic !== undefined) {
      playlistConditions.push(Prisma.sql`p."isPublic" = ${filters.playlist.isPublic}`);
    }
    if (filters?.playlist?.isCollaborative !== undefined) {
      playlistConditions.push(Prisma.sql`p."isCollaborative" = ${filters.playlist.isCollaborative}`);
    }

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
        case 'relevance':
          orderByClause = `score ${dir}`;
          break;
        default:
          orderByClause = 'score DESC';
          break;
      }
    }

    // ── Build UNION ALL query ─────────────────────────────────────
    const queryParts: Prisma.Sql[] = [];
    let needsUnionAll = false;

    if (targetCategories.includes('artist')) {
      queryParts.push(Prisma.sql`
        SELECT a.id, a.name, 'artist' as type,
          a.visibility, NULL::"AlbumType" as "albumType",
          similarity(a.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          avatar.url as "avatarUrl",
          a."createdAt", NULL::timestamp as "releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          NULL::boolean as "explicit"
        FROM "artists" a
        LEFT JOIN "images" avatar ON a."avatarId" = avatar.id
        WHERE ${Prisma.join(artistConditions, ' AND ')}
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('album')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT al.id, al.name, 'album' as type,
          al.visibility, al.type as "albumType",
          similarity(al.name, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl",
          al."createdAt", al."releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          NULL::boolean as "explicit"
        FROM "albums" al
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE ${Prisma.join(albumConditions, ' AND ')}
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('track')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT t.id, t.title as name, 'track' as type,
          t.visibility, NULL::"AlbumType" as "albumType",
          similarity(t.title, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl",
          t."createdAt", NULL::timestamp as "releaseDate",
          t.duration, t."listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          t.explicit as "explicit"
        FROM "tracks" t
        LEFT JOIN "albums" al ON t."albumId" = al.id
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE ${Prisma.join(trackConditions, ' AND ')}
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('playlist')) {
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
          p."isPublic", p."isCollaborative",
          NULL::boolean as "explicit"
        FROM "playlists" p
        LEFT JOIN "images" cover ON p."coverId" = cover.id
        WHERE ${Prisma.join(playlistConditions, ' AND ')}
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('genre')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT g.id, g.name, 'genre' as type,
          'public'::"Visibility" as visibility, NULL::"AlbumType" as "albumType",
          similarity(g.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          NULL::text as "avatarUrl",
          g."createdAt", NULL::timestamp as "releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          NULL::boolean as "explicit"
        FROM "genres" g
        WHERE ${Prisma.join(genreConditions, ' AND ')}
      `);
    }

    if (queryParts.length === 0) {
      return {
        results: [],
        loggedIn,
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
             "createdAt", "releaseDate", duration, "listenedCount", "isPublic", "isCollaborative", "explicit"
      FROM unified
      ORDER BY ${Prisma.raw(orderByClause)}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    return {
      results: results.map((r: RawSearchResult) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        visibility: r.visibility,
        albumType: r.albumType,
        score: r.score,
        releaseDate: r.releaseDate,
        duration: r.duration,
        listenedCount: r.listenedCount,
        explicit: r.explicit,
        coverUrl: r.coverUrl,
        avatarUrl: r.avatarUrl,
      })),
      loggedIn,
      total,
      page,
      pageSize,
      filters: filters ?? null,
      orderBy: orderBy ?? null,
    };
  }

  async librarySearch(userId: string, searchQuery: SearchQuery): Promise<LibrarySearchResultsResponse> {
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

    const targetCategories = filters?.categories ?? ['artist', 'album', 'track', 'playlist', 'genre'];

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
        case 'relevance':
          orderByClause = `score ${dir}`;
          break;
        default:
          orderByClause = 'score DESC';
          break;
      }
    }

    // ── Build UNION ALL query ─────────────────────────────────────
    const queryParts: Prisma.Sql[] = [];
    let needsUnionAll = false;

    if (targetCategories.includes('artist')) {
      queryParts.push(Prisma.sql`
        SELECT a.id, a.name, 'artist' as type,
          a.visibility, NULL::"AlbumType" as "albumType",
          similarity(a.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          avatar.url as "avatarUrl",
          a."createdAt", NULL::timestamp as "releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          NULL::boolean as "explicit"
        FROM "artists" a
        JOIN "library_artists" la ON a.id = la."artistId"
        JOIN "libraries" l ON la."libraryId" = l.id
        LEFT JOIN "images" avatar ON a."avatarId" = avatar.id
        WHERE l."userId" = ${userId}
        AND (similarity(a.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR a.name ILIKE ${searchPattern})
        AND a."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('album')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT al.id, al.name, 'album' as type,
          al.visibility, al.type as "albumType",
          similarity(al.name, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl",
          al."createdAt", al."releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          NULL::boolean as "explicit"
        FROM "albums" al
        JOIN "library_albums" lb ON al.id = lb."albumId"
        JOIN "libraries" l ON lb."libraryId" = l.id
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE l."userId" = ${userId}
        AND (similarity(al.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR al.name ILIKE ${searchPattern})
        AND al."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('track')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT t.id, t.title as name, 'track' as type,
          t.visibility, NULL::"AlbumType" as "albumType",
          similarity(t.title, ${trimmedQuery}) as score,
          cover.url as "coverUrl",
          NULL::text as "avatarUrl",
          t."createdAt", NULL::timestamp as "releaseDate",
          t.duration, t."listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          t.explicit as "explicit"
        FROM "tracks" t
        JOIN "library_tracks" lt ON t.id = lt."trackId"
        JOIN "libraries" l ON lt."libraryId" = l.id
        LEFT JOIN "albums" al ON t."albumId" = al.id
        LEFT JOIN "images" cover ON al."coverId" = cover.id
        WHERE l."userId" = ${userId}
        AND (similarity(t.title, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR t.title ILIKE ${searchPattern})
        AND t."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('playlist')) {
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
          p."isPublic", p."isCollaborative",
          NULL::boolean as "explicit"
        FROM "playlists" p
        JOIN "libraries" l ON p."libraryId" = l.id
        LEFT JOIN "images" cover ON p."coverId" = cover.id
        WHERE l."userId" = ${userId}
        AND (similarity(p.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR p.name ILIKE ${searchPattern})
        AND p."deletedAt" IS NULL
      `);
      needsUnionAll = true;
    }

    if (targetCategories.includes('genre')) {
      if (needsUnionAll) queryParts.push(Prisma.sql` UNION ALL `);
      queryParts.push(Prisma.sql`
        SELECT g.id, g.name, 'genre' as type,
          'public'::"Visibility" as visibility, NULL::"AlbumType" as "albumType",
          similarity(g.name, ${trimmedQuery}) as score,
          NULL::text as "coverUrl",
          NULL::text as "avatarUrl",
          g."createdAt", NULL::timestamp as "releaseDate",
          NULL::integer as duration, NULL::integer as "listenedCount",
          NULL::boolean as "isPublic", NULL::boolean as "isCollaborative",
          NULL::boolean as "explicit"
        FROM "genres" g
        JOIN "libraries" l ON g."libraryId" = l.id
        WHERE l."userId" = ${userId}
        AND (similarity(g.name, ${trimmedQuery}) > ${FUZZY_SEARCH_SIMILARITY} OR g.name ILIKE ${searchPattern})
        AND g."deletedAt" IS NULL
      `);
    }

    if (queryParts.length === 0) {
      return {
        results: [],
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
             "createdAt", "releaseDate", duration, "listenedCount", "isPublic", "isCollaborative", "explicit"
      FROM unified
      ORDER BY ${Prisma.raw(orderByClause)}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    return {
      results: results.map((r: RawSearchResult) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        visibility: r.visibility,
        albumType: r.albumType,
        score: r.score,
        releaseDate: r.releaseDate,
        duration: r.duration,
        listenedCount: r.listenedCount,
        explicit: r.explicit,
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
