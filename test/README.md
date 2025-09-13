# Test Files for Zenix

This directory contains comprehensive test files and test cases for the Zenix image processing utilities.

## Test File Organization

### Folder Structure
```
test/
├── README.md
├── metadata.test.ts
├── resize.test.ts
├── crop.test.ts
├── convert.test.ts
├── watermark.test.ts      # Watermark functionality tests
├── files/
│   ├── metadata/          # Metadata testing files
│   │   ├── metadata-test.jpg
│   │   ├── metadata-test.png
│   │   └── metadata-test.mp4
│   ├── images/            # Image processing test files
│   │   ├── square-800x800.jpg
│   │   ├── portrait-600x900.jpg
│   │   ├── landscape-1200x800.jpg
│   │   ├── small-square-200x200.jpg
│   │   ├── small-portrait-200x300.jpg
│   │   ├── small-landscape-300x200.jpg
│   │   ├── tiny-square-100x100.jpg
│   │   ├── large-square-2000x2000.jpg
│   │   ├── large-portrait-1200x1800.jpg
│   │   ├── large-landscape-2400x1600.jpg
│   │   └── square-800x800.png
│   ├── watermark-overlays/    # Watermark overlay images
│   │   ├── watermark-overlay-test.svg
│   │   ├── watermark-overlay-test.png
│   │   ├── watermark-overlay-test.jpg
│   │   └── watermark-overlay-test.webp
│   ├── watermark-reference/   # Reference images for comparison
│   │   └── (reference images for pixel comparison)
│   └── test-output/           # Generated test images (auto-created)
└── output/                    # Temporary output directory (auto-created)
```

### Test File Categories

#### Metadata Test Files (`test/files/metadata/`)
Files specifically designed for testing metadata stripping and inspection:

- `metadata-test.jpg` - JPEG image with rich metadata for testing
- `metadata-test.png` - PNG image with metadata for testing  
- `metadata-test.mp4` - MP4 video with metadata for testing

#### Image Processing Test Files (`test/files/images/`)
Files generated from a base image for comprehensive image manipulation testing:

- `square-800x800.jpg` - 800x800 square image
- `portrait-600x900.jpg` - 600x900 portrait image
- `landscape-1200x800.jpg` - 1200x800 landscape image
- `small-square-200x200.jpg` - 200x200 square image (edge case)
- `small-portrait-200x300.jpg` - 200x300 portrait image (edge case)
- `small-landscape-300x200.jpg` - 300x200 landscape image (edge case)
- `tiny-square-100x100.jpg` - 100x100 square image (extreme edge case)
- `large-square-2000x2000.jpg` - 2000x2000 square image (performance test)
- `large-portrait-1200x1800.jpg` - 1200x1800 portrait image (performance test)
- `large-landscape-2400x1600.jpg` - 2400x1600 landscape image (performance test)
- `square-800x800.png` - PNG format test file

#### Watermark Test Files (`test/files/watermark-overlays/`)
Overlay images for testing watermark functionality:

- `watermark-overlay-test.svg` - SVG watermark overlay
- `watermark-overlay-test.png` - PNG watermark overlay
- `watermark-overlay-test.jpg` - JPEG watermark overlay
- `watermark-overlay-test.webp` - WebP watermark overlay

#### Watermark Reference Files (`test/files/watermark-reference/`)
Reference images for pixel-by-pixel comparison testing:

- Contains expected output images for all watermark test cases
- Used for automated pixel comparison validation
- Fixed reference images that should not be modified

## Running Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun test test/metadata.test.ts    # Metadata stripping tests
bun test test/resize.test.ts      # Image resizing tests
bun test test/crop.test.ts        # Image cropping tests
bun test test/convert.test.ts     # Image conversion tests
bun test test/watermark.test.ts   # Watermark functionality tests

# Run with verbose output
bun test --verbose

