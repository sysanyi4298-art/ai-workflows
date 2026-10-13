import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DEFAULT_DB_PATH, type DomainRecord, type OutreachStore, openStore } from "./db"

function sample(overrides: Partial<DomainRecord> = {}): DomainRecord {
  return {
    domain: "guideai.com.cn",
    channel: "unknown",
    status: "discovered",
    page_url: null,
    mailto: null,
    cost_usd: 0.024,
    run_id: "run-1",
    ...overrides,
  }
}

describe("OutreachStore", () => {
  let dir: string | undefined
  let store: OutreachStore | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "outreach-db-"))
    store = openStore(join(dir, "outreach.sqlite"))
  })

  afterEach(() => {
    store?.close()
    store = undefined
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true })
    }
    dir = undefined
  })

  test("DEFAULT_DB_PATH is the gitignored outreach sqlite file", () => {
    expect(DEFAULT_DB_PATH).toBe("data/outreach.sqlite")
  })

  test("upsertDomain keeps one row when the same domain is inserted twice", () => {
    if (store === undefined) {
      throw new Error("store fixture missing")
    }
    store.upsertDomain(sample({ channel: "form" }))
    store.upsertDomain(sample({ channel: "email" }))
    expect(store.countDomains()).toBe(1)
  })

  test("upsertDomain updates channel when the same domain is inserted with a new channel", () => {
    if (store === undefined) {
      throw new Error("store fixture missing")
    }
    store.upsertDomain(sample({ channel: "form", status: "discovered" }))
    store.upsertDomain(sample({ channel: "email", status: "qualified" }))
    const row = store.getDomain("guideai.com.cn")
    expect(row?.channel).toBe("email")
    expect(row?.status).toBe("qualified")
  })

  test("getDomain returns the stored domain fields after upsert", () => {
    if (store === undefined) {
      throw new Error("store fixture missing")
    }
    const record = sample({
      channel: "comment",
      status: "queued",
      page_url: "https://guideai.com.cn/join",
      mailto: "guideai2024@163.com",
      cost_usd: 0.048,
      run_id: "run-2",
    })
    store.upsertDomain(record)
    expect(store.getDomain("guideai.com.cn")).toEqual(record)
  })

  test("isSuppressed is false when the domain has no suppression row", () => {
    if (store === undefined) {
      throw new Error("store fixture missing")
    }
    expect(store.isSuppressed("guideai.com.cn")).toBe(false)
  })

  test("isSuppressed is true after a suppression row is written", () => {
    if (store === undefined) {
      throw new Error("store fixture missing")
    }
    store.suppress("guideai.com.cn")
    expect(store.isSuppressed("guideai.com.cn")).toBe(true)
  })
})
