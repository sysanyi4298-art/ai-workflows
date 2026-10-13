const CLAIMS = ["额度一年有效", "永久有效", "¥49.9", "49.9", "返佣", "Help AIO", "helpaio"] as const

const PLACEHOLDERS = ["MISSING", "TODO", "FIXME", "待办", "{{"] as const

const URL_RE = /https?:\/\/[^\s<>"')]+/g

const BANNED_PATHS = ["/dashboard", "/login", "/zh/pricing"] as const

function bannedHost(hostname: string): string | undefined {
  const host = hostname.toLowerCase()
  if (host === "aicodewith.com" || host.endsWith(".aicodewith.com")) {
    return "aicodewith.com"
  }
  if (host === "with7.cn" || host.endsWith(".with7.cn")) {
    return "with7.cn"
  }
  return undefined
}

function isOurHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === "aicodewith.ai" || host.endsWith(".aicodewith.ai") || bannedHost(host) !== undefined
  )
}

function bannedPath(url: URL): string | undefined {
  if (!isOurHost(url.hostname)) {
    return undefined
  }
  return BANNED_PATHS.find((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))
}

export function findForbiddenCopy(text: string): string | undefined {
  const claim = CLAIMS.find((needle) => text.includes(needle))
  if (claim !== undefined) {
    return claim
  }
  const placeholder = PLACEHOLDERS.find((needle) => text.includes(needle))
  if (placeholder !== undefined) {
    return placeholder
  }
  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0]
    if (raw === undefined) {
      continue
    }
    try {
      const url = new URL(raw)
      const host = bannedHost(url.hostname)
      if (host !== undefined) {
        return host
      }
      const path = bannedPath(url)
      if (path !== undefined) {
        return path
      }
    } catch (error) {
      if (error instanceof TypeError) {
        continue
      }
      throw error
    }
  }
  return undefined
}
