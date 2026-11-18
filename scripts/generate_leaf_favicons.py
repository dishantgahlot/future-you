import os
from PyQt5.QtSvg import QSvgRenderer
from PyQt5.QtGui import QImage, QPainter, QColor
from PyQt5.QtCore import QByteArray
from PIL import Image

# 1. Standalone transparent leaf SVG for browser tabs
SVG_LEAF_TRANSPARENT = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="50%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <g transform="translate(256,256) rotate(-12) scale(0.92) translate(-256,-256)">
    <path fill="url(#leafGrad)" d="M471.3 6.7C477.7 .6 487-1.6 495.6 1.2 505.4 4.5 512 13.7 512 24l0 186.9c0 131.2-108.1 237.1-238.8 237.1-77 0-143.4-49.5-167.5-118.7-35.4 30.8-57.7 76.1-57.7 126.7 0 13.3-10.7 24-24 24S0 469.3 0 456C0 381.1 38.2 315.1 96.1 276.3 131.4 252.7 173.5 240 216 240l80 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-80 0c-39.7 0-77.3 8.8-111 24.5 23.3-70 89.2-120.5 167-120.5 66.4 0 115.8-22.1 148.7-44 19.2-12.8 35.5-28.1 50.7-45.3z"/>
  </g>
</svg>'''

# 2. Squircle-backed SVG for mobile / PWA touch icons
SVG_LEAF_SQUIRCLE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F1F1A"/>
      <stop offset="100%" stop-color="#081410"/>
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ADE80"/>
      <stop offset="40%" stop-color="#22C55E"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
    <filter id="leafShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#bgGrad)"/>
  <rect width="504" height="504" x="4" y="4" rx="116" fill="none" stroke="#223326" stroke-width="8"/>
  <g transform="translate(256,256) rotate(-12) scale(0.68) translate(-256,-256)" filter="url(#leafShadow)">
    <path fill="url(#leafGrad)" d="M471.3 6.7C477.7 .6 487-1.6 495.6 1.2 505.4 4.5 512 13.7 512 24l0 186.9c0 131.2-108.1 237.1-238.8 237.1-77 0-143.4-49.5-167.5-118.7-35.4 30.8-57.7 76.1-57.7 126.7 0 13.3-10.7 24-24 24S0 469.3 0 456C0 381.1 38.2 315.1 96.1 276.3 131.4 252.7 173.5 240 216 240l80 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-80 0c-39.7 0-77.3 8.8-111 24.5 23.3-70 89.2-120.5 167-120.5 66.4 0 115.8-22.1 148.7-44 19.2-12.8 35.5-28.1 50.7-45.3z"/>
  </g>
</svg>'''

def render_svg(svg_content, size, transparent=True):
    renderer = QSvgRenderer(QByteArray(svg_content.encode('utf-8')))
    qimg = QImage(size, size, QImage.Format_ARGB32_Premultiplied)
    if transparent:
        qimg.fill(QColor(0, 0, 0, 0))
    else:
        qimg.fill(QColor("#081410"))
    painter = QPainter(qimg)
    painter.setRenderHint(QPainter.Antialiasing, True)
    painter.setRenderHint(QPainter.SmoothPixmapTransform, True)
    renderer.render(painter)
    painter.end()

    temp_path = f"scratch_temp_{size}.png"
    qimg.save(temp_path)
    pil_img = Image.open(temp_path).copy()
    try:
        os.remove(temp_path)
    except:
        pass
    return pil_img

def main():
    public_dir = os.path.join("frontend", "public")
    os.makedirs(public_dir, exist_ok=True)

    # 1. Save SVG favicon (transparent leaf with adaptive scheme)
    svg_favicon_path = os.path.join(public_dir, "favicon.svg")
    with open(svg_favicon_path, "w", encoding="utf-8") as f:
        f.write(SVG_LEAF_TRANSPARENT)
    print("Wrote", svg_favicon_path)

    # 2. Render master high-res transparent leaf
    master_leaf = render_svg(SVG_LEAF_TRANSPARENT, 512, transparent=True)
    master_squircle = render_svg(SVG_LEAF_SQUIRCLE, 512, transparent=False)

    # 3. Save standard transparent sizes (16, 32, 48)
    sizes = [16, 32, 48]
    ico_images = []
    for s in sizes:
        leaf_s = master_leaf.resize((s, s), Image.Resampling.LANCZOS)
        out_path = os.path.join(public_dir, f"favicon-{s}x{s}.png")
        leaf_s.save(out_path, format="PNG")
        print(f"Saved {out_path} ({s}x{s})")
        ico_images.append(leaf_s)

    # 4. Save favicon.png (32x32)
    fav_png_path = os.path.join(public_dir, "favicon.png")
    master_leaf.resize((32, 32), Image.Resampling.LANCZOS).save(fav_png_path, format="PNG")
    print("Saved", fav_png_path)

    # 5. Save multi-resolution favicon.ico (16, 32, 48)
    ico_path = os.path.join(public_dir, "favicon.ico")
    ico_images[0].save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico_images[1:])
    print("Saved", ico_path)

    # 6. Save mobile icons with squircle background
    apple_path = os.path.join(public_dir, "apple-touch-icon.png")
    master_squircle.resize((180, 180), Image.Resampling.LANCZOS).save(apple_path, format="PNG")
    print("Saved", apple_path)

    android_192 = os.path.join(public_dir, "android-chrome-192x192.png")
    master_squircle.resize((192, 192), Image.Resampling.LANCZOS).save(android_192, format="PNG")
    print("Saved", android_192)

    android_512 = os.path.join(public_dir, "android-chrome-512x512.png")
    master_squircle.save(android_512, format="PNG")
    print("Saved", android_512)

    print("All leaf favicons generated successfully!")

if __name__ == "__main__":
    main()
