import { useRef } from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { StaffAvatar } from "@/features/staff/staff-avatar"

export interface SignInProfile {
  id: string
  name: string
  role: string
  avatarUrl?: string | null
  pinSet: boolean
}

const roleLabels: Record<string, string> = {
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  MANAGER: "Manager",
  OWNER: "Owner",
}

export function StaffRail({
  profiles,
  onChoose,
}: {
  profiles: SignInProfile[]
  onChoose: (profile: SignInProfile) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  function scrollByCard(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({
      left: direction * 156,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      {profiles.length > 2 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute top-10 -left-1 z-10 bg-card"
            aria-label="Previous staff"
            onClick={() => scrollByCard(-1)}
          >
            <CaretLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute top-10 -right-1 z-10 bg-card"
            aria-label="Next staff"
            onClick={() => scrollByCard(1)}
          >
            <CaretRightIcon />
          </Button>
        </>
      )}
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory scroll-px-2 [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onChoose(profile)}
            className="flex w-36 shrink-0 snap-center flex-col items-center rounded-xl px-2 py-3 text-center transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <StaffAvatar
              name={profile.name}
              url={profile.avatarUrl}
              className="size-24 text-xl ring-2 ring-border"
            />
            <span className="mt-3 max-w-full truncate text-sm font-semibold">
              {profile.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {roleLabels[profile.role] ?? profile.role}
            </span>
            {!profile.pinSet && (
              <span className="mt-1 text-[11px] font-medium tracking-wide text-primary uppercase">
                First sign-in
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
