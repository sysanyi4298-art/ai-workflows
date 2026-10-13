import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import {
  CHANNELS,
  type DomainRecord,
  MissingCountError,
  parseDomainRow,
  type SqliteDomainRow,
  STATUSES,
  type Status,
  sqlInList,
} from "./domain"
import type { ShortCodeRecord } from "./short-code"

export {
  CHANNELS,
  type Channel,
  type DomainRecord,
  InvalidDomainRowError,
  MissingCountError,
  STATUSES,
  type Status,
} from "./domain"

export const DEFAULT_DB_PATH = "data/outreach.sqlite"

type CountRow = {
  readonly n: number
}

type DomainKeyRow = {
  readonly domain: string
}

type PacketRow = {
  readonly packet_json: string | null
}

type SpendRow = {
  readonly spent_usd: number
}

type SeqRow = {
  readonly n: number | null
}

function ensureParentDir(path: string): void {
  const parent = dirname(path)
  if (parent === "" || parent === ".") {
    return
  }
  mkdirSync(parent, { recursive: true })
}

export class OutreachStore {
  readonly #db: Database

  constructor(path: string = DEFAULT_DB_PATH) {
    ensureParentDir(path)
    this.#db = new Database(path, { create: true, strict: true })
    this.#db.run(`
      CREATE TABLE IF NOT EXISTS domains (
        domain TEXT PRIMARY KEY,
        channel TEXT NOT NULL CHECK (channel IN (${sqlInList(CHANNELS)})),
        status TEXT NOT NULL CHECK (status IN (${sqlInList(STATUSES)})),
        page_url TEXT,
        mailto TEXT,
        cost_usd REAL NOT NULL,
        run_id TEXT NOT NULL,
        packet_json TEXT
      )
    `)
    this.#db.run(`
      CREATE TABLE IF NOT EXISTS suppressions (
        domain TEXT PRIMARY KEY
      )
    `)
    this.#db.run(`
      CREATE TABLE IF NOT EXISTS runs (
        run_id TEXT PRIMARY KEY,
        spent_usd REAL NOT NULL
      )
    `)
    this.#db.run(`
      CREATE TABLE IF NOT EXISTS short_codes (
        domain TEXT PRIMARY KEY,
        seq INTEGER NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE
      )
    `)
  }

  upsertDomain(record: DomainRecord): void {
    this.#db.run(
      `
        INSERT INTO domains (domain, channel, status, page_url, mailto, cost_usd, run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(domain) DO UPDATE SET
          channel = excluded.channel,
          status = excluded.status,
          page_url = excluded.page_url,
          mailto = excluded.mailto,
          cost_usd = excluded.cost_usd,
          run_id = excluded.run_id
      `,
      [
        record.domain,
        record.channel,
        record.status,
        record.page_url,
        record.mailto,
        record.cost_usd,
        record.run_id,
      ],
    )
  }

  getDomain(domain: string): DomainRecord | undefined {
    const row = this.#db
      .query<SqliteDomainRow, [string]>(
        `
          SELECT domain, channel, status, page_url, mailto, cost_usd, run_id
          FROM domains
          WHERE domain = ?
        `,
      )
      .get(domain)
    if (row === null) {
      return undefined
    }
    return parseDomainRow(row)
  }

  countDomains(): number {
    const row = this.#db.query<CountRow, []>("SELECT COUNT(*) AS n FROM domains").get()
    if (row === null) {
      throw new MissingCountError()
    }
    return row.n
  }

  listDomains(): readonly DomainRecord[] {
    const rows = this.#db
      .query<SqliteDomainRow, []>(
        `
          SELECT domain, channel, status, page_url, mailto, cost_usd, run_id
          FROM domains
          ORDER BY domain
        `,
      )
      .all()
    return rows.map((row) => parseDomainRow(row))
  }

  suppress(domain: string): void {
    this.#db.run("INSERT INTO suppressions (domain) VALUES (?) ON CONFLICT(domain) DO NOTHING", [
      domain,
    ])
  }

  isSuppressed(domain: string): boolean {
    const row = this.#db
      .query<DomainKeyRow, [string]>("SELECT domain FROM suppressions WHERE domain = ?")
      .get(domain)
    return row !== null
  }

  updateStatus(domain: string, status: Status): void {
    this.#db.run("UPDATE domains SET status = ? WHERE domain = ?", [status, domain])
  }

  setPacket(domain: string, packet: string | null): void {
    this.#db.run("UPDATE domains SET packet_json = ? WHERE domain = ?", [packet, domain])
  }

  getPacket(domain: string): string | null {
    const row = this.#db
      .query<PacketRow, [string]>("SELECT packet_json FROM domains WHERE domain = ?")
      .get(domain)
    if (row === null) {
      return null
    }
    return row.packet_json
  }

  setRunSpend(runId: string, spent: number): void {
    this.#db.run(
      `
        INSERT INTO runs (run_id, spent_usd) VALUES (?, ?)
        ON CONFLICT(run_id) DO UPDATE SET spent_usd = excluded.spent_usd
      `,
      [runId, spent],
    )
  }

  getRunSpend(runId: string): number {
    const row = this.#db
      .query<SpendRow, [string]>("SELECT spent_usd FROM runs WHERE run_id = ?")
      .get(runId)
    if (row === null) {
      return 0
    }
    return row.spent_usd
  }

  maxShortSeq(): number {
    const row = this.#db.query<SeqRow, []>("SELECT MAX(seq) AS n FROM short_codes").get()
    return row?.n ?? 0
  }

  getShortCode(domain: string): ShortCodeRecord | undefined {
    const row = this.#db
      .query<ShortCodeRecord, [string]>(
        "SELECT domain, seq, code FROM short_codes WHERE domain = ?",
      )
      .get(domain)
    return row ?? undefined
  }

  insertShortCode(record: ShortCodeRecord): void {
    this.#db.run("INSERT INTO short_codes (domain, seq, code) VALUES (?, ?, ?)", [
      record.domain,
      record.seq,
      record.code,
    ])
  }

  listShortCodes(): readonly ShortCodeRecord[] {
    return this.#db
      .query<ShortCodeRecord, []>("SELECT domain, seq, code FROM short_codes ORDER BY seq")
      .all()
  }

  close(): void {
    this.#db.close()
  }
}

export function openStore(path: string = DEFAULT_DB_PATH): OutreachStore {
  return new OutreachStore(path)
}
