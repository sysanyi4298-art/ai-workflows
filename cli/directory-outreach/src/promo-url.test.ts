import { describe, expect, test } from "bun:test"
import { withPromoCode } from "./promo-url"

describe("withPromoCode", () => {
  test("replaces an existing s parameter and keeps the query and hash", () => {
    const tagged = withPromoCode("https://aicodewith.ai/zh?x=1&s=old#top", "xgwl01")
    const url = new URL(tagged)

    expect(url.searchParams.get("s")).toBe("xgwl01")
    expect(url.searchParams.get("x")).toBe("1")
    expect(url.hash).toBe("#top")
    expect(tagged).not.toContain("s=old")
  })

  test("leaves mailboxes and non-promo hosts unchanged", () => {
    expect(withPromoCode("sysanyi4298@gmail.com", "xgwl01")).toBe("sysanyi4298@gmail.com")
    expect(withPromoCode("mailto:hello@editor-nav.example", "xgwl01")).toBe(
      "mailto:hello@editor-nav.example",
    )
    expect(withPromoCode("https://docs.aicodewith.ai/zh/docs", "xgwl01")).toBe(
      "https://docs.aicodewith.ai/zh/docs",
    )
    expect(withPromoCode("https://www.aicodewith.ai/zh", "xgwl01")).toBe(
      "https://www.aicodewith.ai/zh",
    )
  })

  test("does not tag an API endpoint on the promo host", () => {
    expect(withPromoCode("https://aicodewith.ai/v1/chat", "xgwl01")).toBe(
      "https://aicodewith.ai/v1/chat",
    )
  })
})
