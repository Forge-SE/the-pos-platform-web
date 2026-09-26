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
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
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
        globIgnores: ["**/auth.jpg"],
      },
    }),
  ],
})

export default config
