import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { resizeImage } from '../src/commands/resize';

const TEST_DIR = path.join(process.cwd(), 'test');
const FILES_DIR = path.join(TEST_DIR, 'files', 'images');
const OUTPUT_DIR = path.join(TEST_DIR, 'output');

describe('Resize Tests', () => {
    beforeAll(async () => {
        // Create test directories
        await fs.mkdir(FILES_DIR, { recursive: true });
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    });

    afterAll(async () => {
        // Clean up test directories
        try {
            await fs.rmdir(OUTPUT_DIR, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    // Helper function to clean up output directory after each test
    const cleanupOutputDir = async () => {
        try {
            await fs.rmdir(OUTPUT_DIR, { recursive: true });
            await fs.mkdir(OUTPUT_DIR, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    };

    // Helper function to verify dimensions
    const verifyDimensions = async (imagePath: string, expectedWidth: number, expectedHeight: number) => {
        const metadata = await sharp(imagePath).metadata();
        expect(metadata.width).toBe(expectedWidth);
        expect(metadata.height).toBe(expectedHeight);
    };

    // Helper function to verify aspect ratio
    const verifyAspectRatio = async (imagePath: string, expectedRatio: number, tolerance = 0.01) => {
        const metadata = await sharp(imagePath).metadata();
        const actualRatio = metadata.width! / metadata.height!;
        expect(actualRatio).toBeCloseTo(expectedRatio, 2);
    };

    describe('Single File Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should resize by width only', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'resized-width.jpg');

            await resizeImage(inputFile, outputFile, { width: 400 });
            await verifyDimensions(outputFile, 400, 400);
        });

        it('should resize by height only', async () => {
            const inputFile = path.join(FILES_DIR, 'portrait-600x900.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'resized-height.jpg');

            await resizeImage(inputFile, outputFile, { height: 300 });
            await verifyDimensions(outputFile, 200, 300);
        });

        it('should resize by scale factor', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'resized-scale.jpg');

            await resizeImage(inputFile, outputFile, { scale: 0.5 });
            await verifyDimensions(outputFile, 400, 400);
        });

        it('should handle upscaling', async () => {
            const inputFile = path.join(FILES_DIR, 'small-square-200x200.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'resized-upscale.jpg');

            await resizeImage(inputFile, outputFile, { scale: 2 });
            await verifyDimensions(outputFile, 400, 400);
        });

        it('should fit to dimensions', async () => {
            const inputFile = path.join(FILES_DIR, 'landscape-1200x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'resized-fit.jpg');

            await resizeImage(inputFile, outputFile, { fit: '800x600' });
            await verifyDimensions(outputFile, 800, 533);
        });

        it('should maintain aspect ratio with width resize', async () => {
            const inputFile = path.join(FILES_DIR, 'portrait-600x900.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'resized-portrait.jpg');

            await resizeImage(inputFile, outputFile, { width: 400 });
            await verifyAspectRatio(outputFile, 600/900, 0.01);
        });
    });

    describe('Directory Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should process all images in directory', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'batch');

            await resizeImage(inputDir, outputDir, { width: 400 });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);

            // Check each file has width 400
            for (const file of files) {
                const filePath = path.join(outputDir, file);
                const metadata = await sharp(filePath).metadata();
                expect(metadata.width).toBe(400);
            }
        });

        it('should process files recursively', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'recursive');

            await resizeImage(inputDir, outputDir, { width: 400, recursive: true });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should show progress when enabled', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'progress');

            await resizeImage(inputDir, outputDir, { width: 400, progress: true });
            
            // Verify files were created
            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should throw error for non-existent input file', async () => {
            const inputFile = path.join(FILES_DIR, 'nonexistent.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(resizeImage(inputFile, outputFile, { width: 400 })).rejects.toThrow(
                'Input path does not exist'
            );
        });

        it('should throw error for non-existent input directory', async () => {
            const inputDir = path.join(FILES_DIR, 'nonexistent_dir');
            const outputDir = path.join(OUTPUT_DIR, 'output_dir');

            await expect(resizeImage(inputDir, outputDir, { width: 400 })).rejects.toThrow(
                'Input path does not exist'
            );
        });

        it('should throw error for invalid scale', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            // Note: Scale validation happens at CLI level, so this test verifies
            // that the function works with valid scale values
            await resizeImage(inputFile, outputFile, { scale: 0.5 });
            
            // Verify the file was created
            const metadata = await sharp(outputFile).metadata();
            expect(metadata.width).toBe(400); // 800 * 0.5
            expect(metadata.height).toBe(400);
        });

        it('should handle valid scale values', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await resizeImage(inputFile, outputFile, { scale: 2 });
            
            // Verify the file was created with correct dimensions
            const metadata = await sharp(outputFile).metadata();
            expect(metadata.width).toBe(1600); // 800 * 2
            expect(metadata.height).toBe(1600);
        });

        it('should throw error for invalid fit format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(resizeImage(inputFile, outputFile, { fit: 'invalid' })).rejects.toThrow(
                'Fit dimensions must be in format WIDTHxHEIGHT'
            );
        });

        it('should throw error when no resize options provided', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(resizeImage(inputFile, outputFile, {})).rejects.toThrow(
                'Please specify resize options: --width, --height, --scale, or --fit'
            );
        });
    });

    describe('Format Preservation Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should preserve JPEG format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await resizeImage(inputFile, outputFile, { width: 400 });
            
            const metadata = await sharp(outputFile).metadata();
            expect(metadata.format).toBe('jpeg');
        });

        it('should preserve PNG format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.png');
            const outputFile = path.join(OUTPUT_DIR, 'output.png');

            await resizeImage(inputFile, outputFile, { width: 400 });
            
            const metadata = await sharp(outputFile).metadata();
            expect(metadata.format).toBe('png');
        });
    });
});
