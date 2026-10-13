import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { pickCommentLinks } from "./comment-links"
import { loadConfig } from "./config"

const ROOT = join(import.meta.dir, "..")
const HOMEPAGE = "https://aicodewith.ai/zh"
const MODELS = "https://aicodewith.ai/zh/models"
const OPENCODE = "https://aicodewith.ai/zh/integrations/opencode"
const ZED = "https://aicodewith.ai/zh/integrations/zed"

function pool(): readonly string[] {
  return loadConfig(ROOT).commentUrls
}

describe("pickCommentLinks", () => {
  test("returns only the homepage when page text names no tool", () => {
    const links = pickCommentLinks({
      pageText: "A directory of AI coding tools with no named product.",
      pool: pool(),
    })

    expect(links).toEqual([HOMEPAGE])
  })

  test("returns homepage and that integration when page text names Zed", () => {
    const links = pickCommentLinks({
      pageText: "This listing covers Zed as an AI coding editor.",
      pool: pool(),
    })

    expect(links).toEqual([HOMEPAGE, ZED])
  })

  test("returns the earlier pool tool when page text names OpenCode and Zed", () => {
    const links = pickCommentLinks({
      pageText: "Compare Open Code with Zed for AI coding.",
      pool: pool(),
    })

    expect(links).toEqual([HOMEPAGE, OPENCODE])
    expect(links).not.toContain(ZED)
  })

  test("adds the models page when the text asks about models", () => {
    const links = pickCommentLinks({
      pageText: "收录 Zed，并请附上模型列表。",
      pool: pool(),
    })

    expect(links).toEqual([HOMEPAGE, MODELS, ZED])
  })

  test("omits vscode urls when page text mentions vscode", () => {
    const links = pickCommentLinks({
      pageText: "A VS Code and vscode extension roundup.",
      pool: [...pool(), "https://aicodewith.ai/zh/integrations/vscode"],
    })

    expect(links).toEqual([HOMEPAGE])
    expect(links.join(" ").toLowerCase().includes("vscode")).toBe(false)
  })
})
