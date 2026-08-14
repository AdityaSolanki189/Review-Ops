import { createDashboardRoute } from '@/app/api/dashboard/_route'
import { getPortfolioBriefing } from '@/lib/ai/weekly-briefing'

export const GET = createDashboardRoute((scope) => getPortfolioBriefing(scope.public))
