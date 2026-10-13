# SEO v2 Data Contracts

Use these contracts for cache, queries, local candidate processing, and audit output. CSV is the interchange format unless a raw source requires JSON. Raw evidence is immutable; append logs and ledgers rather than overwriting history.

## Directory contract

```text
data/raw/<source>/                    Immutable source exports or captures
data/seo/cache/<source>/              Reusable source artifacts
data/seo/cache/cache_manifest.csv     Cache metadata and freshness
data/seo/processed/                   Locally reduced data for model use
data/seo/processed/research_ledger.csv Per-keyword decisions and reasons
data/seo/historical_article_index.csv  Current immutable-view index used by the duplicate gate
reports/seo/runtime/query_log.csv     Every external-query attempt and cache hit
reports/seo/<date>-seo-run-plan.md    Pre-request budget and reuse plan
```

## Historical article index

Rebuild `data/seo/historical_article_index.csv` before every formal run with `scripts/build_historical_article_index.py`. It contains `ARTICLE_ID`, `TITLE`, `PRIMARY_KEYWORD`, `SECONDARY_KEYWORDS`, `SEARCH_INTENT`, `PLATFORM`, `FILE_PATH`, `CREATED_AT`, `UPDATED_AT`, `CONTENT_HASH`, and `STATUS=HISTORICAL`.

Run `scripts/topic_duplicate_check.py` before GSC/Trends/SERP/Semrush validation. Its decision is `TOPIC_ALREADY_COVERED`, `CONTENT_REFRESH`, `CLUSTER_TOPIC`, or `NEW_TOPIC`. All except `TOPIC_ALREADY_COVERED` may compete for production, with separate type counts.

The candidate contract may include `problem_statement`, `refresh_evidence`, `cluster_evidence`, and `new_topic_evidence`. A keyword-family overlap is a cannibalization warning, not an automatic rejection. `cluster_evidence` must name the independently useful problem and why the parent page does not solve it. `refresh_evidence` routes to `CONTENT_REFRESH`. Unsupported wording changes remain `TOPIC_ALREADY_COVERED`.

## Run and article identity contract

- `RUN_ID`: unique `YYYYMMDD-NN` value.
- New mother `ARTICLE_ID`: `<RUN_ID>-<slug>`.
- Platform `ARTICLE_ID`: `<RUN_ID>-<slug>-<platform>`.
- Run root: `文稿/seo_contect/<YYYY-MM-DD>/run-<NN>/` with the five numbered stage directories.
- Required production metadata: `RUN_ID`, `ARTICLE_ID`, `OPPORTUNITY_TYPE`, `TITLE`, `PRIMARY_KEYWORD`, `SECONDARY_KEYWORDS`, `SEARCH_INTENT`, `SOURCE_BRIEF`, `CREATED_AT`, `STATUS`, `CONTENT_HASH`, `AICODEWITH_RELEVANCE_SCORE`, `TASK_VALUE_SCORE`, `CONTENT_OPPORTUNITY_SCORE`, and `SEO_CONFIDENCE`.

Historical files stay read-only during the run. Refresh candidates use a new run-scoped ID/path, preserve `REFRESH_OF` and `HISTORICAL_FILE_PATH`, and are counted as `CONTENT_REFRESH`, not `NEW_TOPIC`.

## Opportunity score contract

The compact opportunity table contains `opportunity_type`, Semrush status and available fields, named demand signals and their count, the six component scores, `content_opportunity_score`, `seo_confidence`, and `recommend_production`. Semrush `NO_DATA` and `KD_UNAVAILABLE` remain literal states; a missing value is blank, never zero. `SEO_CONFIDENCE=MEDIUM` requires at least two named independent reliable demand signals.

When production must carry AI Code With, `PRODUCT_RELEVANCE` must be `HIGH|MEDIUM` and `PRODUCT_ROLE` must be one of the configured functional roles. `LOW|NONE` is rejected before Briefs and cannot be repaired by inserting a product paragraph later.

The source cache directories are `semrush`, `gsc`, `trends`, and `serp`. A cache entry is invalid if its manifest is missing, its referenced file does not exist, or its scope does not match the planned query.

## Cache manifest

`data/seo/cache/cache_manifest.csv` fields:

- `source`
- `query`
- `keyword`
- `market`
- `query_type`
- `fetched_at`
- `expires_at`
- `data_state`: `raw`, `processed`, or `raw+processed`
- `status`: `success`, `partial`, `error`, or `stale`
- `raw_path`
- `processed_path`
- `source_period_start`
- `source_period_end`
- `filters`
- `checksum`

