export function StaffAvatar({
  name,
  url,
  className = "size-16 text-base",
}: {
  name: string
  url?: string | null
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary ${className}`}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials || "?"}</span>
      )}
    </span>
  )
}
