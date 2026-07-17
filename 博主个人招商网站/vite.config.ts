import vinext from "vinext";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const plugins = [vinext()];

  // Vercel runs this project as a standard Vite/React deployment. The legacy
  // Cloudflare plugins are intentionally not loaded there: they require D1/R2
  // bindings and the OpenAI hosting manifest, neither of which Vercel provides.
  if (!process.env.VERCEL) {
    const [{ sites }, { cloudflare }, hostingModule] = await Promise.all([
      import("./build/sites-vite-plugin"),
      import("@cloudflare/vite-plugin"),
      import("./.openai/hosting.json"),
    ]);
    const hostingConfig = hostingModule.default;
    const placeholderDatabaseId = "00000000-0000-4000-8000-000000000000";

    plugins.push(
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: {
          main: "./worker/index.ts",
          compatibility_flags: ["nodejs_compat"],
          d1_databases: hostingConfig.d1
            ? [
                {
                  binding: hostingConfig.d1,
                  database_name: "site-creator-d1",
                  database_id: placeholderDatabaseId,
                },
              ]
            : [],
          r2_buckets: hostingConfig.r2
            ? [{ binding: hostingConfig.r2, bucket_name: "site-creator-r2" }]
            : [],
        },
      }),
    );
  }

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins,
  };
});
