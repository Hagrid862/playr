import type { Page } from "@playwright/test";

type ApiEnvelope<T> = { data: T };

type BrowserApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function nodeApiBase(): string {
  const raw = process.env.VITE_API_URL || "http://localhost:8000";
  return raw
    .replace(/^http:\/\/api(?=:|\/|$)/, "http://localhost")
    .replace(/\/$/, "");
}

async function resolveApiBase(page: Page): Promise<string> {
  try {
    const fromApp = await page.evaluate(() => {
      const env = (
        import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }
      ).env?.VITE_API_URL;
      return env?.replace(/\/$/, "") ?? null;
    });
    if (fromApp) return fromApp;
  } catch {
    // Page not on a Vite bundle yet.
  }
  return nodeApiBase();
}

async function browserApi<T>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const apiBase = await resolveApiBase(page);
  const result = await page.evaluate(
    async ({ apiBase, method, path, body }): Promise<BrowserApiResult<T>> => {
      const readToken = (): Promise<string | null> =>
        new Promise((resolve) => {
          const request = indexedDB.open("keyval-store");
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("keyval", "readonly");
            const getReq = tx.objectStore("keyval").get("auth-storage");
            getReq.onsuccess = () => {
              db.close();
              try {
                const raw = getReq.result as
                  | string
                  | { state?: { accessToken?: string | null } };
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                resolve(parsed?.state?.accessToken ?? null);
              } catch {
                resolve(null);
              }
            };
            getReq.onerror = () => {
              db.close();
              resolve(null);
            };
          };
          request.onerror = () => resolve(null);
        });

      const token = await readToken();
      if (!token) {
        return { ok: false, error: "Missing access token in IndexedDB" };
      }

      const response = await fetch(`${apiBase}/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          error: `API ${method} ${path} failed (${response.status}): ${text}`,
        };
      }

      try {
        return {
          ok: true,
          data: (text ? JSON.parse(text) : {}) as T,
        };
      } catch {
        return {
          ok: false,
          error: `API ${method} ${path} returned invalid JSON: ${text}`,
        };
      }
    },
    { apiBase, method, path, body },
  );

  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function createLibraryGenreViaApi(
  page: Page,
  name: string,
): Promise<string> {
  const result = await browserApi<ApiEnvelope<{ id: string }>>(
    page,
    "POST",
    "library/genres",
    { name },
  );
  return result.data.id;
}

export async function attachGenresToAlbumViaApi(
  page: Page,
  albumId: string,
  genreIds: string[],
): Promise<void> {
  await browserApi(page, "PATCH", `library/albums/${albumId}`, { genreIds });
}

export async function getAlbumTrackIdsViaApi(
  page: Page,
  albumId: string,
): Promise<string[]> {
  const result = await browserApi<ApiEnvelope<{ id: string }[]>>(
    page,
    "GET",
    `library/albums/${albumId}/tracks`,
  );
  return result.data.map((track) => track.id);
}

export async function attachGenresToTrackViaApi(
  page: Page,
  trackId: string,
  genreIds: string[],
): Promise<void> {
  await browserApi(page, "PATCH", `library/tracks/${trackId}`, { genreIds });
}
