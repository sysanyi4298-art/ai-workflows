---
name: generate-seo-topic-pack
description: Build an auditable daily SEO opportunity funnel for AI Code With from the active topic queue, reusing local evidence before any external request and using Semrush only for final validation. Use for keyword discovery, topic selection, Benchmark research, approved Briefs/articles, or recurring SEO runs. Enforce query/cache deduplication, topic-pack and token budgets, market isolation, human approval, and no-fabrication rules.
metadata:
  version: "2.4"
---

# Generate AI Code With SEO Topic Pack v2.3

## Purpose

Produce up to 10 high-value page-level Search Intents per daily run. Quality takes priority over filling 10 slots, but the funnel must terminate within its declared search budget. The core funnel is:

`LOAD EXISTING DATA -> DISCOVER -> PRE-SCORE -> CHEAP VALIDATION -> SEMRUSH VALIDATION -> TOPIC SELECTION -> DEEP RESEARCH`

Semrush is a final paid validation signal, never the default discovery tool and never the only production gate.

## Required context

1. Read `references/product-operations-profile.md` for product and publication boundaries.
2. Read `references/v2-opportunity-funnel.md` before any keyword research or content production.
3. Read `references/v2-data-contracts.md` before reading/writing cache, query logs, candidate files, or the Research Ledger.
4. Read `references/seo-validation-and-output.md` before formal admission, review-table generation, or Writer work.
5. Read `references/v2.1-browser-sources-and-production.md` before deciding that a source is unavailable, running the article cannibalization gate, or producing provisional drafts.
6. Search the project for `AI-Code-With-产品运营岗位档案.md`; if present, read it and treat it as newer than the bundled profile. Never overwrite it.
7. Run the project `scripts/read_active_topics.py`. Process only the first `status = 进行中` row in its validated order. A seed is only a discovery entry point.
8. Before Brief or article work, read `knowledge/references/house_style.md` and the current product facts.
9. Before candidate validation, rebuild `data/seo/historical_article_index.csv` with `scripts/build_historical_article_index.py`; then run `scripts/topic_duplicate_check.py` against every candidate batch. A missing or stale historical index blocks formal selection and production.

Use the run date as the cutoff and record a rolling 90-day research window. Preserve source-specific collection dates and narrower windows such as Trends 7/30-day signals.

## Non-negotiable operating rules

- Evidence acquisition order is `authenticated browser live read > project CSV/XLSX export > today cache > historical cache > DATA_MISSING`. Query dedupe and freshness still apply at every tier.
- A missing CSV/XLSX export never proves Semrush, GSC, or Trends unavailable. Inspect the authenticated browser tier first and save extracted fields before reusing them.
- Never request a source when `source + normalized keyword/query + market + query_type` has fresh reusable evidence.
- The same `date + source + normalized keyword + market + query_type` may make at most one external request. Log cache hits too.
- Never feed raw large CSV, JSON, HTML, Semrush responses, or GSC exports to the model. Run local parsing, filtering, deduplication, aggregation, and scoring first.
- Do not reopen the same file or page after its extracted evidence is saved and fresh.
- Keep business audience, Semrush/Trends proxy markets, and localized SERP scope distinct. `HK|US|SG` are proxy-only defaults, not target markets or mainland-China volume.
- Do not invent demand, Volume, KD, CPC, Trends values, GSC values, ranks, product facts, or tests.
- Missing Semrush validation is `NO_DATA`, `KD_UNAVAILABLE`, `SEMRUSH_VALIDATION_INCOMPLETE`, or `WAITING_SEMRUSH`. It cannot receive a `FORMAL_SEO_SCORE`, but it may receive a traceable `CONTENT_OPPORTUNITY_SCORE` and enter provisional production when at least two independent reliable demand signals exist.
- Enforce `1 Search Intent = 1 Page`, one Primary Keyword, and 3-10 same-intent Secondary Keywords.
- A shared Primary Keyword or broad topic is not sufficient for rejection. Mark `TOPIC_ALREADY_COVERED` only when Primary Keyword/topic, Search Intent, problem to solve, and useful information are materially the same.
- Route qualifying opportunities as exactly one of `NEW_TOPIC`, `CLUSTER_TOPIC`, or `CONTENT_REFRESH`. A `CLUSTER_TOPIC` solves a distinct concrete problem inside a covered parent cluster and counts as new SEO production. A `CONTENT_REFRESH` improves an owned page because of a documented version, configuration, product, SERP, intent, staleness, quality, or solution change; it is counted separately from new topics.
- Use `REPLACE_WITH_NEXT_CANDIDATE` only after checking the fallback order `NEW_TOPIC -> CLUSTER_TOPIC -> CONTENT_REFRESH`. Do not continue searching after the run budget is exhausted.
- Never continue from review into Brief/article work unless `selection_status = 已确认`.

