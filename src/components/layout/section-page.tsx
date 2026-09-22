import type { ReactNode } from "react"

export function SectionPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
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
