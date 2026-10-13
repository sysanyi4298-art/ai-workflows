import { ForbiddenListingCopyError, type Listing } from "./config"
import {
  blurbLimit,
  commentDraft,
  emailLetter,
  OUTREACH_SUBJECT,
  pageCategory,
  promoLinks,
} from "./copy"
import { findForbiddenCopy } from "./copy-rules"
import type { Channel, OutreachStore, Status } from "./db"
import { buildListingFields, type ListingFields } from "./listing"
import { withPromoCode } from "./promo-url"
import { pageRequiresLogo, qualifyPage, submissionRequiresIcp } from "./qualify"
import { type RegistrationRow, registrationFor } from "./short-code"

const LOGO_NOTE = "对方要求应用标识，但未提供 logo，已阻止导出。"

export type ReadyPacket =
  | {
      readonly kind: "form"
      readonly domain: string
      readonly pageUrl: string
      readonly fields: ListingFields
      readonly registration: RegistrationRow
    }
  | {
      readonly kind: "email"
      readonly domain: string
      readonly pageUrl: string
      readonly mailto: string
      readonly subject: string
      readonly from: string
      readonly replyTo: string
      readonly body: string
      readonly appendix: ListingFields
      readonly registration: RegistrationRow
    }
  | {
      readonly kind: "comment"
      readonly domain: string
      readonly pageUrl: string
      readonly body: string
      readonly links: readonly string[]
      readonly registration: RegistrationRow
    }
  | {
      readonly kind: "blocked"
      readonly reason: "missing_logo"
      readonly note: string
    }

export type ComposeResult = {
  readonly status: Status
  readonly packet: ReadyPacket | null
  readonly note: string | null
}

export type ComposeInput = {
  readonly html: string
  readonly pageUrl: string
  readonly domain: string
  readonly allowlist: readonly string[]
  readonly listing: Listing
  readonly commentPool: readonly string[]
  readonly shortCode: string
  readonly logoPath?: string
}

function firstMail(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, " ")
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0] ?? null
}

function assertClean(value: string): void {
  const forbidden = findForbiddenCopy(value)
  if (forbidden !== undefined) {
    throw new ForbiddenListingCopyError(forbidden)
  }
}

function isSubmit(channel: Channel): boolean {
  return channel === "form" || channel === "email" || channel === "comment"
}

function fieldsFor(input: ComposeInput): ListingFields {
  const category = pageCategory(input.html)
  const limit = blurbLimit(input.html)
  return buildListingFields(input.listing, {
    url: withPromoCode(input.listing.url, input.shortCode),
    ...(limit === undefined ? {} : { blurb: input.listing.blurb.slice(0, limit) }),
    ...(category === undefined ? {} : { category }),
    ...(input.logoPath === undefined ? {} : { logoPath: input.logoPath }),
  })
}

function blocked(status: Status): ComposeResult {
  return { status, packet: null, note: null }
}

export function composePacket(input: ComposeInput): ComposeResult {
  const channel = qualifyPage({
    html: input.html,
    pageUrl: input.pageUrl,
    allowlist: input.allowlist,
  })
  if (
    isSubmit(channel) &&
    submissionRequiresIcp(input.html) &&
    input.listing.icp_number.trim().length === 0
  ) {
    return blocked("blocked_icp")
  }
  if (isSubmit(channel) && pageRequiresLogo(input.html) && input.logoPath === undefined) {
    return {
      status: "qualified",
      packet: { kind: "blocked", reason: "missing_logo", note: LOGO_NOTE },
      note: LOGO_NOTE,
    }
  }
  if (!isSubmit(channel)) {
    if (channel === "friend_link") {
      return { status: "qualified", packet: null, note: "对方要互换友链，不进入待粘贴队列。" }
    }
    if (channel === "paid_only") {
      return { status: "qualified", packet: null, note: "对方只收付费收录，不进入待粘贴队列。" }
    }
    return blocked("qualified")
  }
  const fields = fieldsFor(input)
  const registration = registrationFor(input.domain, input.shortCode)
  const category = pageCategory(input.html)
  if (channel === "form") {
    return {
      status: "queued",
      packet: { kind: "form", domain: input.domain, pageUrl: input.pageUrl, fields, registration },
      note: null,
    }
  }
  if (channel === "email") {
    const mailto = firstMail(input.html)
    if (mailto === null) {
      return blocked("qualified")
    }
    const body = emailLetter({
      listing: input.listing,
      category,
      links: promoLinks(input.listing, input.shortCode),
    })
    assertClean(body)
    return {
      status: "queued",
      packet: {
        kind: "email",
        domain: input.domain,
        pageUrl: input.pageUrl,
        mailto,
        subject: OUTREACH_SUBJECT,
        from: input.listing.contact,
        replyTo: input.listing.contact,
        body,
        appendix: fields,
        registration,
      },
      note: null,
    }
  }
  const links = promoLinks(input.listing, input.shortCode)
  const body = commentDraft({ listing: input.listing, category, links })
  assertClean([body, ...links].join("\n"))
  return {
    status: "queued",
    packet: {
      kind: "comment",
      domain: input.domain,
      pageUrl: input.pageUrl,
      body,
      links,
      registration,
    },
    note: null,
  }
}

export function saveCompose(store: OutreachStore, domain: string, result: ComposeResult): void {
  store.updateStatus(domain, result.status)
  store.setPacket(domain, result.packet === null ? null : JSON.stringify(result.packet))
}
