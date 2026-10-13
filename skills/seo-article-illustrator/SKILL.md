---
name: seo-article-illustrator
description: Analyze complete SEO articles, plan one suitable cover plus only the few body positions that need authentic screenshots or AI visuals, and emit structured tasks for approved images. Use for cover/body illustration planning; hand generation to aicodewith-image-generation and never use AI to imitate a real product or website interface.
---

# SEO Article Illustrator

Plan a restrained cover-and-body illustration system for a complete SEO article. The primary purpose of AI images is to improve the article's appearance, relieve fatigue from dense text, create reading rhythm, and make the page more enjoyable to finish. Supporting comprehension is secondary. Every image must still be clearly related to the article or its surrounding content.

Do not add an image merely to fill space, illustrate every H2, meet a quota, or make the plan look complete. Every article defaults to one cover image, but body AI images remain optional. Never approve more than three AI images for one article, including the cover. Do not modify the source article unless the user explicitly asks.

## Pipeline role and paths

The formal pipeline is:

`generate-seo-topic-pack -> khazix-writer-skill -> evidence-qa -> platform-adaptation -> seo-review -> seo-article-illustrator -> aicodewith-image-generation -> screenshot-check -> final-image-qa -> publish-gate`

For a platform article in the final publishing path, do not plan images unless its front matter and planning request both show `SEO_REVIEW_RESULT = GREEN`, `SEO_REVIEW_SCORE >= 85`, `SEO_REVIEW_VETO = false`, and `PUBLISH_ALLOWED = true`. A Yellow, Red, pending, or vetoed review stays blocked before this Skill. Direct Khazix illustration may still be used for a non-platform visual draft, but it does not satisfy the final platform publishing chain.

For the final platform path, read the `platform_article_file` named by the SEO-Review-unlocked planning request and write to its requested `output_image_plan_file` / `generation_task_dir`. The legacy direct-Khazix visual-draft path may still read `文稿/seo_contect/03_Khazix成稿/` and write `文稿/seo_contect/04_配图/<ARTICLE_ID>/`, but it is not publish-gate evidence. A plan contains:

- `IMAGE_PLAN.md`;
- `cover-image-task.json` when a cover is required;
- `body-image-tasks.json`, including an empty task list when no body AI image is justified.

This Skill decides whether a cover is needed, whether body illustrations are needed, their count, positions, purposes and types, and which items require authentic screenshots. It plans only; it does not call an image API, capture screenshots, or modify the article body. Set `STATUS = IMAGE_PLAN_READY` and `NEXT_STAGE = aicodewith-image-generation` after a complete plan.

## Cover image decision

Default to one `COVER_IMAGE_REQUIRED` item per article. Mark `COVER_IMAGE_REQUIRED = false` only when a cover would be unusable or actively misleading, and record the concrete reason.

An approved cover must:

- be strongly related to the article's main topic and suitable for a blog or SEO article hero;
- communicate the core theme with a clear, professional, restrained composition;
- avoid excessive text, poster-like clutter, and unrelated spectacle;
- use an abstract concept, tool-oriented illustration, workflow visual, or similarly non-deceptive form for Codex, Claude Code, Kimi, API configuration, and related topics;
- never fabricate a real product dashboard, backend, setting, price page, or operational UI;
- include AI Code With only through natural, light brand association when the article has strong product relevance; otherwise do not force branding.

### Default cover visual system

Unless the user explicitly requests another art direction, every generated article cover uses:

```text
COVER_STYLE = CUTE_ANIME
ASPECT_RATIO = 16:9
```

`CUTE_ANIME` means a polished Japanese anime-style editorial illustration for AI and programming content: a charming but not childish programmer or AI-assistant character, a clean modern workspace, soft clear lighting, a strong mobile-thumbnail focal point, restrained futuristic details, and deliberate negative space on one side. Vary the character, pose, props, palette, and scene according to the article instead of repeating one mascot.

Theme mapping:

- Codex / Claude Code: anime programmer, computer, and abstract terminal motifs;
- Kimi / model integration: character connecting multiple symbolic model nodes through API lines;
- errors / timeout: mildly confused character facing an abstract stalled terminal or warning state;
- API tutorials: character connecting Key, API, and model nodes without displaying a real key or UI;
- AI workflows: character coordinating several distinct AI-assistant or workflow nodes.

