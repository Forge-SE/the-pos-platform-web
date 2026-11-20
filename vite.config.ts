import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    proxy: {
      "/graphql": {
        target: "http://localhost:4000",
        changeOrigin: true,
        ws: true,
      },
      "/voice": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "universfield-digital-alarm-clock-151927.mp3",
        "favicon.ico",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],
      manifest: {
        name: "Ovaal POS",
        short_name: "Ovaal",
        description: "Run orders, payments, shifts, and restaurant operations.",
        theme_color: "#b9e769",
        background_color: "#f7f9f2",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Orders",
            short_name: "Orders",
            url: "/orders",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Overview",
            short_name: "Overview",
            url: "/overview",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // The ops console is for platform staff, not restaurant devices, so its
        // chunks are cached on first use (below) instead of downloaded by every
        // till. The login photo is left to the normal HTTP cache.
        globIgnores: [
          "**/auth*.jpg",
          "**/auth-*.webp",
          "**/assets/Ops*.js",
          "**/assets/ops-*.js",
        ],
        runtimeCaching: [
          {
            // Hashed build files never change, so cache them forever once seen.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "assets-on-demand",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
        ],
      },
    }),
  ],
})

export default config
