import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  client: "@hey-api/client-fetch",
  input: "./schema.yaml",
  output: "./src/types/api",
})
