import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type OutreachStore, openStore } from "./db"
import { assignShortCodes, formatShortCode, registrationRows } from "./short-code"

describe("short codes", () => {
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
    dir = mkdtempSync(join(tmpdir(), "outreach-codes-"))
    store = openStore(join(dir, "outreach.sqlite"))
    return store
  }

  test("formats the first code as xgwl01 and stops padding at 100", () => {
    expect(formatShortCode(1)).toBe("xgwl01")
    expect(formatShortCode(99)).toBe("xgwl99")
    expect(formatShortCode(100)).toBe("xgwl100")
  })

  test("assigns the same codes when the input order changes", () => {
    const current = open()

    const first = assignShortCodes(current, ["b.example", "a.example"])
    const second = assignShortCodes(current, ["a.example", "b.example"])

    expect(first.get("a.example")).toBe("xgwl01")
    expect(first.get("b.example")).toBe("xgwl02")
    expect(second.get("a.example")).toBe("xgwl01")
    expect(second.get("b.example")).toBe("xgwl02")
  })

  test("does not recycle a gap when a later domain arrives", () => {
    const current = open()
    current.insertShortCode({ domain: "early.example", seq: 5, code: "xgwl05" })

    const assigned = assignShortCodes(current, ["early.example", "next.example"])

    expect(assigned.get("early.example")).toBe("xgwl05")
    expect(assigned.get("next.example")).toBe("xgwl06")
  })

  test("shares one code for www and the registrable domain", () => {
    const current = open()

    const assigned = assignShortCodes(current, ["www.editor-nav.example", "editor-nav.example"])

    expect(assigned.size).toBe(1)
    expect(assigned.get("editor-nav.example")).toBe("xgwl01")
  })

  test("builds a local registration row without claiming the production table was updated", () => {
    const current = open()
    assignShortCodes(current, ["editor-nav.example"])

    const [row] = registrationRows(current)
    if (row === undefined) {
      throw new Error("missing registration row")
    }

    expect(row.code).toMatch(/^[a-z0-9_-]{2,32}$/)
    expect(row.enabled).toBe(true)
    expect(row.utm_source).toBe("directory")
    expect(row.utm_content).toBe("editor-nav.example")
    expect(row.notes).toContain("未写入线上")
  })
})
