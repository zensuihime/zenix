# Zenix

**Zenix** - Simple image processing utilities by ZensuiHime

A lightweight CLI tool I built for my own daily image processing needs - metadata stripping, resizing, cropping, and format conversion.

*I got tired of using different tools for simple image tasks, so I made this to handle my common workflows in one place.*

**Why "Zenix"?** It's a combination of "Zen" (for the simple, focused approach) + "ix" (from "pixel" - because it's all about images). Plus it sounds like a real tool name! 🎨

## What it does

- **Strip metadata** - Clean EXIF data from photos and videos (privacy)
- **Resize images** - Quick resizing with width/height/scale options
- **Crop images** - Crop by aspect ratio or exact dimensions
- **Convert formats** - Switch between JPEG and PNG
- **Add watermarks** - Text or image watermarks with full customization
- **Batch process** - Handle folders of images at once

## Quick start

```bash
# Install dependencies
bun install

# Strip metadata from a photo
zenix strip photo.jpg clean-photo.jpg

# Resize an image
zenix resize --width 800 photo.jpg resized.jpg

# Crop to square
zenix crop --aspect 1:1 photo.jpg square.jpg

# Convert PNG to JPEG
zenix convert image.png image.jpg

# Add text watermark (default: 5% size, full opacity)
zenix watermark --text "WATERMARK" photo.jpg watermarked.jpg

# Add image watermark with custom size
zenix watermark --image logo.svg --size 15 photo.jpg watermarked.jpg

# Add subtle watermark with custom opacity
zenix watermark --text "© 2024" --size 3 --opacity 0.7 photo.jpg watermarked.jpg

# Add watermark with custom position and padding
zenix watermark --text "SAMPLE" --position top-left --padding-x 20 --padding-y 20 photo.jpg watermarked.jpg

# Add image watermark with different formats (SVG, PNG, JPEG, WebP)
zenix watermark --image logo.png --size 10 --opacity 0.8 photo.jpg watermarked.jpg

# Clean a whole folder
zenix strip -r photos/ cleaned/
```

## Make it portable

```bash
bun run compile
```

Creates `zenix.exe` so you can use it anywhere without installing dependencies.

## Development

```bash
bun run dev    # Run locally
bun test       # Run tests
bun run build  # Build for production
```

## Testing

The project includes comprehensive tests with pixel-by-pixel comparison:

```bash
# Run all tests
bun test

# Run specific test suites
bun test test/watermark.test.ts   # Watermark tests (90 tests)
bun test test/metadata.test.ts    # Metadata tests (9 tests)
bun test test/resize.test.ts      # Resize tests (17 tests)
bun test test/crop.test.ts        # Crop tests (26 tests)
bun test test/convert.test.ts     # Convert tests (23 tests)

# Run with timeout for watermark tests (pixel comparison can be slow)
bun test test/watermark.test.ts --timeout 30000
```

**Total: 165 tests** with ultra-strict pixel validation (0.5% tolerance)

Built with [Bun](https://bun.com) for speed and simplicity.
