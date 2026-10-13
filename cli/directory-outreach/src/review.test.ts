import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type DomainRecord, type OutreachStore, openStore } from "./db"
import { composeKeepsPacket } from "./queue"
import { formatReview } from "./review"

function sample(overrides: Partial<DomainRecord> = {}): DomainRecord {
  return {
    domain: "nav.example",
    channel: "email",
    status: "queued",
    page_url: "https://nav.example/join",
    mailto: "hello@nav.example",
    cost_usd: 0,
    run_id: "run-1",
    ...overrides,
  }
}

describe("formatReview", () => {
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
    dir = mkdtempSync(join(tmpdir(), "outreach-review-"))
    store = openStore(join(dir, "outreach.sqlite"))
    return store
  }

  test("prints the queued letter and hides a blocked domain", () => {
    const current = open()
    current.upsertDomain(sample())
    current.setPacket(
      "nav.example",
      JSON.stringify({
        kind: "email",
        mailto: "hello@nav.example",
        subject: "申请收录",
        body: "LETTER-BODY",
      }),
    )
    current.upsertDomain(sample({ domain: "blocked.example", status: "blocked_icp" }))
    current.setPacket(
      "blocked.example",
      JSON.stringify({ kind: "email", mailto: "a@b.co", subject: "x", body: "HIDDEN" }),
    )

    const text = formatReview(current)

    expect(text).toContain("# nav.example")
    expect(text).toContain("渠道: 邮件")
    expect(text).toContain("状态: 待审核")
    expect(text).toContain("LETTER-BODY")
    expect(text).not.toContain("blocked.example")
    expect(text).not.toContain("HIDDEN")
  })

  test("marks an approved packet as locked", () => {
    const current = open()
    current.upsertDomain(sample({ status: "approved", channel: "comment" }))
    current.setPacket(
      "nav.example",
      JSON.stringify({
        kind: "comment",
        pageUrl: "https://nav.example/item",
        body: "COMMENT-BODY",
        links: [],
      }),
    )

    const text = formatReview(current)

    expect(text).toContain("状态: 已锁定")
    expect(text).toContain("渠道: 评论")
    expect(text).toContain("COMMENT-BODY")
  })
})

describe("composeKeepsPacket", () => {
  test("refuses to replace an approved packet", () => {
    expect(composeKeepsPacket("approved")).toBe(true)
    expect(composeKeepsPacket("exported")).toBe(true)
    expect(composeKeepsPacket("rejected")).toBe(true)
    expect(composeKeepsPacket("queued")).toBe(false)
  })
})
