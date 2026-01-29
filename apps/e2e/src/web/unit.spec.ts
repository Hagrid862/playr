import { test, expect } from "@playwright/test";

test("basic environment check", async () => {
  expect(1 + 1).toBe(2);
});
