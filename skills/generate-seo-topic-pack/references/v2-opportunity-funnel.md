# SEO Opportunity Funnel v2

Read this file for every research or production run. The stages are resumable: write each stage output before moving forward, and resume from the newest valid artifact instead of restarting.

## Run Plan

Create `reports/<run_date>-seo-run-plan.md` before the first quota-bearing request. It must state:

- run date, active topic, content language, business audience, and rolling 90-day window;
- target output count, default 10;
- counts of historical candidates, new discoveries, fresh cache entries, and stale entries by source;
- planned GSC, Trends, localized SERP, and Semrush requests;
- Semrush account total/remaining/reserve, current Topic Pack consumption, calibrated estimated maximum, and 600/800/1000 thresholds;
- planned Candidate Mode and Deep Mode Benchmark counts;
- known blockers and which stages can still proceed.

Do not describe estimated requests or costs as actual consumption. Update the plan after a stop or material scope reduction.

## Stage 0: Load existing data

Allocate a unique `RUN_ID`, create its isolated five-stage run directory, rebuild `data/seo/historical_article_index.csv`, and inventory file metadata and cache manifests first. Check, in order:

1. today's successful processed/cache artifacts;
2. fresh 7-day artifacts;
3. fresh 30-day artifacts;
4. usable 90-day history;
5. stale history that may support discovery but not current claims;
6. new external requests only for unresolved evidence.

Include keyword history, Semrush cache/raw exports, GSC exports, Trends outputs, SERP summaries, Benchmarks, Briefs, drafts, published pages, `data/seo/01_SEO关键词库.csv`, `data/seo/02_主题选题池.csv`, `data/seo/04_文章库.csv`, and processed candidate files when present.

Freshness is source- and topic-sensitive. Reuse requires matching keyword/query, market, source role, query type, filters, and evidence scope. A different run date alone never invalidates Semrush evidence.

Output a compact inventory summary. Do not place raw file bodies in model context.

## Stage 1: Discover

Goal: build a bounded raw candidate pool before clustering. Semrush is prohibited. Respect `run_candidate_budget_max`; do not keep expanding after the budget is reached.

Discovery priority:

1. GSC queries with impressions, especially position 5-30, weak CTR, growth, poor page match, and real product relevance.
2. Historical candidates, validated terms, Semrush history, rejected-but-reconsiderable terms, and prior incomplete work.
3. Autocomplete, PAA, related searches, SERP titles/snippets, and fresh query wording.
4. Trends 7/30/90-day Rising, Breakout, new tools/models/features/errors/versions/configuration needs.
5. Issue titles and short question signals from GitHub, Reddit, X, Zhihu, CSDN, Stack Overflow, forums, and AI communities.
6. Problems the verified product can naturally help solve.

At this stage, competitor/community pages are discovery leads, not fact sources. Do not bulk-read bodies. Product-fit ideation cannot establish search demand.

Save raw discoveries with source, market, query type, collection period, timestamp, and evidence path.

## Stage 2: Pre-score

Goal: reduce the run's bounded pool without Semrush.

Run `scripts/topic_duplicate_check.py` before model judgment or source validation. Exact Primary Keyword or shared topic alone is not a rejection. Compare Search Intent and the concrete problem being solved. Route exactly as follows:

- `NEW_TOPIC`: no historical page owns the same intent/problem;
- `CLUSTER_TOPIC`: a covered parent topic exists, but the candidate solves a distinct useful sub-problem;
- `CONTENT_REFRESH`: the owned page needs a documented update because of version, configuration, product, SERP, intent, staleness, quality, or solution change;
- `TOPIC_ALREADY_COVERED`: keyword/topic, intent, problem, and useful information are materially the same.

Only the last decision is removed. The first three may enter local processing and are accounted separately.

The routing-only Pre-score is:

| Component | Weight |
|---|---:|
| Product Relevance | 25% |
| Search Intent Value | 20% |
| Conversion Potential | 15% |
| Trend / Freshness | 10% |
| Existing GSC Signal | 10% |
| SERP Opportunity | 10% |
| Content Feasibility | 5% |
| Natural Product Fit | 5% |

All component inputs are 0-100 and must be traceable. Missing subjective components remain blank; do not coerce them to zero. The model may judge Search Intent, Product Relevance, commercial value, and natural fit only from compact candidate/evidence summaries, preferably in batches no larger than `config/seo_v2.yaml` permits.

This Pre-score routes work. It never overrides formal admission or the formal SEO score in `config/seo_rules.yaml`.

Intent value generally favors troubleshooting, tutorials, configuration, comparison, cost, API integration, product decision, and transactional research. Pure news, broad brand terms, encyclopedic queries, and weak product relationships rank lower unless real evidence shows unusual value.

## Stage 3: Cheap validation

Goal: reduce candidates to `run_deep_validation_budget_max` high-value opportunities.

Use cache/history before any new request. Validate:

- GSC first-party signals and existing target pages;
- Trends 7/30/90-day direction, spikes, sustained interest, and insufficient data;
- localized SERP intent, result mix, weak/old results, freshness gaps, and page ownership;
- historical evidence and existing-content fit.

### SERP Candidate Mode

