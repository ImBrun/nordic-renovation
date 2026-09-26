import type { DashboardKpi } from '../types/dashboard'

type KpiCardProps = {
  kpi: DashboardKpi
}

export function KpiCard({ kpi }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <p>{kpi.label}</p>
      <strong>{kpi.value}</strong>
      <span>{kpi.detail}</span>
    </article>
  )
}