## Run identity and isolation gate

Before any formal content run, allocate a unique `RUN_ID` in `YYYYMMDD-NN` form. Never reuse a failed or contaminated run number. Create `文稿/seo_contect/<YYYY-MM-DD>/run-<NN>/` with `01_SEO筛选/`, `02_文章初稿/`, `03_Khazix成稿/`, `04_配图/`, and `05_最终成品/`. All artifacts for that run stay under this root.

Historical files are always read-only inputs during a run. A `CONTENT_REFRESH` is written as a run-scoped refresh candidate under the active run root, carries `REFRESH_OF` and the historical ID/path, and must not overwrite the historical file until a separate merge decision. New mother IDs use `<RUN_ID>-<slug>`. Platform IDs use `<RUN_ID>-<slug>-<platform>`. Legacy IDs such as `mother-01`, `codex-004`, or `codex-021` must never be allocated to a new article.

## Run gate

Before any paid or quota-bearing request, generate a **Run Plan** containing:

- run date and target article count;
- active topic and 90-day window;
- historical and newly discovered candidate counts;
- reusable cache by source and freshness tier;
- estimated GSC, Trends, SERP, and Semrush requests;
- Semrush topic-pack budget, estimated maximum consumption, current recorded consumption, and account reserve;
- expected number of candidate-mode and deep-mode Benchmarks.

The plan is an estimate, not authorization. Every Semrush operation still requires `scripts/semrush_quota_guard.py authorize` immediately before the external action.

## Funnel summary

### Stage 0: Load existing data

Allocate the `RUN_ID`, create the isolated run root, rebuild the historical article index, and inventory metadata before reading bodies: today's cache, 7/30/90-day evidence, keyword history, Semrush/GSC/Trends/SERP data, Benchmark summaries, Briefs, drafts, published pages, topic pools, processed files, and cache manifests. Read compact processed summaries first. Do not re-read raw data when a valid processed artifact records its source and checksum.

### Stage 1: Discover, no Semrush

Build candidates from GSC, history, lightweight Google demand features, Trends, user-problem sources, product-relevant problems, and existing research. Autocomplete, PAA, related searches, titles, snippets, issue titles, and short community signals are allowed. No bulk article reading and no Semrush discovery. A run may lower the general funnel limits in `config/seo_v2.yaml`; the 2026-08-24 recovery run is capped at 30 candidates.

### Stage 2: Pre-score, no Semrush

Run `TOPIC_DUPLICATE_CHECK` first with `scripts/topic_duplicate_check.py`. Remove only `TOPIC_ALREADY_COVERED`; retain `NEW_TOPIC`, `CLUSTER_TOPIC`, and `CONTENT_REFRESH` with separate accounting. Then use local processors for normalization, source merging, deterministic score calculation, and compact summaries. Never send hundreds of raw rows to the model. The Pre-score is a routing score, not `FORMAL_SEO_SCORE` or `CONTENT_OPPORTUNITY_SCORE`.

### Stage 3: Cheap validation

