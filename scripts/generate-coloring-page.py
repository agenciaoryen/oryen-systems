#!/usr/bin/env python3
"""Generate a Bible-scene coloring book page via Gemini image generation."""

import os
import sys
from pathlib import Path
from datetime import datetime

# Load .env.local
env_file = Path(__file__).parent.parent / ".env.local"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v.strip('"\''))

from google import genai
from google.genai import types

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("GEMINI_API_KEY missing")
    sys.exit(1)

PROMPT = """Create a black-and-white children's coloring book page illustration.

SCENE: The Biblical story of Peter walking on water toward Jesus (Matthew 14:22-33).
- Jesus standing serenely ON TOP of turbulent sea water, flowing robes, long hair, full beard, gentle kind face, right arm extended reaching down toward Peter, soft glowing halo around his head
- Peter half-submerged in stormy water, waist-deep, curly hair and short beard, terrified facial expression (wide fearful eyes, open mouth), one arm stretched UP reaching desperately toward Jesus's hand, fingers almost touching
- A wooden fishing boat in the middle distance behind them, mast with tattered sail whipping in the storm, three or four disciples visible at the rail watching with shocked expressions, one pointing
- Dramatic stormy sea with large breaking waves, whitecaps, foam, spray, droplets
- Night sky above with heavy storm clouds, crescent moon partially hidden, stars, a lightning bolt in the distance

STYLE REQUIREMENTS (CRITICAL):
- Pure BLACK line art on pure WHITE background
- NO colors, NO gray tones, NO shading, NO hatching, NO crosshatching, NO stippling, NO fills
- Clean bold outlines only, uniform line weight, like a premium children's coloring book
- Clear separated regions so a child can color each area
- Beautifully composed illustration with good use of space
- Realistic proportions and anatomy, semi-detailed (not cartoon, not photorealistic, not overly busy)
- Reverent, dignified, inspiring mood — this is a Christian children's product
- Portrait A4 orientation
- NO text, NO watermark, NO border, NO signature anywhere in the image

Final output must look like a high-quality printable coloring book page ready for a child to color with crayons or markers."""


def main():
    client = genai.Client(api_key=API_KEY)
    model = "gemini-3-pro-image-preview"
    out_dir = Path(__file__).parent.parent / "outputs" / "coloring-pages"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = out_dir / f"pedro-aguas-{ts}.png"

    print(f"Model: {model}")
    print(f"Output: {out_path}")
    print("Generating... (pode levar 30-90s)")

    resp = client.models.generate_content(
        model=model,
        contents=PROMPT,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
            image_config=types.ImageConfig(aspect_ratio="3:4"),
        ),
    )

    img_data = None
    for part in resp.candidates[0].content.parts:
        if getattr(part, "inline_data", None) and part.inline_data.mime_type.startswith("image/"):
            img_data = part.inline_data.data
            break

    if not img_data:
        print("No image returned. Text response:")
        for part in resp.candidates[0].content.parts:
            if getattr(part, "text", None):
                print(part.text)
        sys.exit(1)

    out_path.write_bytes(img_data)
    print(f"OK -> {out_path}")
    print(out_path)


if __name__ == "__main__":
    main()
