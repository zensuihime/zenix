import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { promises as fs } from 'node:fs';
import { addWatermark } from '../src/commands/watermark.js';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

// Test configuration
const TEST_RESULTS_DIR = 'test/files/watermark-results'; // Reference images (fixed, untouched)
const TEST_OUTPUT_DIR = 'test/files/test-output'; // Generated test images
const TEST_IMAGES_DIR = 'test/files/images';
const TEST_OVERLAYS_DIR = 'test/files/watermark-overlays';

// Image comparison configuration
const PIXEL_COMPARISON_TOLERANCE = 0.005;
const PIXEL_THRESHOLD = 0.005;

// Helper function to compare images pixel by pixel
async function compareImages(referencePath: string, testPath: string): Promise<{
    isMatch: boolean;
    difference: number;
    totalPixels: number;
    differentPixels: number;
}> {
    try {
        // Load both images and normalize them to the same format and dimensions
        const referenceImage = sharp(referencePath);
        const testImage = sharp(testPath);
        
        // Get image metadata
        const referenceMeta = await referenceImage.metadata();
        const testMeta = await testImage.metadata();
        
        // Ensure both images have the same dimensions
        if (referenceMeta.width !== testMeta.width || referenceMeta.height !== testMeta.height) {
            return {
                isMatch: false,
                difference: 1.0,
                totalPixels: (referenceMeta.width || 0) * (referenceMeta.height || 0),
                differentPixels: (referenceMeta.width || 0) * (referenceMeta.height || 0)
            };
        }
        
        // Normalize both images to RGBA format with same dimensions
        const width = referenceMeta.width || 0;
        const height = referenceMeta.height || 0;
        
        // Convert both images to RGBA format to ensure consistent channel count
        const referenceBuffer = await referenceImage
            .resize(width, height)
            .ensureAlpha()
            .raw()
            .toBuffer();
            
        const testBuffer = await testImage
            .resize(width, height)
            .ensureAlpha()
            .raw()
            .toBuffer();
        
        // Verify buffer sizes match
        if (referenceBuffer.length !== testBuffer.length) {
            console.log(`  ⚠️  Buffer size mismatch: reference=${referenceBuffer.length}, test=${testBuffer.length}`);
            return {
                isMatch: false,
                difference: 1.0,
                totalPixels: width * height,
                differentPixels: width * height
            };
        }
        
        // Create diff buffer for pixelmatch
        const diffBuffer = Buffer.alloc(width * height * 4);
        
        // Compare pixels
        const differentPixels = pixelmatch(
            referenceBuffer,
            testBuffer,
            diffBuffer,
            width,
            height,
            {
                threshold: PIXEL_COMPARISON_TOLERANCE,
                diffColor: [255, 0, 0],
                includeAA: false
            }
        );
        
        const totalPixels = width * height;
        const difference = differentPixels / totalPixels;
        
        return {
            isMatch: difference <= PIXEL_THRESHOLD,
            difference,
            totalPixels,
            differentPixels
        };
    } catch (error) {
        console.log(`  ❌ Image comparison error: ${error}`);
        return {
            isMatch: false,
            difference: 1.0,
            totalPixels: 0,
            differentPixels: 0
        };
    }
}

// Test data structure
interface TestCase {
    id: string;
    description: string;
    input: string;
    referenceOutput: string; // Reference image in watermark-results
    testOutput: string; // Generated test image in test-output
    options: {
        text?: string;
        image?: string;
        position?: string;
        size?: string;
        opacity?: string;
        paddingX?: string;
        paddingY?: string;
    };
    expectedFormat?: 'jpeg' | 'png' | 'svg' | 'webp';
    expectedSize?: { width: number; height: number };
}