Use reusable or newly authorized GSC, Trends, localized SERP, and history evidence to reduce at most 80 candidates to roughly 30-40. GSC positions 5-30 with real impressions and weak page/CTR fit receive special attention. Candidate SERP mode may retain ranks, URLs, titles, snippets, page types, visible dates, H1/H2/H3 when necessary, approximate length, weak-result flags, and freshness gaps. Do not bulk-read result bodies or store full HTML in model context.

### Stage 4: Semrush validation

Only the configured deep-validation shortlist may enter Semrush. Each intent defaults to one Primary Keyword and at most two necessary variants. Query only the fields needed for decision-making and do not expand Keyword Magic for discovery. Check query dedupe, cache, calibrated cost, account reserve, phase budget, and topic-pack budget before each action. Save HK, US, and SG rows separately. `NO_DATA` and `KD_UNAVAILABLE` are evidence states, not proof of no demand and not automatic rejection reasons.

### Stage 5: Topic selection and review

Reduce validated candidates to the configured page-level limit, run intent-aware cannibalization checks, and rank the run target with `CONTENT_OPPORTUNITY_SCORE`. Score `SEO_DEMAND_SCORE`, `SEARCH_INTENT_SCORE`, `TASK_VALUE_SCORE`, `AICODEWITH_RELEVANCE_SCORE`, `CONTENT_GAP_SCORE`, and `HISTORICAL_DUPLICATE_SCORE`; never rank only by Volume. When Semrush is missing, require at least two independent reliable demand signals and set `SEO_CONFIDENCE = MEDIUM`. Apply `NEW_TOPIC -> CLUSTER_TOPIC -> CONTENT_REFRESH`, with no more than two refreshes in a five-item run. Stop searching once the configured candidate/deep/Semrush budgets are spent. Set `selection_status = 待确认` unless the user has explicitly authorized production in the same request.

### Stage 6: Deep research and production

Only `selection_status = 已确认` intents enter Benchmark Deep Mode. Analyze 3-5 useful pages per intent without copying. Then build original Briefs from official sources, real tests, product facts, the isolated Benchmark summary, and house style. Write articles only when the user requested production; preserve technical-test, QA, and publication gates.

## Downstream article handoff

The formal content pipeline is:

`generate-seo-topic-pack -> khazix-writer-skill -> evidence-qa -> platform-adaptation -> seo-review -> seo-article-illustrator -> aicodewith-image-generation -> screenshot-check -> final-image-qa -> publish-gate`

This Skill owns research, the approved Brief, and the factual SEO draft. It writes them inside the active run root at `01_SEO筛选/` and `02_文章初稿/`; it must not write new articles to shared historical directories and must not perform Khazix rewriting, platform adaptation, SEO Review, illustration planning, image generation, or final publication.

Every Brief/article handoff must carry `RUN_ID`, `ARTICLE_ID`, `OPPORTUNITY_TYPE`, `TITLE`, `PRIMARY_KEYWORD`, `SECONDARY_KEYWORDS`, `SEARCH_INTENT`, `SOURCE_BRIEF`, `CREATED_AT`, `STATUS`, `CONTENT_HASH`, `ENTITY_TYPE`, `PRODUCT_RELEVANCE`, `AICODEWITH_RELEVANCE_SCORE`, `TASK_VALUE_SCORE`, `CONTENT_OPPORTUNITY_SCORE`, and `SEO_CONFIDENCE`. A refresh also carries `REFRESH_OF` and `HISTORICAL_FILE_PATH`. Recompute `CONTENT_HASH` from the actual saved content before handoff; do not copy a historical hash.

Formal production that must carry AI Code With is limited to `PRODUCT_RELEVANCE = HIGH|MEDIUM`. Reject `LOW|NONE` with `REJECT_LOW_PRODUCT_FIT`; do not manufacture a product hook in the body. Set one functional `PRODUCT_ROLE`: `API_CONNECTION`, `MODEL_ACCESS`, `CONFIGURATION`, `TROUBLESHOOTING`, `COST_VISIBILITY`, `USAGE_OBSERVABILITY`, or `SUPPORT`. Validate the pair with `scripts/content_policy.py check-topic` before Brief production.

