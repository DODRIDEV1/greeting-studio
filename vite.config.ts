// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public (publishable) backend config. The .env file is not part of the published
// build source, so provide fallbacks here so VITE_* vars are always baked in.
process.env.VITE_SUPABASE_URL ||= "https://eghxwrnifkglzxvemesz.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= "sb_publishable_84v9IaLJB-UImktIzjHo4Q_mySezoud";
process.env.VITE_SUPABASE_PROJECT_ID ||= "eghxwrnifkglzxvemesz";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
