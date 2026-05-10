// ============================================
// PITCH DECK ORCHESTRATOR — BARREL EXPORTS
// ============================================

// Engine functions
export {
  createDeck,
  generateSlidesFromPlan,
  syncDynamicVariables,
  generateFunderQuestions,
  analyzeDeck,
  getTemplates,
  getTemplateById,
  generateDeckFromScratch,
  getDeckWithSlides,
} from './engine'

// Types
export type {
  SlideDefinition,
  TemplateDefinition,
  DynamicVariableValue,
  DeckAnalysis,
  FunderQuestion,
} from './engine'
