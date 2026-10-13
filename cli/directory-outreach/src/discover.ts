import {
  type DomainIntersectionOutcome,
  type IntersectionRow,
  PROJECTED_COST_USD,
  SPEND_CAP_USD,
  SpendCapExceededError,
} from "./dataforseo"
import type { OutreachStore } from "./db"

const OWN_DOMAINS = ["aicodewith.ai", "aicodewith.com", "with7.cn"] as const
const SPAM_DROP = 60

export type IntersectionCaller = {
  readonly spent: number
  requestDomainIntersection(host: string): Promise<DomainIntersectionOutcome>
}

export type DiscoverInput = {
  readonly competitors: readonly string[]
  readonly client: IntersectionCaller
  readonly store: OutreachStore
  readonly runId: string
}

function registrable(raw: string): string {
  let host = raw.trim().toLowerCase()
  if (host.startsWith("https://")) {
    host = host.slice("https://".length)
  } else if (host.startsWith("http://")) {
    host = host.slice("http://".length)
  }
  const slash = host.indexOf("/")
  if (slash !== -1) {
    host = host.slice(0, slash)
  }
  if (host.startsWith("www.")) {
    host = host.slice("www.".length)
  }
  return host
}

function isOwn(domain: string): boolean {
  for (const host of OWN_DOMAINS) {
    if (host === domain) {
      return true
    }
  }
  return false
}

function shouldDrop(domain: string, item: IntersectionRow, store: OutreachStore): boolean {
  if (domain.length === 0 || isOwn(domain) || store.isSuppressed(domain)) {
    return true
  }
  return item.backlinks_spam_score > SPAM_DROP && !domain.endsWith(".cn")
}

function assertBudget(spent: number): void {
  if (spent + PROJECTED_COST_USD > SPEND_CAP_USD) {
    throw new SpendCapExceededError(spent, PROJECTED_COST_USD, SPEND_CAP_USD)
  }
}

export async function discoverGaps(input: DiscoverInput): Promise<void> {
  const seen = new Set<string>()
  for (const host of input.competitors) {
    assertBudget(input.client.spent)
    const outcome = await input.client.requestDomainIntersection(host)
    for (const item of outcome.items) {
      const domain = registrable(item.domain)
      if (seen.has(domain) || shouldDrop(domain, item, input.store)) {
        seen.add(domain)
        continue
      }
      seen.add(domain)
      const existing = input.store.getDomain(domain)
      input.store.upsertDomain({
        domain,
        channel: existing?.channel ?? "unknown",
        status: existing?.status ?? "discovered",
        page_url: existing?.page_url ?? null,
        mailto: existing?.mailto ?? null,
        cost_usd: existing?.cost_usd ?? 0,
        run_id: input.runId,
      })
    }
  }
  input.store.setRunSpend(input.runId, input.client.spent)
}
