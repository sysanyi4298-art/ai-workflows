# Landing Page Hero Banner Adaptation Notes

Use when a user provides a busy fantasy/game reference image and wants a website hero/landing-page cover, especially for a premium ecommerce template such as v0 Evasion.

## Design sequence

1. **Do not generate immediately.** First analyze the reference image and the target template/page style.
2. For premium ecommerce templates, convert the reference into a **brand hero background**, not a game screenshot or poster.
3. Preserve the reference's emotional anchors while reducing clutter:
   - keep: cute mascot, fantasy/adventure mood, floating islands, waterfalls, atmospheric depth
   - reduce/replace: classic game props that resemble protected IP, dense collectibles, obvious question blocks, excessive coins
4. Reserve composition zones for web use:
   - left 35–40%: darker, low-detail negative space for title/navigation
   - top band: clean sky/gradient for nav overlay
   - center-right: main mascot/focal island
   - right side: brighter fantasy world detail
   - bottom: calm water/grass transition for crop tolerance
5. Discuss style before generation. A useful balanced target is: **premium brand feel 60% + game adventure feel 40%**.
6. Only after style is agreed, confirm the mandatory generation parameters.

## Prompt recipe

Core wording:

```text
A cinematic 16:9 hero banner for a premium landing page, a whimsical fantasy adventure world in polished stylized 3D illustration. The left 40% of the image is a calm dark blue misty valley with distant cliffs, soft fog, subtle water reflections and low-detail negative space for website text and navigation. The center-right features a cute dog adventurer mascot standing confidently on a small floating grassy island with flowers, vines and soft glowing particles. The right side opens into a bright colorful fairytale world with floating islands, waterfalls, clouds, lush greenery, delicate flowers, a charming mushroom house and a distant ivy-covered stone tower.

Premium website hero composition, clean top area for navigation overlay, strong depth, atmospheric perspective, soft cinematic lighting, vibrant but refined color palette, high-end 3D game promotional art, cute but not childish, adventurous and joyful mood.

No text, no logo, no UI, no buttons, no captions, no watermark, no classic question blocks, no Mario-style objects, no pixel art, no flat vector, no anime.
```

## Recommended option set

For a first high-quality hero master:

- model: `gpt-image-2`
- size: `16:9` when 21:9 is uncertain or not desired
- n: `1`
- quality: `high`
- resolution: `2K`

If the final page needs an ultra-wide crop, generate 16:9 as a flexible master first, then crop/extend after visual approval.

## Implementation note

If the runtime does not have `requests`, do not stop. Use Python stdlib `urllib.request` to call the AICodeWith API and poll the task. The lesson is to have a dependency-free fallback, not to assume the image API is unavailable.
