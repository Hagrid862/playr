import { describe, it, expect } from "vitest";
import {
  buildUser,
  buildZodUser,
  buildZodArtist,
  buildZodAlbum,
  buildLibrary,
  buildLibraryTrack,
  buildLibraryAlbum,
  buildLibraryArtist,
  buildAlbum,
  buildArtist,
  buildTrack,
  buildZodTrack,
  buildZodAudioFile,
  buildZodLibrary,
  buildZodCommunityProfile,
  buildZodPlaylist,
} from "./builders";

describe("api builders", () => {
  it("buildUser allows overrides and preserves shape", () => {
    const user = buildUser({ username: "custom" });
    expect(user.username).toBe("custom");
    expect(user.id).toBeTruthy();
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  describe("contracts builders (Zod)", () => {
    it("buildZodUser returns a user-like object", () => {
      const user = buildZodUser({ username: "custom" });
      expect(user.username).toBe("custom");
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("buildZodArtist returns artist with visibility", () => {
      const artist = buildZodArtist();
      expect(artist.visibility).toBeDefined();
    });

    it("buildZodAlbum returns album with totals", () => {
      const album = buildZodAlbum();
      expect(album.totalTracks).toBeGreaterThanOrEqual(0);
    });

    it("buildZodTrack returns track with duration", () => {
      const track = buildZodTrack({ duration: 120 });
      expect(track.duration).toBe(120);
      expect(track.explicit).toBeDefined();
    });

    it("buildZodAudioFile creates a media file with URL and bitrate", () => {
      const audio = buildZodAudioFile({ bitrate: 256, format: "FLAC" as any });
      expect(audio.bitrate).toBe(256);
      expect(audio.format).toBe("FLAC");
    });

    it("buildZodLibrary sets correct userId", () => {
      const lib = buildZodLibrary({ userId: "test-user-321" });
      expect(lib.userId).toBe("test-user-321");
    });

    it("buildZodCommunityProfile returns community profile", () => {
      const profile = buildZodCommunityProfile({ isVerified: true });
      expect(profile.isVerified).toBe(true);
    });

    it("buildZodPlaylist creates playlist", () => {
      const playlist = buildZodPlaylist({ name: "My Jam" });
      expect(playlist.name).toBe("My Jam");
      expect(playlist.isPublic).toBeDefined();
    });
  });

  describe("models builders (Prisma)", () => {
    it("library builders create consistent links", () => {
      const library = buildLibrary({ id: "lib-1", userId: "user-1" });
      const libTrack = buildLibraryTrack({ libraryId: library.id });
      const libAlbum = buildLibraryAlbum({ libraryId: library.id });
      const libArtist = buildLibraryArtist({ libraryId: library.id });

      expect(libTrack.libraryId).toBe(library.id);
      expect(libAlbum.libraryId).toBe(library.id);
      expect(libArtist.libraryId).toBe(library.id);
    });

    it("domain builders return coherent album/artist/track", () => {
      const album = buildAlbum({ id: "album-1" });
      const artist = buildArtist({ id: "artist-1" });
      const track = buildTrack({ albumId: album.id });

      expect(album.id).toBe("album-1");
      expect(artist.id).toBe("artist-1");
      expect(track.albumId).toBe(album.id);
    });
  });
});
