import fs from 'node:fs/promises';
import path from 'node:path';
import { Glob } from 'bun';
import { exiftool, type Tags } from 'exiftool-vendored';
import type { MetadataOptions, ProcessingResult } from '../types';

// Supported file formats
const SUPPORTED_FORMATS = [
    // Images
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'tiff',
    'tif',
    'webp',
    'svg',
    'raw',
    // Videos
    'mp4',
    'avi',
    'mov',
    'mkv',
    'webm',
    '3gp',
    'flv',
    'wmv',
    'm4v',
    // Audio
    'mp3',
    'wav',
    'flac',
    'aac',
    'm4a',
    'ogg',
    'wma',
    // Documents
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
];

export async function stripMetadata(
    input: string,
    output: string,
    options: MetadataOptions = {}
): Promise<ProcessingResult> {
    const inputPath = path.resolve(input);
    const outputPath = path.resolve(output);

    // Check if input exists
    try {
        await fs.access(inputPath);
    } catch {
        throw new Error(`Input path does not exist: ${inputPath}`);
    }

    const stats = await fs.stat(inputPath);

    if (stats.isFile()) {
        return await processSingleFile(inputPath, outputPath, options);
    } else if (stats.isDirectory()) {
        return await processDirectory(inputPath, outputPath, options);
    } else {
        throw new Error(`Invalid input path: ${inputPath}`);
    }
}

async function processSingleFile(
    inputPath: string,
    outputPath: string,
    _options: MetadataOptions
): Promise<ProcessingResult> {
    // Create output directory if needed
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Copy file to output location first
    await fs.copyFile(inputPath, outputPath);

    // Strip ALL metadata using ExifTool
    try {
        await exiftool.write(
            outputPath,
            {},
            {
                writeArgs: ['-all=', '-overwrite_original'],
            }
        );
    } catch (error) {
        throw new Error(`Failed to strip metadata: ${error}`);
    }

    return {
        success: true,
        processed: 1,
        errors: 0,
    };
}

async function processDirectory(
    inputDir: string,
    outputDir: string,
    options: MetadataOptions
): Promise<ProcessingResult> {
    // Create glob pattern for all supported formats
    const formatPattern = `*.{${SUPPORTED_FORMATS.join(',')}}`;
    const pattern = options.recursive ? `**/${formatPattern}` : formatPattern;

    const glob = new Glob(pattern);
    const files = [];
    for await (const file of glob.scan({
        cwd: inputDir,
        absolute: true,
    })) {
        files.push(file);
    }

    if (files.length === 0) {
        return {
            success: true,
            processed: 0,
            errors: 0,
        };
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    let processed = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    // Process files in parallel batches
    const batchSize = 5; // Smaller batch size for ExifTool operations
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const promises = batch.map(async (file) => {
            try {
                const relativePath = path.relative(inputDir, file);
                const outputFile = path.join(outputDir, relativePath);
                const outputFileDir = path.dirname(outputFile);

                // Create subdirectory if needed
                await fs.mkdir(outputFileDir, { recursive: true });

                // Process the file
                await processSingleFile(file, outputFile, options);

                processed++;
            } catch (error) {
                errors++;
                const errorMessage = `Error processing ${file}: ${error instanceof Error ? error.message : String(error)}`;
                errorMessages.push(errorMessage);
            }
        });

        await Promise.all(promises);
    }

    return {
        success: errors === 0,
        processed,
        errors,
        errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
}

export async function inspectMetadata(
    input: string,
    options: { recursive?: boolean } = {}
): Promise<{ metadata: Tags; fileCount: number }> {
    const inputPath = path.resolve(input);

    // Check if input exists
    try {
        await fs.access(inputPath);
    } catch {
        throw new Error(`Input path does not exist: ${inputPath}`);
    }

    const stats = await fs.stat(inputPath);

    if (stats.isFile()) {
        const metadata = await exiftool.read(inputPath);
        return { metadata, fileCount: 1 };
    } else if (stats.isDirectory()) {
        return await inspectDirectory(inputPath, options);
    } else {
        throw new Error(`Invalid input path: ${inputPath}`);
    }
}

async function inspectDirectory(
    inputDir: string,
    options: { recursive?: boolean }
): Promise<{ metadata: Tags; fileCount: number }> {
    const formatPattern = `*.{${SUPPORTED_FORMATS.join(',')}}`;
    const pattern = options.recursive ? `**/${formatPattern}` : formatPattern;

    const glob = new Glob(pattern);
    const files = [];
    for await (const file of glob.scan({
        cwd: inputDir,
        absolute: true,
    })) {
        files.push(file);
    }

    if (files.length === 0) {
        return { metadata: {}, fileCount: 0 };
    }

    // For directory inspection, return metadata from first file as example
    const firstFile = files[0];
    if (!firstFile) {
        return { metadata: {}, fileCount: 0 };
    }
    const metadata = await exiftool.read(firstFile);

    return { metadata, fileCount: files.length };
}
