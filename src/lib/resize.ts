import fs from 'node:fs/promises';
import path from 'node:path';
import { Glob } from 'bun';
import sharp from 'sharp';
import type { ProcessingResult, ResizeOptions } from '../types';

export async function resizeImage(
    input: string,
    output: string,
    options: ResizeOptions = {}
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
    options: ResizeOptions
): Promise<ProcessingResult> {
    // Create output directory if needed
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Load image into buffer first to avoid file handle issues
    const imageBuffer = await fs.readFile(inputPath);
    let pipeline = sharp(imageBuffer);

    try {
        // Apply resize operations based on options
        if (options.scale) {
            const scale = options.scale;

            const metadata = await pipeline.metadata();
            const newWidth = Math.round((metadata.width || 0) * scale);
            const newHeight = Math.round((metadata.height || 0) * scale);

            pipeline = pipeline.resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3, // High-quality resampling
                withoutEnlargement: false,
            });
        } else if (options.fit) {
            const [width, height] = options.fit.split('x').map(Number);
            if (!width || !height) {
                throw new Error('Fit dimensions must be in format WIDTHxHEIGHT (e.g., 1920x1080)');
            }

            pipeline = pipeline.resize(width, height, {
                kernel: sharp.kernel.lanczos3,
                fit: 'inside', // Maintain aspect ratio
                withoutEnlargement: false,
            });
        } else if (options.width || options.height) {
            const width = options.width;
            const height = options.height;

            pipeline = pipeline.resize(width, height, {
                kernel: sharp.kernel.lanczos3,
                withoutEnlargement: false,
            });
        } else {
            throw new Error('Please specify resize options: --width, --height, --scale, or --fit');
        }

        // Performance optimization: Use appropriate output format
        const ext = path.extname(outputPath).toLowerCase();
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                pipeline = pipeline.jpeg({ quality: 100, mozjpeg: true });
                break;
            case '.png':
                pipeline = pipeline.png({ compressionLevel: 9, quality: 100 });
                break;
            case '.webp':
                pipeline = pipeline.webp({ quality: 100 });
                break;
            default:
                // Keep original format
                break;
        }

        await pipeline.toFile(outputPath);
    } finally {
        pipeline.destroy();
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
    options: ResizeOptions
): Promise<ProcessingResult> {
    const formatPattern = '*.{jpg,jpeg,png,gif,bmp,tiff,tif,webp}';
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

    await fs.mkdir(outputDir, { recursive: true });

    let processed = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    const batchSize = 5; // Smaller batch size for resize operations
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const promises = batch.map(async (file) => {
            try {
                const relativePath = path.relative(inputDir, file);
                const outputFile = path.join(outputDir, relativePath);
                const outputFileDir = path.dirname(outputFile);

                await fs.mkdir(outputFileDir, { recursive: true });
                await processSingleFile(file, outputFile, options);

                processed++;
            } catch (error) {
                errors++;
                const errorMessage = `Error resizing ${file}: ${error instanceof Error ? error.message : String(error)}`;
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
