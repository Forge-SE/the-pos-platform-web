import { OpsDashboard } from "@/features/ops/ops-dashboard"
import { OpsGuard } from "@/features/ops/ops-guard"

export function Ops() {
  return (
    <OpsGuard>
      <OpsDashboard />
    </OpsGuard>
  )
}
