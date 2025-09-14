# Zenix

A lightweight CLI tool for image processing - metadata stripping, resizing, cropping, format conversion, and watermarking.

> **Personal Tool**: Built for my own daily image processing needs. Open source under MIT license, but not seeking contributions. Feel free to fork it!

## Features

- **Strip metadata** - Clean EXIF data from photos and videos
- **Resize images** - Quick resizing with width/height/scale options  
- **Crop images** - Crop by aspect ratio or exact dimensions
- **Convert formats** - Switch between JPEG and PNG
- **Add watermarks** - Text or image watermarks with full customization
- **Batch process** - Handle folders of images at once

## Installation

### Local Development
```bash
# Install dependencies
bun install

# Build the project
bun run build

# Run locally
bun start --help
```

### Global Installation
```bash
# Create tarball and install globally
bun pack
bun add -g ./zenix-1.0.0.tgz

# Now use zenix from anywhere
zenix --help
```


## Quick start

```bash
# Strip metadata from a photo
zenix strip photo.jpg clean-photo.jpg

# Resize image to 800px width
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

## Development

```bash
bun run dev    # Run in development mode
bun start      # Run the built version
bun test       # Run tests
bun run build  # Build for production
```

## Development

### Build Commands

```bash
# Development
bun run dev                    # Run in development mode
bun run typecheck             # TypeScript type checking
bun run lint                  # Lint code
bun run lint:fix              # Fix linting issues
bun run format                # Format code

# Building
bun run build                 # Build JavaScript bundle
bun run clean                 # Clean build artifacts
```

### Output Structure

```
dist/                        # JavaScript bundle
└── index.js                 # Bundled application
```

## About

**Why "Zenix"?** It's a combination of "Zen" (from my name ZensuiHime, representing the simple, focused approach) + "ix" (from "pixel" - because it's all about images). Plus it sounds like a real tool name! 🎨

*I got tired of using different tools for simple image tasks, so I made this to handle my common workflows in one place.*

## License & Usage

This project is released under the [MIT License](LICENSE). 

**Personal Tool Notice**: This is a personal project I built for my own image processing needs. While it's open source and you're welcome to use it, I'm not actively seeking:
- Feature requests
- Pull requests  
- Issue reports
- Community contributions

If you find it useful, feel free to fork it and modify it for your own needs!

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