Before handing off one approved draft:

- preserve the Primary Keyword, Search Intent, article goal, core conclusion, tutorial target, evidence URLs, test status, screenshot requirements, product facts, and unresolved blockers;
- read the root `PRODUCT_KNOWLEDGE.md` and classify the subject as `AICODEWITH_CORE`, `AICODEWITH_INTEGRATION`, `THIRD_PARTY_UNRELATED`, or `UNKNOWN`;
- set `PRODUCT_RELEVANCE = HIGH` only when the article subject has qualified `AICODEWITH_INTEGRATION` evidence: explicit integration steps, AI Code With API Key/Base URL/Endpoint/Model configuration, an explicit connectability statement, or reproducible integration evidence; mere appearance in Docs, Blog, navigation, introductions, reposts, news, or reviews is insufficient;
- inspect the actual body, not only `product_hook`, to set `AICODEWITH_MENTIONED`;
- set `AICODEWITH_INTEGRATION_REQUIRED = true` only for an otherwise eligible `HIGH|MEDIUM` topic whose supported functional role is missing from the draft; never use it to rescue `LOW|NONE` topics;
- set `FACT_ENRICHMENT_REQUIRED = true` when a useful claim or product hook lacks authorized evidence; never invent the missing fact;
- carry every real-interface need forward as `SCREENSHOT_PENDING = true` and retain the exact capture notes;
- initialize `COVER_IMAGE_REQUIRED = pending` and `COVER_IMAGE_DONE = false`; only `seo-article-illustrator` decides whether the cover is required;
- initialize `FULLY_PUBLISH_READY = false`. A draft is never publish-ready merely because its prose is complete.

Add these handoff fields to the existing article metadata without removing the audit fields required by the production contract:

```yaml
ENTITY_TYPE: AICODEWITH_INTEGRATION
PRODUCT_RELEVANCE: HIGH
AICODEWITH_MENTIONED: true
AICODEWITH_INTEGRATION_REQUIRED: false
FACT_ENRICHMENT_REQUIRED: false
COVER_IMAGE_REQUIRED: pending
COVER_IMAGE_DONE: false
SCREENSHOT_PENDING: true
FULLY_PUBLISH_READY: false
NEXT_STAGE: khazix-writer-skill
```

Use real booleans for `true`/`false`; `pending` is allowed only for `COVER_IMAGE_REQUIRED` before the illustration decision. If integration or fact enrichment is required, retain the draft and blocker instead of manufacturing a transition-ready article.

## Semrush protection

Read `config/semrush_quota.yaml`, `data/seo/semrush/quota_usage_history.csv`, `data/seo/semrush/keyword_cache.csv`, `data/seo/cache/cache_manifest.csv`, and `reports/seo/runtime/query_log.csv` before authorization.

- Daily account default: 5000, with at least 10% reserved.
- Topic Pack soft limit: 600. At/above it, only explicitly high-priority validations may proceed.
- Warning threshold: 800. Stop and show consumption, remaining account quota, unvalidated candidates, and justification; continuation requires explicit user approval.
- Hard limit: 1000. Stop all new Semrush requests with no bypass.
- First action of an uncalibrated query type uses one keyword only.
- Fresh successful Semrush cache defaults to 14 days; a forced Top-10 refresh still has a 7-day minimum.
- Never switch endpoint, query type, or database to evade dedupe or budget limits.

If Semrush stops, continue local/GSC/Trends/SERP/community/official-scenario work and mark affected candidates `SEMRUSH_VALIDATION_INCOMPLETE`. Do not assign `FORMAL_SEO_SCORE`; do calculate `CONTENT_OPPORTUNITY_SCORE` when its inputs are supported. At least two independent reliable demand signals are required for provisional production.

## Token protection

