# AI Code With product-operations profile

## Product and audience

- Product: AI Code With, an API relay and compatibility service.
- Official site: https://aicodewith.ai/
- Product entry: https://aicodewith.ai/zh/dashboard/welcome
- Current SEO audience: Chinese individual developers, indie developers, and vibe coders using or preparing to use AI coding tools.
- Core needs: stable access, clear configuration, flexible model choice, understandable costs, and timely human assistance.
- Primary conversion: useful content -> trust -> customer service/community -> assisted setup -> registration -> recharge/payment.
- Canonical product and integration knowledge: `PRODUCT_KNOWLEDGE.md` at the project root.

Do not assert product functions, model coverage, price, endpoints, discounts, performance, stability, or savings unless verified from the current product UI, reproducible tests, or an authorized internal source.

## Entity and integration model

- `AICODEWITH_CORE`: AI Code With-owned API Key, model entry, channels, recharge, usage records, and model-call console capabilities.
- `AICODEWITH_INTEGRATION`: a third-party tool with explicit integration steps, AI Code With API Key/Base URL/Endpoint/Model configuration, an explicit connectability statement, or reproducible integration evidence. This is high product relevance for integration tutorials and use cases.
- `THIRD_PARTY_UNRELATED`: a third-party product with no confirmed AI Code With connection.
- `UNKNOWN`: insufficient evidence; do not claim compatibility.

For `AICODEWITH_INTEGRATION`, describe AI Code With as the model/API connection layer. Never attribute the third-party product's office, coding, agent, messaging, or workflow functions to AI Code With.

Mere appearance in AI Code With Docs, Blog, navigation, introductions, reposts, news, or reviews is not integration evidence. If none of the qualifying signals above exists, classify the tool as `UNKNOWN`, not `AICODEWITH_INTEGRATION`.

## Current content priorities

1. Multi-model access and third-party AI tool integrations.
2. Codex, Claude Code, WorkBuddy, Kimi, and other website-confirmed integration tutorials.
3. API Key, unified entry, lower configuration barriers, and reduced repeated configuration across tools.
4. Usage/call records, onboarding support, and real customer assistance.
5. Troubleshooting: 401, 403, 429, request failures, configuration not taking effect, unsupported model or protocol.
6. Cost and comparison only with current verified evidence.

Only `PRODUCT_RELEVANCE = HIGH|MEDIUM` may enter formal production that requires AI Code With. Reject `LOW|NONE`; never force a hook. Assign one functional `PRODUCT_ROLE`: `API_CONNECTION`, `MODEL_ACCESS`, `CONFIGURATION`, `TROUBLESHOOTING`, `COST_VISIBILITY`, `USAGE_OBSERVABILITY`, or `SUPPORT`.

When a confirmed integration is the article subject, set `PRODUCT_RELEVANCE = HIGH` and introduce AI Code With naturally in the first 10%–25% through the model/API/Key/configuration problem. For `MEDIUM`, the usual first functional placement is 20%–40%. These are guidance ranges, not appearance-count KPIs. Continue the task after establishing the product role, and make the final CTA the natural next step.

Apply `BALANCE_EXPIRY_MARKETING_POLICY = DO_NOT_PROACTIVELY_MENTION`. Do not use balance validity as a selling point, comparison point, or ordinary tutorial detail, and do not explain the internal Docs/Terms difference unless the user explicitly asks.

Select the current content cluster only from `config/topic_queue.csv`. Build one root tutorial and link focused configuration, error, FAQ, cost, and comparison pages around the selected active topic.

## Content placement

- Docs: setup, parameters, configuration files, troubleshooting, verification.
- Blog: comparisons, costs, scenarios, experience, decision support.
- Active distribution platforms are 知乎、CSDN、今日头条、微信公众号. 百家号 is historical-index-only. CSDN is capped at two new adaptations per day. Read all platform and daily limits from `config/content_policy.json`.

## Hard publication requirements

- Define one primary keyword, 3-10 same-intent long tails, one clear intent, current competitors, a concrete gap, Docs/Blog placement, product role, and next action before writing.
- Use official documentation and real tests for technical facts.
- Label an untested tutorial `待实测草稿`; never call it publishable.
- Record the last tested date and client/tool version.
- Cover Windows/macOS differences where relevant.
- Provide complete copyable commands/configuration with redacted credentials.
- Include current screenshots, common errors, their causes, fixes, and a success check.
- Keep one main intent per page. Merge near synonyms and variants.
- Write in direct, practical Chinese without padding, keyword stuffing, fake first-person testing, or stiff AI phrasing.
- Add original value through tests, screenshots, version information, failure branches, calculations, or an explicit case.
- Add 1-5 genuinely relevant internal links when targets exist. Zero is valid with `NO_RELEVANT_INTERNAL_TARGET=true`; never invent weak links.
- Add attribution parameters to product links: `?ref=<channel>&src=<article-slug>`.
- Check title, meta description, URL, canonical, sitemap, internal links, mobile usability, and applicable FAQ/HowTo structured data before publication.

## Daily final output

Read `DAILY_FINAL_ARTICLE_TARGET` and `daily_final_article_max` only from `config/content_policy.json`. The current target and maximum are 10 final articles; quality insufficiency explicitly permits fewer. Research Intent caps are not production quotas. Untested AI drafts do not count. If the formal keyword library is empty, publishable units are zero.
