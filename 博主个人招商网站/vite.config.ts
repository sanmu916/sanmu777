import vinext from "vinext";
import { defineConfig } from "vite";

// Vercel deployment configuration. This project is hosted on Vercel, so it
// must not load Cloudflare-only bindings or the OpenAI hosting manifest.
export default defineConfig({
  plugins: [vinext()],
});
