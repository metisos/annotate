"""Generate Annotate store icons at 128x128.

Renders at 1024x1024 and downsamples with LANCZOS for crisp serifs.
Output: dark + paper variants in this folder.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent

# Brand palette
PAPER = (251, 250, 246)        # #fbfaf6 warm cream
INK   = (26, 24, 22)           # near-black, warm
ACCENT = (211, 74, 28)         # #d34a1c vermilion

SERIF_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_BOLD_ITALIC = "/usr/share/fonts/truetype/liberation/LiberationSerif-BoldItalic.ttf"

OVERSAMPLE = 8  # render at 1024 → downsample to 128
SIZE = 128


def render_variant(name: str, bg, fg, accent, italic: bool, font_size: int, a_yshift: int, dot_radius: int, dot_offset: tuple[int, int]):
    canvas_size = SIZE * OVERSAMPLE
    img = Image.new("RGBA", (canvas_size, canvas_size), bg + (255,))
    draw = ImageDraw.Draw(img)

    font_path = SERIF_BOLD_ITALIC if italic else SERIF_BOLD
    font = ImageFont.truetype(font_path, font_size * OVERSAMPLE)

    # Compute glyph bbox for "A" only
    bbox = draw.textbbox((0, 0), "A", font=font)
    a_w = bbox[2] - bbox[0]
    a_h = bbox[3] - bbox[1]

    # We want the "A" centered (with slight optical offset).
    # Italic glyphs lean right; nudge left to recenter optically.
    optical_shift = -font_size * OVERSAMPLE * 0.04 if italic else 0
    x = (canvas_size - a_w) // 2 - bbox[0] + int(optical_shift)
    y = (canvas_size - a_h) // 2 - bbox[1] + a_yshift * OVERSAMPLE

    draw.text((x, y), "A", font=font, fill=fg + (255,))

    # The accent dot — bottom-right of the A's baseline
    dx, dy = dot_offset
    dot_cx = x + bbox[0] + a_w + dx * OVERSAMPLE
    dot_cy = y + bbox[1] + a_h + dy * OVERSAMPLE
    r = dot_radius * OVERSAMPLE
    draw.ellipse(
        (dot_cx - r, dot_cy - r, dot_cx + r, dot_cy + r),
        fill=accent + (255,),
    )

    final = img.resize((SIZE, SIZE), Image.LANCZOS)
    out_path = HERE / f"store-icon-128-{name}.png"
    final.save(out_path, "PNG", optimize=True)

    # Also save a high-res version for promotional use
    hi_path = HERE / f"store-icon-1024-{name}.png"
    img.save(hi_path, "PNG", optimize=True)

    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
    print(f"Wrote {hi_path} ({hi_path.stat().st_size} bytes)")


# Variant 1: Dark — matches the current extension icon's vibe, but with a larger A
render_variant(
    name="dark",
    bg=INK,
    fg=PAPER,
    accent=ACCENT,
    italic=False,
    font_size=104,
    a_yshift=-2,
    dot_radius=10,
    dot_offset=(1, -4),
)

# Variant 2: Paper — matches the landing-page hero (italic vermilion A)
render_variant(
    name="paper",
    bg=PAPER,
    fg=ACCENT,
    accent=INK,
    italic=True,
    font_size=108,
    a_yshift=-2,
    dot_radius=8,
    dot_offset=(0, -4),
)
