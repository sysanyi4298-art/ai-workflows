import { afterEach, describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadConfig } from "./config"
import { type DomainRecord, type OutreachStore, openStore } from "./db"
import { EXPORT_FROM, EXPORT_SUBJECT } from "./export"
import { buildListingFields } from "./listing"

const ROOT = join(import.meta.dir, "..")

function sample(overrides: Partial<DomainRecord>): DomainRecord {
  return {
    domain: "example.com",
    channel: "email",
    status: "queued",
    page_url: null,
    mailto: null,
    cost_usd: 0,
    run_id: "run-1",
    ...overrides,
  }
}

function runCli(args: readonly string[], env: { db: string; out: string }) {
  return spawnSync(process.execPath, [join(import.meta.dir, "cli.ts"), ...args], {
    cwd: ROOT,
    env: { ...process.env, OUTREACH_DB: env.db, OUTREACH_OUT: env.out },
    encoding: "utf8",
  })
}

describe("cli", () => {
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

  function layout(): { db: string; out: string; store: OutreachStore } {
    dir = mkdtempSync(join(tmpdir(), "outreach-cli-"))
    const db = join(dir, "outreach.sqlite")
    store = openStore(db)
    return { db, out: join(dir, "out"), store }
  }

  test("prints usage and exits 1 without a command", () => {
    const current = layout()
    current.store.close()
    store = undefined

    const result = runCli([], current)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("discover")
    expect(result.stdout).toContain("review")
    expect(result.stdout).toContain("export")
  })

  test("lists ready domains and exports an approved email and comment", () => {
    const current = layout()
    const config = loadConfig(ROOT)
    const fields = buildListingFields(config.listing)
    const link = config.commentUrls[0]
    if (link === undefined) {
      throw new Error("comment pool is missing homepage")
    }
    const body = `${config.listing.name} 是${config.listing.blurb}。这里只说明产品，不写个人使用体验。`
    current.store.upsertDomain(
      sample({ domain: "ready.example", channel: "form", status: "queued" }),
    )
    current.store.upsertDomain(
      sample({ domain: "blocked.example", channel: "comment", status: "blocked_icp" }),
    )
    current.store.upsertDomain(
      sample({
        domain: "guideai.com.cn",
        channel: "email",
        status: "approved",
        mailto: "hello@guideai.com.cn",
      }),
    )
    current.store.setPacket(
      "guideai.com.cn",
      JSON.stringify({
        kind: "email",
        pageUrl: "https://www.guideai.com.cn/join",
        mailto: "hello@guideai.com.cn",
        from: EXPORT_FROM,
        replyTo: EXPORT_FROM,
        subject: EXPORT_SUBJECT,
        body: `核验页面：${fields.工具链接}`,
        appendix: fields,
      }),
    )
    current.store.upsertDomain(
      sample({ domain: "dir.example", channel: "comment", status: "approved" }),
    )
    current.store.setPacket(
      "dir.example",
      JSON.stringify({
        kind: "comment",
        pageUrl: "https://dir.example/item",
        body,
        links: [link],
      }),
    )
    current.store.close()
    store = undefined

    const listed = runCli(["list"], current)
    const email = runCli(["export", "guideai.com.cn"], current)
    const comment = runCli(["export", "dir.example"], current)
    const queued = runCli(["export", "ready.example"], current)

    expect(listed.status).toBe(0)
    expect(listed.stdout).toContain("ready.example")
    expect(listed.stdout).not.toContain("blocked.example")
    expect(email.status).toBe(0)
    const eml = readFileSync(join(current.out, "guideai.com.cn", "message.eml"), "utf8")
    expect(eml).toContain(`Subject: ${EXPORT_SUBJECT}`)
    expect(eml).toContain(`From: ${EXPORT_FROM}`)
    expect(eml).not.toContain("应用名称:")
    expect(eml).not.toContain("额度一年有效")
    expect(comment.status).toBe(0)
    const pasted = readFileSync(join(current.out, "dir.example", "COMMENT.txt"), "utf8")
    expect(pasted.split(link)).toHaveLength(2)
    expect(pasted).not.toContain("/integrations/vscode")
    expect(queued.status).not.toBe(0)
    expect(existsSync(join(current.out, "ready.example"))).toBe(false)
  })
})
