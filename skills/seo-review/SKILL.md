---
name: seo-review
description: Review a completed AI Code With platform article for SEO publication readiness after platform adaptation and before image planning or final publication. Use for final SEO review, publication approval, re-review after fixes, or publish-gate decisions; do not use for topic discovery, full-article rewriting, or image generation.
---

# AI Code With SEO Review

Read the project-root `SEO_REVIEW.md` completely before reviewing an article. It is the canonical rule and scoring source.

This Skill runs only after Platform Adaptation and before Image Planning. Review the actual platform article, not only its mother draft.

## Execution

1. Run `scripts/seo_review.py prepare --article <platform-article>` and pass available duplicate, `evidence-qa`, and internal-link evidence paths. The executor also reads the source article, canonical `PRODUCT_KNOWLEDGE.md`, and the historical article index. The legacy `--fact-qa` option is migration-only; ARTICLE_QA is non-scoring context and cannot affect publication eligibility.
2. Assess the generated request against `SEO_REVIEW.md`. Do not guess facts or mark unverified claims correct. Save one structured assessment matching the request's `assessment_schema`.
3. Run `scripts/seo_review.py finalize --request <request.json> --assessment <assessment.json>`.
4. Continue to image planning only when the result is `GREEN`, the score is at least 85, `SEO_REVIEW_VETO=false`, and `PUBLISH_ALLOWED=true`. The executor unlocks the pre-created image-planning request only in that case.
5. After image/screenshot work, use the existing final package and `platform_image_pipeline.py verify-ready` gates. They must also consume the SEO Review result.

Never hand-edit a score to bypass a veto. A non-GREEN result remains at `seo-review-revision`, and must be reviewed again after the article changes.

The final human-readable report must use the fixed format in `SEO_REVIEW.md`, and its final decision must be exactly one of the two permitted decisions.
