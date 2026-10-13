export const STATUSES = [
  "discovered",
  "qualified",
  "queued",
  "approved",
  "rejected",
  "exported",
  "suppressed",
  "blocked_icp",
] as const

export type Status = (typeof STATUSES)[number]

export const CHANNELS = [
  "form",
  "email",
  "comment",
  "friend_link",
  "paid_only",
  "none",
  "unknown",
] as const

export type Channel = (typeof CHANNELS)[number]

export type DomainRecord = {
  readonly domain: string
  readonly channel: Channel
  readonly status: Status
  readonly page_url: string | null
  readonly mailto: string | null
  readonly cost_usd: number
  readonly run_id: string
}

export type SqliteDomainRow = {
  readonly domain: string
  readonly channel: string
  readonly status: string
  readonly page_url: string | null
  readonly mailto: string | null
  readonly cost_usd: number
  readonly run_id: string
}

export class InvalidDomainRowError extends Error {
  readonly name = "InvalidDomainRowError"
  constructor(
    readonly field: string,
    readonly value: string,
  ) {
    super(`invalid domain row ${field}: ${value}`)
  }
}

export class MissingCountError extends Error {
  readonly name = "MissingCountError"
  constructor() {
    super("COUNT(*) returned no row")
  }
}

export function sqlInList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(",")
}

function parseLiteral<T extends string>(field: string, value: string, allowed: readonly T[]): T {
  for (const candidate of allowed) {
    if (candidate === value) {
      return candidate
    }
  }
  throw new InvalidDomainRowError(field, value)
}

export function parseDomainRow(row: SqliteDomainRow): DomainRecord {
  return {
    domain: row.domain,
    channel: parseLiteral("channel", row.channel, CHANNELS),
    status: parseLiteral("status", row.status, STATUSES),
    page_url: row.page_url,
    mailto: row.mailto,
    cost_usd: row.cost_usd,
    run_id: row.run_id,
  }
}
