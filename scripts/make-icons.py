#!/usr/bin/env python3
# Generates PWA icons for PadelSplit (stdlib only, no dependencies).
# Run: python3 scripts/make-icons.py

import zlib
import struct
import os
import math

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

GREEN = (13, 159, 110)       # #0d9f6e
GREEN_DARK = (11, 122, 85)   # #0b7a55
WHITE = (255, 255, 255)


def write_png(path, w, h, pixels):
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        c += struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        return c

    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw += bytes(pixels[y][x])

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("wrote:", path)


def make_image(size, rounded=True, maskable=False):
    px = [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]
    r = size * 0.22 if rounded else 0  # rounded corner radius

    def in_rounded(x, y):
        if not rounded:
            return True
        cx = min(max(x, r), size - 1 - r)
        cy = min(max(y, r), size - 1 - r)
        dx = x - cx
        dy = y - cy
        if dx * dx + dy * dy <= r * r:
            return True
        if (r <= x < size - r) or (r <= y < size - r):
            return True
        return False

    c = size / 2
    ball_r = size * (0.26 if maskable else 0.27)

    for y in range(size):
        for x in range(size):
            if not in_rounded(x, y):
                continue
            # background
            px[y][x] = GREEN
            # white padel ball with a subtle curved seam
            dx = x - c
            dy = y - c
            d = (dx * dx + dy * dy) ** 0.5
            if d <= ball_r:
                px[y][x] = WHITE
                seam_y = c + ball_r * 0.75 * math.sin((x / size) * 4.0 * math.pi)
                if abs(y - seam_y) < max(1.2, ball_r * 0.06) and d < ball_r * 0.9:
                    px[y][x] = (214, 226, 219)
            elif d <= ball_r + size * 0.012:
                px[y][x] = GREEN_DARK

    return px


def main():
    os.makedirs(OUT, exist_ok=True)
    write_png(os.path.join(OUT, "icon-192.png"), 192, 192, make_image(192, rounded=True))
    write_png(os.path.join(OUT, "icon-512.png"), 512, 512, make_image(512, rounded=True))
    write_png(os.path.join(OUT, "maskable-512.png"), 512, 512, make_image(512, rounded=False, maskable=True))
    write_png(os.path.join(OUT, "apple-touch-icon.png"), 180, 180, make_image(180, rounded=True))


if __name__ == "__main__":
    main()
