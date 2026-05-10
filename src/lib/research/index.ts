// ============================================
// RESEARCH MODULE BARREL EXPORTS
// Bank-Grade Research Agent
// ============================================

export {
  getVerifiedSources,
  searchBenchmarks,
  createCitation,
  validateCitation,
  generateResearchReport,
  seedDefaultSources,
  seedDefaultBenchmarks,
} from './engine'

export type {
  VerifiedSource,
  CitationEntry,
  BenchmarkEntry,
  ResearchReport,
} from './engine'
