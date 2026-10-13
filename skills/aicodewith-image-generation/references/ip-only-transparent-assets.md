# IP-only transparent asset generation

Use this reference when the user supplies a busy scene/image but asks for only the mascot/IP as a web asset.

## Durable pattern

1. Confirm whether the user wants the whole scene or only the IP. If they say “只要 IP / 不要背景”, treat every environmental element as negative prompt material.
2. Preserve concrete recognition anchors from the IP reference:
   - species/character type
   - face/body colors
   - ear/limb colors
   - expression details
   - body proportions
   - material/style, e.g. toy-like 3D, chibi, polished platform-game look
3. Convert the business intent into pose/action only, not into background clutter. Example: for a workspace empty state, use “waving hello” and “subtly pointing down-right toward a Create Workspace button” while keeping the image itself free of UI/text.
4. Explicitly strip all non-IP elements from the source scene.
5. Request web-asset suitability: isolated, centered, clean edges, transparent/alpha-ready PNG-style output.

## Prompt skeleton

```text
Create a standalone transparent-background PNG-style 3D mascot character only, based on this IP description: [recognition anchors].
Pose: [business intent as gesture/action].
No background, no ground, no grass, no blocks, no stars, no mushrooms, no coins, no UI, no text, no icons, no scene props, no environment. Isolated character centered with clean edges, web empty-state illustration asset, friendly, minimal, high quality, transparent or plain alpha-ready background.
```

## Pitfalls

- Do not pass local Telegram cache paths to external image APIs as `image_urls`; the AICodeWith API expects public URLs. If no public URL exists, use the image description/recognition anchors in the prompt.
- Do not let the model recreate the busy reference scene when the user asks for “IP only”. Name every unwanted prop/category explicitly.
- Avoid adding readable UI labels inside the PNG even if the asset points toward a button; button text belongs in the web UI, not the mascot image.
