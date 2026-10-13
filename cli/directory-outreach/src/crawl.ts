import type { Channel, OutreachStore, Status } from "./db"
import { qualifyPage } from "./qualify"
import { disallowedPaths, isBlocked } from "./robots"

export const USER_AGENT = "AicodewithDirectoryBot/0.1 (+mailto:support@aicodewith.com)"
export const MAX_GETS = 8
export const GAP_MS = 1000
export const TIMEOUT_MS = 10_000

const PROBES = [
  "/",
  "/join",
  "/submit",
  "/contribute",
  "/guestbook",
  "/links",
  "/link",
  "/friends",
  "/friend",
  "/fl",
] as const

const LINK_TEXT = /投稿|收录|提交|友链|友情链接|submit|join/i

export type CrawlFetch = (
  url: string,
  init: { readonly signal: AbortSignal; readonly headers: { readonly "User-Agent": string } },
) => Promise<Response>

export type CrawlHostInput = {
  readonly origin: string
  readonly domain: string
  readonly allowlist: readonly string[]
  readonly runId: string
  readonly fetch: CrawlFetch
  readonly sleep: (ms: number) => Promise<void>
  readonly store: OutreachStore
}

export type CrawlHit = {
  readonly channel: Channel
  readonly pageUrl: string | null
  readonly mailto: string | null
  readonly html: string | null
}

type Hit = CrawlHit

function rank(channel: Channel): number {
  switch (channel) {
    case "form":
      return 6
    case "email":
      return 5
    case "comment":
      return 4
    case "friend_link":
      return 3
    case "paid_only":
      return 2
    case "none":
      return 1
    case "unknown":
      return 0
    default: {
      const unreachable: never = channel
      return unreachable
    }
  }
}

function statusFor(channel: Channel): Status {
  switch (channel) {
    case "form":
    case "email":
    case "comment":
    case "friend_link":
    case "paid_only":
      return "qualified"
    case "none":
    case "unknown":
      return "discovered"
    default: {
      const unreachable: never = channel
      return unreachable
    }
  }
}

function pageUrl(origin: string, path: string): string {
  const base = origin.endsWith("/") ? origin : `${origin}/`
  return new URL(path, base).href
}

function attr(tagAttrs: string, name: string): string | undefined {
  const match = tagAttrs.match(new RegExp(String.raw`${name}\s*=\s*("([^"]*)"|'([^']*)')`, "i"))
  return match?.[2] ?? match?.[3]
}

function firstMail(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, " ")
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (match === null) {
    return null
  }
  return match[0] ?? null
}

async function readPage(fetchPage: CrawlFetch, url: string): Promise<string | undefined> {
  try {
    const response = await fetchPage(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    })
    if (response.status >= 400) {
      return undefined
    }
    return await response.text()
  } catch (error) {
    if (error instanceof Error) {
      return undefined
    }
    throw error
  }
}

function firstOnPagePath(html: string, origin: string): string | undefined {
  const originUrl = new URL(origin)
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const text = (match[2] ?? "").replace(/<[^>]+>/g, "")
    if (!LINK_TEXT.test(text)) {
      continue
    }
    const href = attr(match[1] ?? "", "href")
    if (href === undefined || href.startsWith("mailto:")) {
      continue
    }
    let url: URL
    try {
      url = new URL(href, originUrl)
    } catch (error) {
      if (error instanceof TypeError) {
        continue
      }
      throw error
    }
    if (url.host !== originUrl.host) {
      continue
    }
    return `${url.pathname}${url.search}`
  }
  return undefined
}

function emptyHit(): Hit {
  return { channel: "none", pageUrl: null, mailto: null, html: null }
}

export async function crawlHost(input: CrawlHostInput): Promise<CrawlHit> {
  const origin = input.origin.replace(/\/$/, "")
  const robots = await readPage(input.fetch, pageUrl(origin, "/robots.txt"))
  const rules = robots === undefined ? [] : disallowedPaths(robots, USER_AGENT)
  const pending: string[] = []
  for (const path of PROBES) {
    if (!isBlocked(path, rules)) {
      pending.push(path)
    }
  }
  const seen = new Set<string>()
  let best = emptyHit()
  let fetched = 0
  let index = 0
  while (index < pending.length && fetched < MAX_GETS) {
    const path = pending[index]
    index += 1
    if (path === undefined || seen.has(path)) {
      continue
    }
    seen.add(path)
    if (fetched > 0) {
      await input.sleep(GAP_MS)
    }
    fetched += 1
    const url = pageUrl(origin, path)
    const html = await readPage(input.fetch, url)
    if (html === undefined) {
      continue
    }
    const channel = qualifyPage({ html, pageUrl: url, allowlist: input.allowlist })
    if (rank(channel) > rank(best.channel)) {
      best = { channel, pageUrl: url, mailto: firstMail(html), html }
    }
    const extra = firstOnPagePath(html, origin)
    if (
      extra !== undefined &&
      !seen.has(extra) &&
      !pending.includes(extra) &&
      !isBlocked(extra, rules)
    ) {
      pending.push(extra)
    }
  }
  const existing = input.store.getDomain(input.domain)
  input.store.upsertDomain({
    domain: input.domain,
    channel: best.channel,
    status: statusFor(best.channel),
    page_url: best.pageUrl,
    mailto: best.mailto,
    cost_usd: existing?.cost_usd ?? 0,
    run_id: input.runId,
  })
  return best
}