Retain only rank, URL, domain, title, snippet, content type, visible publish/update date, H1, necessary H2/H3, approximate word count, weak-result flag, stale-result flag, and freshness gap. Cache the extracted structure. Do not feed full HTML or every result body to the model, and do not request the same SERP twice in one day.

Reject or pause low-value candidates with explicit ledger reasons. Trends `insufficient_data` alone does not eliminate a long-tail term when other real signals are strong.

## Stage 4: Semrush validation

Goal: validate only the configured shortlist and spend no more than `run_semrush_query_budget_max` formal Semrush queries.

Before each operation:

1. check `reports/seo/runtime/query_log.csv` for the exact daily query key;
2. check fresh cache and its manifest;
3. run `scripts/semrush_quota_guard.py authorize` with the exact keyword, market, query type, remaining balance, topic, candidate counts, and calibrated action type;
4. stop unless authorization is true;
5. after the external action, record the real query result and actual before/after balance immediately.

Use Semrush only for Volume, KD, CPC, trend, relevant variations, SERP features, intent/commercial signals needed to decide a pre-qualified phrase. Do not use Keyword Magic as an unbounded discovery loop.

Save HK, US, and SG separately. Never combine one market's Volume with another's KD, sum/average proxy volumes into a target-market value, or imply mainland-China demand.

`NO_DATA` and `KD_UNAVAILABLE` are evidence states, not proof of no demand. A candidate without usable Semrush numbers cannot receive `FORMAL_SEO_SCORE`, but it may receive `CONTENT_OPPORTUNITY_SCORE`. Provisional production requires at least two named independent reliable signals from current SERP, autocomplete, PAA/related searches, GSC, Trends, recent community questions, or official current task scenarios. Product relevance alone is not a demand signal.

At 600 Topic Pack units, only high-priority validation may continue. At 800, stop and request explicit direction after reporting consumption, account remainder, unvalidated count, and expected value. At 1000, all new Semrush operations stop. Account reserve and calibrated phase budgets still apply when stricter.

## Stage 5: Topic selection and human review

Cluster the bounded shortlist into page-level Search Intents. Each page has one Primary Keyword and 3-10 same-intent Secondary Keywords.

Before selection, check current batch, past 30/90-day topics, keyword history, Briefs, drafts, published articles, and the three legacy libraries. Record `CREATE_NEW`, `UPDATE`, or rejection. Existing intent defaults to `UPDATE` unless a genuinely different SERP intent supports a new page.

Calculate these auditable 0-100 components with the weights in `config/seo_rules.yaml`: `SEO_DEMAND_SCORE`, `SEARCH_INTENT_SCORE`, `TASK_VALUE_SCORE`, normalized `AICODEWITH_RELEVANCE_SCORE`, `CONTENT_GAP_SCORE`, and `HISTORICAL_DUPLICATE_SCORE` where 100 means low cannibalization risk. Their weighted result is `CONTENT_OPPORTUNITY_SCORE`.

Rank the run target by content opportunity, not Volume. Record `demand_signal_count`, named signals, and `SEO_CONFIDENCE`. After the search budget is exhausted, fill only from `NEW_TOPIC -> CLUSTER_TOPIC -> CONTENT_REFRESH`, with no more than two refreshes in a five-item run. If only four clear the production threshold, produce four and stop.

Use Candidate Benchmark Mode for 3-5 structural references per intent. Output the review CSV, candidate Benchmark, and Research Ledger with `selection_status = 待确认`, then stop unless the user explicitly authorized production in the same request. If fewer qualify, report the qualified count and intentionally empty slots with reasons.

## Stage 6: Deep research and production

Only rows explicitly changed to `selection_status = 已确认` may proceed.

### Benchmark Deep Mode

For each confirmed intent, choose 3-5 useful pages. Analyze intent, structure, H2/H3, coverage, missing information, unique claims, freshness, examples, data, FAQ, unresolved pain, and differentiation. Store only the isolated synthesis, factual leads, and source URLs. Do not retain long passages or a rewrite-ready competitor outline.

Writer does not reopen competitor originals. It uses the original Brief, official sources, real tests, verified product facts, Benchmark synthesis, and house style. Brief/article generation occurs only when the user asked for it. Technical, QA, and publication gates remain mandatory.

## Stop and resume states

- `REUSE_CACHE`: no external request.
- `REJECT_LOW_PRODUCT_FIT`
- `REJECT_LOW_INTENT_VALUE`
- `REJECT_NO_SEARCH_SIGNAL`
- `REJECT_DUPLICATE_INTENT`
- `REJECT_EXISTING_ARTICLE`
- `NEW_TOPIC`
- `CLUSTER_TOPIC`
- `CONTENT_REFRESH`
- `NO_DATA`
- `KD_UNAVAILABLE`
- `SEO_CONFIDENCE_MEDIUM`
- `UPDATE_EXISTING_ARTICLE`
- `WAITING_CHEAP_VALIDATION`
- `WAITING_SEMRUSH`
- `SEMRUSH_VALIDATION_INCOMPLETE`
- `WAITING_HUMAN_CONFIRMATION`
- `SELECTED`

Every stop state must retain the evidence path and next permitted action so the next run can resume without restarting.
