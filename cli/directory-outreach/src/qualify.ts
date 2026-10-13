import type { Channel } from "./db"

export type QualifyInput = {
  readonly html: string
  readonly pageUrl: string
  readonly allowlist: readonly string[]
}

const SUBMIT_RE = /投稿|收录|submit|join|提交网站|申请收录/i
const FRIEND_RE = /友情链接|交换友链|友链申请|friend link/i
const PAID_RE = /付费收录|收费收录|仅限付费|paid only/i
const INVITE_RE = /欢迎推荐|提交收录|接受产品推荐|欢迎投稿|目录提交|推荐你的工具|欢迎提交工具/
const ICP_RE = /备案信息必填|备案号必填|必须填写备案|ICP必填|不填写不予通过/
const LOGO_TEXT_RE = /应用标识必填|logo必填|应用图标必填/i
const MAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const WORD_RE = /投稿|收录|submit|join|提交网站|申请收录/gi
const NEAR_CHARS = 240

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ")
}

function visibleText(html: string): string {
  const withMailto = html.replace(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi, " $1 ")
  return stripTags(withMailto).replace(/\s+/g, " ")
}

function attr(tagAttrs: string, name: string): string | undefined {
  const match = tagAttrs.match(new RegExp(String.raw`${name}\s*=\s*("([^"]*)"|'([^']*)')`, "i"))
  return match?.[2] ?? match?.[3]
}

function headingBefore(html: string, formIndex: number): string {
  const window = html.slice(Math.max(0, formIndex - 800), formIndex)
  const headings = [...window.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
  const last = headings.at(-1)
  return stripTags(last?.[1] ?? "")
}

function hasQualifyingForm(html: string): boolean {
  for (const tag of html.matchAll(/<form\b([^>]*)>/gi)) {
    const action = attr(tag[1] ?? "", "action") ?? ""
    if (SUBMIT_RE.test(action)) {
      return true
    }
    if (SUBMIT_RE.test(headingBefore(html, tag.index ?? 0))) {
      return true
    }
  }
  return false
}

function hasSubmitMailbox(html: string): boolean {
  const text = visibleText(html)
  const mails = [...text.matchAll(MAIL_RE)]
  const words = [...text.matchAll(WORD_RE)]
  for (const mail of mails) {
    const at = mail.index ?? 0
    for (const word of words) {
      if (Math.abs(at - (word.index ?? 0)) <= NEAR_CHARS) {
        return true
      }
    }
  }
  return false
}

function hasCommentBox(html: string): boolean {
  if (html.includes("登录后评论")) {
    return false
  }
  return /<textarea\b[^>]*(comment|评论)/i.test(html)
}

export function submissionRequiresIcp(html: string): boolean {
  return ICP_RE.test(visibleText(html))
}

export function pageRequiresLogo(html: string): boolean {
  if (LOGO_TEXT_RE.test(visibleText(html))) {
    return true
  }
  return /<input\b[^>]*(?:required[^>]*(?:logo|应用标识)|(?:logo|应用标识)[^>]*required)/i.test(
    html,
  )
}

export function qualifyPage(input: QualifyInput): Channel {
  if (hasQualifyingForm(input.html)) {
    return "form"
  }
  if (hasSubmitMailbox(input.html)) {
    return "email"
  }
  if (hasCommentBox(input.html) && INVITE_RE.test(visibleText(input.html))) {
    return "comment"
  }
  if (FRIEND_RE.test(visibleText(input.html))) {
    return "friend_link"
  }
  if (PAID_RE.test(visibleText(input.html))) {
    return "paid_only"
  }
  return "none"
}