Normalize the key fields before lookup but preserve the original query in storage. Reuse requires `status=success`, `expires_at >= run time`, matching scope/filters, and existing artifact paths. Partial evidence may support discovery but cannot silently satisfy formal admission.

Suggested defaults, overridden by source volatility and explicit evidence:

- Semrush: 14 days; Top-10 forced refresh minimum 7 days.
- GSC export: latest available export; refresh only when the requested window or filters materially change.
- Trends: 1 day for high-volatility terms, 7 days for ordinary 7/30-day checks, up to 14 days for stable 90-day patterns.
- SERP: 1 day for news/version incidents, 7 days for ordinary current-intent checks, up to 14 days for stable evergreen queries.

Do not refresh all terms only because the calendar date changed.

## Query log

`reports/seo/runtime/query_log.csv` has at least:

- `timestamp`
- `source`
- `query`
- `keyword`
- `market`
- `query_type`
- `cache_hit`
- `estimated_cost`
- `cumulative_cost`
- `status`

The exact daily request key is:

`date + normalized source + normalized keyword/query + normalized market + normalized query_type`

Rows with `cache_hit=true` record reuse but do not count as external execution. A matching external row with status `success`, `partial`, `error`, or `executed` blocks another same-day request. Do not change endpoints, wording, or query type merely to evade this rule.

Use `scripts/query_log.py check` before GSC, Trends, SERP, or Semrush requests and `scripts/query_log.py record` immediately after the decision/action. Semrush also requires the Semrush quota guard.

## Candidate input and local processing

Raw discovery CSV must include:

- `keyword`
- `discovery_source`
- `market`
- `query_type`
- `data_period_start`
- `data_period_end`
- `freshness_status`
- `evidence_path`

Optional compact signals:

- `cluster`
- `intent`
- `product_relevance`
- `search_intent_value`
- `conversion_potential`
- `trend_freshness`
- `gsc_signal`
- `serp_opportunity`
- `content_feasibility`
- `natural_product_fit`

Scores use 0-100. Blank means unknown, not zero. The processor refuses a complete Pre-score when any weighted component is missing.

`scripts/seo_local_processor.py` writes:

- a deduplicated processed CSV capped at the configured stage limit;
- a compact JSON summary with counts, score bands, duplicates, existing-content matches, and reject reasons;
- ledger rows that explain routing decisions.

Near-duplicate detection is only a flag. The model confirms whether phrases share a Search Intent.

## Research Ledger

`data/seo/processed/research_ledger.csv` fields:

- `research_date`
- `topic_id`
- `keyword`
- `normalized_keyword`
- `cluster`
- `intent`
- `discovery_source`
- `product_fit`
- `gsc_signal`
- `trend_signal`
- `serp_signal`
- `semrush_market`
- `volume`
- `kd`
- `pre_score`
- `formal_seo_score`
- `existing_content`
- `cannibalization_status`
- `final_status`
- `reject_reason`
- `evidence_path`
- `next_action`

One keyword may have multiple dated ledger rows. Never overwrite a historical research attempt. Use explicit reasons such as `REJECT_LOW_PRODUCT_FIT`, `REJECT_HIGH_COMPETITION`, `REJECT_DUPLICATE_INTENT`, `REJECT_EXISTING_ARTICLE`, `REJECT_NO_SEARCH_SIGNAL`, `UPDATE_EXISTING_ARTICLE`, or `SELECTED`.

## Token and context contract

`config/seo_v2.yaml` defines hard context limits. The model must not read:

- unfiltered raw CSV/JSON exports;
- full Semrush or GSC responses;
- entire SERP HTML;
- candidate-stage article bodies;
- repeated copies of a source already represented by a fresh processed artifact.

Local code owns parsing, normalization, date filtering, dedupe, merge, aggregation, cache lookup, numeric scoring, and query logging. Model context receives only bounded processed rows and short summaries.

Candidate Benchmark Mode stores structure only. Deep Benchmark Mode is limited to confirmed topics and 3-5 pages per topic. Writer consumes the isolated Benchmark summary, not competitor pages.

## Provenance requirements

Every numeric SEO value must retain source, market, query type, collection time, period, and evidence path. Semrush HK/US/SG values remain separate. Trends 0-100 is relative interest, not Volume. No GSC row is not measured zero. Missing data remains blank with an explicit status.
