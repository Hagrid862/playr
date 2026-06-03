import { type Page } from "@playwright/test";

/** Waits until auth tokens are persisted in IndexedDB (idb-keyval). */
export async function waitForAuthStorage(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      return new Promise<boolean>((resolve) => {
        try {
          const request = indexedDB.open("keyval-store");
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("keyval", "readonly");
            const store = tx.objectStore("keyval");
            const getReq = store.get("auth-storage");
            getReq.onsuccess = () => {
              db.close();
              resolve(getReq.result != null && getReq.result !== undefined);
            };
            getReq.onerror = () => {
              db.close();
              resolve(false);
            };
          };
          request.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    },
    { timeout: 15000 },
  );
}

export async function gotoAppShell(page: Page): Promise<void> {
  await page.goto("/app");
  await page.waitForURL(/\/app/, { timeout: 15000 });
  await waitForAuthStorage(page);
}
