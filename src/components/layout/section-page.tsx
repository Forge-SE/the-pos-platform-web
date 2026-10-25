import type { ReactNode } from "react"

export function SectionPage({
  title,
  description,
  children,
  fillHeight = false,
}: {
  title: string
  description: string
  children?: ReactNode
  fillHeight?: boolean
}) {
  return (
    <div
      className={`content-page mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8 ${fillHeight ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col" : ""}`}
    >
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </div>
  )
}