// Test cases definition
const testCases: TestCase[] = [
    // 1. Opacity and Overlay Tests (O001-O015)
    {
        id: 'O001',
        description: 'Text high opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O001-text-opacity-0.9.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O001-text-opacity-0.9.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.9' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O002',
        description: 'Text medium opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O002-text-opacity-0.5.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O002-text-opacity-0.5.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.5' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O003',
        description: 'Text low opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O003-text-opacity-0.1.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O003-text-opacity-0.1.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.1' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O004',
        description: 'JPG high opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O004-jpg-opacity-0.9.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O004-jpg-opacity-0.9.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.jpg`, position: 'bottom-right', size: '25', opacity: '0.9' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O005',
        description: 'JPG medium opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O005-jpg-opacity-0.5.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O005-jpg-opacity-0.5.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.jpg`, position: 'bottom-right', size: '25', opacity: '0.5' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O006',
        description: 'JPG low opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O006-jpg-opacity-0.1.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O006-jpg-opacity-0.1.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.jpg`, position: 'bottom-right', size: '25', opacity: '0.1' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O007',
        description: 'PNG high opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O007-png-opacity-0.9.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O007-png-opacity-0.9.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.png`, position: 'bottom-right', size: '25', opacity: '0.9' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O008',
        description: 'PNG medium opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O008-png-opacity-0.5.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O008-png-opacity-0.5.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.png`, position: 'bottom-right', size: '25', opacity: '0.5' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O009',
        description: 'PNG low opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O009-png-opacity-0.1.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O009-png-opacity-0.1.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.png`, position: 'bottom-right', size: '25', opacity: '0.1' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O010',
        description: 'SVG high opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O010-svg-opacity-0.9.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O010-svg-opacity-0.9.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '25', opacity: '0.9' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O011',
        description: 'SVG medium opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O011-svg-opacity-0.5.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O011-svg-opacity-0.5.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '25', opacity: '0.5' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O012',
        description: 'SVG low opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O012-svg-opacity-0.1.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O012-svg-opacity-0.1.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '25', opacity: '0.1' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O013',
        description: 'WebP high opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O013-webp-opacity-0.9.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O013-webp-opacity-0.9.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.webp`, position: 'bottom-right', size: '25', opacity: '0.9' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O014',
        description: 'WebP medium opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O014-webp-opacity-0.5.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O014-webp-opacity-0.5.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.webp`, position: 'bottom-right', size: '25', opacity: '0.5' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'O015',
        description: 'WebP low opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/O015-webp-opacity-0.1.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/O015-webp-opacity-0.1.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.webp`, position: 'bottom-right', size: '25', opacity: '0.1' },
        expectedFormat: 'jpeg'
    },

    // 2. Size and Input Image Format Tests (S001-S008)
    {
        id: 'S001',
        description: 'Very small text on PNG',
        input: `${TEST_IMAGES_DIR}/square-800x800.png`,
        referenceOutput: `${TEST_RESULTS_DIR}/S001-text-1pct-png.png`,
        testOutput: `${TEST_OUTPUT_DIR}/S001-text-1pct-png.png`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '1', opacity: '0.8' },
        expectedFormat: 'png'
    },
    {
        id: 'S002',
        description: 'Very large text on PNG',
        input: `${TEST_IMAGES_DIR}/square-800x800.png`,
        referenceOutput: `${TEST_RESULTS_DIR}/S002-text-50pct-png.png`,
        testOutput: `${TEST_OUTPUT_DIR}/S002-text-50pct-png.png`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '50', opacity: '0.8' },
        expectedFormat: 'png'
    },
    {
        id: 'S003',
        description: 'Very small SVG on PNG',
        input: `${TEST_IMAGES_DIR}/square-800x800.png`,
        referenceOutput: `${TEST_RESULTS_DIR}/S003-svg-1pct-png.png`,
        testOutput: `${TEST_OUTPUT_DIR}/S003-svg-1pct-png.png`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '1', opacity: '0.8' },
        expectedFormat: 'png'
    },
    {
        id: 'S004',
        description: 'Very large SVG on PNG',
        input: `${TEST_IMAGES_DIR}/square-800x800.png`,
        referenceOutput: `${TEST_RESULTS_DIR}/S004-svg-50pct-png.png`,
        testOutput: `${TEST_OUTPUT_DIR}/S004-svg-50pct-png.png`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '50', opacity: '0.8' },
        expectedFormat: 'png'
    },
    {
        id: 'S005',
        description: 'Very small text on JPG',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/S005-text-1pct-jpg.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/S005-text-1pct-jpg.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '1', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'S006',
        description: 'Very large text on JPG',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/S006-text-50pct-jpg.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/S006-text-50pct-jpg.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '50', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'S007',
        description: 'Very small SVG on JPG',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/S007-svg-1pct-jpg.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/S007-svg-1pct-jpg.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '1', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'S008',
        description: 'Very large SVG on JPG',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/S008-svg-50pct-jpg.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/S008-svg-50pct-jpg.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '50', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },

    // 3. Position and Image Orientation Tests (P001-P020)
    {
        id: 'P001',
        description: 'Text on landscape - center',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P001-text-center-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P001-text-center-landscape.jpg`,
        options: { text: 'WATERMARK', position: 'center', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P002',
        description: 'Text on landscape - top-left',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P002-text-topleft-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P002-text-topleft-landscape.jpg`,
        options: { text: 'WATERMARK', position: 'top-left', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P003',
        description: 'Text on landscape - top-right',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P003-text-topright-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P003-text-topright-landscape.jpg`,
        options: { text: 'WATERMARK', position: 'top-right', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P004',
        description: 'Text on landscape - bottom-left',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P004-text-bottomleft-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P004-text-bottomleft-landscape.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-left', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P005',
        description: 'Text on landscape - bottom-right',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P005-text-bottomright-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P005-text-bottomright-landscape.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P006',
        description: 'SVG on landscape - center',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P006-svg-center-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P006-svg-center-landscape.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P007',
        description: 'SVG on landscape - top-left',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P007-svg-topleft-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P007-svg-topleft-landscape.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'top-left', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P008',
        description: 'SVG on landscape - top-right',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P008-svg-topright-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P008-svg-topright-landscape.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'top-right', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P009',
        description: 'SVG on landscape - bottom-left',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P009-svg-bottomleft-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P009-svg-bottomleft-landscape.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-left', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P010',
        description: 'SVG on landscape - bottom-right',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P010-svg-bottomright-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P010-svg-bottomright-landscape.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P011',
        description: 'Text on portrait - center',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P011-text-center-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P011-text-center-portrait.jpg`,
        options: { text: 'WATERMARK', position: 'center', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P012',
        description: 'Text on portrait - top-left',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P012-text-topleft-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P012-text-topleft-portrait.jpg`,
        options: { text: 'WATERMARK', position: 'top-left', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P013',
        description: 'Text on portrait - top-right',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P013-text-topright-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P013-text-topright-portrait.jpg`,
        options: { text: 'WATERMARK', position: 'top-right', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P014',
        description: 'Text on portrait - bottom-left',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P014-text-bottomleft-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P014-text-bottomleft-portrait.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-left', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P015',
        description: 'Text on portrait - bottom-right',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P015-text-bottomright-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P015-text-bottomright-portrait.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P016',
        description: 'SVG on portrait - center',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P016-svg-center-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P016-svg-center-portrait.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P017',
        description: 'SVG on portrait - top-left',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P017-svg-topleft-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P017-svg-topleft-portrait.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'top-left', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P018',
        description: 'SVG on portrait - top-right',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P018-svg-topright-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P018-svg-topright-portrait.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'top-right', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P019',
        description: 'SVG on portrait - bottom-left',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P019-svg-bottomleft-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P019-svg-bottomleft-portrait.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-left', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'P020',
        description: 'SVG on portrait - bottom-right',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/P020-svg-bottomright-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/P020-svg-bottomright-portrait.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '25', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },

    // 4. Padding Variations Tests (PA001-PA006)
    {
        id: 'PA001',
        description: 'Text with no padding',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/PA001-text-nopadding.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/PA001-text-nopadding.jpg`,
        options: { text: 'WATERMARK', position: 'top-left', size: '10', opacity: '0.8', paddingX: '0', paddingY: '0' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'PA002',
        description: 'Text with small padding',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/PA002-text-smallpadding.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/PA002-text-smallpadding.jpg`,
        options: { text: 'WATERMARK', position: 'top-left', size: '10', opacity: '0.8', paddingX: '5', paddingY: '5' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'PA003',
        description: 'Text with large padding',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/PA003-text-largepadding.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/PA003-text-largepadding.jpg`,
        options: { text: 'WATERMARK', position: 'top-left', size: '10', opacity: '0.8', paddingX: '20', paddingY: '20' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'PA004',
        description: 'SVG with no padding',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/PA004-svg-nopadding.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/PA004-svg-nopadding.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'top-left', size: '30', opacity: '0.8', paddingX: '0', paddingY: '0' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'PA005',
        description: 'SVG with small padding',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/PA005-svg-smallpadding.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/PA005-svg-smallpadding.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'top-left', size: '30', opacity: '0.8', paddingX: '5', paddingY: '5' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'PA006',
        description: 'SVG with large padding',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/PA006-svg-largepadding.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/PA006-svg-largepadding.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'top-left', size: '30', opacity: '0.8', paddingX: '20', paddingY: '20' },
        expectedFormat: 'jpeg'
    },

    // 5. Mixed Format Output Tests (M001-M006)
    {
        id: 'M001',
        description: 'JPG input → PNG output',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/M001-jpg-to-png.png`,
        testOutput: `${TEST_OUTPUT_DIR}/M001-jpg-to-png.png`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.jpg`, position: 'bottom-right', size: '25', opacity: '0.7' },
        expectedFormat: 'png'
    },
    {
        id: 'M002',
        description: 'PNG input → JPG output',
        input: `${TEST_IMAGES_DIR}/square-800x800.png`,
        referenceOutput: `${TEST_RESULTS_DIR}/M002-png-to-jpg.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/M002-png-to-jpg.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.png`, position: 'bottom-right', size: '25', opacity: '0.7' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'M003',
        description: 'JPG input → WebP output',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/M003-jpg-to-webp.webp`,
        testOutput: `${TEST_OUTPUT_DIR}/M003-jpg-to-webp.webp`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '25', opacity: '0.7' },
        expectedFormat: 'webp'
    },
    {
        id: 'M004',
        description: 'PNG input → WebP output',
        input: `${TEST_IMAGES_DIR}/square-800x800.png`,
        referenceOutput: `${TEST_RESULTS_DIR}/M004-png-to-webp.webp`,
        testOutput: `${TEST_OUTPUT_DIR}/M004-png-to-webp.webp`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'bottom-right', size: '25', opacity: '0.7' },
        expectedFormat: 'webp'
    },
    {
        id: 'M005',
        description: 'Text JPG → PNG output',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/M005-text-jpg-to-png.png`,
        testOutput: `${TEST_OUTPUT_DIR}/M005-text-jpg-to-png.png`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.7' },
        expectedFormat: 'png'
    },
    {
        id: 'M006',
        description: 'Text PNG → JPG output',
        input: `${TEST_IMAGES_DIR}/square-800x800.png`,
        referenceOutput: `${TEST_RESULTS_DIR}/M006-text-png-to-jpg.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/M006-text-png-to-jpg.jpg`,
        options: { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.7' },
        expectedFormat: 'jpeg'
    },

    // 6. Edge Cases Tests (E001-E008)
    {
        id: 'E001',
        description: 'Tiny image with large watermark',
        input: `${TEST_IMAGES_DIR}/tiny-square-100x100.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E001-tiny-large-watermark.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E001-tiny-large-watermark.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '80', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'E002',
        description: 'Large image with tiny watermark',
        input: `${TEST_IMAGES_DIR}/large-landscape-2400x1600.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E002-large-tiny-watermark.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E002-large-tiny-watermark.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '1', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'E003',
        description: 'Maximum size watermark',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E003-max-size-watermark.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E003-max-size-watermark.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '95', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'E004',
        description: 'Minimum size watermark',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E004-min-size-watermark.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E004-min-size-watermark.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '2', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'E005',
        description: 'Maximum opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E005-max-opacity.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E005-max-opacity.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '25', opacity: '1.0' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'E006',
        description: 'Minimum opacity',
        input: `${TEST_IMAGES_DIR}/square-800x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E006-min-opacity.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E006-min-opacity.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '25', opacity: '0.01' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'E007',
        description: 'Square on portrait',
        input: `${TEST_IMAGES_DIR}/portrait-600x900.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E007-square-on-portrait.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E007-square-on-portrait.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '40', opacity: '0.8' },
        expectedFormat: 'jpeg'
    },
    {
        id: 'E008',
        description: 'Square on landscape',
        input: `${TEST_IMAGES_DIR}/landscape-1200x800.jpg`,
        referenceOutput: `${TEST_RESULTS_DIR}/E008-square-on-landscape.jpg`,
        testOutput: `${TEST_OUTPUT_DIR}/E008-square-on-landscape.jpg`,
        options: { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '40', opacity: '0.8' },
        expectedFormat: 'jpeg'
    }
];

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Helper function to get image metadata
async function getImageMetadata(filePath: string) {
    const sharp = (await import('sharp')).default;
    return await sharp(filePath).metadata();
}

describe('Watermark Command Tests', () => {
    beforeAll(async () => {
        // Ensure test output directory exists
        await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    });

    afterAll(async () => {
        // Clean up test output directory
        await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    });

    // Generate tests for each test case
    for (const testCase of testCases) {
        it(`should handle ${testCase.description} (${testCase.id})`, async () => {
            // Check if input file exists
            expect(await fileExists(testCase.input)).toBe(true);

            // Check if reference file exists
            expect(await fileExists(testCase.referenceOutput)).toBe(true);

            // Run the watermark command to generate test output
            await addWatermark(testCase.input, testCase.testOutput, testCase.options);

            // Check if test output file was created
            expect(await fileExists(testCase.testOutput)).toBe(true);

            // Check output format if specified
            if (testCase.expectedFormat) {
                const metadata = await getImageMetadata(testCase.testOutput);
                expect(metadata.format).toBe(testCase.expectedFormat);
            }

            // Check output dimensions if specified
            if (testCase.expectedSize) {
                const metadata = await getImageMetadata(testCase.testOutput);
                expect(metadata.width).toBe(testCase.expectedSize.width);
                expect(metadata.height).toBe(testCase.expectedSize.height);
            }

            // Basic file size check (should not be empty)
            const stats = await fs.stat(testCase.testOutput);
            expect(stats.size).toBeGreaterThan(0);

            // Pixel-by-pixel comparison with reference image
            const comparison = await compareImages(testCase.referenceOutput, testCase.testOutput);
            
            // Log comparison details for debugging
            console.log(`  📊 ${testCase.id}: ${comparison.differentPixels}/${comparison.totalPixels} different pixels (${(comparison.difference * 100).toFixed(2)}%)`);
            
            // Assert that images match within tolerance
            expect(comparison.isMatch).toBe(true);
            
            // Additional assertion with detailed error message
            if (!comparison.isMatch) {
                throw new Error(
                    `Image comparison failed for ${testCase.id}: ${comparison.differentPixels}/${comparison.totalPixels} ` +
                    `pixels differ (${(comparison.difference * 100).toFixed(2)}% > ${(PIXEL_THRESHOLD * 100).toFixed(1)}% threshold)`
                );
            }
        });
    }

    // Additional validation tests
    describe('Validation Tests', () => {
        it('should reject unsupported overlay formats', async () => {
            // Create a test TIFF file
            const sharp = (await import('sharp')).default;
            const tiffPath = `${TEST_OVERLAYS_DIR}/test.tiff`;
            await sharp(`${TEST_OVERLAYS_DIR}/watermark-overlay-test.png`).tiff().toFile(tiffPath);

            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/invalid-format-test.jpg`,
                    { image: tiffPath, position: 'bottom-right', size: '25', opacity: '0.5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Unsupported overlay image format');
            } finally {
                // Clean up test file
                try {
                    await fs.unlink(tiffPath);
                } catch {
                    // Ignore cleanup errors
                }
            }
        });

        it('should accept high opacity values (clamped)', async () => {
            // The watermark command should accept high opacity values
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/high-opacity-test.jpg`,
                { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '2.0' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/high-opacity-test.jpg`)).toBe(true);
        });

        it('should accept large size values (clamped)', async () => {
            // The watermark command should accept large size values
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/large-size-test.jpg`,
                { text: 'WATERMARK', position: 'bottom-right', size: '150', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/large-size-test.jpg`)).toBe(true);
        });

        it('should reject missing watermark options', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/missing-options-test.jpg`,
                    {}
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Please specify either --text or --image');
            }
        });

        it('should reject both text and image options', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/both-options-test.jpg`,
                    { 
                        text: 'WATERMARK', 
                        image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`,
                        position: 'bottom-right', 
                        size: '5', 
                        opacity: '0.5' 
                    }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Please specify either --text or --image, not both');
            }
        });

        it('should reject non-existent input file', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/non-existent-file.jpg`,
                    `${TEST_OUTPUT_DIR}/invalid-input-test.jpg`,
                    { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Input path does not exist');
            }
        });

        it('should accept invalid position values (defaults to bottom-right)', async () => {
            // The watermark command should accept invalid position and default to bottom-right
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/invalid-position-test.jpg`,
                { text: 'WATERMARK', position: 'invalid-position', size: '5', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/invalid-position-test.jpg`)).toBe(true);
        });

        it('should reject negative padding values', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/negative-padding-test.jpg`,
                    { text: 'WATERMARK', position: 'top-left', size: '5', opacity: '0.5', paddingX: '-10', paddingY: '-5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Padding must be a positive number or percentage');
            }
        });

        it('should accept invalid text color values (defaults to white)', async () => {
            // The watermark command should accept invalid color and default to white
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/invalid-color-test.jpg`,
                { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.5', textColor: 'invalid-color' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/invalid-color-test.jpg`)).toBe(true);
        });

        it('should reject non-existent watermark image', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/invalid-watermark-test.jpg`,
                    { image: `${TEST_OVERLAYS_DIR}/non-existent-watermark.svg`, position: 'bottom-right', size: '25', opacity: '0.5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Watermark image not found');
            }
        });

        it('should create invalid output directory (auto-creates)', async () => {
            // The watermark command should create the output directory if it doesn't exist
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/nested/invalid/path/output.jpg`,
                { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/nested/invalid/path/output.jpg`)).toBe(true);
        });

        it('should accept zero size values (clamped to minimum)', async () => {
            // The watermark command should accept zero size and clamp it to minimum
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/zero-size-test.jpg`,
                { text: 'WATERMARK', position: 'bottom-right', size: '0', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/zero-size-test.jpg`)).toBe(true);
        });

        it('should accept negative opacity values (clamped to 0)', async () => {
            // The watermark command should accept negative opacity and clamp it to 0
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/negative-opacity-test.jpg`,
                { text: 'WATERMARK', position: 'bottom-right', size: '5', opacity: '-0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/negative-opacity-test.jpg`)).toBe(true);
        });
    });

    describe('Directory Processing Tests', () => {
        const TEST_DIR_INPUT = `${TEST_OUTPUT_DIR}/test-dir-input`;
        const TEST_DIR_OUTPUT = `${TEST_OUTPUT_DIR}/test-dir-output`;

        beforeAll(async () => {
            // Create test directory with multiple image files
            await fs.mkdir(TEST_DIR_INPUT, { recursive: true });
            await fs.mkdir(`${TEST_DIR_INPUT}/subdir`, { recursive: true });
            
            // Copy test images to directory
            await fs.copyFile(`${TEST_IMAGES_DIR}/square-800x800.jpg`, `${TEST_DIR_INPUT}/square.jpg`);
            await fs.copyFile(`${TEST_IMAGES_DIR}/landscape-1200x800.jpg`, `${TEST_DIR_INPUT}/landscape.jpg`);
            await fs.copyFile(`${TEST_IMAGES_DIR}/portrait-600x900.jpg`, `${TEST_DIR_INPUT}/portrait.jpg`);
            await fs.copyFile(`${TEST_IMAGES_DIR}/square-800x800.png`, `${TEST_DIR_INPUT}/square.png`);
            await fs.copyFile(`${TEST_IMAGES_DIR}/landscape-1200x800.jpg`, `${TEST_DIR_INPUT}/subdir/nested.jpg`);
        });

        afterAll(async () => {
            // Clean up test directories
            await fs.rm(TEST_DIR_INPUT, { recursive: true, force: true });
            await fs.rm(TEST_DIR_OUTPUT, { recursive: true, force: true });
        });

        it('should process directory with multiple image files', async () => {
            await addWatermark(
                TEST_DIR_INPUT,
                TEST_DIR_OUTPUT,
                { text: 'DIRECTORY', position: 'bottom-right', size: '10', opacity: '0.7' }
            );

            // Check that all files were processed
            expect(await fileExists(`${TEST_DIR_OUTPUT}/square.jpg`)).toBe(true);
            expect(await fileExists(`${TEST_DIR_OUTPUT}/landscape.jpg`)).toBe(true);
            expect(await fileExists(`${TEST_DIR_OUTPUT}/portrait.jpg`)).toBe(true);
            expect(await fileExists(`${TEST_DIR_OUTPUT}/square.png`)).toBe(true);
        });

        it('should process directory with recursive flag', async () => {
            const recursiveOutput = `${TEST_OUTPUT_DIR}/recursive-output`;
            await addWatermark(
                TEST_DIR_INPUT,
                recursiveOutput,
                { text: 'RECURSIVE', position: 'top-left', size: '8', opacity: '0.6', recursive: true }
            );

            // Check that nested files were processed
            expect(await fileExists(`${recursiveOutput}/square.jpg`)).toBe(true);
            expect(await fileExists(`${recursiveOutput}/subdir/nested.jpg`)).toBe(true);
        });

        it('should handle empty directory gracefully', async () => {
            const emptyDir = `${TEST_OUTPUT_DIR}/empty-dir`;
            const emptyOutput = `${TEST_OUTPUT_DIR}/empty-output`;
            
            await fs.mkdir(emptyDir, { recursive: true });
            
            await addWatermark(
                emptyDir,
                emptyOutput,
                { text: 'EMPTY', position: 'center', size: '5', opacity: '0.5' }
            );

            // Should not throw error but doesn't create output directory for empty input
            // The function returns early when no files are found
            expect(await fileExists(emptyOutput)).toBe(false);
        });

        it('should handle directory processing with progress flag', async () => {
            const progressOutput = `${TEST_OUTPUT_DIR}/progress-output`;
            await addWatermark(
                TEST_DIR_INPUT,
                progressOutput,
                { text: 'PROGRESS', position: 'center', size: '5', opacity: '0.5', progress: true }
            );

            // Check that files were processed
            expect(await fileExists(`${progressOutput}/square.jpg`)).toBe(true);
            expect(await fileExists(`${progressOutput}/landscape.jpg`)).toBe(true);
        });

        it('should handle mixed success and failure in directory processing', async () => {
            const mixedDir = `${TEST_OUTPUT_DIR}/mixed-dir`;
            const mixedOutput = `${TEST_OUTPUT_DIR}/mixed-output`;
            
            await fs.mkdir(mixedDir, { recursive: true });
            
            // Copy valid image
            await fs.copyFile(`${TEST_IMAGES_DIR}/square-800x800.jpg`, `${mixedDir}/valid.jpg`);
            
            // Create invalid file (not an image)
            await fs.writeFile(`${mixedDir}/invalid.txt`, 'not an image');
            
            await addWatermark(
                mixedDir,
                mixedOutput,
                { text: 'MIXED', position: 'bottom-right', size: '5', opacity: '0.5' }
            );

            // Valid file should be processed
            expect(await fileExists(`${mixedOutput}/valid.jpg`)).toBe(true);
            // Invalid file should not be processed
            expect(await fileExists(`${mixedOutput}/invalid.txt`)).toBe(false);
        });
    });

    describe('Edge Case Tests', () => {
        it('should handle invalid input path type', async () => {
            // Create a file that's not a directory or valid image
            const invalidPath = `${TEST_OUTPUT_DIR}/invalid-path.txt`;
            await fs.writeFile(invalidPath, 'not an image');
            
            try {
                await addWatermark(
                    invalidPath,
                    `${TEST_OUTPUT_DIR}/should-fail.jpg`,
                    { text: 'INVALID', position: 'center', size: '5', opacity: '0.5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Input file contains unsupported image format');
            }
        });

        it('should handle default position case in calculatePosition', async () => {
            // Test with invalid position that falls through to default case
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/default-position-test.jpg`,
                { text: 'DEFAULT', position: 'invalid-position', size: '5', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/default-position-test.jpg`)).toBe(true);
        });

        it('should handle default text anchor case', async () => {
            // Test with invalid position that falls through to default case in getTextAnchor
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/default-anchor-test.jpg`,
                { text: 'DEFAULT', position: 'unknown-position', size: '5', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/default-anchor-test.jpg`)).toBe(true);
        });

        it('should handle extreme size values', async () => {
            // Test with size exactly at boundary (100)
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/extreme-size-100.jpg`,
                { text: 'EXTREME', position: 'center', size: '100', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/extreme-size-100.jpg`)).toBe(true);

            // Test with size just over boundary (should be clamped)
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/extreme-size-101.jpg`,
                { text: 'EXTREME', position: 'center', size: '101', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/extreme-size-101.jpg`)).toBe(true);
        });

        it('should handle extreme opacity values', async () => {
            // Test with opacity exactly at boundary (1.0)
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/extreme-opacity-1.jpg`,
                { text: 'EXTREME', position: 'center', size: '5', opacity: '1.0' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/extreme-opacity-1.jpg`)).toBe(true);

            // Test with opacity just over boundary (should be clamped)
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/extreme-opacity-1.1.jpg`,
                { text: 'EXTREME', position: 'center', size: '5', opacity: '1.1' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/extreme-opacity-1.1.jpg`)).toBe(true);
        });

        it('should handle size validation error with image watermark', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/size-error-test.jpg`,
                    { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '0', opacity: '0.5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Size must be a number between 1 and 100');
            }
        });

        it('should handle negative size values with image watermark', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/negative-size-test.jpg`,
                    { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: '-5', opacity: '0.5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Size must be a number between 1 and 100');
            }
        });

        it('should handle NaN size values with image watermark', async () => {
            try {
                await addWatermark(
                    `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                    `${TEST_OUTPUT_DIR}/nan-size-test.jpg`,
                    { image: `${TEST_OVERLAYS_DIR}/watermark-overlay-test.svg`, position: 'center', size: 'not-a-number', opacity: '0.5' }
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Size must be a number between 1 and 100');
            }
        });

        it('should accept invalid size values with text watermark (no validation)', async () => {
            // Text watermarks don't validate size, so invalid values should be accepted
            await addWatermark(
                `${TEST_IMAGES_DIR}/square-800x800.jpg`,
                `${TEST_OUTPUT_DIR}/text-invalid-size-test.jpg`,
                { text: 'TEXT_INVALID_SIZE', position: 'center', size: 'not-a-number', opacity: '0.5' }
            );
            expect(await fileExists(`${TEST_OUTPUT_DIR}/text-invalid-size-test.jpg`)).toBe(true);
        });
    });
});