Always avoid photorealism, dark cyberpunk, large black backgrounds, corporate 3D/isometric infographics, abstract network nodes as the only subject, dense text, complex UI, fabricated product interfaces, and fabricated brand logos. The baseline prompt is:

```text
Cute Japanese anime-style editorial illustration for an AI technology article,
charming young programmer character,
clean modern workspace,
friendly AI assistant or small robot,
subtle futuristic technology elements,
soft lighting,
polished professional anime rendering,
clear visual hierarchy,
minimal clutter,
editorial cover composition,
16:9,
no large text,
no fake user interface,
not childish,
not photorealistic,
not corporate 3D infographic
```

Add the article-specific scene after this baseline. Record `cover_style: CUTE_ANIME` in the structured cover task.

The cover task uses `task_status: COVER_IMAGE_REQUIRED` and includes `article_id`, title, Primary Keyword, purpose, image type, must-include, must-avoid, composition, style, aspect ratio, prompt, alt text, and filename.

## Read The Complete Article

Read the entire Markdown, HTML, or plain-text article before making any illustration decision. If the file is too long for one read, continue in ordered chunks until reaching the end; do not infer the article from its opening or headings alone.

Build an internal content map that identifies:

- the main topic and search intent;
- the H1, H2, and H3 hierarchy, or the equivalent logical structure in plain text;
- the purpose and substance of every section;
- the approximate 20% point of the article;
- the longest or densest explanatory passage in the middle;
- abstract processes, relationships, comparisons, architecture, or unfamiliar concepts;
- a useful near-ending position where a relevant image could improve completion and visual rhythm;
- all locations that describe or require evidence from a real product or software interface;
- overlapping candidate visuals that would communicate substantially the same idea.

Before listing illustration decisions, briefly report the article topic, search intent, structure, dense or abstract sections, and the overall illustration strategy. Do not treat the preferred positions as mandatory slots.

## Use Five Execution States

Assign every plausible insertion point exactly one final state:

- `AI_IMAGE`
- `AI_IMAGE_OPTIONAL`
- `AI_IMAGE_SKIPPED`
- `SCREENSHOT_REQUIRED`
- `NO_IMAGE`

Apply the following decision order without skipping a gate:

1. If the passage describes, proves, or teaches a real product page, software interface, backend, setting, operation step, state, value, or layout, classify it as `SCREENSHOT_REQUIRED`. It must never enter the AI-image candidate pool.
2. If the position has no clear visual-break value, aesthetic value, relevance, comprehension value, or layout value, classify it as `NO_IMAGE` without using an image quota to justify the decision.
3. Only when a relevant visual could genuinely improve the article's appearance or reading experience may the position enter the AI-image candidate pool.
4. Score every candidate in that pool using the required formula and thresholds.
5. Resolve overlap through `redundancy_penalty`, rank all candidates eligible for `AI_IMAGE`, and enforce the article-wide maximum of three.

The screenshot gate is absolute. Scores and the AI-image cap cannot override it.

## Protect Authentic Screenshots

Use `SCREENSHOT_REQUIRED` whenever the article refers to a real Ai Code With interface or observable product state, including its:

- website, console, Dashboard, and backend pages;
- API Key, recharge, pricing, model list, channel management, or image workstation pages;
- feature entry points, operation steps, buttons, menus, configuration items, balances, prices, data, or page layout.

Apply the same rule to Codex, Claude Code, Semrush, Google Search Console, Google Trends, Feishu, SaaS backends, third-party websites, and all other real software or platforms. An authentic screenshot is required for actual interfaces, buttons, menus, settings, configuration pages, consoles, prices, feature entries, and sequences of UI actions.

Never generate, simulate, reconstruct, or guess these visuals from article text. Do not use an AI-created mock interface as a substitute for evidence.

Examples:

- An abstract flow such as `User -> Ai Code With -> model provider -> response` may enter the AI-image candidate pool.
- A procedure such as `Open the Ai Code With console -> click API Key -> create a key` must be `SCREENSHOT_REQUIRED`.

