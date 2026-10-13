# SEO v2 Validation and Output Standard

## Target and market configuration

Read the active row in `config/topic_queue.csv`. The row controls business audience, content language, Semrush proxy databases, Trends proxy geos, proxy role, localized SERP country, and SERP language. These fields are mandatory and may not be hardcoded in the Skill or scripts.

Semrush and Trends proxy sets must match, normally `HK|US|SG` with `reference_market_role=proxy_only`. They do not have to equal the localized SERP country. Content and SERP languages must match. Proxy data never represents mainland-China demand, the business target market, or AI Code With market size.

Use a rolling 90-day window ending on the run date for admission. Shorter 7/30-day Trends signals may add freshness context but do not replace the 90-day record.

## Required evidence

### Semrush final validation

Accept authenticated UI/API evidence or a dated export. Preserve one row per keyword and proxy market with keyword, market/database, Volume, KD, CPC/currency, intent, trend, SERP features, query type, source, and checked time. Never sum or average proxy volumes or combine fields across markets.

Semrush access is valid only after local discovery/pre-score/cheap validation and successful authorization by `scripts/semrush_quota_guard.py`. Missing or stopped validation is `NO_DATA`, `KD_UNAVAILABLE`, `SEMRUSH_VALIDATION_INCOMPLETE`, or `WAITING_SEMRUSH`. It blocks `FORMAL_SEO_SCORE`, not `CONTENT_OPPORTUNITY_SCORE` or provisional production by itself.

### Google Trends

Require the configured proxy geos, exact term, 90-day period, direction/pattern, related topics/queries when available, collection time, and `data_status`. Trends 0-100 is relative interest, not search volume. Preserve `insufficient_data`; do not invent zero or automatically reject a long tail.

### Localized Google SERP

Formal admission requires a current result inspection for configured country/language/device. Record exact query, date, localization, ranks/URLs/titles/domains/page types, visible freshness, dominant intent, recurring coverage, weak/outdated results, content gaps, and a testable differentiation opportunity.

Candidate Mode may use cached structural fields only. A partial result list supports discovery but does not satisfy formal admission.

### GSC optional enhancement

When available, preserve property, query, page, country/device/search-type filters, clicks, impressions, CTR, average position, date range, and export date. GSC is first-party evidence and has priority for opportunity routing. Missing GSC does not block a new keyword that passes Semrush, Trends, and localized SERP; proxy data cannot replace it.

## Admission and scoring

Statuses:

- `候选词`: discovered but incomplete.
- `机会词`: meaningful partial evidence but one or more required validations are missing.
- `正式SEO词`: Semrush + Trends + localized SERP are complete, aligned, current, and auditable; GSC is attached when available.
- `生产机会词`: does not qualify for `FORMAL_SEO_SCORE`, but has at least two reliable independent demand signals, a clear task intent, `CONTENT_OPPORTUNITY_SCORE` above threshold, and `SEO_CONFIDENCE=MEDIUM` or higher.
- `暂停`: irrelevant, stale, duplicated, misleading, blocked, or unable to serve a real user/product need.

The Stage 2 Pre-score is only a routing score. `FORMAL_SEO_SCORE` continues to require the formal source set. `CONTENT_OPPORTUNITY_SCORE` is a separate production-ranking score that may use the multi-signal contract when Semrush is missing. No score makes a missing numeric source real.

## Page-level selection

Cluster validated phrases into at most 15-20 page-level Search Intents, then rank up to 10 daily review candidates. Each row has exactly one Primary Keyword and 3-10 same-intent Secondary Keywords. Fewer are correct when fewer qualify.

Rebuild and check `data/seo/historical_article_index.csv` before current batch, past 30/90-day selections, the three legacy libraries, Briefs, drafts, and published pages. Shared keywords do not decide ownership. Use `TOPIC_ALREADY_COVERED` only for the same intent/problem with no new information, `CLUSTER_TOPIC` for a distinct sub-problem, and `CONTENT_REFRESH` for an owned page needing documented revision.

