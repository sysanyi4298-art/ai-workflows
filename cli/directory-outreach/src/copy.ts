import { ForbiddenListingCopyError, type Listing } from "./config"
import { findForbiddenCopy } from "./copy-rules"
import { withPromoCode } from "./promo-url"

export const OUTREACH_SUBJECT = "申请收录 AI Code With｜多模型 API 与 AI 编程工具接入"

const STIFF = [
  "请审核是否收录",
  "核验页面",
  "因此申请",
  "同一个入口",
  "完全兼容",
  "长期关注",
  "预充值",
] as const

export type LetterInput = {
  readonly listing: Listing
  readonly category: string | undefined
  readonly links: readonly string[]
}

const ACTION_RE = /申请收录|提交网站|站点提交|submit|join/i

function tagText(html: string, tag: string): string {
  const match = html.match(new RegExp(String.raw`<${tag}\b[^>]*>([\s\S]*?)</${tag}>`, "i"))
  return (match?.[1] ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function usableCategory(value: string): string | undefined {
  if (value.length === 0 || value.length > 24 || /[。！？]/.test(value) || ACTION_RE.test(value)) {
    return undefined
  }
  return value
}

export function pageCategory(html: string): string | undefined {
  return usableCategory(tagText(html, "h1")) ?? usableCategory(tagText(html, "title"))
}

export function blurbLimit(html: string): number | undefined {
  for (const tag of html.matchAll(/<input\b[^>]*>/gi)) {
    const raw = tag[0]
    if (raw === undefined || !raw.includes("简介")) {
      continue
    }
    const digits = raw.match(/maxlength\s*=\s*"(\d+)"/i)?.[1]
    if (digits === undefined) {
      return undefined
    }
    const limit = Number(digits)
    return Number.isInteger(limit) && limit > 0 ? limit : undefined
  }
  return undefined
}

export function promoLinks(listing: Listing, code: string): readonly string[] {
  return [listing.url, listing.models_url, listing.integrations_url].map((url) =>
    withPromoCode(url, code),
  )
}

function assertSpeakable(text: string): string {
  const forbidden = findForbiddenCopy(text)
  if (forbidden !== undefined) {
    throw new ForbiddenListingCopyError(forbidden)
  }
  const stiff = STIFF.find((needle) => text.includes(needle))
  if (stiff !== undefined) {
    throw new ForbiddenListingCopyError(stiff)
  }
  return text
}

function purpose(name: string, category: string | undefined): string {
  if (category === undefined) {
    return `想向贵站提交 ${name}，供您审核收录。`
  }
  return `想向贵站的「${category}」分类提交 ${name}，供您审核收录。`
}

function ask(category: string | undefined): string {
  const materials = "如需 logo、指定格式的简介或其他资料，我可以按要求补充。"
  if (category === undefined) {
    return `如符合贵站收录标准，希望能被收录。${materials}`
  }
  return `如符合贵站收录标准，希望能加入相关分类。${materials}`
}

function linkLabel(url: string): string {
  try {
    const path = new URL(url).pathname
    if (path === "/zh/models" || path.startsWith("/zh/models/")) {
      return "模型与价格"
    }
    if (path.includes("/integrations")) {
      return "工具接入"
    }
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error
    }
  }
  return "官网"
}

function productBlock(links: readonly string[]): string {
  const lines = links.slice(0, 3).map((url) => `- ${linkLabel(url)}：${url}`)
  if (lines.length === 0) {
    return ""
  }
  return ["产品资料：", ...lines].join("\n")
}

function outreachBody(input: LetterInput): readonly string[] {
  return [
    purpose(input.listing.name, input.category),
    input.listing.blurb,
    input.listing.detail,
    productBlock(input.links),
    ask(input.category),
  ].filter((part) => part.length > 0)
}

export function emailLetter(input: LetterInput): string {
  const parts = [
    "您好，",
    ...outreachBody(input),
    "谢谢！",
    `${input.listing.name}\n${input.listing.contact}`,
  ]
  return assertSpeakable(parts.join("\n\n"))
}

export function commentDraft(input: LetterInput): string {
  return assertSpeakable(outreachBody(input).join("\n\n"))
}
