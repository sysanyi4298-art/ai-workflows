const CODE_RE = /^[a-z0-9_-]{2,32}$/
const REGISTRATION_NOTE = "本地分配，未写入线上 utm_short_codes"

export class ShortCodeError extends Error {
  readonly name = "ShortCodeError"
  constructor(message: string) {
    super(message)
  }
}

export type ShortCodeRecord = {
  readonly domain: string
  readonly seq: number
  readonly code: string
}

export type ShortCodeDb = {
  maxShortSeq(): number
  getShortCode(domain: string): ShortCodeRecord | undefined
  insertShortCode(record: ShortCodeRecord): void
  listShortCodes(): readonly ShortCodeRecord[]
}

export type RegistrationRow = {
  readonly code: string
  readonly utm_source: string
  readonly utm_medium: string
  readonly utm_campaign: string
  readonly utm_content: string
  readonly notes: string
  readonly enabled: boolean
}

export function formatShortCode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new ShortCodeError(`invalid short code sequence: ${seq}`)
  }
  const body = seq < 100 ? String(seq).padStart(2, "0") : String(seq)
  const code = `xgwl${body}`
  if (!CODE_RE.test(code)) {
    throw new ShortCodeError(`invalid short code: ${code}`)
  }
  return code
}

export function normalizeOutreachDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.length === 0 || trimmed.includes("@")) {
    throw new ShortCodeError(`invalid outreach domain: ${raw}`)
  }
  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`
  let host: string
  try {
    host = new URL(withScheme).hostname
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ShortCodeError(`invalid outreach domain: ${raw}`)
    }
    throw error
  }
  const domain = host.startsWith("www.") ? host.slice(4) : host
  if (domain.length === 0) {
    throw new ShortCodeError(`invalid outreach domain: ${raw}`)
  }
  return domain
}

export function assignShortCodes(
  store: ShortCodeDb,
  domains: readonly string[],
): ReadonlyMap<string, string> {
  const unique = [...new Set(domains.map((domain) => normalizeOutreachDomain(domain)))]
  unique.sort((left, right) => left.localeCompare(right, "en"))
  const assigned = new Map<string, string>()
  const fresh: string[] = []
  for (const domain of unique) {
    const existing = store.getShortCode(domain)
    if (existing === undefined) {
      fresh.push(domain)
    } else {
      assigned.set(domain, existing.code)
    }
  }
  let seq = store.maxShortSeq()
  for (const domain of fresh) {
    seq += 1
    const code = formatShortCode(seq)
    store.insertShortCode({ domain, seq, code })
    assigned.set(domain, code)
  }
  return assigned
}

export function registrationFor(domain: string, code: string): RegistrationRow {
  return {
    code,
    utm_source: "directory",
    utm_medium: "outreach",
    utm_campaign: "xgwl",
    utm_content: normalizeOutreachDomain(domain),
    notes: REGISTRATION_NOTE,
    enabled: true,
  }
}

export function registrationRows(store: ShortCodeDb): readonly RegistrationRow[] {
  return store.listShortCodes().map((row) => registrationFor(row.domain, row.code))
}

export function formatRegistrationList(store: ShortCodeDb): string {
  const rows = registrationRows(store)
  if (rows.length === 0) {
    return ""
  }
  const header = [
    "code",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "notes",
    "enabled",
  ].join("\t")
  const lines = rows.map((row) =>
    [
      row.code,
      row.utm_source,
      row.utm_medium,
      row.utm_campaign,
      row.utm_content,
      row.notes,
      row.enabled ? "true" : "false",
    ].join("\t"),
  )
  return [header, ...lines].join("\n")
}