Final prioritization considers product relevance, intent value, `TASK_VALUE_SCORE`, GSC, separate-market Semrush evidence, Trends, SERP/autocomplete/PAA, community questions, official task scenarios, competitive opportunity, differentiation, and cannibalization risk. Calculate `CONTENT_OPPORTUNITY_SCORE`; do not sort only by Volume.

## First-run outputs and human gate

Before paid requests, write `reports/seo/<run_date>-seo-run-plan.md`.

After Stage 5, write:

- `reports/seo/<run_date>-keyword-review.csv`
- `knowledge/benchmarks/<topic_id>.md` in Candidate Benchmark Mode
- updated `data/seo/processed/research_ledger.csv`
- appended `data/seo/keyword_research_history.csv`
- query/cache/quota logs for actions actually taken

The review CSV includes opportunity type, Primary Keyword, 3-10 Secondary Keywords, intent, GSC signal, Semrush status and separate proxy data when available, 90-day reference trend, other named demand signals, localized SERP gap, task value, product relevance, cluster, formal SEO score when eligible, content opportunity score, SEO confidence, cannibalization decision, create/update decision, recommended angle, reason, evidence paths, validation status, and `selection_status = 待确认`.

If no term passes, write `正式入库：0`. If seven pass, write `7 qualified topics` and `3 slots intentionally left empty` with reasons. Never fill slots with variants or weak terms.

Stop after these outputs. Only a user-confirmed `selection_status = 已确认` row may enter Stage 6.

## Benchmark isolation

Candidate Mode retains 3-5 pages per review intent using URL, title, rank, snippet, H1, necessary H2/H3, date, type, and approximate length. It identifies structural coverage and obvious gaps without bulk body reading.

Deep Mode is available only after confirmation. Analyze 3-5 useful pages per confirmed intent and retain only common coverage, strengths, weaknesses, missing questions, factual leads, case types, structural patterns, and differentiation. Do not retain copied passages, distinctive phrasing, or a rewrite-ready competitor outline.

Writer must not reopen competitor originals. Writer primarily uses the original Brief, official sources, reproducible tests, verified product facts, isolated Benchmark synthesis, and `knowledge/references/house_style.md`.

## Production outputs

Only confirmed intents may create:

- `文稿/seo_contect/<YYYY-MM-DD>/run-<NN>/01_SEO筛选/<article_id>.md`
- `文稿/seo_contect/<YYYY-MM-DD>/run-<NN>/02_文章初稿/<article_id>.md`

The article header must include `RUN_ID`, unique article/topic IDs, `TITLE`, Primary and Secondary Keywords, `SEARCH_INTENT`, `SOURCE_BRIEF`, `CREATED_AT`, `STATUS`, `CONTENT_HASH`, `AICODEWITH_RELEVANCE_SCORE`, cluster, parent, internal links, product hook, data window, evidence URLs, validation status, Semrush status, test status, QA status, fact-check status, and publication status.

Untested technical content remains `待实测`. Missing product facts remain `FACT_CHECK_REQUIRED`. QA below 80 or any hard error remains `待修改`. No automatic publication.

## No-fabrication and audit check

Before completion, verify:

- every external request has a query-log row and every cache reuse has a cache-hit row;
- exact same-day query keys were not re-requested;
- all numeric values retain source, market, period, checked time, and evidence path;
- cache entries have manifest metadata and valid artifact paths;
- no raw large export or full HTML was placed in model context;
- Semrush discovery did not occur and every paid action passed the guard;
- Topic Pack soft/warning/hard limits and account reserve were respected;
- HK/US/SG remain separate and proxy-only;
- GSC is separately scoped and missing GSC is not represented as zero;
- no seed or AI expansion was treated as validated evidence;
- every rejection/selection has a Research Ledger reason;
- no close synonym owns a second page without distinct SERP intent;
- only confirmed rows entered Deep Benchmark, Brief, article, internal link, or QA work;
- no product or technical claim was fabricated or falsely called tested/publishable.
