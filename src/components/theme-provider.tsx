import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"
import type { ReactNode } from "react"

type Theme = "light" | "dark"

const STORAGE_KEY = "pos.theme"
const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
} | null>(null)

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light"
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // The current browser may block persistent storage.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#203129" : "#b9e769")
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Keep the theme active for this tab when storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (
        event.key === STORAGE_KEY &&
        (event.newValue === "light" || event.newValue === "dark")
      ) {
        setTheme(event.newValue)
      }
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
