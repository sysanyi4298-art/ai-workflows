export type CommentLinkInput = {
  readonly pageText: string
  readonly pool: readonly string[]
}

export class MissingPoolLinkError extends Error {
  readonly name = "MissingPoolLinkError"
  constructor(readonly kind: "homepage" | "models") {
    super(`comment pool is missing ${kind}`)
  }
}

const BANNED = [
  "vscode",
  "claude-code",
  "pricing",
  "dashboard",
  "login",
  "with7.cn",
  "aicodewith.com",
]

function isBanned(url: string): boolean {
  const lower = url.toLowerCase()
  return BANNED.some((needle) => lower.includes(needle))
}

function mentions(pageText: string, slug: string): boolean {
  const needle = slug.toLowerCase().replaceAll("-", "")
  const tokens = pageText.toLowerCase().split(/[^a-z0-9]+/)
  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index]
    if (current === undefined || current.length === 0) {
      continue
    }
    if (current === needle) {
      return true
    }
    const next = tokens[index + 1]
    if (next !== undefined && next.length > 0 && `${current}${next}` === needle) {
      return true
    }
  }
  return false
}

function requireLink(pool: readonly string[], kind: "homepage" | "models"): string {
  const found =
    kind === "homepage"
      ? pool.find((url) => !url.includes("/models") && !url.includes("/integrations/"))
      : pool.find((url) => url.includes("/models"))
  if (found === undefined || isBanned(found)) {
    throw new MissingPoolLinkError(kind)
  }
  return found
}

function firstTool(pageText: string, pool: readonly string[]): string | undefined {
  for (const url of pool) {
    const marker = "/integrations/"
    const at = url.indexOf(marker)
    if (at === -1 || isBanned(url)) {
      continue
    }
    const slug = url.slice(at + marker.length).replace(/\/$/, "")
    if (mentions(pageText, slug)) {
      return url
    }
  }
  return undefined
}

function wantsModels(pageText: string): boolean {
  return /模型|models/i.test(pageText)
}

export function pickCommentLinks(input: CommentLinkInput): readonly string[] {
  const links = [requireLink(input.pool, "homepage")]
  if (wantsModels(input.pageText)) {
    links.push(requireLink(input.pool, "models"))
  }
  const tool = firstTool(input.pageText, input.pool)
  if (tool !== undefined && !links.includes(tool)) {
    links.push(tool)
  }
  return links.slice(0, 3)
}
