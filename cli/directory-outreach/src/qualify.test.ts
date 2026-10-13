import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { qualifyPage } from "./qualify"

const FIXTURES = join(import.meta.dir, "..", "test", "fixtures")

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8")
}

describe("qualifyPage", () => {
  test("classifies a GuideAI-shaped join page as email", () => {
    const channel = qualifyPage({
      html: fixture("guideai-join.html"),
      pageUrl: "https://www.guideai.com.cn/join",
      allowlist: ["guideai.com.cn"],
    })

    expect(channel).toBe("email")
  })

  test("classifies a submit form as form", () => {
    const channel = qualifyPage({
      html: fixture("form-submit.html"),
      pageUrl: "https://example.com/submit",
      allowlist: [],
    })

    expect(channel).toBe("form")
  })

  test("classifies a blog that only mentions 投稿 as none", () => {
    const channel = qualifyPage({
      html: fixture("blog-post.html"),
      pageUrl: "https://blog.example.com/notes",
      allowlist: [],
    })

    expect(channel).toBe("none")
    expect(channel).not.toBe("comment")
  })

  test("classifies a directory page with a comment box as comment", () => {
    const channel = qualifyPage({
      html: fixture("directory-comment.html"),
      pageUrl: "https://nav.example.com/",
      allowlist: [],
    })

    expect(channel).toBe("comment")
  })

  test("does not classify a login-gated comment box as comment", () => {
    const channel = qualifyPage({
      html: '<title>工具导航</title><p>登录后评论</p><textarea name="comment"></textarea>',
      pageUrl: "https://nav.example.com/",
      allowlist: [],
    })

    expect(channel).toBe("none")
  })

  test("does not classify a comment box without an invitation as comment", () => {
    const channel = qualifyPage({
      html: '<title>留言</title><textarea name="comment"></textarea>',
      pageUrl: "https://www.guideai.com.cn/guestbook",
      allowlist: ["guideai.com.cn"],
    })

    expect(channel).toBe("none")
  })

  test("classifies an explicit product-recommendation box as comment", () => {
    const channel = qualifyPage({
      html: '<title>留言</title><p>欢迎推荐产品并提交到本目录。</p><textarea name="comment"></textarea>',
      pageUrl: "https://notes.example/guestbook",
      allowlist: [],
    })

    expect(channel).toBe("comment")
  })

  test("classifies a reciprocal-link page as friend_link", () => {
    const channel = qualifyPage({
      html: "<title>链接</title><h1>友情链接</h1><p>交换友链请留言。</p>",
      pageUrl: "https://example.com/links",
      allowlist: [],
    })

    expect(channel).toBe("friend_link")
  })

  test("classifies a paid listing page as paid_only", () => {
    const channel = qualifyPage({
      html: "<title>收录</title><p>本站仅限付费收录。</p>",
      pageUrl: "https://example.com/paid",
      allowlist: [],
    })

    expect(channel).toBe("paid_only")
  })
})
