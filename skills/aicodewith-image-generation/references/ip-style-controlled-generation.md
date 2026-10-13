# IP/style-controlled image generation notes

Use when the user provides a character/IP reference and says the generated image must follow that style.

## Lesson

If the user asks for an illustration based on an IP/reference image, do not only describe the task category (e.g. “AI Agent illustration”). The prompt must explicitly preserve the IP’s recognizable visual anchors and the reference image’s style constraints.

## Prompt structure

1. State the deliverable and usage context.
2. Add a hard requirement: “core IP must be visually recognizable.”
3. List concrete IP anchors from the reference image:
   - body/head orientation
   - color blocks
   - ears/eyes/nose/mouth shape
   - distinctive patches/accessories
   - expression/personality
4. List style constraints from the reference image:
   - palette
   - background
   - flat/vector/3D/photographic style
   - line weight, cards, nodes, icons, decoration
   - forbidden style drift (e.g. no blue-purple tech glow, no 3D)
5. Then add the new product/theme content.
6. For multiple images, define different compositions while keeping the same IP and visual system.

## Example skeleton

```text
Generate N website illustrations for [product/context].

Core IP must be very recognizable: [specific character orientation, colors, ear/face/body markings, expression, silhouette]. Do not transform the IP into a generic mascot, robot, or different species. Preserve [top 3 most recognizable anchors].

Visual style must strictly follow the reference: [palette], [background], [flat/vector/etc.], [shape language], [UI motif]. Avoid [style drift].

Theme/content: [agent/workflow/product concept].

Composition variants:
1. ...
2. ...

No readable text, no logos, no watermark.
```

## Pitfall

Do not rely on “based on this IP” alone. If the generated image loses recognizability, the prompt was underspecified even if the product theme was correct.
