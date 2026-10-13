export const DOMAIN_INTERSECTION_LIVE_URL =
  "https://api.dataforseo.com/v3/backlinks/domain_intersection/live"

export const PROJECTED_COST_USD = 0.024
export const SPEND_CAP_USD = 0.15

const OWN_DOMAINS = ["aicodewith.ai", "aicodewith.com", "with7.cn"] as const
const ORDER_BY = ["rank,desc"] as const
const TASK_LIMIT = 20
const OK_STATUS = 20000
const TIMEOUT_STATUS = 50401
const FATAL_STATUS_CODES = [40100, 40104, 40200, 40203, 40204, 40210] as const

export type FetchInit = {
  readonly method: string
  readonly headers: {
    readonly Authorization: string
    readonly "Content-Type": string
  }
  readonly body: string
}

export type FetchFn = (url: string, init: FetchInit) => Promise<Response>

/** Spend accumulator — mutation is the documented purpose of this ledger. */
export type SpendLedger = {
  spent: number
}

export type DataForSeoClientOptions = {
  readonly login: string
  readonly password: string
  readonly fetch: FetchFn
  readonly ledger: SpendLedger
}

export type IntersectionRow = {
  readonly domain: string
  readonly rank: number
  readonly backlinks_spam_score: number
}

export type DomainIntersectionOutcome = {
  readonly cost: number
  readonly items: readonly IntersectionRow[]
}

type JsonObject = {
  readonly status_code?: unknown
  readonly cost?: unknown
  readonly tasks?: unknown
  readonly result?: unknown
  readonly items?: unknown
  readonly domain_intersection?: unknown
  readonly target?: unknown
  readonly rank?: unknown
  readonly backlinks_spam_score?: unknown
  readonly "1"?: unknown
}

export class SpendCapExceededError extends Error {
  readonly name = "SpendCapExceededError"
  constructor(
    readonly spent: number,
    readonly projectedCost: number,
    readonly cap: number,
  ) {
    super("DataForSEO spend cap exceeded")
  }
}

export class DataForSeoStatusError extends Error {
  readonly name = "DataForSeoStatusError"
  constructor(readonly code: number) {
    super(`DataForSEO status ${code}`)
  }
}

export class DataForSeoResponseError extends Error {
  readonly name = "DataForSeoResponseError"
  constructor(message: string) {
    super(message)
  }
}

function asObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

function firstTask(envelope: JsonObject): unknown {
  return Array.isArray(envelope.tasks) ? envelope.tasks[0] : undefined
}

function taskCost(task: unknown): number {
  if (!asObject(task)) {
    return 0
  }
  const cost = asNumber(task.cost)
  return cost === undefined ? 0 : cost
}

function taskStatusCode(task: unknown): number | undefined {
  if (!asObject(task)) {
    return undefined
  }
  return asNumber(task.status_code)
}

function isFatalStatus(code: number): boolean {
  for (const fatal of FATAL_STATUS_CODES) {
    if (fatal === code) {
      return true
    }
  }
  return false
}

function normalizeHost(raw: string): string {
  let host = raw.trim()
  const lowered = host.toLowerCase()
  if (lowered.startsWith("https://")) {
    host = host.slice("https://".length)
  } else if (lowered.startsWith("http://")) {
    host = host.slice("http://".length)
  }
  if (host.toLowerCase().startsWith("www.")) {
    host = host.slice("www.".length)
  }
  while (host.endsWith("/")) {
    host = host.slice(0, -1)
  }
  return host
}

function parseItems(envelope: JsonObject): readonly IntersectionRow[] {
  const task = firstTask(envelope)
  if (!asObject(task) || !Array.isArray(task.result)) {
    return []
  }
  const firstResult = task.result[0]
  if (!asObject(firstResult) || !Array.isArray(firstResult.items)) {
    return []
  }
  const rows: IntersectionRow[] = []
  for (const item of firstResult.items) {
    if (!asObject(item) || !asObject(item.domain_intersection)) {
      continue
    }
    const firstTarget = item.domain_intersection["1"]
    if (!asObject(firstTarget) || typeof firstTarget.target !== "string") {
      continue
    }
    rows.push({
      domain: firstTarget.target,
      rank: typeof firstTarget.rank === "number" ? firstTarget.rank : 0,
      backlinks_spam_score:
        typeof firstTarget.backlinks_spam_score === "number" ? firstTarget.backlinks_spam_score : 0,
    })
  }
  return rows
}

export class DataForSeoClient {
  readonly #fetch: FetchFn
  readonly #ledger: SpendLedger
  readonly #authorization: string

  constructor(options: DataForSeoClientOptions) {
    this.#fetch = options.fetch
    this.#ledger = options.ledger
    this.#authorization = `Basic ${Buffer.from(`${options.login}:${options.password}`, "utf8").toString("base64")}`
  }

  get spent(): number {
    return this.#ledger.spent
  }

  requestDomainIntersection(host: string): Promise<DomainIntersectionOutcome> {
    return this.#request(normalizeHost(host), false)
  }

  #assertCap(): void {
    if (this.#ledger.spent + PROJECTED_COST_USD > SPEND_CAP_USD) {
      throw new SpendCapExceededError(this.#ledger.spent, PROJECTED_COST_USD, SPEND_CAP_USD)
    }
  }

  #post(host: string): Promise<Response> {
    const body = JSON.stringify([
      {
        targets: { "1": host },
        exclude_targets: OWN_DOMAINS,
        limit: TASK_LIMIT,
        order_by: ORDER_BY,
      },
    ])
    return this.#fetch(DOMAIN_INTERSECTION_LIVE_URL, {
      method: "POST",
      headers: {
        Authorization: this.#authorization,
        "Content-Type": "application/json",
      },
      body,
    })
  }

  async #request(host: string, retried: boolean): Promise<DomainIntersectionOutcome> {
    this.#assertCap()
    const response = await this.#post(host)
    const payload: unknown = await response.json()
    if (!asObject(payload)) {
      throw new DataForSeoResponseError("envelope is not an object")
    }
    const task = firstTask(payload)
    const cost = taskCost(task)
    this.#ledger.spent += cost

    const envelopeStatus = asNumber(payload.status_code)
    if (envelopeStatus === undefined) {
      throw new DataForSeoResponseError("missing envelope status_code")
    }
    const status =
      envelopeStatus === OK_STATUS ? (taskStatusCode(task) ?? envelopeStatus) : envelopeStatus

    if (status === OK_STATUS) {
      return { cost, items: parseItems(payload) }
    }
    if (isFatalStatus(status)) {
      throw new DataForSeoStatusError(status)
    }
    if (status === TIMEOUT_STATUS && !retried) {
      return this.#request(host, true)
    }
    throw new DataForSeoStatusError(status)
  }
}
