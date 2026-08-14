import { createDashboardRoute } from '@/app/api/dashboard/_route'
import { getDashboardTopicImpact } from '@/db/queries/dashboard-analytics'

export const GET = createDashboardRoute(getDashboardTopicImpact)
