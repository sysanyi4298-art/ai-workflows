import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { composePacket } from "./compose"
import { type Listing, loadConfig } from "./config"

const ROOT = join(import.meta.dir, "..")
const FIXTURES = join(ROOT, "test", "fixtures")

function listingWithIcp(icp: string): Listing {
  return { ...loadConfig(ROOT).listing, icp_number: icp }
}

function compose(name: string, icp: string, html?: string) {
  const config = loadConfig(ROOT)
  return composePacket({
    html: html ?? readFileSync(join(FIXTURES, name), "utf8"),
    pageUrl: "https://www.guideai.com.cn/join",
    domain: "guideai.com.cn",
    allowlist: config.navAllowlist,
    listing: listingWithIcp(icp),
    commentPool: config.commentUrls,
    shortCode: "xgwl01",
  })
}

describe("composePacket", () => {
  test("blocks GuideAI when the ICP number is empty", () => {
    const result = compose("guideai-join.html", "")

    expect(result.status).toBe("blocked_icp")
    expect(result.packet).toBeNull()
  })

  test("builds a letter instead of a field dump when GuideAI has an ICP number", () => {
    const result = compose("guideai-join.html", "京ICP备00000000号")

    expect(result.status).toBe("queued")
    expect(result.packet?.kind).toBe("email")
    if (result.packet?.kind !== "email") {
      return
    }
    expect(result.packet.mailto).toBe("hello@guideai.com.cn")
    expect(result.packet.from).toBe("sysanyi4298@gmail.com")
    expect(result.packet.appendix.联系方式).toBe("sysanyi4298@gmail.com")
    expect(result.packet.subject).toBe("申请收录 AI Code With｜多模型 API 与 AI 编程工具接入")
    expect(result.packet.body).toContain("想向贵站提交 AI Code With，供您审核收录。")
    expect(result.packet.body).toContain("希望能被收录。")
    expect(result.packet.body).toContain("谢谢！")
    expect(result.packet.body).not.toContain("「提交网站」")
    expect(result.packet.body).not.toContain("相关分类")
    expect(result.packet.body).toContain("https://aicodewith.ai/zh?s=xgwl01")
    expect(result.packet.body).toContain("https://aicodewith.ai/zh/models?s=xgwl01")
    expect(result.packet.body).toContain("https://aicodewith.ai/zh/integrations?s=xgwl01")
    expect(result.packet.body).not.toContain("请审核是否收录")
    expect(result.packet.body).not.toContain("核验页面")
    expect(result.packet.body).not.toContain("因此申请")
    expect(result.packet.body).not.toContain("应用名称:")
    expect(result.packet.body).not.toContain("docs.aicodewith.ai")
    expect(result.packet.body).not.toContain("一年有效")
    expect(result.packet.body).not.toContain("永久有效")
    expect(result.packet.body).toContain("AI Code With\nsysanyi4298@gmail.com")
  })

  test("builds one comment link and keeps it out of the comment body", () => {
    const result = compose("directory-comment.html", "")

    expect(result.status).toBe("queued")
    expect(result.packet?.kind).toBe("comment")
    if (result.packet?.kind !== "comment") {
      return
    }
    expect(result.packet.links).toEqual([
      "https://aicodewith.ai/zh?s=xgwl01",
      "https://aicodewith.ai/zh/models?s=xgwl01",
      "https://aicodewith.ai/zh/integrations?s=xgwl01",
    ])
    expect(result.packet.body.split("https://aicodewith.ai/zh?s=xgwl01")).toHaveLength(2)
    expect(result.packet.body.split("xgwl01")).toHaveLength(4)
    expect(result.packet.body).toContain(
      "想向贵站的「工具收录列表」分类提交 AI Code With，供您审核收录。",
    )
    expect(result.packet.body).toContain("独立 API Key")
    expect(result.packet.body).toContain("希望能加入相关分类")
    expect(result.packet.body).not.toContain("一个 API Key")
    expect(result.packet.body).not.toContain("集中管理 API Key")
    expect(result.packet.body).not.toContain("您好")
    expect(result.packet.body).not.toContain("谢谢")
    expect(result.packet.body).not.toContain("我用过")
    expect(result.packet.body).not.toContain("备案")
  })

  test("names the page category when the heading is a real category", () => {
    const result = compose(
      "guideai-join.html",
      "京ICP备00000000号",
      `<h1>开发者工具</h1><p>请将网站资料发送到 hello@guideai.com.cn，申请收录。</p><p>备案信息必填，不填写不予通过。</p>`,
    )

    expect(result.packet?.kind).toBe("email")
    if (result.packet?.kind !== "email") {
      return
    }
    expect(result.packet.body).toContain(
      "想向贵站的「开发者工具」分类提交 AI Code With，供您审核收录。",
    )
    expect(result.packet.body).toContain("希望能加入相关分类。")
    expect(result.packet.body.split("开发者工具")).toHaveLength(2)
    expect(result.packet.body).not.toContain("希望能作为贵站「开发者工具」分类中的一个选择。")
    expect(result.packet.body).not.toContain("因此申请")
    expect(result.packet.body).not.toContain("因为贵站")
  })

  test("builds a form packet without a missing logo placeholder", () => {
    const result = compose("form-submit.html", "")

    expect(result.packet?.kind).toBe("form")
    if (result.packet?.kind !== "form") {
      return
    }
    expect(result.packet.fields.联系方式).toBe("sysanyi4298@gmail.com")
    expect(result.packet.fields.应用标识).toBeUndefined()
    expect(result.packet.fields.工具链接).toContain("s=xgwl01")
    expect(JSON.stringify(result.packet.fields)).not.toContain("MISSING")
  })

  test("does not block a footer filing number that is not a submission rule", () => {
    const result = compose(
      "form-submit.html",
      "",
      `<h1>申请收录</h1><form action="/submit"><input name="url"></form><footer>京ICP备12345678号</footer>`,
    )

    expect(result.status).toBe("queued")
    expect(result.packet?.kind).toBe("form")
  })

  test("blocks export preparation when the page requires a logo and none is provided", () => {
    const result = compose(
      "form-submit.html",
      "",
      `<h1>申请收录</h1><p>应用标识必填</p><form action="/submit"></form>`,
    )

    expect(result.packet?.kind).toBe("blocked")
    expect(result.note).toContain("应用标识")
  })
})
