import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import os from "os";

const isWindows = process.platform === "win32";
const cpuCount = os.cpus().length;

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: undefined,
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],

    // Windows: use threads (reliable in Vitest 4.x)
    // Others: use forks (default)
    pool: isWindows ? "threads" : "forks",

    // Windows: limit workers to prevent memory issues
    maxWorkers: isWindows ? Math.max(1, Math.floor(cpuCount / 2)) : undefined,

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        ".next/",
        "dist/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/image": path.resolve(__dirname, "./src/test/mocks/next-image.tsx"),
      "next/link": path.resolve(__dirname, "./src/test/mocks/next-link.tsx"),
      "next/navigation": path.resolve(__dirname, "./src/test/mocks/next-navigation.ts"),
    },
  },
});
