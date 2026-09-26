import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { registerSW } from "virtual:pwa-register"

import { getRouter } from "@/router"
import "@/styles.css"

const rootElement = document.getElementById("root")

if (!rootElement) throw new Error("Root element was not found.")

registerSW({ immediate: true })

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={getRouter()} />
  </StrictMode>
)
