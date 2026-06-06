import { defineConfig } from "@hey-api/openapi-ts"

// Types only — the app consumes the generated component types, not the SDK
// client, so we don't generate the (unused) fetch client/sdk.
export default defineConfig({
  input: "../table-mate-backend/schema.yaml",
  output: "src/types/api",
  plugins: ["@hey-api/typescript"],
})
