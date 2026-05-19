/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: [
    "@openai/agents",
    "@openai/agents-core",
    "openai",
    "@corsair-dev/mcp",
  ],
};

export default config;