Do not invent missing prices, balances, metrics, features, interface states, or layout details. If an authentic screenshot cannot be obtained, retain `SCREENSHOT_REQUIRED` and report the blocker; never downgrade it to an AI state.

## Score AI-Image Candidates

Score each candidate from 0 to 5 on all five dimensions:

- `visual_break_value`: how strongly the image would relieve fatigue from a long or dense text passage;
- `aesthetic_value`: how much it would improve the page's overall visual appeal;
- `relevance`: how clearly and specifically it relates to the surrounding passage;
- `comprehension_gain`: how much it would assist understanding;
- `redundancy_penalty`: how much its purpose or content duplicates another candidate; greater duplication receives a higher penalty.

Calculate the score exactly as:

```text
total_score = visual_break_value + aesthetic_value + relevance + comprehension_gain - redundancy_penalty
```

Apply these thresholds before the article-wide cap:

- `total_score < 10`: `NO_IMAGE`;
- `total_score` from 10 through 13: `AI_IMAGE_OPTIONAL`;
- `total_score >= 14`: eligible for `AI_IMAGE`.

A score never permits fake UI or a weakly related decorative image. If relevance is not clear, the candidate should have failed the earlier value gate and be `NO_IMAGE`.

`AI_IMAGE_OPTIONAL` is a reserve state, not an instruction to generate. By default it receives no Image Brief and is not sent to an image generator. If the final plan would otherwise contain zero `AI_IMAGE` items, the highest-scoring optional candidate may be promoted to `AI_IMAGE` only when it scores 13, remains clearly relevant, materially improves reading rhythm, and the promotion reason is recorded. At most one optional candidate may be promoted this way.

## Enforce The Three-Image Maximum

The cover has first claim on the article-wide budget. After the cover decision, at most two body AI images may be approved, so that the default total remains:

- one cover image;
- zero to two body AI images;
- no more than three generated AI images in total.

After every eligible body candidate has been scored:

1. Sort candidates with `total_score >= 14` from highest to lowest total score.
2. Use higher `visual_break_value`, then higher `aesthetic_value`, then higher `relevance`, then better article-wide spacing only as tie-breakers.
3. Keep only the number that fits the remaining article-wide budget as `AI_IMAGE`.
4. Classify every remaining candidate that scored 14 or above as `AI_IMAGE_SKIPPED`, retaining its scores and rank, with this exact reason: `已达到单篇 3 张 AI 图上限（包含封面），优先保留更高价值图片。`

`AI_IMAGE_SKIPPED` therefore means the candidate passed the approval threshold but lost the article-wide ranking. It is different from `AI_IMAGE_OPTIONAL`, which scored only 10-13 and did not pass the normal approval threshold.

Do not count `SCREENSHOT_REQUIRED` items against the three-AI-image maximum. Do not fill unused slots with weak candidates. Aim to distribute selected images across the article rather than clustering all three near the opening; use the redundancy score and spacing tie-breaker without overriding a higher total score.

## Prefer Useful Visual Forms And Positions

Prefer these AI-image forms when they match the passage:

- abstract flow diagrams;
- simple architecture diagrams;
- scenario-based conceptual illustrations;
- technical-blog section illustrations;
- lightweight relationship diagrams;
- lightweight comparison diagrams.

Deprioritize or reject:

- fake or simulated UI;
- complicated low-value data graphics;
- weakly related decoration;
- visuals that repeat the meaning of another selected image.

Give special consideration, without assigning images mechanically, to:

1. a relevant position around the first 20% of the article as an early visual break;
2. the end of the longest and densest middle explanation;
3. the end of an abstract process or relationship explanation;
4. a relevant near-ending position that improves the sense of completion.

Place an approved visual immediately after the claim, explanation, or conceptual sequence it supports, unless it is explicitly a cover image. Never assign one image to every H2 or use fixed paragraph intervals.

## Output Contract

Start with the cover decision, then a compact body-image selection summary containing these five groups, even when a group is empty:

1. final body `AI_IMAGE` positions, maximum two when a cover is selected;
2. `AI_IMAGE_OPTIONAL` positions;
3. `AI_IMAGE_SKIPPED` positions;
4. `SCREENSHOT_REQUIRED` positions;
5. `NO_IMAGE` positions.

