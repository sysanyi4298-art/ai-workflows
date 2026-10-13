# Programmatic Image Analysis (Pillow + NumPy fallback)

When `vision_analyze` fails (missing vision provider, model doesn't support vision), use this
approach to extract actionable visual data from an image file without seeing it.

## Dependencies

```bash
uv pip install Pillow numpy
```

If already in venv, runs with `/opt/hermes/.venv/bin/python`.

## Analysis recipe

Run these analyses in order — each builds on the previous:

### 1. Basic info + dominant colors

```python
from PIL import Image
import collections

img = Image.open('/path/to/image.jpg')
print(f'Format: {img.format}')
print(f'Size: {img.size[0]}x{img.size[1]}')
print(f'Mode: {img.mode}')

img_small = img.resize((100, 100))
pixels = list(img_small.getdata())
color_counts = collections.Counter(pixels)

for color, count in color_counts.most_common(20):
    pct = count / len(pixels) * 100
    if pct > 0.5:
        r, g, b = color[0], color[1], color[2] if len(color) >= 3 else (color[0],)*3
        print(f'  #{r:02x}{g:02x}{b:02x} RGB({r},{g},{b}) = {pct:.1f}%')
```

### 2. Composition: content bounding box + quadrant density

```python
import numpy as np
arr = np.array(img)
mask = ~((arr[:,:,0] > 240) & (arr[:,:,1] > 240) & (arr[:,:,2] > 240))
rows = np.any(mask, axis=1)
cols = np.any(mask, axis=0)

if rows.any():
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    print(f'Content region: ({cmin},{rmin}) to ({cmax},{rmax})')
    
    crop = arr[rmin:rmax, cmin:cmax]
    h, w = crop.shape[0], crop.shape[1]
    for qname, q in [('top-left', crop[:h//2,:w//2]),
                      ('top-right', crop[:h//2,w//2:]),
                      ('bot-left', crop[h//2:,:w//2]),
                      ('bot-right', crop[h//2:,w//2:])]:
        non_white = ((q[:,:,0] < 240) | (q[:,:,1] < 240) | (q[:,:,2] < 240)).mean()
        print(f'  {qname}: {non_white*100:.0f}% non-white')

# Row-by-row density profile
for r in range(rmin, rmax+1, max(1, (rmax-rmin)//15)):
    content_pct = mask[r, cmin:cmax].mean()
    bar = '#' * int(content_pct * 50)
    print(f'  row {r:4d}: {bar} ({content_pct*100:.0f}%)')
```

### 3. Edge density (shape/contour distribution)

```python
from PIL import ImageFilter
edges = np.array(img.filter(ImageFilter.FIND_EDGES))
edge_mask = (edges[:,:,0] > 30) | (edges[:,:,1] > 30) | (edges[:,:,2] > 30)

h, w = arr.shape[:2]
dh, dw = h//8, w//8
print('Edge density grid (8x8):')
for row in range(8):
    line = ''
    for col in range(8):
        density = edge_mask[row*dh:(row+1)*dh, col*dw:(col+1)*dw].mean()
        if density > 0.20: line += '██'
        elif density > 0.10: line += '▓▓'
        elif density > 0.05: line += '▒▒'
        elif density > 0.01: line += '░░'
        else: line += '  '
    print(f'  {line}')
```

### 4. Symmetry check

```python
mid = w // 2
left = arr[:, :mid]
right = arr[:, mid:][:, ::-1]  # flipped
diff = np.abs(left.astype(float) - right.astype(float)).mean()
print(f'Left-right avg diff: {diff:.0f} (0=perfect symmetry)')
```

### 5. Color banding (horizontal slices)

```python
for r in range(50, arr.shape[0], 50):
    strip = arr[r:r+10, 50:-50]
    avg = strip.mean(axis=(0,1))
    rc, gc, bc = int(avg[0]), int(avg[1]), int(avg[2])
    label = 'DARK' if rc<100 and gc<100 and bc<100 else \
            'WARM' if rc>150 and gc>100 and bc<170 else \
            'LITE' if rc>200 and gc>200 and bc>200 else 'GRAY'
    print(f'  row {r:4d}: #{rc:02x}{gc:02x}{bc:02x} [{label}]')
```

## What to infer from these outputs

- **Color palette** → the brand's color language; guides hero background palette
- **Composition quadrants** → where the visual weight sits; asymmetrical logos need backgrounds that balance them
- **Edge density grid** → locates complex/detailed regions vs. flat areas
- **Symmetry** → low diff = centered/symmetric logo; high diff = dynamic/off-center
- **Color banding** → reveals gradients and transitions across the image

## When to use this

Only when `vision_analyze` fails with a provider error. If vision works, prefer it —
it gives richer results including text recognition and semantic understanding.
