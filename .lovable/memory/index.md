# Memory: index.md
Updated: now

# Project Memory

## Core
- **Design:** Dark theme strict tokens (Bg #111111, Cards #1a1a1a, Accent #e85d00). Avoid generic UI.
- **Security:** Zero frontend secrets. Use Supabase edge functions and server-side env vars only.
- **Edge Logs:** Use `createLogger` from `_shared/logger.ts` (auto-redact tokens/secrets/emails). Never `console.log` raw API payloads.
- **Storage Buckets:** Public buckets must restrict listing — `product-images` por dono, `banners` só admin. URLs públicas continuam funcionando.
- **Data Isolation:** All operations must be filtered by `store_id` (anti-IDOR) for multi-store support.
- **Shopee Constraint:** Integration is strictly Read-Only. Never attempt to mutate Shopee listings or inventory.
- **Shopee Price Protection:** `products.shopee_sale_price` é snapshot do preço Shopee. Sync NUNCA sobrescreve `sale_price` se já tiver valor (>0).
- **Access Control:** App locked to active subscriptions via standalone `/paywall`. New users start as free/0 stores.
- **Unit Economics:** Calculate real margin strictly as (Sale Price - Product Costs - Marketplace Costs). Decouple Ads GMV.
- **API Resilience:** Edge functions must validate env vars explicitly. Handle Shopee API rate limits with fallback cascades.
- **Data Cleanup:** Disconnecting any integration triggers immediate deletion of related persisted data.

## Memories
- [Storage Bucket Policies](mem://security/storage-bucket-policies) — Listing restrito em product-images e banners
- [Edge Function Logging](mem://security/edge-function-logging) — Logger compartilhado com redaction
- [Admin Privileges](mem://auth/admin-privileges) — RPC has_role('admin') and user_roles RLS constraints
- [Financial Metrics](mem://logic/financial-health-metrics) — Gross profit formulas, emoji labels, and ROAS thresholds
- [Marketplace Fees](mem://logic/marketplace-fee-architecture) — Fee logic for TikTok, Shein, Amazon, and ML
- [Ads Analysis](mem://logic/ads-analysis-constraints) — Halo effect >10%, learning phase <7 days, profit consumption alerts
- [Ads Data Integrity](mem://logic/ads-data-integrity) — CSV/API merge strategy preserves enrichments during sync
- [Subscription Access](mem://auth/subscription-access-policy) — Active status enforcement and manual email overrides
- [Marketplace Calculators](mem://features/marketplace-calculator-suite) — Shopee fixed fees and unified tax logic
- [Multi-Channel Margins](mem://logic/multi-channel-margin-calculation) — Activation defaults for external channels
- [Pricing Plans](mem://business/pricing-plans) — Skalify plan limits (Essencial 2 stores, Pro 7 stores)
- [Unit Economics](mem://logic/unit-economics-integrity) — Decoupling ads cost from product profitability
- [Design Tokens](mem://tech/style/design-tokens) — Typography scales and exact hex codes for UI elements
- [Shopee Access](mem://auth/shopee-access-policy) — Integration available to all active subscribers without admin roles
- [Subscription Reconciliation](mem://auth/subscription-reconciliation-logic) — Server-side email matching for null user_id
- [Ads Data Management](mem://features/ads-data-management) — File auto-detection and asynchronous UPSERT logic
- [Shopee Production Access](mem://constraints/shopee-production-access) — Seller App (In House) vs Ads App (Ads Service) constraints
- [Shopee Metric Mapping](mem://logic/shopee-ads-metric-mapping) — Broad vs direct metrics and HMAC validation details
- [Ads Discovery Insights](mem://features/shopee-ads-discovery-insights) — Keyword volume, heatmaps, and avg position
- [Ads Auto Linking](mem://features/shopee-ads-auto-linking-logic) — API campaigns auto-linked via shopee_item_id
- [Design Philosophy](mem://design/skalify-design-philosophy) — Cohesive brand styling over generic UI components
- [Defense in Depth](mem://security/defense-in-depth) — Execution locks, unique indexes, and rate limiting rules
- [CSV Processing](mem://security/csv-processing) — 5MB/502 lines limit, XSS sanitization, and newline handling
- [Payment Webhooks](mem://security/payment-webhooks) — Cakto validation logic, CORS policies, and constant-time checks
- [Credential Isolation](mem://security/credential-isolation) — Policy ensuring secrets never leak to the frontend
- [Ads API Strategy](mem://integration/shopee/ads-api-strategy) — 28-day windows, 30-day chunks, and GET-list fallbacks
- [Ads Sync Logic](mem://integration/shopee/ads-sync-logic) — Data enrichment and broad metric prioritization
- [Orders Sync Logic](mem://integration/shopee/orders-sync-logic) — 15-day windows and update_time fallbacks
- [Tokens Management](mem://integration/shopee/tokens-management) — Silent refresh and needs_reauth flags handling
- [Ads Error Feedback](mem://ux/ads/error-feedback) — Diagnostic metadata for precise user alerts
- [Shopee Date Filtering](mem://logic/shopee-ads-date-filtering) — Excluding 'Today' and recalculating dynamic arrays
- [Integrations Center](mem://features/integrations-management-center) — Seller vs Ads terminology and Shop Mismatch alerts
- [Multi-App Architecture](mem://integration/shopee/multi-app-architecture) — Dual onboarding flows for Seller and Ads APIs
- [Shopee Sync Integrity](mem://logic/shopee-sync-integrity) — Zero-revenue upsert prevention and auth abortion
- [Data Cleanup Policy](mem://security/data-cleanup-policy) — Auto-deletion of Shopee records on account unlink
- [Adaptive Dashboard](mem://features/performance-adaptive-dashboard-logic) — Dynamic KPIs based on API vs Excel data presence
- [Product Deep Dive](mem://features/performance-product-deep-dive) — Merged organic vs ads performance view
- [Seller API Visibility](mem://features/shopee-seller-api-visibility-flag) — Feature flag controlling Seller API availability
- [Revenue Limitations](mem://logic/performance-revenue-limitations) — Net revenue missing due to Finance API constraints
- [Ignored Security Findings](mem://security/ignored-findings-rationale) — Deliberate architectural choices for tokens/logs
- [API & CSV Interoperability](mem://logic/ads-api-csv-interoperability) — Removing api-campaign locks for local imports
- [Shopee Report Types](mem://knowledge/shopee-report-types) — Product Performance vs Parent SKU Detail usage
- [API Source Limitations](mem://logic/performance/api-data-source-limitations) — Ads API cannot supply inventory/orders data
- [Store Isolation](mem://architecture/shopee-store-isolation) — Separating tokens and queries by store_id
- [Cakto Logic](mem://integration/payment/cakto-logic) — Checkout URL generation and environment variables
- [Ads Attribution Analysis](mem://logic/ads-attribution-analysis) — Direct vs Broad GMV efficiency classifications
- [Catalog Fallback](mem://features/shopee-ads-catalog-fallback) — Synthesizing products from Ads API data
- [Edge Function Resilience](mem://security/edge-function-resilience) — Strict env var validation in runtime
- [Integration Mode](mem://constraints/shopee-integration-mode) — Strict Read-Only rule for Shopee interactions
- [Budget Optimization](mem://logic/ads-budget-optimization) — Budget suggestions based on ROAS thresholds
- [PWA Onboarding](mem://features/pwa-install-onboarding) — OS-specific PWA installation instructions
- [Data Architecture](mem://logic/performance/data-architecture-config) — Parent SKU (Total) - Ads API = Pure Organic
- [Funnel Diagnostics](mem://logic/performance/funnel-insights-diagnostics) — CTR, Conversion, and Bounce rate thresholds
- [Database Triggers](mem://security/database-integrity-triggers) — Server-side enforcement of pricing plan limits
- [Access Control](mem://security/access-control-policies) — Service_role usage and route protection
- [Ads Scoring](mem://logic/ads-scoring-diagnostics) — 0-100 efficiency score and auto-bidding strategies
- [Validation Rules](mem://auth/validation-rules) — Password limits and 100-char max for display names
- [IA Analysis Fallback](mem://logic/ads/ia-analysis-fallback) — Synthetic financial calculation for unlinked ads
- [Ads Status Terminology](mem://ux/ads-status-terminology) — Folga vs Empate ROAS calculation formula
- [Onboarding Paywall](mem://auth/onboarding-paywall-policy) — Immediate paywall lock with no automatic free trial
