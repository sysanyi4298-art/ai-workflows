import type { Channel, DomainRecord, OutreachStore, Status } from "./db"
import { packetBlockNote } from "./packet-block"

const READY_CHANNELS = ["form", "email", "comment"] as const
const READY_STATUSES = ["queued", "qualified"] as const

export class MissingDomainError extends Error {
  readonly name = "MissingDomainError"
  constructor(readonly domain: string) {
    super(`missing domain: ${domain}`)
  }
}

function isReadyChannel(channel: Channel): boolean {
  for (const ready of READY_CHANNELS) {
    if (ready === channel) {
      return true
    }
  }
  return false
}

function isReadyStatus(status: Status): boolean {
  for (const ready of READY_STATUSES) {
    if (ready === status) {
      return true
    }
  }
  return false
}

function requireDomain(store: OutreachStore, domain: string): DomainRecord {
  const row = store.getDomain(domain)
  if (row === undefined) {
    throw new MissingDomainError(domain)
  }
  return row
}

const LOCKED = ["approved", "rejected", "exported"] as const

export function composeKeepsPacket(status: Status): boolean {
  return (LOCKED as readonly string[]).includes(status)
}

export function readyDomains(store: OutreachStore): readonly DomainRecord[] {
  return store
    .listDomains()
    .filter(
      (row) =>
        isReadyChannel(row.channel) &&
        isReadyStatus(row.status) &&
        packetBlockNote(store.getPacket(row.domain)) === undefined,
    )
}

export function formatReadyList(store: OutreachStore): string {
  return readyDomains(store)
    .map((row) => row.domain)
    .join("\n")
}

export function showDomain(store: OutreachStore, domain: string): string {
  const row = requireDomain(store, domain)
  const packet = store.getPacket(domain)
  const lines = [`domain: ${row.domain}`, `channel: ${row.channel}`, `status: ${row.status}`]
  if (packet === null) {
    lines.push("packet: none")
  } else {
    lines.push(packet)
  }
  return lines.join("\n")
}

export function approveDomain(store: OutreachStore, domain: string): void {
  requireDomain(store, domain)
  store.updateStatus(domain, "approved")
}

export function rejectDomain(store: OutreachStore, domain: string): void {
  requireDomain(store, domain)
  store.updateStatus(domain, "rejected")
  store.suppress(domain)
}
