import { Outlet } from "@tanstack/react-router"

import { OpsGuard } from "@/features/ops/ops-guard"
import { OpsShell } from "@/features/ops/ops-shell"

export function Ops() {
  return (
    <OpsGuard>
      <OpsShell>
        <Outlet />
      </OpsShell>
    </OpsGuard>
  )
}
