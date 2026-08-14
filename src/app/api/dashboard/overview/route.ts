import { getDashboardOverview } from '@/db/queries/dashboard-analytics'
import { createDashboardRoute } from '@/app/api/dashboard/_route'

export const GET = createDashboardRoute(getDashboardOverview)
