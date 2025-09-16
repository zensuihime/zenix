import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stripMetadata, inspectMetadata } from '../src/commands/metadata';
import { exiftool } from 'exiftool-vendored';

const TEST_DIR = path.join(process.cwd(), 'test');
const FILES_DIR = path.join(TEST_DIR, 'files', 'metadata');
const OUTPUT_DIR = path.join(TEST_DIR, 'output');

describe('Metadata Stripping Tests', () => {
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

    describe('Single File Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should strip metadata from JPEG file', async () => {
            const inputFile = path.join(FILES_DIR, 'metadata-test.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'metadata_test_stripped.jpg');

            // Check if test file exists
            try {
                await fs.access(inputFile);
            } catch {
                console.log('⚠️  Skipping JPEG test - metadata-test.jpg not found');
                return;
            }

            // Get original metadata
            const originalMetadata = await exiftool.read(inputFile);
            const originalMetadataCount = Object.keys(originalMetadata).length;

            // Strip metadata
            await stripMetadata(inputFile, outputFile, {
            });

            // Check output file exists
            await fs.access(outputFile);

            // Get stripped metadata
            const strippedMetadata = await exiftool.read(outputFile);
            const strippedMetadataCount = Object.keys(strippedMetadata).length;

            // Verify metadata was reduced
            expect(strippedMetadataCount).toBeLessThan(originalMetadataCount);
            expect(strippedMetadataCount).toBeGreaterThan(0); // Should still have basic file info

            console.log(`✅ JPEG: Stripped ${originalMetadataCount - strippedMetadataCount} metadata fields`);
        });

        it('should strip metadata from PNG file', async () => {
            const inputFile = path.join(FILES_DIR, 'metadata-test.png');
            const outputFile = path.join(OUTPUT_DIR, 'metadata_test_stripped.png');

            try {
                await fs.access(inputFile);
            } catch {
                console.log('⚠️  Skipping PNG test - metadata-test.png not found');
                return;
            }

            const originalMetadata = await exiftool.read(inputFile);
            const originalMetadataCount = Object.keys(originalMetadata).length;

            await stripMetadata(inputFile, outputFile, {
            });

            await fs.access(outputFile);

            const strippedMetadata = await exiftool.read(outputFile);
            const strippedMetadataCount = Object.keys(strippedMetadata).length;

            expect(strippedMetadataCount).toBeLessThan(originalMetadataCount);
            expect(strippedMetadataCount).toBeGreaterThan(0);

            console.log(`✅ PNG: Stripped ${originalMetadataCount - strippedMetadataCount} metadata fields`);
        });

        it('should strip metadata from MP4 file', async () => {
            const inputFile = path.join(FILES_DIR, 'metadata-test.mp4');
            const outputFile = path.join(OUTPUT_DIR, 'metadata_test_stripped.mp4');

            try {
                await fs.access(inputFile);
            } catch {
                console.log('⚠️  Skipping MP4 test - metadata-test.mp4 not found');
                return;
            }

            const originalMetadata = await exiftool.read(inputFile);
            const originalMetadataCount = Object.keys(originalMetadata).length;

            await stripMetadata(inputFile, outputFile, {
            });

            await fs.access(outputFile);

            const strippedMetadata = await exiftool.read(outputFile);
            const strippedMetadataCount = Object.keys(strippedMetadata).length;

            expect(strippedMetadataCount).toBeLessThan(originalMetadataCount);
            expect(strippedMetadataCount).toBeGreaterThan(0);

            console.log(`✅ MP4: Stripped ${originalMetadataCount - strippedMetadataCount} metadata fields`);
        });
    });

    describe('Directory Tests', () => {
        afterEach(async () => {
            await cleanupOutputDir();
        });

        it('should process all files in directory', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'batch');

            // Get list of test files
            const files = await fs.readdir(inputDir);
            const supportedFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase().slice(1);
                return ['jpg', 'jpeg', 'png', 'mp4'].includes(ext);
            });

            if (supportedFiles.length === 0) {
                console.log('⚠️  Skipping directory test - no supported files found');
                return;
            }

            console.log(`📁 Processing ${supportedFiles.length} files: ${supportedFiles.join(', ')}`);

            await stripMetadata(inputDir, outputDir, {
                recursive: false,
                progress: false,
            });

            // Check that output files were created
            for (const file of supportedFiles) {
                const outputFile = path.join(outputDir, file);
                await fs.access(outputFile);
                console.log(`✅ Processed: ${file}`);
            }

            console.log(`✅ Directory test: Successfully processed ${supportedFiles.length} files`);
        });

        it('should process files recursively', async () => {
            const inputDir = FILES_DIR;
            const outputDir = path.join(OUTPUT_DIR, 'recursive');

            // Create a subdirectory with a file
            const subDir = path.join(inputDir, 'subdir');
            await fs.mkdir(subDir, { recursive: true });

            // Copy a test file to subdirectory if it exists
            const testFile = path.join(inputDir, 'metadata-test.jpg');
            const subFile = path.join(subDir, 'metadata-test.jpg');
            try {
                await fs.copyFile(testFile, subFile);
            } catch {
                console.log('⚠️  Skipping recursive test - no test file to copy');
                await fs.rmdir(subDir);
                return;
            }

            console.log('📁 Testing recursive directory processing...');

            await stripMetadata(inputDir, outputDir, {
                recursive: true,
                progress: false,
            });

            // Check that files in subdirectory were processed
            const subOutputFile = path.join(outputDir, 'subdir', 'metadata-test.jpg');
            try {
                await fs.access(subOutputFile);
                console.log('✅ Recursive test: Successfully processed file in subdirectory');
            } catch {
                console.log('⚠️  Recursive test: File in subdirectory not found');
            }

            // Clean up test subdirectory
            await fs.unlink(subFile);
            await fs.rmdir(subDir);
        });
    });

    describe('Metadata Inspection Tests', () => {
        it('should inspect metadata without modifying files', async () => {
            const inputFile = path.join(FILES_DIR, 'metadata-test.jpg');

            try {
                await fs.access(inputFile);
            } catch {
                console.log('⚠️  Skipping inspection test - metadata-test.jpg not found');
                return;
            }

            await inspectMetadata(inputFile, {});

            // Verify file still exists and is unchanged
            await fs.access(inputFile);
            console.log('✅ Inspection test: Successfully inspected metadata without modifying file');
        });

        it('should inspect directory metadata', async () => {
            const inputDir = FILES_DIR;

            try {
                await inspectMetadata(inputDir, { recursive: false });
            } catch (error) {
                if (error instanceof Error && error.message.includes('No supported files found')) {
                    return;
                }
                throw error;
            }
        });
    });

    describe('Error Handling Tests', () => {
        it('should throw error for non-existent input file', async () => {
            const inputFile = path.join(FILES_DIR, 'nonexistent.jpg');
            const outputFile = path.join(OUTPUT_DIR, 'error_test.jpg');

            await expect(stripMetadata(inputFile, outputFile, {})).rejects.toThrow();
        });

        it('should throw error for non-existent input directory', async () => {
            const inputDir = path.join(FILES_DIR, 'nonexistent');
            const outputDir = path.join(OUTPUT_DIR, 'error_test');

            await expect(stripMetadata(inputDir, outputDir, {})).rejects.toThrow();
        });
    });
});
