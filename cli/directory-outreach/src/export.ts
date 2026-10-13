import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { ForbiddenListingCopyError } from "./config"
import { findForbiddenCopy } from "./copy-rules"
import type { Channel, OutreachStore } from "./db"
import type { ListingFieldKey, ListingFields } from "./listing"
import { packetBlockNote } from "./packet-block"
import { MissingDomainError } from "./queue"

export const EXPORT_FROM = "sysanyi4298@gmail.com"
export const EXPORT_SUBJECT = "申请收录 AI Code With｜多模型 API 与 AI 编程工具接入"

const FIELD_KEYS = [
  "应用名称",
  "工具链接",
  "分类类别",
  "网址标签",
  "应用简介",
  "应用详情",
  "应用标识",
  "备案信息",
  "联系方式",
] as const satisfies readonly ListingFieldKey[]

const FRIEND_NOTE = "对方要互换友链，不进入待粘贴队列。"
const PAID_NOTE = "对方只收付费收录，不进入待粘贴队列。"

export class ExportNotApprovedError extends Error {
  readonly name = "ExportNotApprovedError"
  constructor(
    readonly domain: string,
    readonly status: string,
  ) {
    super(`export requires approved status: ${domain} is ${status}`)
  }
}

export class ExportPacketError extends Error {
  readonly name = "ExportPacketError"
  constructor(readonly domain: string) {
    super(`export packet is missing or invalid: ${domain}`)
  }
}

export class MissingRequiredLogoError extends Error {
  readonly name = "MissingRequiredLogoError"
  constructor(
    readonly domain: string,
    readonly note: string,
  ) {
    super(note)
  }
}

function textValue(value: object, key: string): string | undefined {
  if (!(key in value)) {
    return undefined
  }
  const raw: unknown = Reflect.get(value, key)
  return typeof raw === "string" ? raw : undefined
}

function objectValue(value: object, key: string): object | undefined {
  if (!(key in value)) {
    return undefined
  }
  const raw: unknown = Reflect.get(value, key)
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw
  }
  return undefined
}

function readFields(value: object, key: string): ListingFields | undefined {
  const raw = objectValue(value, key)
  if (raw === undefined) {
    return undefined
  }
  const required = {
    应用名称: textValue(raw, "应用名称"),
    工具链接: textValue(raw, "工具链接"),
    分类类别: textValue(raw, "分类类别"),
    网址标签: textValue(raw, "网址标签"),
    应用简介: textValue(raw, "应用简介"),
    应用详情: textValue(raw, "应用详情"),
    联系方式: textValue(raw, "联系方式"),
  }
  for (const field of Object.values(required)) {
    if (field === undefined) {
      return undefined
    }
  }
  const fields: ListingFields = {
    应用名称: required.应用名称 ?? "",
    工具链接: required.工具链接 ?? "",
    分类类别: required.分类类别 ?? "",
    网址标签: required.网址标签 ?? "",
    应用简介: required.应用简介 ?? "",
    应用详情: required.应用详情 ?? "",
    联系方式: required.联系方式 ?? "",
  }
  const icp = textValue(raw, "备案信息")?.trim() ?? ""
  const withIcp = icp.length === 0 ? fields : { ...fields, 备案信息: icp }
  const logo = textValue(raw, "应用标识")
  return logo === undefined ? withIcp : { ...withIcp, 应用标识: logo }
}

function checklist(fields: ListingFields): string {
  return FIELD_KEYS.flatMap((key) => {
    const value = fields[key]
    return value === undefined ? [] : [`${key}: ${value}`]
  }).join("\n")
}

function noteFor(channel: Channel): string | undefined {
  if (channel === "friend_link") {
    return FRIEND_NOTE
  }
  if (channel === "paid_only") {
    return PAID_NOTE
  }
  return undefined
}

function emailFiles(packet: object): { eml: string; md: string } | undefined {
  const body = textValue(packet, "body")
  const mailto = textValue(packet, "mailto")
  if (body === undefined || mailto === undefined) {
    return undefined
  }
  const from = textValue(packet, "from") ?? EXPORT_FROM
  const replyTo = textValue(packet, "replyTo") ?? from
  const subject = textValue(packet, "subject") ?? EXPORT_SUBJECT
  const eml = [
    `To: ${mailto}`,
    `From: ${from}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
    "",
  ].join("\n")
  const appendix = readFields(packet, "appendix")
  const pageUrl = textValue(packet, "pageUrl")
  const extra =
    appendix === undefined || pageUrl === undefined
      ? ""
      : `\n\n---\n附表（表单字段，非邮件正文）\n页面: ${pageUrl}\n${checklist(appendix)}\n`
  return { eml, md: `${body}\n${extra}` }
}

function commentText(packet: object): string | undefined {
  const pageUrl = textValue(packet, "pageUrl")
  const body = textValue(packet, "body")
  if (pageUrl === undefined || body === undefined || !("links" in packet)) {
    return undefined
  }
  const links: unknown = Reflect.get(packet, "links")
  if (!Array.isArray(links) || links.some((link) => typeof link !== "string")) {
    return undefined
  }
  const extra = links.filter(
    (link): link is string => typeof link === "string" && !body.includes(link),
  )
  return [`页面: ${pageUrl}`, body, ...extra].join("\n")
}

function filesFor(
  channel: Channel,
  packet: string | null,
): { readonly name: string; readonly body: string }[] | undefined {
  const note = noteFor(channel)
  if (note !== undefined) {
    return [{ name: "NOTE.md", body: `${note}\n` }]
  }
  if (packet === null) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(packet)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined
    }
    throw error
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return undefined
  }
  const kind = textValue(parsed, "kind")
  if (kind === "email") {
    const email = emailFiles(parsed)
    if (email === undefined) {
      return undefined
    }
    return [
      { name: "message.eml", body: email.eml },
      { name: "message.md", body: email.md },
    ]
  }
  if (kind === "form") {
    const pageUrl = textValue(parsed, "pageUrl")
    const fields = readFields(parsed, "fields")
    if (pageUrl === undefined || fields === undefined) {
      return undefined
    }
    return [{ name: "FORM.txt", body: `页面: ${pageUrl}\n${checklist(fields)}\n` }]
  }
  if (kind === "comment") {
    const text = commentText(parsed)
    if (text === undefined) {
      return undefined
    }
    return [{ name: "COMMENT.txt", body: `${text}\n` }]
  }
  return undefined
}

export function exportDomain(store: OutreachStore, domain: string, outRoot: string): string {
  const row = store.getDomain(domain)
  if (row === undefined) {
    throw new MissingDomainError(domain)
  }
  if (row.status !== "approved") {
    throw new ExportNotApprovedError(domain, row.status)
  }
  const packet = store.getPacket(domain)
  const blocked = packetBlockNote(packet)
  if (blocked !== undefined) {
    throw new MissingRequiredLogoError(domain, blocked)
  }
  const files = filesFor(row.channel, packet)
  if (files === undefined) {
    throw new ExportPacketError(domain)
  }
  const forbidden = findForbiddenCopy(files.map((file) => file.body).join("\n"))
  if (forbidden !== undefined) {
    throw new ForbiddenListingCopyError(forbidden)
  }
  const dir = join(outRoot, domain)
  mkdirSync(dir, { recursive: true })
  for (const file of files) {
    writeFileSync(join(dir, file.name), file.body, "utf8")
  }
  store.updateStatus(domain, "exported")
  return dir
}
