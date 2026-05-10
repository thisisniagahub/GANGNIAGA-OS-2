// ============================================
// IDEA VALIDATION ENGINE — BARREL EXPORTS
// ============================================

// Main validation function
export { validateIdea } from './engine'

// Question generation
export { generateValidationQuestions } from './engine'

// Risk analysis
export { analyzeRisk } from './engine'

// Persistence helper
export { persistValidation } from './engine'

// Types
export type {
  CanvasData,
  ValidationCategory,
  ValidationQuestion,
  RiskAssessment,
  ValidationReport,
} from './engine'
