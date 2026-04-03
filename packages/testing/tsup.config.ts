import { packagesConfig } from "@repo/configs/tsup/packages";
import { defineConfig } from "tsup";

export default defineConfig({
  ...packagesConfig,
  entry: {
    index: "src/index.ts",
    "nestjs/index": "src/nestjs/index.ts",
    "web/index": "src/web/index.ts",
  },
});
