import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "../table-mate-backend/schema.yaml",
  output: "src/types/api",
  plugins: ["@hey-api/client-fetch"],
})
