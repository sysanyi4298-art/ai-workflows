import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadConfig } from "./config"
import { type DomainRecord, type OutreachStore, openStore } from "./db"
import { EXPORT_FROM, EXPORT_SUBJECT, ExportNotApprovedError, exportDomain } from "./export"
import { buildListingFields } from "./listing"

function sample(overrides: Partial<DomainRecord> = {}): DomainRecord {
  return {
    domain: "guideai.com.cn",
    channel: "email",
    status: "approved",
    page_url: "https://www.guideai.com.cn/join",
    mailto: "hello@guideai.com.cn",
    cost_usd: 0,
    run_id: "run-1",
    ...overrides,
  }
}

function emailPacket(): string {
  const fields = buildListingFields(loadConfig(join(import.meta.dir, "..")).listing, {
    url: "https://aicodewith.ai/zh?s=xgwl01",
  })
  return JSON.stringify({
    kind: "email",
    pageUrl: "https://www.guideai.com.cn/join",
    mailto: "hello@guideai.com.cn",
    from: EXPORT_FROM,
    replyTo: EXPORT_FROM,
    subject: EXPORT_SUBJECT,
    body: `核验页面：${fields.工具链接}\n${EXPORT_FROM}`,
    appendix: fields,
  })
}

describe("exportDomain", () => {
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

  function open(): { store: OutreachStore; out: string } {
    dir = mkdtempSync(join(tmpdir(), "outreach-export-"))
    store = openStore(join(dir, "outreach.sqlite"))
    return { store, out: join(dir, "out") }
  }

  test("writes a letter without dumping form fields into the eml", () => {
    const current = open()
    current.store.upsertDomain(sample())
    current.store.setPacket("guideai.com.cn", emailPacket())

    const written = exportDomain(current.store, "guideai.com.cn", current.out)
    const eml = readFileSync(join(written, "message.eml"), "utf8")
    const md = readFileSync(join(written, "message.md"), "utf8")

    expect(eml).toContain(`Subject: ${EXPORT_SUBJECT}`)
    expect(eml).toContain(`From: ${EXPORT_FROM}`)
    expect(eml).toContain("To: hello@guideai.com.cn")
    expect(eml).not.toContain("应用名称:")
    expect(eml).not.toContain("额度一年有效")
    expect(md).toContain("附表（表单字段，非邮件正文）")
    expect(current.store.getDomain("guideai.com.cn")?.status).toBe("exported")
  })

  test("writes each comment link once", () => {
    const current = open()
    const link = "https://aicodewith.ai/zh?s=xgwl01"
    current.store.upsertDomain(sample({ domain: "dir.example", channel: "comment" }))
    current.store.setPacket(
      "dir.example",
      JSON.stringify({
        kind: "comment",
        pageUrl: "https://dir.example/item",
        body: `说明产品。\n${link}`,
        links: [link],
      }),
    )

    const written = exportDomain(current.store, "dir.example", current.out)
    const pasted = readFileSync(join(written, "COMMENT.txt"), "utf8")

    expect(pasted.split(link)).toHaveLength(2)
  })

  test("refuses a queued domain and writes nothing", () => {
    const current = open()
    current.store.upsertDomain(sample({ status: "queued" }))
    current.store.setPacket("guideai.com.cn", emailPacket())

    expect(() => exportDomain(current.store, "guideai.com.cn", current.out)).toThrow(
      ExportNotApprovedError,
    )
    expect(existsSync(join(current.out, "guideai.com.cn"))).toBe(false)
  })

  test("writes only a note for a friend-link domain", () => {
    const current = open()
    current.store.upsertDomain(sample({ domain: "friend.example", channel: "friend_link" }))

    const written = exportDomain(current.store, "friend.example", current.out)

    expect(readdirSync(written)).toEqual(["NOTE.md"])
  })
})
