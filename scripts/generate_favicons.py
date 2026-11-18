import os
import base64
import json
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

src_path = 'C:/Users/disha/.gemini/antigravity/brain/f9fe8be3-f0a2-4f7c-a045-d3eb6b2759b4/.user_uploaded/media_1794998362279_0b3b7694.jpg'
dest_dir = 'c:/Users/disha/OneDrive/Desktop/error/future-you/frontend/public'
os.makedirs(dest_dir, exist_ok=True)

img = Image.open(src_path).convert('RGBA')
arr = np.array(img, dtype=np.float32)
h, w, _ = arr.shape
rgb = arr[:, :, :3]
brightness = np.max(rgb, axis=2)

# Flood fill outer black
bg_seed = np.zeros((h, w), dtype=bool)
bg_seed[0, :] = brightness[0, :] < 15
bg_seed[-1, :] = brightness[-1, :] < 15
bg_seed[:, 0] = brightness[:, 0] < 15
bg_seed[:, -1] = brightness[:, -1] < 15

visited = np.copy(bg_seed)
q = deque([(y, x) for y in range(h) for x in range(w) if bg_seed[y, x]])
while q:
    y, x = q.popleft()
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
            if brightness[ny, nx] < 16:
                visited[ny, nx] = True
                q.append((ny, nx))

fg = ~visited
y_idx, x_idx = np.where(fg)
min_y, max_y = y_idx.min(), y_idx.max()
min_x, max_x = x_idx.min(), x_idx.max()

cx = (min_x + max_x) / 2.0
cy = (min_y + max_y) / 2.0
size = max(max_x - min_x + 1, max_y - min_y + 1)
size_crop = int(size + 4)
if size_crop % 2 != 0:
    size_crop += 1

x0 = int(round(cx - size_crop / 2.0))
y0 = int(round(cy - size_crop / 2.0))
x1 = x0 + size_crop
y1 = y0 + size_crop

# Anti-aliased alpha mask
alpha = np.ones((h, w), dtype=np.float32) * 255.0
alpha[visited] = 0.0

mask_img = Image.fromarray(alpha.astype(np.uint8))
mask_smooth = mask_img.filter(ImageFilter.GaussianBlur(radius=0.6))

img_rgba = Image.fromarray(np.dstack([arr[:, :, :3].astype(np.uint8), np.array(mask_smooth, dtype=np.uint8)]))
master_icon = img_rgba.crop((x0, y0, x1, y1))

# Generate standard sizes
sizes = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'favicon-48x48.png': 48,
    'favicon.png': 32,
    'apple-touch-icon.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512,
}

for filename, sz in sizes.items():
    resized = master_icon.resize((sz, sz), Image.Resampling.LANCZOS)
    if sz <= 32:
        resized = resized.filter(ImageFilter.UnsharpMask(radius=0.8, percent=120, threshold=3))
    out_path = os.path.join(dest_dir, filename)
    resized.save(out_path, format='PNG')
    print(f'Saved {filename} ({sz}x{sz})')

# Multi-resolution ICO (16x16, 32x32, 48x48)
ico_path = os.path.join(dest_dir, 'favicon.ico')
master_icon.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print('Saved favicon.ico')

# Also generate favicon.svg embedding 512x512 PNG data URI
img_512 = master_icon.resize((512, 512), Image.Resampling.LANCZOS)
import io
buf = io.BytesIO()
img_512.save(buf, format='PNG')
b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image width="512" height="512" href="data:image/png;base64,{b64}"/>
</svg>'''
with open(os.path.join(dest_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_content)
print('Saved favicon.svg')

# Save site.webmanifest
manifest = {
    "name": "FUTURE YOU",
    "short_name": "Future You",
    "description": "Visualize your future self based on today's habits",
    "icons": [
        {
            "src": "/android-chrome-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/android-chrome-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ],
    "theme_color": "#059669",
    "background_color": "#F8FAFC",
    "display": "standalone"
}
with open(os.path.join(dest_dir, 'site.webmanifest'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)
print('Saved site.webmanifest')
