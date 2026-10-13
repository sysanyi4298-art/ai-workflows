# AI model logo mascot banners

Session learning from a 3:1 token leaderboard banner iteration.

## Class of task

When generating cute/3D/jelly mascot banners for AI model leaderboards, users may expect strong official-logo recognition, not loose brand-color inspiration. If the user asks for model IPs like Claude, Codex, DeepSeek, Gemini, clarify whether they want:

- brand-inspired mascots, or
- official-logo-recognizable mascots made cuter.

If they say “一看就知道是 X” or “官方 logo 复刻然后可爱一点”, preserve the logo silhouette and core marks first; add cuteness second.

## Codex logo anchors

Do **not** represent Codex with the OpenAI/GPT knot logo, and do not default to a generic black terminal/code block. The user corrected that this is visually wrong.

Use these anchors for Codex:

- app-style rounded-square icon
- white/light-gray icon base with large rounded corners and soft shadow
- inner cloud/blob terminal symbol
- smooth purple/violet-to-deep-blue gradient on the inner blob
- pale lavender/white terminal glyphs: `>_`
- developer-terminal feeling, but still app-icon clean

Good prompt fragment:

> Codex mascot must match an app-style rounded-square white/light-gray icon with large rounded corners and soft shadow; inside it a rounded cloud/blob terminal symbol with smooth purple/violet at the top to deep blue at the bottom; inside the cloud are pale lavender/white terminal prompt marks like `>_`. Make it cute and glossy 3D, but do not obscure the cloud shape or `>_`. It should look like the Codex logo reference, not the OpenAI knot, GPT logo, or a generic black terminal.

## Iteration pattern

For incremental edits:

1. Reuse the previous generated public image URL as `image_urls` when available.
2. If the user provides a local Telegram/cache image as logo reference, do not pass the local path to AICodeWith; describe its visual anchors in the prompt unless a public URL is available.
3. Preserve approved parts explicitly: “Keep Claude, DeepSeek, Gemini as close as possible; ONLY fix Codex.”
4. State negative constraints explicitly: “not OpenAI knot, not GPT logo, not black terminal, no text, no buttons.”
5. Keep the web banner constraints: `3:1`, no background/card/text/buttons if the user has already removed them, open space above for website overlay text.
