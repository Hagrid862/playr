import { ZodAlbum, ZodArtist } from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LibraryState {
  libraryId: string | null;
  privateAccountId: string | null;
  privateArtists: ZodArtist[];
  privateAlbums: ZodAlbum[];

  setLibraryId: (libraryId: string) => void;
  setPrivateAccountId: (privateAccountId: string) => void;
  setPrivateArtists: (artists: ZodArtist[]) => void;
  setPrivateAlbums: (albums: ZodAlbum[]) => void;
  updatePrivateArtist: (artist: ZodArtist) => void;
  updatePrivateAlbum: (album: ZodAlbum) => void;
  removePrivateArtist: (id: string) => void;
  removePrivateAlbum: (id: string) => void;
  clearLibrary: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      libraryId: null,
      privateAccountId: null,
      privateArtists: [],
      privateAlbums: [],
      setLibraryId: (libraryId) => set({ libraryId }),
      setPrivateAccountId: (privateAccountId) => set({ privateAccountId }),
      setPrivateArtists: (privateArtists) => set({ privateArtists }),
      setPrivateAlbums: (privateAlbums) => set({ privateAlbums }),
      updatePrivateArtist: (artist) =>
        set((state) => {
          const index = state.privateArtists.findIndex((a) => a.id === artist.id);
          if (index > -1) {
            const privateArtists = [...state.privateArtists];
            privateArtists[index] = artist;
            return { privateArtists };
          }
          return { privateArtists: [...state.privateArtists, artist] };
        }),
      updatePrivateAlbum: (album) =>
        set((state) => {
          const index = state.privateAlbums.findIndex((a) => a.id === album.id);
          if (index > -1) {
            const privateAlbums = [...state.privateAlbums];
            privateAlbums[index] = album;
            return { privateAlbums };
          }
          return { privateAlbums: [...state.privateAlbums, album] };
        }),
      removePrivateArtist: (id) =>
        set((state) => ({
          privateArtists: state.privateArtists.filter((a) => a.id !== id),
        })),
      removePrivateAlbum: (id) =>
        set((state) => ({
          privateAlbums: state.privateAlbums.filter((a) => a.id !== id),
        })),
      clearLibrary: () =>
        set({ libraryId: null, privateAccountId: null, privateArtists: [], privateAlbums: [] }),
    }),
    {
      name: 'library-storage',
    },
  ),
);
