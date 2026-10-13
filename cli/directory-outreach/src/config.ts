import { readFileSync } from "node:fs"
import { join } from "node:path"
import { YAML } from "bun"
import { z } from "zod"
import { findForbiddenCopy } from "./copy-rules"

const COMMENT_URLS = [
  "https://aicodewith.ai/zh",
  "https://aicodewith.ai/zh/models",
  "https://aicodewith.ai/zh/integrations/opencode",
  "https://aicodewith.ai/zh/integrations/zed",
  "https://aicodewith.ai/zh/integrations/cherry-studio",
  "https://aicodewith.ai/zh/integrations/botgem",
  "https://aicodewith.ai/zh/integrations/rikkahub",
  "https://aicodewith.ai/zh/integrations/chatwise",
  "https://aicodewith.ai/zh/integrations/glarity",
  "https://aicodewith.ai/zh/integrations/workbuddy",
] as const

const listingSchema = z
  .object({
    name: z.string().min(1),
    url: z.string().min(1),
    models_url: z.string().min(1),
    integrations_url: z.string().min(1),
    blurb: z.string().min(1),
    contact: z.string().min(1),
    category: z.string().min(1),
    audience: z.string().min(1),
    detail: z.string().min(1),
    values: z.array(z.string().min(1)).min(2).max(3),
    scenario: z.string().min(1),
    icp_number: z.string(),
    verified_at: z.string().min(1),
    sources: z.array(z.string().min(1)).min(1),
    notes: z.string().min(1),
  })
  .superRefine((listing, ctx) => {
    const forbidden = findForbiddenCopy(copyHaystack(listing))
    if (forbidden === undefined) {
      return
    }
    ctx.addIssue({
      code: "custom",
      message: `forbidden listing copy: ${forbidden}`,
    })
  })

const competitorsSchema = z.object({
  hosts: z.array(z.string().min(1)).min(1),
})

export type Listing = Readonly<z.infer<typeof listingSchema>>

export type Config = {
  readonly listing: Listing
  readonly commentUrls: readonly string[]
  readonly navAllowlist: readonly string[]
  readonly competitors: readonly string[]
}

export class ForbiddenListingCopyError extends Error {
  readonly name = "ForbiddenListingCopyError"
  constructor(readonly substring: string) {
    super(`forbidden listing copy: ${substring}`)
  }
}

function copyHaystack(listing: Listing): string {
  return [
    listing.name,
    listing.url,
    listing.models_url,
    listing.integrations_url,
    listing.blurb,
    listing.category,
    listing.audience,
    listing.detail,
    listing.scenario,
    ...listing.values,
    listing.icp_number,
  ].join("\n")
}

function throwListingParseError(error: z.ZodError): never {
  const marker = "forbidden listing copy: "
  for (const issue of error.issues) {
    const at = issue.message.indexOf(marker)
    if (at !== -1) {
      throw new ForbiddenListingCopyError(issue.message.slice(at + marker.length))
    }
  }
  throw error
}

export function parseListingYaml(raw: string): Listing {
  const parsed = listingSchema.safeParse(YAML.parse(raw))
  if (!parsed.success) {
    throwListingParseError(parsed.error)
  }
  return parsed.data
}

export function parseNavAllowlist(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
}

export function parseCompetitorsYaml(raw: string): string[] {
  const parsed = competitorsSchema.parse(YAML.parse(raw))
  return [...parsed.hosts]
}

export function loadConfig(root: string): Config {
  const listing = parseListingYaml(readFileSync(join(root, "config/listing.yaml"), "utf8"))
  const navAllowlist = parseNavAllowlist(
    readFileSync(join(root, "config/nav-allowlist.txt"), "utf8"),
  )
  const competitors = parseCompetitorsYaml(
    readFileSync(join(root, "config/competitors.yaml"), "utf8"),
  )
  return {
    listing,
    commentUrls: COMMENT_URLS,
    navAllowlist,
    competitors,
  }
}
