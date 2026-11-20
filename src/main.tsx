import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { registerSW } from "virtual:pwa-register"

import { getRouter } from "@/router"
import { restoreSession } from "@/lib/auth-session"
import "@/styles.css"

const rootElement = document.getElementById("root")

if (!rootElement) throw new Error("Root element was not found.")

// The service worker pre-downloads the app for offline use. On a slow link that
// would compete with the first screen, so start it once the page has loaded
// and the browser is idle.
function registerServiceWorkerWhenIdle() {
  const register = () => registerSW({ immediate: true })
  const whenIdle = () =>
    "requestIdleCallback" in window
      ? window.requestIdleCallback(register, { timeout: 10_000 })
      : setTimeout(register, 3_000)
  if (document.readyState === "complete") whenIdle()
  else window.addEventListener("load", whenIdle, { once: true })
}

registerServiceWorkerWhenIdle()

void restoreSession().finally(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={getRouter()} />
    </StrictMode>
  )
})
