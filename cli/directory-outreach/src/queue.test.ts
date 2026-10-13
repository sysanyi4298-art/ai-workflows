import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { DomainIntersectionOutcome, IntersectionRow } from "./dataforseo"
import { type DomainRecord, type OutreachStore, openStore } from "./db"
import { discoverGaps, type IntersectionCaller } from "./discover"
import { approveDomain, formatReadyList, rejectDomain } from "./queue"

function sample(overrides: Partial<DomainRecord>): DomainRecord {
  return {
    domain: "example.com",
    channel: "form",
    status: "queued",
    page_url: null,
    mailto: null,
    cost_usd: 0,
    run_id: "run-1",
    ...overrides,
  }
}

class FakeClient implements IntersectionCaller {
  spent = 0
  readonly calls: string[] = []

  requestDomainIntersection(host: string): Promise<DomainIntersectionOutcome> {
    this.calls.push(host)
    this.spent += 0.024
    const items: readonly IntersectionRow[] = [
      { domain: "skip.example", rank: 1, backlinks_spam_score: 1 },
    ]
    return Promise.resolve({ cost: 0.024, items })
  }
}

describe("approval queue", () => {
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
    dir = mkdtempSync(join(tmpdir(), "outreach-queue-"))
    store = openStore(join(dir, "outreach.sqlite"))
    return store
  }

  test("lists ready domains and omits blocked filings", () => {
    const current = open()
    current.upsertDomain(sample({ domain: "form.example", channel: "form", status: "queued" }))
    current.upsertDomain(sample({ domain: "mail.example", channel: "email", status: "qualified" }))
    current.upsertDomain(
      sample({ domain: "blocked.example", channel: "comment", status: "blocked_icp" }),
    )
    current.upsertDomain(
      sample({ domain: "friend.example", channel: "friend_link", status: "qualified" }),
    )

    const listed = formatReadyList(current)

    expect(listed).toContain("form.example")
    expect(listed).toContain("mail.example")
    expect(listed).not.toContain("blocked.example")
    expect(listed).not.toContain("friend.example")
  })

  test("approve changes status", () => {
    const current = open()
    current.upsertDomain(sample({ domain: "form.example" }))

    approveDomain(current, "form.example")

    expect(current.getDomain("form.example")?.status).toBe("approved")
  })

  test("reject suppresses the domain so the next discover skips it", async () => {
    const current = open()
    current.upsertDomain(sample({ domain: "skip.example", channel: "email", status: "queued" }))
    rejectDomain(current, "skip.example")
    const client = new FakeClient()

    await discoverGaps({
      competitors: ["openrouter.ai"],
      client,
      store: current,
      runId: "run-2",
    })

    expect(current.getDomain("skip.example")?.status).toBe("rejected")
    expect(current.isSuppressed("skip.example")).toBe(true)
    expect(current.countDomains()).toBe(1)
  })
})
