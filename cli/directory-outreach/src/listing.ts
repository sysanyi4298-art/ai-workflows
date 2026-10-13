import { ForbiddenListingCopyError, type Listing } from "./config"
import { findForbiddenCopy } from "./copy-rules"

export type ListingFieldKey =
  | "应用名称"
  | "工具链接"
  | "分类类别"
  | "网址标签"
  | "应用简介"
  | "应用详情"
  | "应用标识"
  | "备案信息"
  | "联系方式"

export type ListingFields = {
  readonly 应用名称: string
  readonly 工具链接: string
  readonly 分类类别: string
  readonly 网址标签: string
  readonly 应用简介: string
  readonly 应用详情: string
  readonly 联系方式: string
  readonly 备案信息?: string
  readonly 应用标识?: string
}

export type ListingFieldOptions = {
  readonly logoPath?: string
  readonly category?: string
  readonly url?: string
  readonly blurb?: string
}

export function buildListingFields(listing: Listing, options?: ListingFieldOptions): ListingFields {
  const category = options?.category ?? listing.category
  const fields: ListingFields = {
    应用名称: listing.name,
    工具链接: options?.url ?? listing.url,
    分类类别: category,
    网址标签: category,
    应用简介: options?.blurb ?? listing.blurb,
    应用详情: listing.detail,
    联系方式: listing.contact,
  }
  const icp = listing.icp_number.trim()
  const withIcp = icp.length === 0 ? fields : { ...fields, 备案信息: icp }
  const withLogo =
    options?.logoPath === undefined ? withIcp : { ...withIcp, 应用标识: options.logoPath }
  const forbidden = findForbiddenCopy(Object.values(withLogo).join("\n"))
  if (forbidden !== undefined) {
    throw new ForbiddenListingCopyError(forbidden)
  }
  return withLogo
}