Code handles CSV/JSON parsing, date filtering, normalization, dedupe, sorting, merging, aggregation, numeric thresholds, cache lookup, rank calculation, basic scoring, content-index matching, and query logging. The model handles Search Intent, product relevance, commercial value, SERP gaps, differentiation, Briefs, and article strategy from compact summaries. Cache one bounded summary for the operations profile, each official source, each SERP, and each analyzed keyword; never restart the same analysis for each article.

Candidate Benchmark Mode never reads full competitor bodies. Deep Mode is limited to confirmed final topics and 3-5 pages each. Writer reads the isolated Benchmark output, not competitor originals.

For an explicitly authorized production run, prepare and cannibalization-check all Briefs as one batch before writing any body. Incomplete source validation may produce `PROVISIONAL_TODAY` and `待实测草稿`, but never `PUBLISH_READY`.

Stop and switch to local processing if an action would place a raw export, full response, full HTML, or more rows than the limits in `config/seo_v2.yaml` into model context.

## Completion and stop conditions

- Duplicate query: use cache/log evidence; do not request again.
- Historical duplicate: set `TOPIC_ALREADY_COVERED` only when intent and problem are also the same; do not validate externally.
- Distinct problem inside an owned parent topic: set `CLUSTER_TOPIC`; it may count as new production.
- Historical refresh opportunity: set `CONTENT_REFRESH`; write it under the active run with refresh linkage and count it separately.
- Low-value candidate: record a reject reason; do not deepen research.
- Existing intent: mark `UPDATE` and assess the existing page.
- Semrush at warning/hard/account reserve: follow the guard decision.
- Token-waste risk: stop reading and create a local processor/summary.
- Missing source or access: record the blocker and continue only permitted stages.
- Fewer than the target qualified topics after all budgets and fallback types are exhausted: report the qualified count and intentionally empty slots. Four valuable items are preferable to an unbounded fifth search.
- First research run: stop after the review table, candidate Benchmark, and Research Ledger.
- V1/V2 never auto-publishes.

## Product and quality guardrails

- AI Code With must answer a real user problem; product promotion cannot create demand evidence.
- Verify price, endpoints, models, discounts, behavior, and availability from product facts or current authorized evidence. Otherwise use `FACT_CHECK_REQUIRED`.
- Technical tutorials need official sources, reproducible commands, redacted credentials, versions, screenshots, failure branches, and a success check. Untested work remains `待实测`.
- A third-party tool is `AICODEWITH_INTEGRATION` only when the evidence includes explicit integration steps, AI Code With API Key/Base URL/Endpoint/Model configuration, an explicit statement that it can connect through AI Code With, or reproducible integration proof. Mere presence in Docs, Blog, navigation, an introduction, repost, news item, or review is not integration evidence. It may be used as an ecosystem tutorial, integration case, or application scenario only after this threshold is met, and its own functions must never be attributed to AI Code With.
- For a confirmed integration topic such as WorkBuddy, Codex, Claude Code, or Kimi, introduce AI Code With naturally within the first 10%–25% through the user's model/API/Key/configuration problem, then continue the third-party tool tutorial. Do not postpone the first product mention until the final third.
- Use natural product placement only where API Key, Base URL, model choice, integration, testing, cost, or support logically follows the query.
- Apply `BALANCE_EXPIRY_MARKETING_POLICY = DO_NOT_PROACTIVELY_MENTION`: ordinary SEO, tutorials, comparisons, and product hooks must not introduce “permanent” or “12-month” balance validity, use it as a selling point, or explain the internal Docs/Terms difference. Answer only when the user explicitly asks.
- Preserve source URLs, source roles, markets, collection dates, periods, freshness, cache decisions, and reject reasons for auditability.

## Architecture boundary

Topic, seed, audience, proxy markets, SERP market, and language belong only in allowed fields of `config/topic_queue.csv`. Do not hardcode a topic or seed in this Skill, scripts, or scoring rules. Routine topic changes must not alter this Skill, the scorer, or history. Infrastructure changes require an explicit upgrade request or a blocking bug.
