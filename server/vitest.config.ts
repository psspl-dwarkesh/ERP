import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The suite signs in many times from one address; the production per-IP ceiling is 30 per 10 min.
    env: { SIGNIN_MAX_PER_IP: "1000" },
    testTimeout: 30_000,
  },
});
