import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { convertImage } from '../src/commands/convert';

const TEST_DIR = path.join(process.cwd(), 'test');
const FILES_DIR = path.join(TEST_DIR, 'files', 'images');
const OUTPUT_DIR = path.join(TEST_DIR, 'output');

// Helper function to clean up output directory
const cleanupOutputDir = async () => {
    try {
        // Remove the entire output directory and recreate it
        await fs.rmdir(OUTPUT_DIR, { recursive: true });
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (error) {
        // Ignore cleanup errors
    }
};

// Helper function to verify image format
async function verifyImageFormat(imagePath: string, expectedFormat: 'png' | 'jpeg') {
    const metadata = await sharp(imagePath).metadata();
    expect(metadata.format).toBe(expectedFormat);
}

// Helper function to verify image dimensions
async function verifyDimensions(imagePath: string, expectedWidth: number, expectedHeight: number) {
    const metadata = await sharp(imagePath).metadata();
    expect(metadata.width).toBe(expectedWidth);
    expect(metadata.height).toBe(expectedHeight);
}

describe('Convert Tests', () => {
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

    afterEach(async () => {
        await cleanupOutputDir();
    });

    describe('Single File Tests', () => {
        it('should convert JPEG to PNG', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'converted.png');

            await convertImage(inputFile, outputFile, {});

            // Verify file exists and format
            await fs.access(outputFile);
            await verifyImageFormat(outputFile, 'png');
            await verifyDimensions(outputFile, 800, 800);
        });

        it('should convert PNG to JPEG', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.png');
            const outputFile = path.join(OUTPUT_DIR, 'converted.jpg');

            await convertImage(inputFile, outputFile, {});

            await fs.access(outputFile);
            await verifyImageFormat(outputFile, 'jpeg');
            await verifyDimensions(outputFile, 800, 800);
        });





        it('should apply custom quality for JPEG', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'converted.jpg');

            await convertImage(inputFile, outputFile, { quality: 50 });

            await fs.access(outputFile);
            await verifyImageFormat(outputFile, 'jpeg');
            await verifyDimensions(outputFile, 800, 800);
        });


        it('should apply custom compression for PNG', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'converted.png');

            await convertImage(inputFile, outputFile, { compression: 9 });

            await fs.access(outputFile);
            await verifyImageFormat(outputFile, 'png');
            await verifyDimensions(outputFile, 800, 800);
        });

        it('should ignore quality for PNG conversion', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'converted.png');

            // Should not throw error even though quality is specified for PNG
            await convertImage(inputFile, outputFile, { quality: 50 });

            await fs.access(outputFile);
            await verifyImageFormat(outputFile, 'png');
        });

        it('should ignore compression for JPEG conversion', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.png');
            const outputFile = path.join(OUTPUT_DIR, 'converted.jpg');

            // Should not throw error even though compression is specified for JPEG
            await convertImage(inputFile, outputFile, { compression: 9 });

            await fs.access(outputFile);
            await verifyImageFormat(outputFile, 'jpeg');
        });

        it('should handle overwrite option', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'converted.png');

            // First conversion
            await convertImage(inputFile, outputFile, {});
            await fs.access(outputFile);

            // Second conversion without overwrite should fail
            await expect(convertImage(inputFile, outputFile, {})).rejects.toThrow(
                'Output file already exists'
            );

            // Third conversion with overwrite should succeed
            await convertImage(inputFile, outputFile, { overwrite: true });
            await fs.access(outputFile);
        });
    });

    describe('Directory Tests', () => {
        it('should convert directory to PNG format', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await convertImage(inputDir, outputDir, { format: 'png' });

            // Check that files were converted
            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);

            // Verify all files are PNG
            for (const file of files) {
                if (file.endsWith('.png')) {
                    await verifyImageFormat(path.join(outputDir, file), 'png');
                }
            }
        });

        it('should convert directory to JPEG format', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await convertImage(inputDir, outputDir, { format: 'jpeg' });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);

            for (const file of files) {
                if (file.endsWith('.jpg')) {
                    await verifyImageFormat(path.join(outputDir, file), 'jpeg');
                }
            }
        });


        it('should apply quality settings to directory conversion', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await convertImage(inputDir, outputDir, { 
                format: 'jpeg', 
                quality: 50 
            });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should apply compression settings to directory conversion', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await convertImage(inputDir, outputDir, { 
                format: 'png', 
                compression: 6 
            });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should process files recursively', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await convertImage(inputDir, outputDir, { 
                format: 'png', 
                recursive: true 
            });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should show progress when enabled', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await convertImage(inputDir, outputDir, { 
                format: 'png', 
                progress: true 
            });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling Tests', () => {
        it('should throw error for non-existent input file', async () => {
            const inputFile = path.join(FILES_DIR, 'nonexistent.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.png');

            await expect(convertImage(inputFile, outputFile, {})).rejects.toThrow(
                'Input path does not exist'
            );
        });

        it('should throw error for non-existent input directory', async () => {
            const inputDir = path.join(FILES_DIR, 'nonexistent');
            const outputDir = path.join(OUTPUT_DIR, 'output');

            await expect(convertImage(inputDir, outputDir, { format: 'png' })).rejects.toThrow(
                'Input path does not exist'
            );
        });

        it('should throw error for unsupported input format', async () => {
            // Create a file with unsupported extension
            const inputFile = path.join(OUTPUT_DIR, 'test.txt');
            await fs.writeFile(inputFile, 'test content');
            const outputFile = path.join(OUTPUT_DIR, 'output.png');

            await expect(convertImage(inputFile, outputFile, {})).rejects.toThrow(
                'Unsupported input format'
            );
        });

        it('should throw error for unsupported output format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.bmp');

            await expect(convertImage(inputFile, outputFile, {})).rejects.toThrow(
                'Unsupported output format'
            );
        });

        it('should throw error for single file with --format option', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.png');

            await expect(convertImage(inputFile, outputFile, { format: 'png' })).rejects.toThrow(
                '--format option is not allowed for single file conversion'
            );
        });

        it('should throw error for directory without --format option', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await expect(convertImage(inputDir, outputDir, {})).rejects.toThrow(
                '--format option is required for directory conversion'
            );
        });

        it('should throw error for invalid format', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'converted');

            await expect(convertImage(inputDir, outputDir, { format: 'bmp' })).rejects.toThrow(
                'Unsupported format'
            );
        });

        it('should throw error when output file exists without overwrite', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'existing.png');

            // Create existing file
            await fs.writeFile(outputFile, 'existing');

            await expect(convertImage(inputFile, outputFile, {})).rejects.toThrow(
                'Output file already exists'
            );
        });
    });

    describe('Format Validation Tests', () => {
        it('should validate quality range for JPEG', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(convertImage(inputFile, outputFile, { quality: 150 })).rejects.toThrow(
                'Quality must be between 1 and 100'
            );
        });

        it('should validate compression range for PNG', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.png');

            await expect(convertImage(inputFile, outputFile, { compression: 15 })).rejects.toThrow(
                'Compression must be between 0 and 9'
            );
        });

    });
});
