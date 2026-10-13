import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type CrawlFetch, crawlHost, GAP_MS } from "./crawl"
import { type OutreachStore, openStore } from "./db"

const FIXTURE = readFileSync(
  join(import.meta.dir, "..", "test", "fixtures", "guideai-join.html"),
  "utf8",
)
const ORIGIN = "https://www.guideai.com.cn"

function response(status: number, body: string): Response {
  return new Response(body, { status })
}

function mockFetch(routes: ReadonlyMap<string, Response>): {
  readonly fetch: CrawlFetch
  readonly calls: string[]
} {
  const calls: string[] = []
  const fetch: CrawlFetch = (url) => {
    calls.push(url)
    const found = routes.get(url)
    return Promise.resolve(found ?? response(404, "missing"))
  }
  return { fetch, calls }
}

describe("crawlHost", () => {
  let dir: string | undefined
  let store: OutreachStore | undefined

  afterEach(() => {
    store?.close()
    store = undefined
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true })
    }
    dir = undefined
  })

  function open(): OutreachStore {
    dir = mkdtempSync(join(tmpdir(), "outreach-crawl-"))
    store = openStore(join(dir, "outreach.sqlite"))
    return store
  }

  test("stores email when /join is a GuideAI-shaped page and /submit is 404", async () => {
    const routes = new Map<string, Response>([
      [`${ORIGIN}/robots.txt`, response(200, "User-agent: *\nAllow: /\n")],
      [`${ORIGIN}/join`, response(200, FIXTURE)],
    ])
    const { fetch, calls } = mockFetch(routes)
    const gaps: number[] = []
    const current = open()

    const hit = await crawlHost({
      origin: ORIGIN,
      domain: "guideai.com.cn",
      allowlist: ["guideai.com.cn"],
      runId: "run-1",
      fetch,
      sleep: (ms) => {
        gaps.push(ms)
        return Promise.resolve()
      },
      store: current,
    })

    expect(hit.channel).toBe("email")
    expect(hit.mailto).toBe("hello@guideai.com.cn")
    expect(hit.pageUrl).toBe(`${ORIGIN}/join`)
    expect(calls).toContain(`${ORIGIN}/submit`)
    expect(gaps.every((gap) => gap === GAP_MS)).toBe(true)
    const row = current.getDomain("guideai.com.cn")
    expect(row?.channel).toBe("email")
    expect(row?.status).toBe("qualified")
    expect(row?.page_url).toBe(`${ORIGIN}/join`)
  })

  test("does not fetch /join when robots.txt disallows it", async () => {
    const routes = new Map<string, Response>([
      [`${ORIGIN}/robots.txt`, response(200, "User-agent: *\nDisallow: /join\n")],
      [`${ORIGIN}/`, response(200, "<title>首页</title><p>没有提交入口</p>")],
    ])
    const { fetch, calls } = mockFetch(routes)
    const current = open()

    const hit = await crawlHost({
      origin: ORIGIN,
      domain: "guideai.com.cn",
      allowlist: [],
      runId: "run-1",
      fetch,
      sleep: () => Promise.resolve(),
      store: current,
    })

    expect(calls).not.toContain(`${ORIGIN}/join`)
    expect(hit.channel).toBe("none")
    expect(current.getDomain("guideai.com.cn")?.channel).toBe("none")
  })
})
