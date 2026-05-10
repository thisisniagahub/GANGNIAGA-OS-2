// ============================================
// ACTUALS TRACKING — BARREL EXPORTS
// ============================================

export {
  importActuals,
  computeVariances,
  generateAlerts,
  getDashboardData,
  simulateQuickBooksSync,
  simulateXeroSync,
  dismissAlert,
} from './engine'

export type {
  ImportActualsData,
  VarianceResult,
  AlertResult,
  DashboardData,
} from './engine'
