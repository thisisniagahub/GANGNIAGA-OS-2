# Integrations

Complete reference for all external service integrations in **GangNiaga AI OS**.

---

## Table of Contents

1. [QuickBooks Online](#quickbooks-online)
2. [Xero](#xero)
3. [Stripe](#stripe)
4. [Google Analytics](#google-analytics)
5. [Slack](#slack)
6. [Discord](#discord)
7. [GitHub](#github)
8. [HubSpot](#hubspot)
9. [Salesforce](#salesforce)
10. [z-ai-web-dev-sdk](#z-ai-web-dev-sdk)

---

## QuickBooks Online

### Overview

QuickBooks Online (QBO) is the primary accounting data source for GangNiaga AI OS. The integration enables automatic synchronization of financial transactions, chart of accounts, invoices, bills, and budget data. Synchronized data powers the **Plan vs Actuals** engine, financial intelligence agents, and dashboard KPI widgets.

### Authentication

| Property       | Value                                      |
|----------------|--------------------------------------------|
| Protocol       | OAuth 2.0 with PKCE                        |
| Authorization URL | `https://appcenter.intuit.com/connect/oauth2` |
| Token URL      | `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` |
| Scopes          | `com.intuit.quickbooks.accounting`, `com.intuit.quickbooks.payment` |
| Token Storage  | Encrypted at rest (AES-256-GCM)           |
| Refresh Policy | Auto-refresh 30 days before expiry        |

**Connection Flow:**

1. User initiates connection from **Settings → Integrations → QuickBooks Online**.
2. GangNiaga AI OS redirects to Intuit authorization URL with PKCE challenge.
3. User authorizes and is redirected back with an authorization code.
4. Backend exchanges code for access and refresh tokens.
5. Tokens are encrypted and stored; a background sync job is scheduled.

### Data Flow

```
QuickBooks Online API
        │
        ▼
   Sync Scheduler (cron: every 15 min)
        │
        ▼
   Data Normalization Layer
        │
        ├──► Chart of Accounts → Internal accounts table
        ├──► Invoices / Bills  → Revenue & expense records
        ├──► Budgets           → Plan targets for Plan vs Actuals
        └──► P&L / Balance Sheet → Financial intelligence engine
```

- **Incremental sync** uses the QBO `LastUpdatedTime` filter to pull only changed records.
- **Full sync** runs daily at 02:00 UTC to reconcile any missed incremental updates.
- All monetary values are normalized to the company's base currency using QBO exchange rates.

### Configuration

| Setting                | Default         | Description                                          |
|------------------------|-----------------|------------------------------------------------------|
| `QBO_SYNC_INTERVAL`   | `15m`           | Incremental sync frequency                           |
| `QBO_FULL_SYNC_TIME`  | `02:00 UTC`     | Daily full reconciliation time                       |
| `QBO_WEBHOOK_ENABLED` | `true`          | Enable real-time webhook notifications               |
| `QBO_WEBHOOK_SECRET`  | —               | HMAC-SHA256 verification secret for webhooks         |
| `QBO_COMPANY_ID`      | —               | Target QuickBooks realm ID                           |
| `QBO_SANDBOX_MODE`    | `false`         | Use Intuit sandbox environment for testing           |

### API Reference

| Endpoint                                  | Method | Description                        |
|-------------------------------------------|--------|------------------------------------|
| `/api/integrations/qbo/connect`           | POST   | Initiate OAuth connection          |
| `/api/integrations/qbo/callback`          | GET    | OAuth callback handler             |
| `/api/integrations/qbo/disconnect`        | POST   | Revoke tokens and stop sync        |
| `/api/integrations/qbo/sync`              | POST   | Trigger manual sync                |
| `/api/integrations/qbo/sync-status`       | GET    | Current sync state and last sync   |
| `/api/integrations/qbo/accounts`          | GET    | List synced chart of accounts      |
| `/api/integrations/qbo/plan-vs-actuals`   | GET    | Variance report with QBO data      |

### Limitations

- QBO API rate limit: 500 requests per minute per realm. GangNiaga AI OS implements request queuing and exponential backoff.
- Historical data sync is limited to the past 24 months on QBO Plus; 40 months on QBO Advanced.
- Multi-currency support requires the QBO Multi-Currency feature to be enabled in the company settings.
- Webhook delivery is not guaranteed to be ordered; the sync reconciliation step handles out-of-order events.
- Sandbox environment data is ephemeral and resets periodically; do not rely on it for persistent testing.

---

## Xero

### Overview

Xero serves as an alternative accounting platform integration alongside QuickBooks Online. It provides the same core capabilities — transaction sync, chart of accounts, invoices, and budget data — with full support for the **Plan vs Actuals** engine. Users may connect either QBO or Xero (or both) depending on their accounting stack.

### Authentication

| Property       | Value                                          |
|----------------|-------------------------------------------------|
| Protocol       | OAuth 2.0 with PKCE                             |
| Authorization URL | `https://login.xero.com/identity/connect/authorize` |
| Token URL      | `https://identity.xero.com/connect/token`       |
| Scopes          | `accounting.transactions`, `accounting.settings`, `accounting.reports.read`, `offline_access` |
| Token Storage  | Encrypted at rest (AES-256-GCM)                 |
| Refresh Policy | Auto-refresh 25 days before expiry              |

**Connection Flow:**

1. User selects Xero from **Settings → Integrations**.
2. Redirect to Xero authorization with PKCE challenge and requested scopes.
3. User selects the Xero organization and authorizes access.
4. Backend exchanges code, stores encrypted tokens, and links the Xero tenant to the user's workspace.
5. Initial full sync is triggered immediately upon connection.

### Data Flow

```
Xero API
    │
    ▼
Sync Scheduler (cron: every 15 min)
    │
    ▼
Data Normalization Layer (shared with QBO)
    │
    ├──► Accounts        → Internal accounts table
    ├──► Invoices        → Revenue records
    ├──► Bank Transactions → Cash flow data
    ├──► Budgets / Tracking → Plan targets
    └──► Reports (P&L, BS)  → Financial intelligence engine
```

- The normalization layer maps Xero data to the same internal schema used by QBO, ensuring feature parity regardless of the connected platform.
- Xero webhooks deliver event-driven updates with HMAC-SHA256 signature verification.

### Configuration

| Setting                 | Default         | Description                                        |
|-------------------------|-----------------|----------------------------------------------------|
| `XERO_SYNC_INTERVAL`   | `15m`           | Incremental sync frequency                         |
| `XERO_FULL_SYNC_TIME`  | `03:00 UTC`     | Daily full reconciliation time                     |
| `XERO_WEBHOOK_ENABLED` | `true`          | Enable webhook event processing                    |
| `XERO_WEBHOOK_KEY`     | —               | Webhook signing key from Xero developer portal     |
| `XERO_TENANT_ID`       | —               | Target Xero organization tenant ID                 |
| `XERO_SANDBOX_MODE`    | `false`         | Use Xero sandbox for development                   |

### API Reference

| Endpoint                                  | Method | Description                        |
|-------------------------------------------|--------|------------------------------------|
| `/api/integrations/xero/connect`          | POST   | Initiate OAuth connection          |
| `/api/integrations/xero/callback`         | GET    | OAuth callback handler             |
| `/api/integrations/xero/disconnect`       | POST   | Revoke tokens and stop sync        |
| `/api/integrations/xero/sync`             | POST   | Trigger manual sync                |
| `/api/integrations/xero/sync-status`      | GET    | Current sync state and last sync   |
| `/api/integrations/xero/tenants`          | GET    | List connected Xero organizations  |
| `/api/integrations/xero/plan-vs-actuals`  | GET    | Variance report with Xero data     |

### Limitations

- Xero API rate limit: 60 requests per minute per tenant, 5,000 per day. Batch endpoints are used where available to conserve quota.
- Xero does not expose budget data via the standard API for all plan tiers; some organizations may require manual budget entry.
- Webhook events are batched and may have up to a 5-minute delivery delay.
- Multi-currency handling requires Xero's Multi-Currency add-on to be active.
- The Xero sandbox does not support all report endpoints; integration tests must account for partial coverage.

---

## Stripe

### Overview

Stripe provides payment processing and subscription management for GangNiaga AI OS customers. The integration handles checkout sessions, subscription lifecycle events, invoice generation, and payment method management. Revenue data from Stripe is also fed into financial dashboards and the Plan vs Actuals engine.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | Stripe API with secret key + webhook signing        |
| Key Type       | Restricted API key (permissible scopes: `charges`, `customers`, `invoices`, `subscriptions`) |
| Webhook Signing| Stripe-Signature header with timestamp tolerance of 300s |
| Key Storage    | Encrypted at rest (AES-256-GCM)                    |
| Mode           | Test mode / Live mode toggle                       |

### Data Flow

```
Stripe API
    │
    ├──► Webhook Events (async)
    │       │
    │       ├── checkout.session.completed → Activate subscription
    │       ├── customer.subscription.updated → Update plan tier
    │       ├── customer.subscription.deleted → Downgrade / cancel
    │       ├── invoice.payment_succeeded → Record revenue
    │       └── invoice.payment_failed → Alert + retry logic
    │
    └──► Polling (cron: every 30 min)
            │
            └── Revenue sync → Financial dashboards
```

- Webhook events are the primary data flow; polling serves as a reconciliation fallback.
- All webhook events are idempotently processed using the Stripe event ID.

### Configuration

| Setting                     | Default    | Description                                        |
|-----------------------------|------------|----------------------------------------------------|
| `STRIPE_WEBHOOK_SECRET`    | —          | Endpoint signing secret from Stripe dashboard      |
| `STRIPE_PRICE_PRO`         | —          | Price ID for Pro plan                              |
| `STRIPE_PRICE_TEAM`        | —          | Price ID for Team plan                             |
| `STRIPE_PRICE_ENTERPRISE`  | —          | Price ID for Enterprise plan                       |
| `STRIPE_REVENUE_SYNC`      | `30m`      | Revenue data sync interval                         |
| `STRIPE_TOLERANCE_SECONDS` | `300`      | Webhook timestamp tolerance                        |

### API Reference

| Endpoint                                     | Method | Description                           |
|----------------------------------------------|--------|---------------------------------------|
| `/api/integrations/stripe/checkout`          | POST   | Create a Stripe Checkout session      |
| `/api/integrations/stripe/portal`            | POST   | Generate customer portal URL          |
| `/api/integrations/stripe/webhook`           | POST   | Webhook event receiver                |
| `/api/integrations/stripe/subscription`      | GET    | Current user subscription status      |
| `/api/integrations/stripe/invoices`          | GET    | List invoices for the customer        |
| `/api/integrations/stripe/revenue-summary`   | GET    | Aggregated revenue for dashboards     |

### Limitations

- Stripe webhook delivery is at-least-once; duplicate events are deduplicated by event ID.
- Test mode keys cannot process real payments; ensure mode is set correctly before going live.
- Revenue sync does not include refunds by default; a separate reconciliation job runs daily.
- Subscription downgrades take effect at the end of the current billing period.
- Enterprise plan pricing is handled through custom Stripe Checkout sessions with negotiated amounts.

---

## Google Analytics

### Overview

Google Analytics (GA4) integration provides web analytics data to GangNiaga AI OS. Traffic metrics, user behavior, conversion events, and audience data are synced to power KPI tracking widgets, marketing agent insights, and the LivePlan Idea Canvas market validation features.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | OAuth 2.0                                           |
| Authorization URL | `https://accounts.google.com/o/oauth2/v2/auth`  |
| Token URL      | `https://oauth2.googleapis.com/token`               |
| Scopes          | `https://www.googleapis.com/auth/analytics.readonly` |
| Token Storage  | Encrypted at rest (AES-256-GCM)                     |
| Refresh Policy | Auto-refresh 7 days before expiry                   |

### Data Flow

```
Google Analytics Data API (GA4)
        │
        ▼
   Sync Scheduler (cron: every 1 hour)
        │
        ├──► Traffic Metrics → Dashboard KPI widgets
        ├──► Conversion Events → Marketing agent insights
        ├──► Audience Segments → Customer segmentation reports
        └──► Real-time Data → Live dashboard (polling: every 5 min)
```

### Configuration

| Setting                       | Default      | Description                                       |
|-------------------------------|--------------|---------------------------------------------------|
| `GA_PROPERTY_ID`             | —            | GA4 property ID                                   |
| `GA_SYNC_INTERVAL`           | `1h`         | Metrics sync frequency                            |
| `GA_REALTIME_INTERVAL`       | `5m`         | Real-time data polling frequency                  |
| `GA_LOOKBACK_DAYS`           | `30`         | Default lookback window for reports               |
| `GA_INCLUDE_DEMO`            | `false`      | Include demo/test traffic in metrics              |

### API Reference

| Endpoint                                   | Method | Description                            |
|--------------------------------------------|--------|----------------------------------------|
| `/api/integrations/ga/connect`             | POST   | Initiate OAuth connection              |
| `/api/integrations/ga/callback`            | GET    | OAuth callback handler                 |
| `/api/integrations/ga/disconnect`          | POST   | Revoke access and stop sync            |
| `/api/integrations/ga/traffic`             | GET    | Traffic metrics for date range         |
| `/api/integrations/ga/conversions`         | GET    | Conversion event data                  |
| `/api/integrations/ga/realtime`            | GET    | Current real-time visitor count        |
| `/api/integrations/ga/audiences`           | GET    | Audience segment breakdown             |

### Limitations

- GA4 Data API has a quota of 10 concurrent requests per project; requests are queued.
- Real-time data API returns sampled data for properties exceeding 200,000 sessions/day.
- Historical data availability depends on the GA4 property retention setting (default: 2 months, max: 14 months).
- OAuth tokens may require re-authorization if the Google Cloud project is in testing mode and user access expires.
- Custom dimensions and metrics must be pre-registered in GA4 before they can be queried.

---

## Slack

### Overview

Slack integration delivers real-time notifications, alerts, and workflow triggers from GangNiaga AI OS directly into Slack channels and DMs. Agents can post updates, financial alerts can trigger channel messages, and users can invoke commands from Slack using slash commands.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | OAuth 2.0                                           |
| Authorization URL | `https://slack.com/oauth/v2/authorize`          |
| Token URL      | `https://slack.com/api/oauth.v2.access`             |
| Scopes          | `chat:write`, `channels:read`, `incoming-webhook`, `commands` |
| Token Storage  | Encrypted at rest (AES-256-GCM)                     |
| Token Type     | Bot token (`xoxb-`) + Workspace token               |

### Data Flow

```
GangNiaga AI OS
        │
        ├──► Outbound Notifications (via chat.postMessage)
        │       ├── Financial alerts → #finance-alerts channel
        │       ├── Plan review completions → #plans channel
        │       └── Agent task failures → #ops-alerts channel
        │
        ├──► Slash Commands (incoming from Slack)
        │       └── /gangniaga <command> → Command Palette bridge
        │
        └──► Workflow Triggers
                └── Event subscriptions → Agent orchestration triggers
```

### Configuration

| Setting                      | Default           | Description                                      |
|------------------------------|-------------------|--------------------------------------------------|
| `SLACK_BOT_TOKEN`           | —                 | Bot OAuth token (`xoxb-`)                        |
| `SLACK_SIGNING_SECRET`      | —                 | Request verification signing secret              |
| `SLACK_DEFAULT_CHANNEL`     | `#gangniaga`      | Default channel for general notifications        |
| `SLACK_FINANCE_CHANNEL`     | `#finance-alerts` | Channel for financial alert messages             |
| `SLACK_ENABLE_COMMANDS`     | `true`            | Enable `/gangniaga` slash command                |
| `SLACK_NOTIFICATION_LEVEL`  | `important`       | `all`, `important`, or `critical` filtering      |

### API Reference

| Endpoint                                     | Method | Description                           |
|----------------------------------------------|--------|---------------------------------------|
| `/api/integrations/slack/connect`            | POST   | Initiate OAuth connection             |
| `/api/integrations/slack/callback`           | GET    | OAuth callback handler                |
| `/api/integrations/slack/events`             | POST   | Slack event subscription receiver     |
| `/api/integrations/slack/command`            | POST   | Slash command handler                 |
| `/api/integrations/slack/test`               | POST   | Send test message to default channel  |
| `/api/integrations/slack/channels`           | GET    | List available Slack channels         |

### Limitations

- Slack rate limit: 1 message per second per channel; bursts up to 5 messages are allowed briefly.
- Slash command responses must be sent within 3 seconds; longer operations use delayed responses.
- Bot tokens cannot post to private channels unless the bot is explicitly invited.
- File uploads via Slack are limited to 1 GB per file; larger exports use download links.
- Slack event subscriptions require a publicly accessible HTTPS endpoint with a valid SSL certificate.

---

## Discord

### Overview

Discord integration provides community notifications and team collaboration features. GangNiaga AI OS can post updates to Discord channels via webhooks, making it ideal for team-oriented alerts, community announcements, and shared operational visibility.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | Discord Webhook URL                                 |
| Auth Mechanism | Webhook token (embedded in URL)                     |
| URL Format     | `https://discord.com/api/webhooks/{id}/{token}`     |
| Security       | Webhook URLs are treated as secrets; stored encrypted |

### Data Flow

```
GangNiaga AI OS
        │
        ▼
   Webhook Dispatcher
        │
        ├──► Agent completion notifications → #ai-updates channel
        ├──► System health alerts → #ops channel
        ├──► Community announcements → #announcements channel
        └──► Weekly summary reports → #reports channel
```

- Discord uses a simple webhook model — no OAuth flow is required for server-to-server messaging.
- Messages support Discord markdown, embeds, and file attachments.

### Configuration

| Setting                      | Default             | Description                                    |
|------------------------------|---------------------|------------------------------------------------|
| `DISCORD_WEBHOOK_URL`       | —                   | Primary webhook URL                            |
| `DISCORD_OPS_WEBHOOK`       | —                   | Ops alert webhook URL                          |
| `DISCORD_REPORTS_WEBHOOK`   | —                   | Reports channel webhook URL                    |
| `DISCORD_ENABLED`           | `true`              | Enable/disable Discord notifications           |
| `DISCORD_NOTIFICATION_LEVEL`| `important`         | `all`, `important`, or `critical` filtering    |
| `DISCORD_MENTION_ROLE`      | —                   | Role ID to ping on critical alerts             |

### API Reference

| Endpoint                                     | Method | Description                            |
|----------------------------------------------|--------|----------------------------------------|
| `/api/integrations/discord/configure`        | POST   | Set or update webhook URLs             |
| `/api/integrations/discord/test`             | POST   | Send test message to configured webhook|
| `/api/integrations/discord/status`           | GET    | Check webhook configuration status     |

### Limitations

- Discord webhook rate limit: 30 requests per minute per webhook.
- Message body limit: 2,000 characters; longer content is split or attached as a file.
- Embed limits: up to 10 embeds per message, 25 fields per embed, 6,000 total characters across embeds.
- Webhook URLs are not scoped — anyone with the URL can post. Rotate URLs if compromised.
- Discord does not provide delivery confirmations; failed deliveries are logged locally.

---

## GitHub

### Overview

GitHub integration enables code management and CI/CD connectivity for teams using GangNiaga AI OS alongside their development workflow. Repository events trigger workflow automations, and agents can reference code context when generating technical business plans or product roadmaps.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | OAuth 2.0 (user-to-server) + GitHub App (server-to-server) |
| Authorization URL | `https://github.com/login/oauth/authorize`      |
| Token URL      | `https://github.com/login/oauth/access_token`       |
| Scopes (OAuth) | `repo`, `read:org`, `workflow`                      |
| App Type       | GitHub App with private key (RS256 JWT)             |
| Token Storage  | Encrypted at rest (AES-256-GCM)                     |

### Data Flow

```
GitHub API
    │
    ├──► Webhook Events (incoming)
    │       ├── push → Trigger workflow automation
    │       ├── pull_request → Notify product agent
    │       └── deployment_status → Update ops dashboard
    │
    └──► API Polling (cron: every 30 min)
            ├── Repository metrics → Product roadmap insights
            ├── CI/CD status → Operations dashboard
            └── Commit activity → Development velocity tracking
```

### Configuration

| Setting                      | Default        | Description                                       |
|------------------------------|----------------|---------------------------------------------------|
| `GITHUB_APP_ID`             | —              | GitHub App identifier                             |
| `GITHUB_PRIVATE_KEY`        | —              | RSA private key for JWT authentication            |
| `GITHUB_WEBHOOK_SECRET`     | —              | HMAC-SHA256 webhook verification secret           |
| `GITHUB_ORG`                | —              | Default organization for repo queries             |
| `GITHUB_SYNC_INTERVAL`      | `30m`          | Repository metrics sync frequency                 |
| `GITHUB_CI_TRACKING`        | `true`         | Enable CI/CD pipeline status tracking             |

### API Reference

| Endpoint                                     | Method | Description                           |
|----------------------------------------------|--------|---------------------------------------|
| `/api/integrations/github/connect`           | POST   | Initiate OAuth / App installation     |
| `/api/integrations/github/callback`          | GET    | OAuth callback handler                |
| `/api/integrations/github/webhook`           | POST   | Webhook event receiver                |
| `/api/integrations/github/repositories`      | GET    | List connected repositories           |
| `/api/integrations/github/metrics`           | GET    | Repository activity metrics           |
| `/api/integrations/github/deployments`       | GET    | Recent deployment status              |

### Limitations

- GitHub API rate limit: 5,000 requests per hour (authenticated); 15,000 for GitHub Apps.
- Webhook delivery retries up to 3 times with exponential backoff; events older than 24 hours may be dropped.
- OAuth tokens for GitHub do not expire; GitHub App installation tokens expire after 1 hour and require JWT-based refresh.
- Repository access is scoped to the permissions granted during App installation; private repos require explicit approval.
- CI/CD status is read-only; GangNiaga AI OS cannot trigger or cancel GitHub Actions directly.

---

## HubSpot

### Overview

HubSpot CRM integration syncs contact, deal, and company data between HubSpot and GangNiaga AI OS. The sales and marketing agents leverage this data for pipeline analysis, lead scoring, and campaign performance tracking. Two-way sync ensures changes in either system are reflected in both.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | OAuth 2.0                                           |
| Authorization URL | `https://app.hubspot.com/oauth/authorize`       |
| Token URL      | `https://api.hubapi.com/oauth/v1/token`             |
| Scopes          | `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.companies.read` |
| Token Storage  | Encrypted at rest (AES-256-GCM)                     |
| Refresh Policy | Auto-refresh 7 days before expiry                   |

### Data Flow

```
HubSpot API
    │
    ├──► Inbound Sync (cron: every 30 min)
    │       ├── Contacts → Internal contacts table
    │       ├── Deals → Sales pipeline data
    │       ├── Companies → Account enrichment
    │       └── Engagement → Activity timeline
    │
    └──► Outbound Sync (event-driven)
            └── AI-generated insights → HubSpot notes / tasks
```

- Two-way sync uses a last-modified timestamp conflict resolution strategy.
- Contact and deal property mappings are configurable in the integration settings.

### Configuration

| Setting                      | Default         | Description                                      |
|------------------------------|-----------------|--------------------------------------------------|
| `HUBSPOT_PORTAL_ID`        | —               | HubSpot account portal ID                        |
| `HUBSPOT_SYNC_INTERVAL`    | `30m`           | Sync frequency for contacts and deals            |
| `HUBSPOT_TWO_WAY_SYNC`     | `true`          | Enable write-back to HubSpot                     |
| `HUBSPOT_CONFLICT_STRATEGY`| `last_modified` | Conflict resolution: `last_modified` or `manual` |
| `HUBSPOT_PIPELINE_MAPPING` | —               | JSON map of HubSpot pipeline IDs to internal IDs |

### API Reference

| Endpoint                                     | Method | Description                           |
|----------------------------------------------|--------|---------------------------------------|
| `/api/integrations/hubspot/connect`          | POST   | Initiate OAuth connection             |
| `/api/integrations/hubspot/callback`         | GET    | OAuth callback handler                |
| `/api/integrations/hubspot/disconnect`       | POST   | Revoke tokens and stop sync           |
| `/api/integrations/hubspot/contacts`         | GET    | List synced contacts                  |
| `/api/integrations/hubspot/deals`            | GET    | List synced deals                     |
| `/api/integrations/hubspot/sync-status`      | GET    | Current sync state and metrics        |

### Limitations

- HubSpot API rate limit: 100 requests per 10 seconds per OAuth token; 200 for App-level tokens.
- Two-way sync may have a propagation delay of up to 30 minutes depending on the sync interval.
- Custom object types require the HubSpot Enterprise tier and must be explicitly mapped.
- Batch API endpoints support a maximum of 100 records per request; larger datasets are chunked automatically.
- Marketing email data is not included in the sync (requires additional HubSpot Marketing scope).

---

## Salesforce

### Overview

Salesforce integration provides enterprise CRM connectivity for organizations using Salesforce as their system of record. The integration supports contact, opportunity, account, and lead synchronization, enabling the sales and strategy agents to deliver pipeline forecasts, account intelligence, and revenue predictions directly from Salesforce data.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | OAuth 2.0 JWT Bearer Flow                           |
| Authorization URL | `https://login.salesforce.com/services/oauth2/authorize` |
| Token URL      | `https://login.salesforce.com/services/oauth2/token` |
| Scopes          | `api`, `refresh_token`, `offline_access`            |
| Token Storage  | Encrypted at rest (AES-256-GCM)                     |
| Certificate    | Self-signed X.509 certificate registered in Salesforce Connected App |

### Data Flow

```
Salesforce API (REST + Streaming)
        │
        ├──► Streaming API (PushTopic)
        │       ├── Opportunity updates → Real-time pipeline alerts
        │       └── Lead conversions → Sales agent notifications
        │
        ├──► REST API Polling (cron: every 30 min)
        │       ├── Accounts → Internal accounts table
        │       ├── Contacts → Contact enrichment
        │       ├── Opportunities → Sales pipeline & forecasting
        │       └── Leads → Lead scoring input
        │
        └──► Outbound (Bulk API 2.0)
                └── AI-generated insights → Salesforce custom objects
```

- The Streaming API connection uses the Bayeux protocol with long-polling; automatic reconnection is implemented with exponential backoff.
- Bulk API 2.0 is used for large outbound data operations exceeding 2,000 records.

### Configuration

| Setting                        | Default           | Description                                     |
|--------------------------------|-------------------|-------------------------------------------------|
| `SF_CLIENT_ID`                | —                 | Connected App consumer key                      |
| `SF_USERNAME`                 | —                 | Integration user username                       |
| `SF_INSTANCE_URL`             | —                 | Salesforce instance URL                         |
| `SF_SYNC_INTERVAL`            | `30m`             | REST API polling interval                       |
| `SF_STREAMING_ENABLED`        | `true`            | Enable PushTopic streaming                      |
| `SF_BULK_API_THRESHOLD`       | `2000`            | Record count threshold to switch to Bulk API    |
| `SF_SANDBOX`                  | `false`           | Use Salesforce sandbox instance                 |

### API Reference

| Endpoint                                        | Method | Description                            |
|-------------------------------------------------|--------|----------------------------------------|
| `/api/integrations/salesforce/connect`          | POST   | Initiate JWT OAuth flow                |
| `/api/integrations/salesforce/disconnect`       | POST   | Revoke tokens and stop sync            |
| `/api/integrations/salesforce/opportunities`    | GET    | List synced opportunities              |
| `/api/integrations/salesforce/accounts`         | GET    | List synced accounts                   |
| `/api/integrations/salesforce/leads`            | GET    | List synced leads                      |
| `/api/integrations/salesforce/pipeline`         | GET    | Aggregated pipeline metrics            |
| `/api/integrations/salesforce/sync-status`      | GET    | Current sync state and last sync       |

### Limitations

- Salesforce API rate limit varies by edition: 100,000 requests per day (Enterprise), 1,000,000 (Unlimited).
- Streaming API PushTopic events have a 24-hour retention window; missed events during downtime require REST reconciliation.
- Bulk API 2.0 jobs have a maximum batch size of 150 MB; larger datasets require job chunking.
- Custom fields and objects must be explicitly mapped in the integration configuration.
- The integration user requires the appropriate profile permissions (API Access, Read/Write on target objects).
- Salesforce sandboxes are refreshed periodically, which invalidates stored tokens; re-authorization is required after a refresh.

---

## z-ai-web-dev-sdk

### Overview

The **z-ai-web-dev-sdk** is the core AI integration layer powering all LLM and AI capabilities within GangNiaga AI OS. It provides unified access to 36+ language models across OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and custom endpoints. The SDK handles model routing, streaming responses, tool execution, memory management, and multi-agent orchestration.

### Authentication

| Property       | Value                                              |
|----------------|-----------------------------------------------------|
| Protocol       | API Key + Bearer Token                              |
| Base URL       | `https://api.z-ai.dev/v1`                           |
| Auth Header    | `Authorization: Bearer <Z_AI_API_KEY>`              |
| Key Storage    | Encrypted at rest (AES-256-GCM); injected via environment variable |
| Key Rotation   | Supported; key updates take effect without restart  |

### Data Flow

```
z-ai-web-dev-sdk
        │
        ├──► Chat Completions
        │       ├── Single-agent conversations
        │       ├── Multi-agent orchestration (8 agents)
        │       └── Streaming responses via SSE
        │
        ├──► Tool Execution
        │       ├── Calculator, web search, chart builder
        │       ├── Report generator, data export
        │       ├── Financial modeler, sentiment analyzer
        │       ├── Competitor monitor, compliance checker
        │       └── Task automator
        │
        ├──► Model Routing
        │       ├── Cost-optimized routing (cheapest capable model)
        │       ├── Latency-optimized routing (fastest response)
        │       └── Quality-optimized routing (highest capability)
        │
        └──► Memory Management
                ├── Short-term (conversation context window)
                ├── Long-term (persistent vector store)
                └── Episodic (session-scoped recall)
```

### Configuration

| Setting                       | Default            | Description                                       |
|-------------------------------|--------------------|---------------------------------------------------|
| `Z_AI_API_KEY`               | —                  | API key for z-ai-web-dev-sdk                      |
| `Z_AI_BASE_URL`              | `https://api.z-ai.dev/v1` | SDK base URL                               |
| `Z_AI_DEFAULT_MODEL`         | `gpt-4o`           | Default model for general tasks                   |
| `Z_AI_FINANCE_MODEL`         | `claude-3.5-sonnet`| Model for financial intelligence agent            |
| `Z_AI_STRATEGY_MODEL`        | `gpt-4.1`          | Model for strategy agent                          |
| `Z_AI_MAX_TOKENS`            | `4096`             | Default max tokens for completions                |
| `Z_AI_TEMPERATURE`           | `0.7`              | Default sampling temperature                      |
| `Z_AI_STREAMING`             | `true`             | Enable streaming responses                        |
| `Z_AI_ROUTING_STRATEGY`      | `quality`          | `cost`, `latency`, or `quality`                   |
| `Z_AI_MEMORY_ENABLED`        | `true`             | Enable persistent memory for agents               |
| `Z_AI_TOOL_AUTO_EXEC`        | `true`             | Allow automatic tool execution by agents          |
| `Z_AI_RETRY_ATTEMPTS`        | `3`                | Number of retry attempts on API failure           |
| `Z_AI_TIMEOUT_MS`            | `60000`            | Request timeout in milliseconds                   |

### API Reference

| Endpoint                                       | Method | Description                            |
|------------------------------------------------|--------|----------------------------------------|
| `/api/ai/chat`                                 | POST   | Send a chat completion request         |
| `/api/ai/chat/stream`                          | POST   | Stream a chat completion (SSE)         |
| `/api/ai/models`                               | GET    | List available models and capabilities |
| `/api/ai/agents`                               | GET    | List configured agents and statuses    |
| `/api/ai/agents/:id/invoke`                    | POST   | Invoke a specific agent                |
| `/api/ai/tools`                                | GET    | List available tools                   |
| `/api/ai/tools/:id/execute`                    | POST   | Execute a specific tool                |
| `/api/ai/memory/:agentId`                      | GET    | Retrieve agent memory context          |
| `/api/ai/memory/:agentId/clear`                | POST   | Clear agent memory                     |
| `/api/ai/routing/config`                       | GET    | Current model routing configuration   |

### Limitations

- Rate limits vary by model tier: Standard models — 60 RPM; Premium models (o3, Claude 4) — 10 RPM; Budget models — 120 RPM.
- Context window varies by model: GPT-4o (128K), Claude 3.5 (200K), Gemini 2.5 (1M). Agent memory management automatically truncates older context when approaching limits.
- Streaming responses may experience latency spikes during peak usage periods; the SDK implements adaptive buffering.
- Tool execution is synchronous and blocking per request; parallel tool calls within a single agent turn are queued.
- Vector store for long-term memory has a maximum of 100,000 embeddings per workspace; older embeddings are evicted using an LRU policy.
- Custom model endpoints must conform to the OpenAI Chat Completions API schema to be compatible with the SDK's model routing layer.

---

## General Notes

### Token Encryption

All OAuth tokens, API keys, and webhook secrets are encrypted at rest using AES-256-GCM with keys managed through the application's secret management layer. Tokens are decrypted only at runtime when needed for API calls and are never logged or exposed in error messages.

### Sync Architecture

All integrations follow a consistent sync pattern:

1. **Incremental sync** — scheduled at configurable intervals, pulls only changed records since the last sync.
2. **Full reconciliation** — runs daily during off-peak hours to catch any missed incremental updates.
3. **Webhook / streaming** — real-time event delivery where supported by the provider.
4. **Manual trigger** — available via API endpoint for on-demand synchronization.

### Error Handling

- Transient API errors (429, 500, 502, 503) are retried with exponential backoff (base: 1s, max: 60s, 3 attempts).
- Permanent errors (401, 403, 404) are logged and surfaced to the user with actionable guidance.
- Sync failures trigger alerts via the configured notification channels (Slack / Discord).
- All integration API calls are instrumented with OpenTelemetry traces for observability.

---

*Last updated: 2025-03-04 • GangNiaga AI OS v4.0.0*
