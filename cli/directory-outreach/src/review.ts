import { z } from "zod"
import type { OutreachStore, Status } from "./db"

const SHOWN = ["queued", "approved"] as const

const emailPacket = z.object({
  kind: z.literal("email"),
  mailto: z.string(),
  subject: z.string(),
  body: z.string(),
})

const formPacket = z.object({
  kind: z.literal("form"),
  pageUrl: z.string(),
  fields: z.record(z.string(), z.string()),
})

const commentPacket = z.object({
  kind: z.literal("comment"),
  pageUrl: z.string(),
  body: z.string(),
  links: z.array(z.string()),
})

const blockedPacket = z.object({
  kind: z.literal("blocked"),
})

const packetSchema = z.discriminatedUnion("kind", [
  emailPacket,
  formPacket,
  commentPacket,
  blockedPacket,
])

function channelLabel(channel: string): string {
  if (channel === "email") {
    return "邮件"
  }
  if (channel === "form") {
    return "表单"
  }
  if (channel === "comment") {
    return "评论"
  }
  return channel
}

function statusLabel(status: Status): string {
  if (status === "queued") {
    return "待审核"
  }
  if (status === "approved") {
    return "已锁定"
  }
  return status
}

function shownStatus(status: Status): boolean {
  return (SHOWN as readonly string[]).includes(status)
}

function extraLinks(body: string, links: readonly string[]): readonly string[] {
  return links.filter((link) => !body.includes(link))
}

function renderPacket(raw: string): string | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return "正文: 无法读取"
    }
    throw error
  }
  const packet = packetSchema.safeParse(parsed)
  if (!packet.success) {
    return "正文: 无法读取"
  }
  if (packet.data.kind === "blocked") {
    return undefined
  }
  if (packet.data.kind === "email") {
    return [
      `收件人: ${packet.data.mailto}`,
      `主题: ${packet.data.subject}`,
      "",
      packet.data.body,
    ].join("\n")
  }
  if (packet.data.kind === "form") {
    const fields = Object.entries(packet.data.fields)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n")
    return [`页面: ${packet.data.pageUrl}`, fields].join("\n")
  }
  const pending = extraLinks(packet.data.body, packet.data.links)
  return [`页面: ${packet.data.pageUrl}`, packet.data.body, ...pending].join("\n")
}

export function formatReview(store: OutreachStore): string {
  const blocks: string[] = []
  for (const row of store.listDomains()) {
    if (!shownStatus(row.status)) {
      continue
    }
    const packet = store.getPacket(row.domain)
    if (packet === null) {
      continue
    }
    const body = renderPacket(packet)
    if (body === undefined) {
      continue
    }
    blocks.push(
      [
        `# ${row.domain}`,
        `渠道: ${channelLabel(row.channel)}`,
        `状态: ${statusLabel(row.status)}`,
        body,
      ].join("\n"),
    )
  }
  return blocks.join("\n\n")
}