Then list detailed decisions in article order. Keep section names and insertion anchors specific enough that an editor can locate them without guessing.

For every authentic screenshot item, use:

```yaml
classification: SCREENSHOT_REQUIRED
section:
screenshot_target:
screenshot_reason:
screenshot_note:
recommended_position:
alt_text:
```

In `screenshot_note`, state the required page state, visible controls or data, capture boundary, and any sensitive information that must be hidden. Do not claim that a screenshot exists unless it was actually captured or supplied.

For every final `AI_IMAGE`, report the complete score, why it is one of the article's most-needed positions, and a production-ready Image Brief:

```yaml
classification: AI_IMAGE
selection_rank:
scores:
  visual_break_value: 0
  aesthetic_value: 0
  relevance: 0
  comprehension_gain: 0
  redundancy_penalty: 0
  total_score: 0
why_most_needed:
image_id:
section:
insert_position:
purpose:
image_type:
must_include:
must_avoid:
composition:
style:
aspect_ratio:
prompt:
alt_text:
filename:
```

Make the prompt consistent with the brief and explicitly exclude real or simulated UI when relevant. Use concise, descriptive alt text without keyword stuffing. Use a stable, descriptive, lowercase, hyphen-separated filename with an appropriate image extension.

For every optional candidate, use:

```yaml
classification: AI_IMAGE_OPTIONAL
section:
candidate_position:
scores:
  visual_break_value: 0
  aesthetic_value: 0
  relevance: 0
  comprehension_gain: 0
  redundancy_penalty: 0
  total_score: 0
reason:
```

Do not create an Image Brief unless the item is formally promoted to `AI_IMAGE`.

For every above-threshold candidate excluded by the cap, use:

```yaml
classification: AI_IMAGE_SKIPPED
selection_rank:
section:
candidate_position:
scores:
  visual_break_value: 0
  aesthetic_value: 0
  relevance: 0
  comprehension_gain: 0
  redundancy_penalty: 0
  total_score: 0
reason: 已达到单篇 3 张 AI 图上限，优先保留更高价值图片。
```

For every rejected candidate, use:

```yaml
classification: NO_IMAGE
section:
candidate_position:
reason:
scores:
  visual_break_value: 0
  aesthetic_value: 0
  relevance: 0
  comprehension_gain: 0
  redundancy_penalty: 0
  total_score: 0
```

Scores may be omitted for `NO_IMAGE` when the decision was made before the AI candidate pool, such as a position with no clear visual, comprehension, or layout value. Always provide a concrete reason.

End with counts for the cover and all five body states, plus any unresolved screenshot blockers. Counts must reflect the final cap and any optional promotion. Set:

```yaml
STATUS: IMAGE_PLAN_READY
COVER_IMAGE_REQUIRED: true
COVER_IMAGE_DONE: false
SCREENSHOT_PENDING: true
FULLY_PUBLISH_READY: false
NEXT_STAGE: aicodewith-image-generation
```

`SCREENSHOT_PENDING` is true whenever at least one authentic screenshot item remains uncaptured. `body-image-tasks.json` passes only final `AI_IMAGE` items to the executor and gives each `task_status: IMAGE_GENERATION_REQUIRED`; it must never include screenshot, optional, skipped, or no-image items as generation tasks.

## Generate Only When Explicitly Requested

Planning and generation are separate phases. During planning, produce classifications and Image Briefs for final `AI_IMAGE` items only.

Only after the user explicitly requests generation may the `aicodewith-image-generation` skill be loaded and called. A user-approved pipeline run that explicitly includes image execution counts as that request. Pass it only the `COVER_IMAGE_REQUIRED` task and final `IMAGE_GENERATION_REQUIRED` body tasks. Never send `AI_IMAGE_OPTIONAL`, `AI_IMAGE_SKIPPED`, `SCREENSHOT_REQUIRED`, or `NO_IMAGE` items to an image generator.

Do not generate images merely because this skill was invoked. Do not capture or fabricate screenshots without a separate request and access to the authentic interface.
