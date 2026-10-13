export function isBlocked(path: string, rules: readonly string[]): boolean {
  for (const rule of rules) {
    if (rule === "/" || path === rule || path.startsWith(`${rule}/`)) {
      return true
    }
  }
  return false
}

export function disallowedPaths(body: string, userAgent: string): readonly string[] {
  const groups: { agents: string[]; rules: string[] }[] = []
  let agents: string[] = []
  let rules: string[] = []
  let sawRule = false
  const flush = (): void => {
    if (agents.length === 0) {
      return
    }
    groups.push({ agents: [...agents], rules: [...rules] })
    agents = []
    rules = []
    sawRule = false
  }
  for (const raw of body.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim()
    if (line.length === 0) {
      flush()
      continue
    }
    const colon = line.indexOf(":")
    if (colon === -1) {
      continue
    }
    const key = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (key === "user-agent") {
      if (sawRule) {
        flush()
      }
      agents.push(value.toLowerCase())
      continue
    }
    if (key === "disallow") {
      sawRule = true
      if (value.length > 0) {
        rules.push(value)
      }
    }
  }
  flush()
  const agent = userAgent.toLowerCase()
  const specific = groups.filter((group) =>
    group.agents.some((name) => name !== "*" && agent.startsWith(name)),
  )
  const chosen =
    specific.length > 0 ? specific : groups.filter((group) => group.agents.includes("*"))
  return chosen.flatMap((group) => group.rules)
}
