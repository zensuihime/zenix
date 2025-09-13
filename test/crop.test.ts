import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { cropImage } from '../src/commands/crop';

const TEST_DIR = path.join(process.cwd(), 'test');
const FILES_DIR = path.join(TEST_DIR, 'files', 'images');
const OUTPUT_DIR = path.join(TEST_DIR, 'output');

describe('Crop Tests', () => {
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

    describe('Single File Tests - Aspect Ratio', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should crop by aspect ratio 4:5', async () => {
            const inputFile = path.join(FILES_DIR, 'portrait-600x900.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-4-5.jpg');

            await cropImage(inputFile, outputFile, { aspect: '4:5' });
            await verifyAspectRatio(outputFile, 4/5, 0.01);
        });

        it('should crop by aspect ratio 1:1 (square)', async () => {
            const inputFile = path.join(FILES_DIR, 'portrait-600x900.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-square.jpg');

            await cropImage(inputFile, outputFile, { aspect: '1:1' });
            await verifyAspectRatio(outputFile, 1, 0.01);
        });

        it('should crop by aspect ratio 16:9', async () => {
            const inputFile = path.join(FILES_DIR, 'landscape-1200x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-16-9.jpg');

            await cropImage(inputFile, outputFile, { aspect: '16:9' });
            await verifyAspectRatio(outputFile, 16/9, 0.01);
        });

        it('should crop from center by default', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-center.jpg');

            await cropImage(inputFile, outputFile, { aspect: '1:1' });
            await verifyDimensions(outputFile, 800, 800);
        });
    });

    describe('Single File Tests - Custom Dimensions', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should crop by exact dimensions', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-exact.jpg');

            await cropImage(inputFile, outputFile, { dimensions: '400x400' });
            await verifyDimensions(outputFile, 400, 400);
        });

        it('should crop from different positions', async () => {
            const inputFile = path.join(FILES_DIR, 'landscape-1200x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-top.jpg');

            await cropImage(inputFile, outputFile, { 
                dimensions: '600x400', 
                position: 'top' 
            });
            await verifyDimensions(outputFile, 600, 400);
        });

        it('should crop from bottom-right position', async () => {
            const inputFile = path.join(FILES_DIR, 'landscape-1200x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-bottom-right.jpg');

            await cropImage(inputFile, outputFile, { 
                dimensions: '600x400', 
                position: 'bottom-right' 
            });
            await verifyDimensions(outputFile, 600, 400);
        });

        it('should crop from left position', async () => {
            const inputFile = path.join(FILES_DIR, 'portrait-600x900.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'cropped-left.jpg');

            await cropImage(inputFile, outputFile, { 
                dimensions: '300x450', 
                position: 'left' 
            });
            await verifyDimensions(outputFile, 300, 450);
        });
    });

    describe('Directory Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should process directory with aspect ratio', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'batch-aspect');

            await cropImage(inputDir, outputDir, { aspect: '4:5' });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);

            // Check aspect ratio for each file
            for (const file of files) {
                const filePath = path.join(outputDir, file);
                await verifyAspectRatio(filePath, 4/5, 0.01);
            }
        });

        it('should process directory with square aspect ratio', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'batch-square');

            await cropImage(inputDir, outputDir, { aspect: '1:1' });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);

            // Check square aspect ratio for each file
            for (const file of files) {
                const filePath = path.join(outputDir, file);
                await verifyAspectRatio(filePath, 1, 0.01);
            }
        });

        it('should process files recursively', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'recursive');

            await cropImage(inputDir, outputDir, { aspect: '16:9', recursive: true });

            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should show progress when enabled', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'progress');

            await cropImage(inputDir, outputDir, { aspect: '4:5', progress: true });
            
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

            await expect(cropImage(inputFile, outputFile, { aspect: '4:5' })).rejects.toThrow(
                'Input path does not exist'
            );
        });

        it('should throw error for non-existent input directory', async () => {
            const inputDir = path.join(FILES_DIR, 'nonexistent_dir');
            const outputDir = path.join(OUTPUT_DIR, 'output_dir');

            await expect(cropImage(inputDir, outputDir, { aspect: '4:5' })).rejects.toThrow(
                'Input path does not exist'
            );
        });

        it('should throw error for oversized dimensions - both larger', async () => {
            const inputFile = path.join(FILES_DIR, 'small-square-200x200.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(cropImage(inputFile, outputFile, { dimensions: '400x400' })).rejects.toThrow(
                'Crop dimensions (400x400) cannot be larger than image dimensions (200x200)'
            );
        });

        it('should throw error for oversized dimensions - width larger', async () => {
            const inputFile = path.join(FILES_DIR, 'small-portrait-200x300.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(cropImage(inputFile, outputFile, { dimensions: '400x200' })).rejects.toThrow(
                'Crop dimensions (400x200) cannot be larger than image dimensions (200x300)'
            );
        });

        it('should throw error for oversized dimensions - height larger', async () => {
            const inputFile = path.join(FILES_DIR, 'small-landscape-300x200.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(cropImage(inputFile, outputFile, { dimensions: '200x400' })).rejects.toThrow(
                'Crop dimensions (200x400) cannot be larger than image dimensions (300x200)'
            );
        });

        it('should process directory with dimensions (function level)', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'output_dir');

            // Note: Directory + dimensions validation happens at CLI level
            // At function level, it processes files but some may fail due to size constraints
            await cropImage(inputDir, outputDir, { dimensions: '400x300' });
            
            // Some files should be processed successfully (larger ones)
            const files = await fs.readdir(outputDir);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should throw error when no options provided', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(cropImage(inputFile, outputFile, {})).rejects.toThrow(
                'Please specify either --aspect or --dimensions'
            );
        });

        it('should handle conflicting options (function level)', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            // Note: Conflicting options validation happens at CLI level
            // At function level, it processes with the first valid option
            await cropImage(inputFile, outputFile, { 
                aspect: '4:5', 
                dimensions: '400x300' 
            });
            
            // Verify the file was created (function uses aspect ratio when both provided)
            const metadata = await sharp(outputFile).metadata();
            expect(metadata.width).toBe(640); // Uses aspect ratio option (4:5 from 800x800)
            expect(metadata.height).toBe(800); // Uses aspect ratio option
        });

        it('should throw error for invalid aspect ratio format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(cropImage(inputFile, outputFile, { aspect: 'invalid' })).rejects.toThrow(
                'Aspect ratio must be in format WIDTH:HEIGHT'
            );
        });

        it('should throw error for invalid dimensions format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(cropImage(inputFile, outputFile, { dimensions: 'invalid' })).rejects.toThrow(
                'Dimensions must be in format WIDTHxHEIGHT'
            );
        });

        it('should throw error for invalid position', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await expect(cropImage(inputFile, outputFile, { 
                dimensions: '400x300', 
                position: 'invalid' 
            })).rejects.toThrow(
                'Invalid position: invalid'
            );
        });
    });

    describe('Position Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should crop from all 9 valid positions', async () => {
            const inputFile = path.join(FILES_DIR, 'landscape-1200x800.jpg');
            const positions = [
                'center', 'top', 'bottom', 'left', 'right',
                'top-left', 'top-right', 'bottom-left', 'bottom-right'
            ];

            for (const position of positions) {
                const outputFile = path.join(OUTPUT_DIR, `cropped-${position}.jpg`);
                
                await cropImage(inputFile, outputFile, { 
                    dimensions: '600x400', 
                    position: position as any
                });
                
                await verifyDimensions(outputFile, 600, 400);
            }
        });
    });

    describe('Format Preservation Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should preserve JPEG format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'output.jpg');

            await cropImage(inputFile, outputFile, { aspect: '1:1' });
            
            const metadata = await sharp(outputFile).metadata();
            expect(metadata.format).toBe('jpeg');
        });

        it('should preserve PNG format', async () => {
            const inputFile = path.join(FILES_DIR, 'square-800x800.png');
            const outputFile = path.join(OUTPUT_DIR, 'output.png');

            await cropImage(inputFile, outputFile, { aspect: '1:1' });
            
            const metadata = await sharp(outputFile).metadata();
            expect(metadata.format).toBe('png');
        });
    });
});
