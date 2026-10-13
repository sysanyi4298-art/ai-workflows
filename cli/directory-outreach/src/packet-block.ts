const DEFAULT_NOTE = "对方要求应用标识，但未提供 logo，已阻止导出。"

export function packetBlockNote(packet: string | null): string | undefined {
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
  if (
    Reflect.get(parsed, "kind") !== "blocked" ||
    Reflect.get(parsed, "reason") !== "missing_logo"
  ) {
    return undefined
  }
  const note = Reflect.get(parsed, "note")
  return typeof note === "string" && note.length > 0 ? note : DEFAULT_NOTE
}
