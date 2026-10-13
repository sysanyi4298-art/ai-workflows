import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type DomainIntersectionOutcome,
  type IntersectionRow,
  SpendCapExceededError,
} from "./dataforseo"
import { type OutreachStore, openStore } from "./db"
import { discoverGaps, type IntersectionCaller } from "./discover"

const COMPETITORS = [
  "openrouter.ai",
  "302.ai",
  "aihubmix.com",
  "siliconflow.com",
  "together.ai",
] as const

function row(domain: string, score: number): IntersectionRow {
  return { domain, rank: 10, backlinks_spam_score: score }
}

class FakeClient implements IntersectionCaller {
  spent = 0
  readonly calls: string[] = []

  constructor(private readonly pages: Readonly<Record<string, readonly IntersectionRow[]>>) {}

  requestDomainIntersection(host: string): Promise<DomainIntersectionOutcome> {
    this.calls.push(host)
    this.spent += 0.024
    return Promise.resolve({ cost: 0.024, items: this.pages[host] ?? [] })
  }
}

describe("discoverGaps", () => {
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
    dir = mkdtempSync(join(tmpdir(), "outreach-discover-"))
    store = openStore(join(dir, "outreach.sqlite"))
    return store
  }

  test("inserts deduped domains from five calls and keeps a high-spam .cn domain", async () => {
    const current = open()
    current.suppress("suppressed.example")
    const client = new FakeClient({
      "openrouter.ai": [
        row("example.com", 80),
        row("example.cn", 80),
        row("good.example", 10),
        row("https://www.aicodewith.ai/zh", 0),
      ],
      "302.ai": [row("good.example", 10), row("second.example", 20)],
      "aihubmix.com": [row("suppressed.example", 5)],
      "siliconflow.com": [],
      "together.ai": [row("with7.cn", 1)],
    })

    await discoverGaps({
      competitors: COMPETITORS,
      client,
      store: current,
      runId: "run-1",
    })

    expect(client.calls).toEqual([...COMPETITORS])
    expect(current.countDomains()).toBe(3)
    expect(current.getDomain("example.com")).toBeUndefined()
    expect(current.getDomain("example.cn")?.status).toBe("discovered")
    expect(current.getDomain("good.example")).toBeDefined()
    expect(current.getDomain("second.example")).toBeDefined()
    expect(current.getDomain("suppressed.example")).toBeUndefined()
    expect(current.getDomain("aicodewith.ai")).toBeUndefined()
    expect(current.getRunSpend("run-1")).toBeCloseTo(0.12)
  })

  test("performs zero lookups when the next call would exceed the cap", async () => {
    const current = open()
    const calls: string[] = []
    const client: IntersectionCaller = {
      spent: 0.14,
      requestDomainIntersection(host) {
        calls.push(host)
        return Promise.resolve({ cost: 0, items: [] })
      },
    }

    await expect(
      discoverGaps({ competitors: COMPETITORS, client, store: current, runId: "run-1" }),
    ).rejects.toBeInstanceOf(SpendCapExceededError)
    expect(calls).toHaveLength(0)
    expect(current.countDomains()).toBe(0)
  })
})
