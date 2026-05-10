# GangNiaga AI OS — Product Roadmap

> **Version:** 4.0  
> **Last Updated:** 2026-03-04  
> **Status:** Active Development  
> **Maintainer:** GangNiaga Engineering

---

## Table of Contents

1. [Vision & Strategy](#1-vision--strategy)
2. [Current State (v4.0)](#2-current-state-v40)
3. [Near-Term (v4.1)](#3-near-term-v41)
4. [Mid-Term (v5.0)](#4-mid-term-v50)
5. [Long-Term (v6.0)](#5-long-term-v60)
6. [Technical Debt](#6-technical-debt)
7. [Community & Open Source Strategy](#7-community--open-source-strategy)
8. [Release Calendar](#8-release-calendar)

---

## 1. Vision & Strategy

### 1.1 Vision Statement

To become the definitive AI-powered business operating system for startups and SMEs in ASEAN, enabling founders and business owners to plan, forecast, validate, and operate their businesses with the intelligence and rigor of a Fortune 500 executive team — at a fraction of the cost.

### 1.2 Strategic Pillars

| Pillar | Description | Priority |
|--------|-------------|----------|
| **Autonomous Intelligence** | AI agents that execute tasks, not just chat — CFO, CEO, Research, Growth, Operations, Fundraising, Browser, Reporting | P0 |
| **Financial Rigor** | SaaS metrics, burn rate, scenario analysis, forecast validation, plan vs actuals with QuickBooks/Xero sync | P0 |
| **ASEAN-First** | Multi-currency (USD, MYR, SGD, IDR, THB, VND, PHP), regional benchmarks, local accounting integrations | P1 |
| **Investor-Ready** | Dynamic pitch decks, multi-agent plan review, export to 6 formats, funder question generation | P1 |
| **Bank-Grade Research** | 50+ verified sources with citations, confidence scores, industry benchmarks by geography | P1 |
| **Pipeline Orchestration** | DAG-based multi-agent pipelines with dependency resolution and persistent memory | P2 |

### 1.3 Product Philosophy

- **AI as a Team Member** — Agents are not chatbots; they are specialized team members with tools, memory, and accountability
- **Data-Driven Decisions** — Every recommendation is backed by data, citations, and confidence scores
- **Zero to Investor-Ready** — From idea validation to bankable business plan to pitch deck in a single platform
- **Progressive Complexity** — Simple for solopreneurs, powerful for enterprises, without configuration overload

### 1.4 Market Positioning

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Competitive Landscape                             │
│                                                                      │
│  Low Complexity ───────────────────────────────────── High Complexity│
│                                                                      │
│  Spreadsheets    LivePlan     ★ GangNiaga    BizPlan    Palantir    │
│  Google Sheets   Bplans       AI OS          Gust       Foundry     │
│  Excel           Enloop                      Carta                 │
│                                                                      │
│  Low AI ─────────────────────────────────────────────── High AI     │
└─────────────────────────────────────────────────────────────────────┘
```

GangNiaga AI OS occupies the unique intersection of deep AI capability and accessible complexity — more intelligent than LivePlan, more integrated than spreadsheets, and far more affordable than Palantir.

---

## 2. Current State (v4.0)

### 2.1 Platform Overview

GangNiaga AI OS v4.0 is a **fully functional MVP** with all core systems operational. The platform runs as a single-page application built on Next.js 16 with 15 feature pages, 8 specialized AI agents, 10 registered tools, and 36+ database models.

### 2.2 Feature Completeness

| Feature | Page | Status | Completeness |
|---------|------|--------|-------------|
| Dashboard | `/` | ✅ Live | 90% |
| Idea Canvas | `idea-canvas` | ✅ Live | 95% |
| Business Plans | `plans` | ✅ Live | 90% |
| Forecasting | `forecasting` | ✅ Live | 95% |
| Plan vs Actuals | `actuals` | ✅ Live | 85% |
| Plan Review | `plan-review` | ✅ Live | 90% |
| Pitch Decks | `pitch-deck` | ✅ Live | 85% |
| AI Agents | `agents` | ✅ Live | 90% |
| AI Copilot | `copilot` | ✅ Live | 85% |
| Research | `research` | ✅ Live | 80% |
| Reports | `reports` | ✅ Live | 75% |
| Workflows | `workflows` | ✅ Live | 80% |
| Observability | `observability` | ✅ Live | 85% |
| Browser | `browser` | ✅ Live | 70% |
| Settings | `settings` | ✅ Live | 85% |

### 2.3 System Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GangNiaga AI OS v4.0                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Presentation: Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui    │
│  State:        Zustand (app-store, auth-store)                         │
│  Charts:       Recharts 2.15 · Framer Motion 12                       │
│                                                                         │
│  API Layer:    35+ endpoints · withApiHandler middleware pipeline       │
│  Middleware:   Rate Limit → Auth → RBAC → Handler → Audit              │
│                                                                         │
│  Engines:      Finance · Idea Validation · Plan Review · Pitch Deck    │
│               Research · Browser Runtime · Export · Observability       │
│                                                                         │
│  Agents:       8 types (CFO, CEO, Research, Growth, Ops,              │
│               Fundraising, Browser, Reporting)                         │
│  Tools:        10 registered (web_search, forecast_calculate, etc.)    │
│  Pipelines:    DAG engine with Kahn's algorithm                        │
│  Memory:       7 categories · LLM compression · Relevance ranking     │
│                                                                         │
│  Data:         Prisma 6.11 · SQLite · 36+ models · 13 domains         │
│  AI SDK:       z-ai-web-dev-sdk 0.0.17                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Key Metrics (Current)

| Metric | Value | Target |
|--------|-------|--------|
| Feature Pages | 15 | 15 |
| API Endpoints | 35+ | 40+ |
| Database Models | 36+ | 40+ |
| AI Agent Types | 8 | 8 |
| Registered Tools | 10 | 10 |
| Export Formats | 6 (PDF, DOCX, PPTX, CSV, XLSX, Markdown) | 6 |
| Research Sources | 50+ verified | 100+ |
| Currencies | 7 (USD, MYR, SGD, IDR, THB, VND, PHP) | 7 |
| RBAC Roles | 5 org roles + 3 global roles | 5+3 |
| Rate Limit Configs | 9 endpoint configs + default | 10+ |
| UI Components | 50 shadcn/ui primitives | 50+ |

### 2.5 Known Limitations (v4.0)

| Limitation | Impact | Severity |
|------------|--------|----------|
| SQLite single-writer | Limits concurrent write throughput | Medium |
| In-memory rate limiting | Lost on restart; not shared across instances | Medium |
| Session cookie auth only | No JWT, no refresh token rotation | Medium |
| No real QuickBooks/Xero OAuth | Simulated sync only | High |
| No WebSocket server | Polling for real-time data | Medium |
| No full-text search | Linear memory scan for retrieval | Low |
| No file upload/attachment | Cannot attach documents to plans | Medium |
| No email notifications | Notifications are in-app only | Medium |
| No automated tests | Zero test coverage currently | High |
| No CI/CD pipeline | Manual deployment process | Medium |

---

## 3. Near-Term (v4.1)

**Target:** Q2 2026  
**Theme:** Stabilization & Production Readiness

### 3.1 Bug Fixes & Hardening

| Item | Description | Priority |
|------|-------------|----------|
| Error boundaries | Add React error boundaries to all page components | P0 |
| Loading states | Consistent skeleton loading across all 15 pages | P0 |
| Toast notifications | Standardize success/error/warning toast patterns | P0 |
| Form validation | Zod schemas for all form inputs with inline error messages | P0 |
| Null safety | Handle null/undefined states for all API responses | P0 |
| Mobile responsiveness | Fix layout issues on screens < 768px | P1 |
| Keyboard navigation | Ensure all interactive elements are keyboard-accessible | P1 |
| Scroll behavior | Persist scroll positions when navigating between pages | P2 |

### 3.2 Authentication Improvements

| Item | Description | Priority |
|------|-------------|----------|
| Password reset | Implement forgot-password flow with email token | P0 |
| Email verification | Require email verification on registration | P0 |
| Session expiry | Auto-logout after session cookie expiry with UI prompt | P1 |
| JWT tokens | Add optional JWT-based auth alongside session cookies | P1 |
| OAuth providers | Google and GitHub OAuth for social login | P2 |
| Two-factor auth | TOTP-based 2FA for admin and owner roles | P2 |

### 3.3 Real QuickBooks & Xero Integration

| Item | Description | Priority |
|------|-------------|----------|
| QuickBooks OAuth 2.0 | Implement full OAuth flow with Intuit OAuth API | P0 |
| Xero OAuth 2.0 | Implement full OAuth flow with Xero identity API | P0 |
| Token management | Secure token storage with auto-refresh | P0 |
| Data sync engine | Real sync engine replacing simulated sync | P0 |
| Sync scheduling | Configurable sync frequency (hourly to monthly) | P1 |
| Error recovery | Retry failed syncs with exponential backoff | P1 |
| Disconnect flow | Clean disconnect with data retention options | P1 |
| Connection health | Dashboard showing sync status, last sync, error count | P2 |

### 3.4 UX Polish

| Item | Description | Priority |
|------|-------------|----------|
| Onboarding wizard | Guided first-time setup for new organizations | P0 |
| Empty states | Helpful empty state illustrations and CTAs for all pages | P0 |
| Command palette | Enhance Cmd+K with recent items and contextual actions | P1 |
| Dark mode refinements | Fix contrast issues in dark theme | P1 |
| Drag-and-drop | Implement dnd-kit for plan section reordering and pipeline steps | P1 |
| Undo/redo | Add undo support for plan editing and forecast modifications | P2 |
| Keyboard shortcuts | Add global shortcuts (Cmd+N for new, Cmd+S for save, etc.) | P2 |
| Search | Global search across plans, forecasts, agents, reports | P2 |

### 3.5 Testing Foundation

| Item | Description | Priority |
|------|-------------|----------|
| Unit tests | Vitest setup with tests for all engine functions | P0 |
| API route tests | Integration tests for all 35+ API endpoints | P0 |
| Component tests | React Testing Library tests for shared components | P1 |
| E2E tests | Playwright setup with critical path tests | P1 |
| CI pipeline | GitHub Actions for lint, test, build on every PR | P0 |
| Coverage targets | 60% line coverage for engines, 40% for API routes | P2 |

### 3.6 Documentation Completion

| Item | Description | Priority |
|------|-------------|----------|
| API examples | curl examples for all 35+ endpoints | P1 |
| Component storybook | Storybook for all 50 shadcn/ui + custom components | P2 |
| Engine documentation | Detailed docs for all 8 engine modules | P1 |
| Deployment guide | Step-by-step production deployment (DEPLOYMENT.md) | P0 |

---

## 4. Mid-Term (v5.0)

**Target:** Q4 2026  
**Theme:** Scale & Intelligence

### 4.1 PostgreSQL Migration

| Item | Description | Priority |
|------|-------------|----------|
| Schema migration | Convert all 36+ models to PostgreSQL-compatible schema | P0 |
| Native JSON columns | Replace String-as-JSON with PostgreSQL `jsonb` columns | P0 |
| Full-text search | PostgreSQL `tsvector` for plan content, memory search | P0 |
| Connection pooling | PgBouncer for production connection management | P1 |
| Prisma migration | `prisma migrate deploy` for zero-downtime schema changes | P0 |
| Data migration script | SQLite → PostgreSQL migration tool with validation | P0 |
| Dual-database support | Support both SQLite (dev) and PostgreSQL (prod) via env | P1 |

### 4.2 pgvector & Semantic Search

| Item | Description | Priority |
|------|-------------|----------|
| pgvector extension | Install and configure pgvector in PostgreSQL | P0 |
| Embedding generation | Generate embeddings for plans, memories, research | P0 |
| Semantic memory search | Replace keyword matching with vector similarity | P0 |
| RAG pipeline | Retrieval-augmented generation for agent context | P0 |
| Hybrid search | Combine keyword (tsvector) + semantic (pgvector) search | P1 |
| Embedding caching | Cache embeddings to avoid regeneration costs | P1 |

### 4.3 LangGraph Agent Framework

| Item | Description | Priority |
|------|-------------|----------|
| LangGraph integration | Replace custom orchestrator with LangGraph for agent state machines | P0 |
| Multi-step reasoning | Enable agents to reason over multiple steps with tool calls | P0 |
| Agent memory graphs | Persistent agent state across sessions via LangGraph checkpoints | P0 |
| Human-in-the-loop | Add approval steps for high-risk agent actions | P1 |
| Agent streaming | Stream agent reasoning steps to the client in real-time | P1 |
| Custom agent builder | UI for defining custom agent personas with tool selection | P2 |

### 4.4 Real-Time Updates (WebSocket)

| Item | Description | Priority |
|------|-------------|----------|
| WebSocket server | Socket.io server alongside Next.js for real-time communication | P0 |
| Live agent status | Real-time agent task progress updates | P0 |
| Live pipeline execution | Stream pipeline step execution status | P0 |
| Collaboration cursors | Show other users' presence in shared documents | P1 |
| Live notifications | Push notifications via WebSocket instead of polling | P1 |
| Real-time dashboards | Live-updating KPIs and financial metrics | P1 |

### 4.5 Collaboration Features

| Item | Description | Priority |
|------|-------------|----------|
| Real-time co-editing | Collaborative editing for business plans with conflict resolution | P0 |
| Comments & mentions | Add inline comments to plan sections with @mention support | P0 |
| Activity feed | Organization-wide activity stream with filtering | P1 |
| Approval workflows | Submit plans for approval with reviewer assignment | P1 |
| Version history | Full version history for plans with diff comparison | P1 |
| Sharing & permissions | Share plans/decks with external users via shareable links | P2 |

### 4.6 Advanced Analytics

| Item | Description | Priority |
|------|-------------|----------|
| Custom dashboards | User-configurable dashboard with drag-and-drop widgets | P1 |
| Trend analysis | AI-powered trend detection across KPIs and financials | P1 |
| Anomaly detection | Automatic anomaly detection in financial data | P1 |
| Predictive alerts | ML-based predictive alerts (e.g., "Cash will run out in 45 days") | P2 |
| Benchmark comparison | Compare organization metrics against industry benchmarks | P2 |
| Cohort analysis | Customer cohort analysis for SaaS businesses | P2 |

---

## 5. Long-Term (v6.0)

**Target:** Q2 2027  
**Theme:** Platform & Ecosystem

### 5.1 Multi-Tenant SaaS

| Item | Description | Priority |
|------|-------------|----------|
| Tenant isolation | Strict data isolation between organizations at the database level | P0 |
| Custom domains | Allow organizations to use custom domains (e.g., app.acme.com) | P1 |
| White-labeling | Customizable UI themes, logos, and branding per tenant | P1 |
| Tenant provisioning | Automated tenant creation with Stripe integration | P0 |
| Usage metering | Per-tenant API call, token, and storage usage tracking | P0 |
| Billing engine | Stripe integration with plan tiers (Free, Starter, Pro, Enterprise) | P0 |
| Plan limits | Enforce feature and resource limits per subscription tier | P1 |

### 5.2 Mobile Application

| Item | Description | Priority |
|------|-------------|----------|
| React Native app | iOS and Android native app using React Native | P0 |
| Core features | Dashboard, KPI monitoring, alerts, agent chat | P0 |
| Push notifications | Native push for financial alerts and task completions | P0 |
| Offline support | Offline KPI viewing and cached data with sync-on-reconnect | P1 |
| Camera integration | Scan receipts and documents for actuals import | P2 |
| Biometric auth | Face ID / fingerprint for mobile authentication | P1 |
| Apple Watch | KPI glance complications and alert notifications | P3 |

### 5.3 Voice Agents

| Item | Description | Priority |
|------|-------------|----------|
| Voice input | Speech-to-text for agent conversations and plan dictation | P1 |
| Voice output | Text-to-speech for agent responses and report narration | P1 |
| Voice commands | "Hey GangNiaga" wake word for hands-free operation | P2 |
| Phone integration | Twilio integration for voice-based financial updates | P2 |
| Meeting transcription | Auto-transcribe and analyze investor meetings | P3 |
| Voice-first agents | Dedicated voice-optimized agent personas | P2 |

### 5.4 On-Premise Deployment

| Item | Description | Priority |
|------|-------------|----------|
| Docker Compose stack | Self-contained deployment with all dependencies | P0 |
| Kubernetes Helm chart | Production-grade K8s deployment with auto-scaling | P1 |
| Air-gapped mode | Full offline operation without external API dependencies | P1 |
| Custom LLM backends | Support for self-hosted LLMs (Llama, Mistral, etc.) | P0 |
| Data sovereignty | Configurable data residency and storage regions | P1 |
| Enterprise SSO | SAML 2.0 and OIDC integration for enterprise auth | P0 |
| Audit compliance | SOC 2 Type II compliance documentation and controls | P1 |

### 5.5 Marketplace & Ecosystem

| Item | Description | Priority |
|------|-------------|----------|
| Plugin marketplace | Third-party integrations and extensions marketplace | P1 |
| Custom agent builder | Visual agent builder for domain-specific agents | P2 |
| Template marketplace | Community-contributed business plan and pitch deck templates | P2 |
| API marketplace | Public API for building custom tools on top of GangNiaga | P1 |
| Webhook system | Outgoing webhooks for all major events | P1 |
| Zapier integration | No-code automation via Zapier connector | P2 |

### 5.6 Advanced AI Features

| Item | Description | Priority |
|------|-------------|----------|
| Multi-modal agents | Agents that can process images, charts, and documents | P1 |
| Auto-ML pipelines | Automated model selection and fine-tuning for domain-specific tasks | P2 |
| Causal inference | Causal AI for understanding business driver relationships | P2 |
| Scenario simulation | Monte Carlo simulation for financial scenario modeling | P1 |
| Competitor monitoring | Automated competitor tracking with change detection | P2 |
| Regulatory intelligence | Automated regulatory change detection and compliance alerts | P3 |

---

## 6. Technical Debt

### 6.1 Critical Debt

| Debt Item | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| No automated tests | Risk of regressions, slow development velocity | Large | P0 |
| No CI/CD pipeline | Manual deployment, no quality gates | Medium | P0 |
| SQLite for production | Single-writer bottleneck, no concurrency | Large | P0 |
| No real OAuth for QB/Xero | Simulated sync only, no real data flow | Medium | P0 |
| In-memory rate limiting | Lost on restart, not shared across instances | Medium | P1 |

### 6.2 Architecture Debt

| Debt Item | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| Client-side routing only | No deep linking, no SEO for pages | Large | P1 |
| JSON stored as strings | No native JSON querying, manual serialization everywhere | Medium | P1 |
| No file upload infrastructure | Cannot attach documents to plans or upload CSV data | Medium | P1 |
| Monolithic engine layer | Engines are tightly coupled to API routes | Medium | P2 |
| No background job processing | Long-running tasks block API requests | Large | P1 |
| No caching layer | Every request hits the database | Medium | P2 |

### 6.3 Code Quality Debt

| Debt Item | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| TypeScript ignoreBuildErrors | Type safety bypassed in production builds | Medium | P1 |
| No ESLint strict mode | Inconsistent code patterns | Small | P1 |
| No shared error types | Error handling is inconsistent across engines | Medium | P2 |
| Hardcoded strings | No i18n framework for future localization | Large | P2 |
| No API versioning | Breaking changes affect all clients | Medium | P2 |
| Console.error in production | No structured logging framework | Small | P2 |

### 6.4 Security Debt

| Debt Item | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| No CSP headers | XSS risk from injected scripts | Small | P0 |
| Session cookie without rotation | Long-lived sessions without refresh | Small | P1 |
| No database encryption at rest | SQLite file is readable if compromised | Medium | P1 |
| URL parameter auth fallback | Less secure authentication path | Small | P2 |
| No rate limit persistence | In-memory rate limits lost on restart | Medium | P2 |

### 6.5 Debt Resolution Plan

```
Q2 2026 (v4.1):
  ── Automated test foundation (Vitest + React Testing Library)
  ── CI/CD pipeline (GitHub Actions)
  ── CSP headers and security hardening
  ── Fix TypeScript build errors, remove ignoreBuildErrors

Q4 2026 (v5.0):
  ── PostgreSQL migration (eliminates SQLite bottleneck)
  ── Redis for rate limiting and caching
  ── Background job processing (Bull/BullMQ)
  ── Structured logging (Pino)

Q2 2027 (v6.0):
  ── API versioning
  ── i18n framework (next-intl)
  ── Hybrid routing (Next.js file-based + client-side)
  ── Database encryption at rest
```

---

## 7. Community & Open Source Strategy

### 7.1 Open Source Model

| Component | License | Rationale |
|-----------|---------|-----------|
| Core platform | MIT | Maximum adoption, community contributions |
| Enterprise features | Commercial | Revenue sustainability |
| Agent definitions | MIT | Community-driven agent ecosystem |
| Templates | CC BY-SA 4.0 | Shareable business plan templates |
| Integrations | MIT | Third-party connector ecosystem |

### 7.2 Community Building

| Initiative | Timeline | Goal |
|------------|----------|------|
| GitHub public repo | Q3 2026 | 500 stars in first 6 months |
| Discord community | Q3 2026 | Active community for support and feature discussion |
| Contributor guide | Q3 2026 | CONTRIBUTING.md with clear onboarding |
| Bug bounty program | Q4 2026 | Security-focused community engagement |
| Ambassadors program | Q1 2027 | Regional ASEAN community leaders |
| Hackathon | Q2 2027 | Build custom agents and integrations |

### 7.3 Contribution Areas

We welcome community contributions in the following areas:

| Area | Examples | Difficulty |
|------|----------|-----------|
| Agent definitions | New agent personas, improved system prompts | Beginner |
| Research sources | New verified sources for specific industries/geographies | Beginner |
| Templates | Business plan templates, pitch deck templates | Beginner |
| Integrations | New accounting/CRM/analytics connectors | Intermediate |
| UI components | New shadcn/ui components, page improvements | Intermediate |
| Engine features | New engine functions, calculation improvements | Advanced |
| Pipeline patterns | Pre-built pipeline templates for common workflows | Intermediate |
| Localization | Translations for MY, ID, TH, VN, PH languages | Beginner |

### 7.4 Governance

| Role | Responsibility | Selection |
|------|---------------|-----------|
| BDFL | Final architectural decisions, release approvals | Founder |
| Core Maintainers | PR review, roadmap direction, issue triage | BDFL appointment |
| Module Owners | Domain-specific expertise and review | Core maintainer nomination |
| Contributors | Bug fixes, features, documentation | Open |
| Community Moderators | Discord/Forum moderation | Core maintainer nomination |

### 7.5 Release Cadence

| Release Type | Cadence | Contents |
|-------------|---------|----------|
| Patch (4.0.x) | Weekly | Bug fixes, security patches |
| Minor (4.x) | Monthly | New features, non-breaking changes |
| Major (x.0) | Quarterly | Breaking changes, major features |
| LTS | Annually | Long-term support branch with security-only updates |

---

## 8. Release Calendar

### 2026

| Quarter | Version | Theme | Key Deliverables |
|---------|---------|-------|------------------|
| Q1 | 4.0 | MVP Launch | All 15 pages, 8 agents, 10 tools, full engine suite |
| Q2 | 4.1 | Stabilization | Bug fixes, UX polish, real QB/Xero OAuth, test foundation |
| Q3 | 4.2 | Intelligence | RAG-enhanced agents, semantic search prototype, email notifications |
| Q4 | 5.0 | Scale | PostgreSQL migration, pgvector, LangGraph, WebSocket, collaboration |

### 2027

| Quarter | Version | Theme | Key Deliverables |
|---------|---------|-------|------------------|
| Q1 | 5.1 | Mobile | React Native app (MVP), push notifications, biometric auth |
| Q2 | 6.0 | Platform | Multi-tenant SaaS, on-premise deployment, marketplace |
| Q3 | 6.1 | Voice | Voice agents, meeting transcription, phone integration |
| Q4 | 6.2 | Ecosystem | Plugin marketplace, custom agent builder, Zapier |

### Success Metrics by Release

| Metric | v4.0 (Current) | v4.1 Target | v5.0 Target | v6.0 Target |
|--------|----------------|-------------|-------------|-------------|
| MAU | 100 | 500 | 2,000 | 10,000 |
| Organizations | 50 | 200 | 1,000 | 5,000 |
| Test Coverage | 0% | 40% | 70% | 85% |
| API Response (p95) | 800ms | 500ms | 300ms | 200ms |
| Uptime | 95% | 99% | 99.5% | 99.9% |
| QB/Xero Connections | 0 | 50 | 300 | 1,000 |
| Agent Tasks/Day | 100 | 500 | 5,000 | 50,000 |

---

## Appendix: Feature Request Priority Matrix

```
                    High Impact
                        │
         P1             │              P0
    ┌───────────────────┼───────────────────┐
    │ • Email notifs    │ • Real QB/Xero    │
    │ • File uploads    │ • Test coverage   │
    │ • Custom agents   │ • PostgreSQL      │
    │ • Search          │ • CSP headers     │
    │ • Collaboration   │ • CI/CD pipeline  │
Low └───────────────────┼───────────────────┘ Effort
Effort                  │                   High
         P2             │              P3
    ┌───────────────────┼───────────────────┐
    │ • i18n            │ • Voice agents    │
    │ • Undo/redo       │ • Mobile app      │
    │ • Shortcuts       │ • Multi-tenant    │
    │ • Dark mode fixes │ • Marketplace     │
    │                   │ • On-premise      │
    └───────────────────┼───────────────────┘
                        │
                    Low Impact
```

---

*This roadmap is a living document. Priorities may shift based on user feedback, market conditions, and technical constraints. Last reviewed: March 2026.*
