import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { loadConfig, parseCompetitorsYaml, parseListingYaml, parseNavAllowlist } from "./config"
import { USER_AGENT } from "./crawl"

const ROOT = join(import.meta.dir, "..")

const PINNED_LISTING = {
  name: "AI Code With",
  url: "https://aicodewith.ai/zh",
  models_url: "https://aicodewith.ai/zh/models",
  integrations_url: "https://aicodewith.ai/zh/integrations",
  blurb:
    "AI Code With 是面向个人开发者和技术团队的多模型 API 接入平台。用户可以在同一平台选择不同模型、统一管理调用额度，并按实际用量计费，减少分别维护多个平台账号和账单的工作。",
  contact: "sysanyi4298@gmail.com",
  category: "AI编程",
  audience: "个人开发者和技术团队",
  detail:
    "平台同时提供模型价格与编程工具配置资料，方便用户了解调用成本并完成接入。对于多个项目或团队成员的使用需求，还可以通过独立 API Key 设置消费限额和可用模型，管理各自的使用范围。",
  values: [
    "在同一平台选择不同模型",
    "统一管理调用额度，并按实际用量计费",
    "通过独立 API Key 设置消费限额和可用模型",
  ],
  scenario: "减少分别维护多个平台账号和账单的工作。",
  icp_number: "",
  verified_at: "2026-10-12",
  sources: [
    "https://aicodewith.ai/zh",
    "https://aicodewith.ai/zh/models",
    "https://aicodewith.ai/zh/integrations",
    "https://docs.aicodewith.ai/zh/docs",
    "https://docs.aicodewith.ai/zh/docs/subscription-package-selection",
  ],
  notes:
    "首页写有额度一年有效和30+模型。计费文档确认预充值加按量计费，同一页还写永久有效、体验价和折扣。这些不写入对外文案。统一额度管理按维护后的事实包使用。",
} as const

const PINNED_COMMENT_URLS = [
  "https://aicodewith.ai/zh",
  "https://aicodewith.ai/zh/models",
  "https://aicodewith.ai/zh/integrations/opencode",
  "https://aicodewith.ai/zh/integrations/zed",
  "https://aicodewith.ai/zh/integrations/cherry-studio",
  "https://aicodewith.ai/zh/integrations/botgem",
  "https://aicodewith.ai/zh/integrations/rikkahub",
  "https://aicodewith.ai/zh/integrations/chatwise",
  "https://aicodewith.ai/zh/integrations/glarity",
  "https://aicodewith.ai/zh/integrations/workbuddy",
] as const

const PINNED_COMPETITORS = [
  "openrouter.ai",
  "302.ai",
  "aihubmix.com",
  "siliconflow.com",
  "together.ai",
] as const

function listingYaml(detail: string, url = "https://aicodewith.ai/zh"): string {
  return `name: AI Code With
url: ${url}
models_url: https://aicodewith.ai/zh/models
integrations_url: https://aicodewith.ai/zh/integrations
blurb: 面向个人开发者和小型技术团队的多模型 API 接入平台
contact: support@aicodewith.com
category: AI编程
audience: 个人开发者和小型技术团队
detail: ${detail}
values:
  - 在同一平台选择不同模型
  - 按实际用量付费
scenario: 按教程完成接入。
icp_number: ""
verified_at: "2026-10-12"
sources:
  - https://aicodewith.ai/zh
notes: 核对记录
`
}

describe("loadConfig", () => {
  test("returns pinned listing copy when reading repo yaml", () => {
    const config = loadConfig(ROOT)

    expect(config.listing).toEqual({
      ...PINNED_LISTING,
      values: [...PINNED_LISTING.values],
      sources: [...PINNED_LISTING.sources],
    })
  })

  test("keeps conflicting validity notes out of the contact used for outreach", () => {
    const config = loadConfig(ROOT)

    expect(config.listing.notes).toContain("永久有效")
    expect(config.listing.contact).toBe("sysanyi4298@gmail.com")
    expect(config.listing.detail).not.toContain("一年有效")
    expect(config.listing.detail).not.toContain("永久有效")
  })

  test("returns the comment url pool in pool order when reading repo config", () => {
    const config = loadConfig(ROOT)

    expect(config.commentUrls).toEqual([...PINNED_COMMENT_URLS])
  })

  test("omits vscode and claude-code from the comment url pool", () => {
    const config = loadConfig(ROOT)

    expect(config.commentUrls.some((url) => url.includes("vscode"))).toBe(false)
    expect(config.commentUrls.some((url) => url.includes("claude-code"))).toBe(false)
  })

  test("seeds nav allowlist with guideai.com.cn when reading repo allowlist", () => {
    const config = loadConfig(ROOT)

    expect(config.navAllowlist).toContain("guideai.com.cn")
  })

  test("returns the five competitor hosts when reading repo yaml", () => {
    const config = loadConfig(ROOT)

    expect(config.competitors).toEqual([...PINNED_COMPETITORS])
  })

  test("keeps the crawler mailbox separate from the outreach contact", () => {
    expect(USER_AGENT).toContain("support@aicodewith.com")
    expect(loadConfig(ROOT).listing.contact).not.toBe("support@aicodewith.com")
  })
})

describe("parseListingYaml", () => {
  test("accepts pinned detail that describes pay-as-you-go billing", () => {
    const raw = readFileSync(join(ROOT, "config/listing.yaml"), "utf8")

    const listing = parseListingYaml(raw)

    expect(listing.blurb).toContain("按实际用量计费")
    expect(listing.detail).toContain("独立 API Key")
    expect(listing.detail).not.toContain("预充值")
    expect(listing.detail).not.toContain("同一个入口")
  })

  test("rejects a fixture yaml containing 额度一年有效", () => {
    expect(() => parseListingYaml(listingYaml("额度一年有效"))).toThrow(/额度一年有效/)
  })

  test("accepts an old support mailbox and rejects that host as a promo url", () => {
    expect(parseListingYaml(listingYaml("按实际用量计费")).contact).toBe("support@aicodewith.com")
    expect(() =>
      parseListingYaml(listingYaml("按实际用量计费", "https://aicodewith.com/zh")),
    ).toThrow(/aicodewith.com/)
  })
})

describe("parseNavAllowlist", () => {
  test("keeps guideai.com.cn when the file seeds that host", () => {
    const hosts = parseNavAllowlist("guideai.com.cn\n")

    expect(hosts).toEqual(["guideai.com.cn"])
  })
})

describe("parseCompetitorsYaml", () => {
  test("returns the five hosts when yaml lists them", () => {
    const raw = `hosts:
  - openrouter.ai
  - 302.ai
  - aihubmix.com
  - siliconflow.com
  - together.ai
`

    expect(parseCompetitorsYaml(raw)).toEqual([...PINNED_COMPETITORS])
  })
})
