import { defineConfig } from "@hey-api/openapi-ts"

// Types only — the app consumes the generated component types, not the SDK
// client, so we don't generate the (unused) fetch client/sdk.
export default defineConfig({
  input: "../table-mate-backend/schema.yaml",
  // Format with the project's prettier so regenerated output matches what is
  // committed — otherwise the CI drift gate would fail on formatting alone.
  output: { path: "src/types/api", format: "prettier" },
  plugins: ["@hey-api/typescript"],
})