# Run watermark tests with timeout (pixel comparison can be slow)
bun test test/watermark.test.ts --timeout 30000
```

## Test Structure

- `metadata.test.ts` - Metadata stripping and inspection tests (uses `files/metadata/`)
- `resize.test.ts` - Image resizing functionality tests (uses `files/images/`)
- `crop.test.ts` - Image cropping functionality tests (uses `files/images/`)
- `convert.test.ts` - Image format conversion tests (uses `files/images/`)
- `watermark.test.ts` - Watermark functionality tests (uses `files/watermark-overlays/` and `files/watermark-reference/`)
- `files/metadata/` - Directory for metadata test files
- `files/images/` - Directory for image processing test files
- `files/watermark-overlays/` - Directory for watermark overlay images
- `files/watermark-reference/` - Directory for reference images (pixel comparison)
- `files/test-output/` - Directory for generated test images (auto-created/cleaned)
- `output/` - Temporary output directory (created/deleted during tests)

## Test Coverage

### Metadata Tests (9 tests)
- ✅ **Single File Tests**
  - Strip metadata from JPEG files
  - Strip metadata from PNG files  
  - Strip metadata from MP4 files
- ✅ **Directory Tests**
  - Process all files in directory
  - Process files recursively
- ✅ **Inspection Tests**
  - Inspect metadata without modifying files
  - Inspect directory metadata
- ✅ **Error Handling Tests**
  - Handle non-existent input files
  - Handle non-existent input directories

### Resize Tests (17 tests)
- ✅ **Single File Tests**
  - Resize by width only
  - Resize by height only
  - Resize by scale factor
  - Handle upscaling
  - Fit to specific dimensions
  - Maintain aspect ratio
- ✅ **Directory Tests**
  - Process all images in directory
  - Process files recursively
  - Show progress when enabled
- ✅ **Error Handling Tests**
  - Handle non-existent files/directories
  - Handle invalid scale values
  - Handle invalid fit formats
  - Handle missing resize options
- ✅ **Format Preservation Tests**
  - Preserve JPEG format
  - Preserve PNG format

### Crop Tests (26 tests)
- ✅ **Single File Tests - Aspect Ratio**
  - Crop by aspect ratio 4:5
  - Crop by aspect ratio 1:1 (square)
  - Crop by aspect ratio 16:9
  - Crop from center by default
- ✅ **Single File Tests - Custom Dimensions**
  - Crop by exact dimensions
  - Crop from different positions
  - Crop from all 9 valid positions
- ✅ **Directory Tests**
  - Process directory with aspect ratio
  - Process directory with square aspect ratio
  - Process files recursively
  - Show progress when enabled
- ✅ **Error Handling Tests**
  - Handle non-existent files/directories
  - Handle oversized dimensions (various combinations)
  - Handle conflicting options
  - Handle invalid aspect ratio formats
  - Handle invalid dimensions formats
  - Handle invalid positions
  - Handle missing options
- ✅ **Format Preservation Tests**
  - Preserve JPEG format
  - Preserve PNG format

### Convert Tests (23 tests)
- ✅ **Single File Tests**
  - Convert JPEG to PNG
  - Convert PNG to JPEG
  - Note: WebP support removed due to Windows compatibility issues
  - Apply custom quality for JPEG
  - Apply custom compression for PNG
  - Ignore quality for PNG conversion
  - Ignore compression for JPEG conversion
  - Handle overwrite option
- ✅ **Directory Tests**
  - Convert directory to PNG format
  - Convert directory to JPEG format
  - Apply quality settings to directory conversion
  - Apply compression settings to directory conversion
  - Process files recursively
  - Show progress when enabled
- ✅ **Error Handling Tests**
  - Handle non-existent input files/directories
  - Handle unsupported input/output formats
  - Handle single file with --format option (should fail)
  - Handle directory without --format option (should fail)
  - Handle invalid format
  - Handle output file exists without overwrite
- ✅ **Format Validation Tests**
  - Validate quality range for JPEG (1-100)
  - Validate compression range for PNG (0-9)

### Watermark Tests (90 tests)
- ✅ **Text Watermark Tests**
  - Basic text watermarking with various sizes (1%, 3%, 5%, 10%, 20%, 50%)
  - Text watermarks with different opacity values (0.1, 0.5, 0.7, 1.0)
  - Text watermarks with different colors (white, black, red, blue, green)
  - Text watermarks with different positions (top-left, top-right, center, bottom-left, bottom-right)
  - Text watermarks with padding options
  - Text watermarks with different text content
- ✅ **Image Watermark Tests**
  - Image watermarks with various formats (SVG, PNG, JPEG, WebP)
  - Image watermarks with different sizes (1%, 3%, 5%, 10%, 20%, 50%)
  - Image watermarks with different opacity values (0.1, 0.5, 0.7, 1.0)
  - Image watermarks with different positions (top-left, top-right, center, bottom-left, bottom-right)
  - Image watermarks with padding options
- ✅ **Directory Processing Tests**
  - Process directory with multiple image files
  - Process directory with recursive flag
  - Handle empty directory gracefully
  - Handle directory processing with progress flag
  - Handle mixed success and failure in directory processing
- ✅ **Error Handling Tests**
  - Handle non-existent input files
  - Handle non-existent watermark images
  - Handle negative padding values
  - Handle invalid input path types
  - Handle size validation errors with image watermarks
  - Handle negative size values with image watermarks
  - Handle NaN size values with image watermarks
- ✅ **Edge Case Tests**
  - Handle default position case in calculatePosition
  - Handle default text anchor case
  - Handle extreme size values
  - Handle extreme opacity values
- ✅ **Pixel-by-Pixel Comparison**
  - Ultra-strict pixel validation with 0.5% tolerance
  - Automatic image normalization (RGBA format, identical dimensions)
  - Comprehensive difference reporting
  - Reference image comparison system

## Test Data Requirements

| Filename | Location | Dimensions | Purpose | Status |
|----------|----------|------------|---------|--------|
| `metadata-test.jpg` | `files/metadata/` | 512x512 | Metadata testing | ✅ Required |
| `metadata-test.png` | `files/metadata/` | 512x512 | Metadata testing | ✅ Required |
| `metadata-test.mp4` | `files/metadata/` | 512x512 | Metadata testing | ✅ Required |
| `square-800x800.jpg` | `files/images/` | 800x800 | Base case | ✅ Auto-generated |
| `portrait-600x900.jpg` | `files/images/` | 600x900 | Vertical | ✅ Auto-generated |
| `landscape-1200x800.jpg` | `files/images/` | 1200x800 | Horizontal | ✅ Auto-generated |
| `small-square-200x200.jpg` | `files/images/` | 200x200 | Edge case | ✅ Auto-generated |
| `small-portrait-200x300.jpg` | `files/images/` | 200x300 | Edge case | ✅ Auto-generated |
| `small-landscape-300x200.jpg` | `files/images/` | 300x200 | Edge case | ✅ Auto-generated |
| `tiny-square-100x100.jpg` | `files/images/` | 100x100 | Extreme edge | ✅ Auto-generated |
| `large-square-2000x2000.jpg` | `files/images/` | 2000x2000 | Performance | ✅ Auto-generated |
| `large-portrait-1200x1800.jpg` | `files/images/` | 1200x1800 | Performance | ✅ Auto-generated |
| `large-landscape-2400x1600.jpg` | `files/images/` | 2400x1600 | Performance | ✅ Auto-generated |
| `square-800x800.png` | `files/images/` | 800x800 | Format test | ✅ Auto-generated |

## Adding Test Files

### For Metadata Tests
1. Add your test files to `test/files/metadata/` directory
2. Name them `metadata-test.jpg`, `metadata-test.png`, `metadata-test.mp4`
3. Ensure they contain rich metadata for testing

### For Image Processing Tests
1. Place a base image (4096x4096 recommended) in `test/files/images/` as `base.jpg`
2. Run the crop command to generate all required test files:
   ```bash
   # Generate all test files from base.jpg
   bun run src/index.ts crop test/files/images/base.jpg test/files/images/square-800x800.jpg --dimensions 800x800
   bun run src/index.ts crop test/files/images/base.jpg test/files/images/portrait-600x900.jpg --dimensions 600x900
   # ... (continue for all required dimensions)
   ```
3. Run `bun test` to execute all tests

The tests will automatically skip if required test files are not found and clean up output files after each test.

## Test Features

- **Organized file structure** - Clear separation between metadata, image processing, and watermark tests
- **Dimension verification** - All tests verify exact dimensions
- **Aspect ratio verification** - Tests verify correct ratios
- **Error handling** - Comprehensive error testing
- **Format preservation** - JPEG and PNG format testing
- **Format conversion** - JPEG ↔ PNG conversion testing
- **Quality/compression settings** - JPEG quality and PNG compression testing
- **Position testing** - All 9 crop positions tested
- **Directory processing** - Batch and recursive testing
- **Edge cases** - Oversized dimensions, invalid inputs
- **Cleanup** - Proper test isolation and cleanup
- **Pixel-by-pixel comparison** - Ultra-strict image validation using pixelmatch
- **Watermark testing** - Comprehensive text and image watermark validation
- **Transparency handling** - Proper alpha channel manipulation for watermarks
- **Reference image system** - Fixed reference images for consistent comparison
- **Automatic normalization** - Images normalized to RGBA format for accurate comparison