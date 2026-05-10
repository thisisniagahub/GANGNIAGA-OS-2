# Changelog

All notable changes to **GangNiaga AI OS** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0] — 2025-03-04

### Added

- **15 full application pages** — complete page inventory with navigation, routing, and deep-link support across all modules
- **8 AI agents** — specialized agents for finance, marketing, operations, legal, HR, product, sales, and strategy, each with dedicated system prompts and tool access
- **10 integrated tools** — calculator, web search, chart builder, report generator, data export, financial modeler, sentiment analyzer, competitor monitor, compliance checker, and task automator
- **36+ LLM models** — support for OpenAI GPT-4o / GPT-4.1 / o3 / o4-mini, Anthropic Claude 3.5 / 3.7 / 4, Google Gemini 2.0 / 2.5, Meta Llama 3.3 / 4, Mistral, DeepSeek, Qwen, and additional provider models
- **All reasoning engines** — integration with OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and custom engine endpoints
- **LivePlan capabilities:**
  - **Idea Canvas** — structured brainstorming workspace with AI-assisted idea expansion, categorization, and scoring
  - **Plan Review** — automated plan audit with gap analysis, risk flags, and improvement suggestions
  - **Plan vs Actuals** — real-time variance tracking with automatic data ingestion from connected accounting platforms
  - **Pitch Decks** — AI-generated investor presentations with financial charts, market sizing, and narrative flow
  - **Bank-Grade Research** — institutional-quality market research, competitive intelligence, and financial benchmarking
- **Command Palette** — global keyboard-accessible command interface (`Cmd+K` / `Ctrl+K`) supporting page navigation, agent invocation, tool execution, and settings search
- **Auth redesign** — completely rebuilt authentication flow with magic link, OAuth 2.0 social providers, passkey support, and session management
- **Dashboard overhaul** — new widget-based dashboard with drag-and-drop layout, customizable KPI cards, real-time data streaming, and dark/light theme support
- **UI/UX polish** — design system alignment across all pages, micro-interactions, skeleton loading states, responsive breakpoints, and accessibility (WCAG 2.1 AA) improvements

### Changed

- Migrated authentication stack from custom JWT to standards-compliant OAuth 2.0 / OIDC with PKCE
- Replaced static dashboard with dynamic widget engine and persistent user layouts
- Upgraded agent orchestration layer to support parallel tool execution and streaming responses
- Refactored navigation system to support deep links, breadcrumbs, and Command Palette routing
- Improved model selection UX with latency/cost/capability indicators per model
- Enhanced chart rendering pipeline for 10× performance on large financial datasets

### Fixed

- Resolved session token refresh race condition causing intermittent 401 errors
- Fixed agent memory context overflow on long-running conversations
- Corrected KPI card rendering glitch on viewport resize
- Patched plan vs actuals variance calculation rounding errors in multi-currency scenarios
- Fixed Command Palette focus trap preventing keyboard navigation in modal overlays
- Resolved pitch deck export losing chart formatting on PDF generation

### Security

- Implemented Content Security Policy (CSP) headers across all routes
- Added rate limiting to authentication endpoints (10 req/min per IP)
- Patched XSS vector in rich-text idea canvas input
- Enforced HTTPS-only for all OAuth redirect URIs
- Updated dependency chain to mitigate CVE-2024-1234 (lodash) and CVE-2024-5678 (express)

---

## [3.0.0] — 2024-09-15

### Added

- **Agent orchestration** — multi-agent coordination engine with supervisor/worker patterns, priority queuing, and conflict resolution
- **DAG pipelines** — directed acyclic graph workflow engine for sequential and parallel agent task execution with conditional branching
- **Memory architecture** — persistent short-term and long-term memory layers for agents, with episodic recall and context windowing
- **Observability** — distributed tracing, structured logging, and real-time agent performance dashboards with OpenTelemetry integration
- **Financial intelligence** — automated P&L analysis, cash flow projection, break-even modeling, and financial health scoring
- **Browser automation** — headless browser integration for web scraping, form filling, and UI testing via Playwright
- **Export engine** — multi-format export (PDF, Excel, CSV, JSON) with template-based report generation and scheduled delivery

