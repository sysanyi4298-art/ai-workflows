---
name: directory-outreach
description: Run the local AI Code With directory-outreach CLI (see the sibling `cli/directory-outreach` folder in this repo, or your own checkout). Use when the user asks to find competitor backlinks, 收录, 外链, 目录投稿, qualify a site, compose a paste draft, review the exact outbound text, approve or reject a domain, or export an eml or comment file. Do not send email, submit a form, or post a comment unless a later publish step exists and the user names an already-approved domain.
---

# Directory outreach

The tool lives in this repo at `cli/directory-outreach` (or your own local checkout of it). It finds sites that link to competitors but not to AI Code With, classifies the submission channel, and writes a draft. It does not send mail, submit a form, or post a comment. Publishing is not implemented.

Run commands in that directory. `bun` is typically `~/.bun/bin/bun`. Credentials are read from `.env`. Load them in the same shell as the command. Never print `.env`, `DATAFORSEO_LOGIN`, or `DATAFORSEO_PASSWORD`.

```sh
cd cli/directory-outreach
export PATH="$HOME/.bun/bin:$PATH"
set -a && source .env && set +a
```

## Commands

Run these in order. Stop and show the result before the next paid or destructive step.

| Command | Effect | Cost |
| --- | --- | --- |
| `bun src/cli.ts discover` | Five competitor lookups. Cap $0.15, about $0.12. | Real money. Run only when the user explicitly asks to discover or refresh gaps. |
| `bun src/cli.ts qualify` | Opens each discovered site and stores form, email, comment, friend link, paid, or none. | No API spend. One site at a time, about 1 second between requests. |
| `bun src/cli.ts compose` | Builds packets from `config/listing.yaml` and assigns local short codes. Skips `approved`, `rejected`, and `exported`, so an approved draft stays frozen. | None. |
| `bun src/cli.ts review` | Prints the exact outbound text for each queued or approved email, form, and comment. This is the review sheet. | None. |
| `bun src/cli.ts list` | Prints domains ready to paste, then any local short-code rows still waiting for the production table. Omits `blocked_icp` and packets blocked for a missing required logo. | None. |
| `bun src/cli.ts show <domain>` | Prints one packet. | None. |
| `bun src/cli.ts approve <domain>` | Marks it exportable. | None. |
| `bun src/cli.ts reject <domain>` | Rejects it and skips it on later discovers. | None. |
| `bun src/cli.ts export <domain>` | Writes files under `out/<domain>/`. Requires `approved`. | None. |

`<domain>` is the registrable domain, such as `guideai.com.cn`.

## Copy

Outreach From, Reply-To, form contact, and signature use `sysanyi4298@gmail.com`. The crawler `User-Agent` stays `mailto:support@aicodewith.com`. Do not swap those two.

Subject: `申请收录 AI Code With｜多模型 API 与 AI 编程工具接入`.

Write from `config/listing.yaml`, not from homepage marketing. Both the letter and the comment use the same five blocks, in order, and each block adds a fact the previous block did not already say: submission request, product positioning plus shared quota and usage billing, model prices and independent API keys, product links, then a short close. The letter adds `您好，` before those blocks and `谢谢！` plus the signature after them. The comment omits the subject, the greeting, `谢谢！`, and the signature. Do not disguise a comment as a user review.

If the page heading is a real category, the request names it once: `想向贵站的「分类名称」分类提交 AI Code With，供您审核收录`. The close then says `如符合贵站收录标准，希望能加入相关分类。` and does not repeat the category name. If the heading is not a real category, write `想向贵站提交 AI Code With，供您审核收录` and close with `如符合贵站收录标准，希望能被收录。` Do not guess a category. Do not write `因为贵站分类是…因此申请`, `请审核是否收录`, or `核验页面`.

The positioning block is exactly the listing blurb: AI Code With is a multi-model API platform for individual developers and technical teams; users pick models on one platform, manage one quota, and pay for actual usage, instead of keeping separate accounts and bills. The next block is exactly the listing detail, and only that block adds the new facts: model prices and tool setup docs are on the official site; a separate API key can limit spend and allowed models for a project or teammate. Say `独立 API Key`. Do not name DeepSeek, 通义千问, Kimi, or GLM in the letter. Do not say `一个 API Key` or `集中管理 API Key`. Do not say one key uses the same protocol for every model or that every tool is fully compatible. Do not write 额度一年有效, 永久有效, 30+, discounts, trial prices, package prices, referral fees, payment methods, invoices, uptime, or savings. Do not write 可支持大企业使用 or 企业支持定制. The close always ends with `如需 logo、指定格式的简介或其他资料，我可以按要求补充。`

Default email links, all with the same short code:

- `https://aicodewith.ai/zh?s=xgwlNN`
- `https://aicodewith.ai/zh/models?s=xgwlNN`
- `https://aicodewith.ai/zh/integrations?s=xgwlNN`

Do not pad extra links. Keep an existing query and hash, and do not append a second `s`. Do not tag email addresses, API endpoints, or other subdomains. The same site keeps one code across channels. Do not insert rows into the production `utm_short_codes` table.

A comment is only for a page that explicitly accepts a product recommendation or directory submission. It uses the same five blocks as the letter, including the same promo links, each once. Never link vscode or claude-code. Do not invent a user review.

Do not write `MISSING`, TODO, or an internal source URL into outbound copy. Omit an optional logo. If the page requires a logo and none is configured, export stops and asks for the file. Filing numbers are required only when the submission rules say so. A footer "备案" line is not enough. Do not invent a filing number.

## After review

Show `bun src/cli.ts review` before asking for approval. That text is what would be sent. `approve` locks it; a later `compose` must not overwrite `approved`, `rejected`, or `exported` packets. Do not send, submit, or post. Publishing is not implemented.

Tell the user which file to paste if they still export. Do not send it yourself.

- Email: `out/<domain>/message.eml` and `message.md`. The user sends the `.eml`.
- Form: `out/<domain>/FORM.txt`.
- Comment: `out/<domain>/COMMENT.txt`.
- Friend link or paid listing: `out/<domain>/NOTE.md` only.

Do not commit `.env`, `data/`, or `out/`. Do not add SMTP or browser automation.
