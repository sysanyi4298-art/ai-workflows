import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { ForbiddenListingCopyError, loadConfig } from "./config"
import { buildListingFields } from "./listing"

const ROOT = join(import.meta.dir, "..")

describe("buildListingFields", () => {
  test("includes the outreach mailbox when loading repo config", () => {
    const { listing } = loadConfig(ROOT)

    const fields = buildListingFields(listing)

    expect(fields.联系方式).toBe("sysanyi4298@gmail.com")
  })

  test("includes the pinned zh url when loading repo config", () => {
    const { listing } = loadConfig(ROOT)

    const fields = buildListingFields(listing)

    expect(fields.工具链接).toBe("https://aicodewith.ai/zh")
  })

  test("copies the pinned blurb into 应用简介 without padding", () => {
    const { listing } = loadConfig(ROOT)

    const fields = buildListingFields(listing)

    expect(fields.应用简介).toBe(
      "AI Code With 是面向个人开发者和技术团队的多模型 API 接入平台。用户可以在同一平台选择不同模型、统一管理调用额度，并按实际用量计费，减少分别维护多个平台账号和账单的工作。",
    )
  })

  test("omits 备案信息 when the filing number is empty", () => {
    const { listing } = loadConfig(ROOT)

    const fields = buildListingFields(listing)

    expect(listing.icp_number).toBe("")
    expect(fields.备案信息).toBeUndefined()
    expect(JSON.stringify(fields)).not.toContain("备案信息")
  })

  test("includes 备案信息 when a filing number is configured", () => {
    const { listing } = loadConfig(ROOT)
    const icp = "京ICP备00000000号"

    const fields = buildListingFields({ ...listing, icp_number: icp })

    expect(fields.备案信息).toBe(icp)
  })

  test("omits 应用标识 when no logo path is provided", () => {
    const { listing } = loadConfig(ROOT)

    const fields = buildListingFields(listing)

    expect(fields.应用标识).toBeUndefined()
    expect(JSON.stringify(fields)).not.toContain("MISSING")
  })

  test("accepts pinned detail that describes usage billing", () => {
    const { listing } = loadConfig(ROOT)

    const fields = buildListingFields(listing)

    expect(fields.应用详情).toContain("独立 API Key")
    expect(fields.应用详情).not.toContain("一个 API Key")
    expect(fields.应用详情).not.toContain("集中管理 API Key")
    expect(fields.应用详情).not.toContain("30+")
    expect(fields.应用详情).not.toContain("预充值")
  })

  test("throws ForbiddenListingCopyError when detail contains 额度一年有效", () => {
    const { listing } = loadConfig(ROOT)
    const poisoned = { ...listing, detail: "额度一年有效" }

    expect(() => buildListingFields(poisoned)).toThrow(ForbiddenListingCopyError)
    expect(() => buildListingFields(poisoned)).toThrow(/额度一年有效/)
  })

  test("does not treat an old mailbox as a banned promo url", () => {
    const { listing } = loadConfig(ROOT)
    const withMailbox = { ...listing, detail: "联系 support@aicodewith.com 不作为推广链接" }

    expect(buildListingFields(withMailbox).应用详情).toContain("support@aicodewith.com")
  })

  test("throws when the tool url uses the old promo host", () => {
    const { listing } = loadConfig(ROOT)

    expect(() => buildListingFields({ ...listing, url: "https://aicodewith.com/zh" })).toThrow(
      /aicodewith.com/,
    )
  })

  test("copies a provided logo path into 应用标识", () => {
    const { listing } = loadConfig(ROOT)
    const logoPath = "/tmp/aicodewith-logo.png"

    const fields = buildListingFields(listing, { logoPath })

    expect(fields.应用标识).toBe(logoPath)
  })
})
