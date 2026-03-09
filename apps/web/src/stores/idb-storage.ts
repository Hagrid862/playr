import { get, set, del } from 'idb-keyval';
import { createJSONStorage } from 'zustand/middleware';

const storage =
  typeof indexedDB !== 'undefined'
    ? {
        getItem: async (name: string) => (await get(name)) ?? null,
        setItem: async (name: string, value: string) => await set(name, value),
        removeItem: async (name: string) => await del(name),
      }
    : {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      };

export const idbStorage = createJSONStorage(() => storage);
