const PROMO_HOST = "aicodewith.ai"

function isApiPath(pathname: string): boolean {
  return (
    pathname === "/v1" ||
    pathname.startsWith("/v1/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/")
  )
}

export function withPromoCode(raw: string, code: string): string {
  if (raw.includes("@") && !raw.includes("://")) {
    return raw
  }
  if (raw.toLowerCase().startsWith("mailto:")) {
    return raw
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch (error) {
    if (error instanceof TypeError) {
      return raw
    }
    throw error
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return raw
  }
  if (url.hostname !== PROMO_HOST || isApiPath(url.pathname)) {
    return raw
  }
  url.searchParams.set("s", code)
  return url.toString()
}
