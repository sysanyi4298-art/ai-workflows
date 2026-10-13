import { join } from "node:path"
import { composePacket, saveCompose } from "./compose"
import { loadConfig } from "./config"
import { type CrawlFetch, crawlHost, USER_AGENT } from "./crawl"
import { DataForSeoClient, type FetchFn } from "./dataforseo"
import { DEFAULT_DB_PATH, type OutreachStore, openStore } from "./db"
import { discoverGaps } from "./discover"
import { exportDomain } from "./export"
import {
  approveDomain,
  composeKeepsPacket,
  formatReadyList,
  rejectDomain,
  showDomain,
} from "./queue"
import { formatReview } from "./review"
import { assignShortCodes, formatRegistrationList, normalizeOutreachDomain } from "./short-code"

const VERBS = [
  "discover",
  "qualify",
  "compose",
  "review",
  "list",
  "show",
  "approve",
  "reject",
  "export",
] as const

type Verb = (typeof VERBS)[number]

function isVerb(value: string): value is Verb {
  return (VERBS as readonly string[]).includes(value)
}

function printUsage(): void {
  console.log(`Usage: bun src/cli.ts <command>

Commands: ${VERBS.join(", ")}`)
}

function envValue(name: string): string | undefined {
  const value = process.env[name]
  if (value === undefined || value.length === 0) {
    return undefined
  }
  return value
}

function dbPath(): string {
  return envValue("OUTREACH_DB") ?? DEFAULT_DB_PATH
}

function outRoot(): string {
  return envValue("OUTREACH_OUT") ?? "out"
}

function projectRoot(): string {
  return join(import.meta.dir, "..")
}

function needsId(command: Verb): boolean {
  return command === "show" || command === "approve" || command === "reject" || command === "export"
}

function readId(command: Verb): string | undefined {
  if (!needsId(command)) {
    return undefined
  }
  const id = process.argv[3]
  if (id === undefined || id.length === 0) {
    console.error(`Usage: bun src/cli.ts ${command} <id>`)
    process.exit(1)
  }
  return id
}

function requireCredentials(): { login: string; password: string } {
  const login = envValue("DATAFORSEO_LOGIN")
  const password = envValue("DATAFORSEO_PASSWORD")
  if (login === undefined || password === undefined) {
    throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are required")
  }
  return { login, password }
}

async function discover(store: OutreachStore): Promise<void> {
  const config = loadConfig(projectRoot())
  const { login, password } = requireCredentials()
  const runId = envValue("OUTREACH_RUN_ID") ?? "discover"
  const ledger = { spent: store.getRunSpend(runId) }
  const fetchImpl: FetchFn = (url, init) => fetch(url, init)
  const client = new DataForSeoClient({ login, password, fetch: fetchImpl, ledger })
  await discoverGaps({ competitors: config.competitors, client, store, runId })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function qualify(store: OutreachStore): Promise<void> {
  const config = loadConfig(projectRoot())
  const fetchPage: CrawlFetch = (url, init) => fetch(url, init)
  for (const row of store.listDomains()) {
    if (row.status !== "discovered") {
      continue
    }
    await crawlHost({
      origin: `https://${row.domain}`,
      domain: row.domain,
      allowlist: config.navAllowlist,
      runId: row.run_id,
      fetch: fetchPage,
      sleep,
      store,
    })
  }
}

async function compose(store: OutreachStore): Promise<void> {
  const config = loadConfig(projectRoot())
  const pending = store
    .listDomains()
    .filter((row) => row.page_url !== null && !composeKeepsPacket(row.status))
  const codes = assignShortCodes(
    store,
    pending.map((row) => row.domain),
  )
  for (const row of pending) {
    if (row.page_url === null) {
      continue
    }
    const response = await fetch(row.page_url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      continue
    }
    const code = codes.get(normalizeOutreachDomain(row.domain))
    if (code === undefined) {
      continue
    }
    const html = await response.text()
    saveCompose(
      store,
      row.domain,
      composePacket({
        html,
        pageUrl: row.page_url,
        domain: row.domain,
        allowlist: config.navAllowlist,
        listing: config.listing,
        commentPool: config.commentUrls,
        shortCode: code,
      }),
    )
  }
}

async function run(command: Verb, id: string | undefined, store: OutreachStore): Promise<void> {
  if (command === "discover") {
    await discover(store)
    return
  }
  if (command === "qualify") {
    await qualify(store)
    return
  }
  if (command === "compose") {
    await compose(store)
    return
  }
  if (command === "review") {
    const text = formatReview(store)
    if (text.length > 0) {
      console.log(text)
    }
    return
  }
  if (command === "list") {
    const text = formatReadyList(store)
    const registration = formatRegistrationList(store)
    const parts = [text]
    if (registration.length > 0) {
      parts.push(`# 待登记 utm_short_codes，尚未写入线上库\n${registration}`)
    }
    const output = parts.filter((part) => part.length > 0).join("\n\n")
    if (output.length > 0) {
      console.log(output)
    }
    return
  }
  if (id === undefined) {
    return
  }
  if (command === "show") {
    console.log(showDomain(store, id))
    return
  }
  if (command === "approve") {
    approveDomain(store, id)
    return
  }
  if (command === "reject") {
    rejectDomain(store, id)
    return
  }
  console.log(exportDomain(store, id, outRoot()))
}

async function main(): Promise<void> {
  const command = process.argv[2]
  if (command === undefined || !isVerb(command)) {
    printUsage()
    process.exit(1)
  }
  const id = readId(command)
  const store = openStore(dbPath())
  try {
    await run(command, id, store)
  } catch (error) {
    console.error(error instanceof Error ? error.message : "command failed")
    process.exitCode = 1
  } finally {
    store.close()
  }
}

void main()