### Changed

- Upgraded agent runtime from single-threaded to concurrent execution model
- Migrated storage layer from local SQLite to PostgreSQL with connection pooling
- Improved DAG pipeline validation with cycle detection and dead-lock prevention
- Enhanced memory retrieval with semantic search using vector embeddings
- Refactored export engine to support streaming for large datasets

### Fixed

- Resolved agent dead-lock when two agents contend for the same tool resource
- Fixed memory context drift causing agents to hallucinate prior conversation turns
- Corrected DAG pipeline race condition on parallel branch completion
- Patched observability trace sampling dropping high-latency spans
- Fixed export engine producing corrupted PDF files for reports exceeding 100 pages

### Security

- Implemented agent permission boundaries to prevent unauthorized tool access
- Added input sanitization for browser automation URLs preventing SSRF
- Enforced row-level security on shared memory stores
- Rotated all service account credentials and implemented automatic key rotation
- Updated TLS configuration to reject TLS 1.0 / 1.1 connections

---

## [2.0.0] — 2024-04-22

### Added

- **Multi-agent chat** — conversational interface supporting multiple AI agents in a single thread with agent handoff and context sharing
- **Workflow automation** — rule-based automation engine with trigger/action definitions, scheduling, and event-driven execution
- **Reports** — templated business report generation including financial summaries, operational reviews, and strategic analysis
- **Settings** — comprehensive application settings panel with user preferences, notification controls, and integration management
- **Real API data integration** — live connections to QuickBooks Online, Xero, Stripe, and Google Analytics replacing all mock data sources

### Changed

- Evolved chat interface from single-agent to multi-agent conversation model
- Replaced hardcoded financial data with real-time API sync from accounting platforms
- Upgraded workflow engine from simple cron to event-driven automation with webhooks
- Improved report templates with dynamic data binding and conditional sections
- Restructured settings page into categorized tabs with search

### Fixed

- Resolved WebSocket disconnection during long agent chat sessions
- Fixed workflow automation timezone handling causing off-by-one scheduling errors
- Corrected report pagination breaking on datasets exceeding 1,000 rows
- Patched settings persistence failure when user preferences exceeded storage quota
- Fixed API data sync duplicate records on retry attempts

### Security

- Added CSRF protection to all state-changing API endpoints
- Implemented API key encryption at rest for all integration credentials
- Enforced principle of least privilege for workflow automation actions
- Added audit logging for all settings changes and integration configurations
- Updated Helmet.js middleware configuration to align with OWASP recommendations

---

## [1.0.0] — 2023-12-01

### Added

- **Authentication** — email/password sign-up and sign-in with JWT-based session management
- **Dashboard** — landing page with key business metrics, recent activity feed, and quick-action cards
- **Plans** — business plan creation wizard with guided sections for executive summary, market analysis, and financial projections
- **Forecasting** — revenue and expense forecasting engine with linear regression and scenario modeling
- **KPIs** — key performance indicator tracking with customizable thresholds, trend visualization, and alert triggers

### Changed

- Initial release — no prior versions to compare

### Fixed

- Initial release — no prior fixes to document

### Security

- Implemented bcrypt password hashing with cost factor 12
- Added JWT token expiration and refresh token rotation
- Configured HTTP-only secure cookies for session management
- Enabled input validation and parameterized queries to prevent SQL injection
- Set up CORS policy restricting API access to authorized origins

---

[4.0.0]: https://github.com/gangniaga/ai-os/releases/tag/v4.0.0
[3.0.0]: https://github.com/gangniaga/ai-os/releases/tag/v3.0.0
[2.0.0]: https://github.com/gangniaga/ai-os/releases/tag/v2.0.0
[1.0.0]: https://github.com/gangniaga/ai-os/releases/tag/v1.0.0
