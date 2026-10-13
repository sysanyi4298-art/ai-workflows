import { describe, expect, test } from "bun:test"
import {
  DataForSeoClient,
  DataForSeoStatusError,
  DOMAIN_INTERSECTION_LIVE_URL,
  type FetchFn,
  type FetchInit,
  SpendCapExceededError,
} from "./dataforseo"

type FetchCall = {
  readonly url: string
  readonly init: FetchInit
}

type PostedTask = {
  readonly targets?: unknown
  readonly exclude_targets?: unknown
  readonly limit?: unknown
  readonly order_by?: unknown
  readonly intersection_mode?: unknown
}

type PostedTargets = {
  readonly "1"?: unknown
}

function asObject(value: unknown): value is PostedTask {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asTargets(value: unknown): value is PostedTargets {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

function envelope(options: {
  readonly envelopeStatus: number
  readonly taskStatus: number
  readonly cost?: number
}): unknown {
  if (options.cost === undefined) {
    return {
      status_code: options.envelopeStatus,
      tasks: [{ status_code: options.taskStatus }],
    }
  }
  return {
    status_code: options.envelopeStatus,
    tasks: [{ status_code: options.taskStatus, cost: options.cost }],
  }
}

function createMockFetch(responses: readonly Response[]): {
  readonly fetch: FetchFn
  readonly calls: FetchCall[]
} {
  const calls: FetchCall[] = []
  const queue = [...responses]
  const fetchFn: FetchFn = (url, init) => {
    calls.push({ url, init })
    const next = queue.shift()
    if (next === undefined) {
      return Promise.reject(new Error("mock fetch queue empty"))
    }
    return Promise.resolve(next)
  }
  return { fetch: fetchFn, calls }
}

function readJsonBody(init: FetchInit): unknown {
  return JSON.parse(init.body)
}

const TEST_AUTH = {
  login: "test-login",
  password: "test-secret",
} as const

describe("DataForSeoClient.requestDomainIntersection", () => {
  test("posts one domain_intersection task and ledgers the billed cost on 20000", async () => {
    const ledger = { spent: 0 }
    const { fetch, calls } = createMockFetch([
      jsonResponse(envelope({ envelopeStatus: 20000, taskStatus: 20000, cost: 0.024 })),
    ])
    const client = new DataForSeoClient({
      login: TEST_AUTH.login,
      password: TEST_AUTH.password,
      fetch,
      ledger,
    })

    await client.requestDomainIntersection("openrouter.ai")

    expect(calls).toHaveLength(1)
    const first = calls[0]
    expect(first).toBeDefined()
    if (first === undefined) {
      return
    }
    expect(first.url).toBe(DOMAIN_INTERSECTION_LIVE_URL)
    expect(first.init.method).toBe("POST")

    const body = readJsonBody(first.init)
    expect(Array.isArray(body)).toBe(true)
    if (!Array.isArray(body)) {
      return
    }
    expect(body).toHaveLength(1)
    const task = body[0]
    expect(asObject(task)).toBe(true)
    if (!asObject(task)) {
      return
    }
    expect(task.limit).toBe(20)
    expect("intersection_mode" in task).toBe(false)
    expect(task.exclude_targets).toEqual(["aicodewith.ai", "aicodewith.com", "with7.cn"])
    expect(task.order_by).toEqual(["rank,desc"])
    expect(asTargets(task.targets)).toBe(true)
    if (!asTargets(task.targets)) {
      return
    }
    expect(Object.keys(task.targets)).toEqual(["1"])
    expect(task.targets["1"]).toBe("openrouter.ai")
    expect(ledger.spent).toBe(0.024)
  })

  test("throws and does not fetch when spent plus projected cost exceeds the cap", async () => {
    const ledger = { spent: 0.13 }
    const { fetch, calls } = createMockFetch([])
    const client = new DataForSeoClient({
      login: TEST_AUTH.login,
      password: TEST_AUTH.password,
      fetch,
      ledger,
    })

    await expect(client.requestDomainIntersection("openrouter.ai")).rejects.toBeInstanceOf(
      SpendCapExceededError,
    )
    expect(calls).toHaveLength(0)
    expect(ledger.spent).toBe(0.13)
  })

  test("throws DataForSeoStatusError and fetches once when status is 40104", async () => {
    const ledger = { spent: 0 }
    const { fetch, calls } = createMockFetch([
      jsonResponse(envelope({ envelopeStatus: 20000, taskStatus: 40104 })),
    ])
    const client = new DataForSeoClient({
      login: TEST_AUTH.login,
      password: TEST_AUTH.password,
      fetch,
      ledger,
    })

    let thrown: unknown
    try {
      await client.requestDomainIntersection("openrouter.ai")
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(DataForSeoStatusError)
    if (thrown instanceof DataForSeoStatusError) {
      expect(thrown.code).toBe(40104)
      expect(thrown.name).toBe("DataForSeoStatusError")
    }
    expect(calls).toHaveLength(1)
  })

  test("retries 50401 once and ledgers only the successful cost when the error has no cost", async () => {
    const ledger = { spent: 0 }
    const { fetch, calls } = createMockFetch([
      jsonResponse(envelope({ envelopeStatus: 20000, taskStatus: 50401 })),
      jsonResponse(envelope({ envelopeStatus: 20000, taskStatus: 20000, cost: 0.024 })),
    ])
    const client = new DataForSeoClient({
      login: TEST_AUTH.login,
      password: TEST_AUTH.password,
      fetch,
      ledger,
    })

    await client.requestDomainIntersection("openrouter.ai")

    expect(calls).toHaveLength(2)
    expect(calls[0]?.url).toBe(DOMAIN_INTERSECTION_LIVE_URL)
    expect(calls[1]?.url).toBe(DOMAIN_INTERSECTION_LIVE_URL)
    expect(ledger.spent).toBe(0.024)
  })
})
