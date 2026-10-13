# Token leaderboard banner edit pattern

Use this reference for iterative website/banner image generation where the user starts from a cute promotional graphic and asks for a cleaned banner asset.

## Durable pattern

1. Confirm required AICodeWith parameters before generation, even for edits:
   - model, size/aspect ratio, n, quality, resolution.
2. For website hero banners, ask/propose a wide ratio such as `3:1` when the user wants a horizontal banner.
3. If the prior generated image already has a public URL, reuse it in `image_urls` for the next edit. Do not attempt to pass local Telegram cache paths to the API.
4. When the user says to remove background/text/buttons, explicitly enumerate all removals in the prompt:
   - remove beige/yellow/background card if requested
   - remove all text, typography, headline, subtitle, badges with words, brand text
   - remove CTA buttons and UI controls
   - preserve only mascot/illustration/ranking decorative elements
5. Ask the model to leave empty space for the site to overlay its own title later if it is a banner asset.

## Prompt recipe

```text
Edit the provided 3:1 website banner image.
Remove the pale beige/yellow background entirely. Remove ALL text, typography, labels, badges with words, brand text, headline, subtitle, and remove the CTA button.
Keep and improve only the cute glossy token/blob mascot illustration elements: colorful jelly-like blob characters, token coins, small flames, trophy, upward arrows, rank badges like #1 #2 #3 only if they are decorative, and cheerful leaderboard/AI usage energy.
Create a clean transparent-background or pure white-background banner asset suitable for placing over a website hero section. No words, no sentences, no UI button. Preserve the playful glossy vector/soft-3D style, saturated colors, polished highlights, cute expressions, wide horizontal composition, bottom-heavy mascot cluster with empty space above for the website to overlay its own title later.
Important: output should be a 3:1 horizontal banner illustration, no watermark, no photorealism, no visible text.
```

## Final response

Return the task id, completion status, selected options, and one markdown image URL only. Avoid resending prior images unless requested.
