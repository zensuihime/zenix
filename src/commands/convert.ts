import fs from 'node:fs/promises';
import path from 'node:path';
import { Glob } from 'bun';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import sharp from 'sharp';

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png'] as const;
type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

interface ConvertOptions {
    format?: string;
    quality?: number;
    compression?: number;
    recursive?: boolean;
    progress?: boolean;
    overwrite?: boolean;
}

export async function convertImage(
    input: string,
    output: string,
    options: ConvertOptions
): Promise<void> {
    const inputPath = path.resolve(input);
    const outputPath = path.resolve(output);

    // Check if input exists
    try {
        await fs.access(inputPath);
    } catch {
        throw new Error(`Input path does not exist: ${inputPath}`);
    }

    // Check if input is file or directory
    const stats = await fs.stat(inputPath);
    const isDirectory = stats.isDirectory();

    if (isDirectory) {
        await processDirectory(inputPath, outputPath, options);
    } else {
        await processSingleFile(inputPath, outputPath, options);
    }
}

async function processSingleFile(
    inputPath: string,
    outputPath: string,
    options: ConvertOptions
): Promise<void> {
    // Validate single file conversion rules
    if (options.format) {
        throw new Error('Error: --format option is not allowed for single file conversion');
    }

    // Auto-detect output format from file extension
    const outputFormat = path.extname(outputPath).toLowerCase().slice(1) as SupportedFormat;
    if (!SUPPORTED_FORMATS.includes(outputFormat)) {
        throw new Error(`Error: Unsupported output format: ${outputFormat}`);
    }

    // Validate input format
    const inputFormat = path.extname(inputPath).toLowerCase().slice(1) as SupportedFormat;
    if (!SUPPORTED_FORMATS.includes(inputFormat)) {
        throw new Error(`Error: Unsupported input format: ${inputFormat}`);
    }

    // Check if output file exists and overwrite is not enabled
    if (!options.overwrite) {
        try {
            await fs.access(outputPath);
            // File exists and overwrite is false, so throw error
            throw new Error(
                `Output file already exists: ${outputPath}. Use --overwrite to replace it.`
            );
        } catch (error: unknown) {
            // Only continue if it's a "file not found" error (ENOENT)
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                // File doesn't exist, which is what we want - continue processing
            } else {
                // Re-throw any other error (including our "already exists" error)
                throw error;
            }
        }
    }

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Convert the image
    await convertSingleImage(inputPath, outputPath, outputFormat, options);
    console.log(chalk.green('✅ Image converted successfully!'));
}

async function processDirectory(
    inputDir: string,
    outputDir: string,
    options: ConvertOptions
): Promise<void> {
    // Validate directory conversion rules
    if (!options.format) {
        throw new Error('Error: --format option is required for directory conversion');
    }

    const targetFormat = options.format.toLowerCase() as SupportedFormat;
    if (!SUPPORTED_FORMATS.includes(targetFormat)) {
        throw new Error(`Error: Unsupported format: ${options.format}`);
    }

    // Check if output is a directory
    try {
        const outputStats = await fs.stat(outputDir);
        if (!outputStats.isDirectory()) {
            throw new Error('Error: Output must be a directory when input is a directory');
        }
    } catch {
        // Output directory doesn't exist, create it
        await fs.mkdir(outputDir, { recursive: true });
    }

    // Find all supported image files
    const formatPattern = '*.{jpg,jpeg,png}';
    const pattern = options.recursive ? `**/${formatPattern}` : formatPattern;
    const glob = new Glob(pattern);

    const files: string[] = [];
    for await (const file of glob.scan({
        cwd: inputDir,
        absolute: true,
    })) {
        files.push(file);
    }

    if (files.length === 0) {
        console.log(chalk.yellow('⚠️  No supported image files found'));
        return;
    }

    console.log(chalk.blue(`📁 Found ${files.length} image files`));

    let spinner: Ora | null = null;
    if (options.progress) {
        spinner = ora('Converting images...').start();
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
        try {
            const relativePath = path.relative(inputDir, file);
            const outputFile = path.join(outputDir, relativePath);

            // Change extension to target format
            const outputFileWithExt = path.format({
                ...path.parse(outputFile),
                ext: `.${targetFormat}`,
                base: undefined,
            });

            // Check if output file exists and overwrite is not enabled
            if (!options.overwrite) {
                try {
                    await fs.access(outputFileWithExt);
                    console.log(
                        chalk.yellow(`⚠️  Skipping ${relativePath} - output file already exists`)
                    );
                    continue;
                } catch {
                    // File doesn't exist, continue
                }
            }

            // Create output subdirectory if needed
            const outputFileDir = path.dirname(outputFileWithExt);
            await fs.mkdir(outputFileDir, { recursive: true });

            await convertSingleImage(file, outputFileWithExt, targetFormat, options);
            successCount++;
        } catch (error) {
            errorCount++;
            const relativePath = path.relative(inputDir, file);
            console.error(chalk.red(`Error converting ${relativePath}:`), error);
        }
    }

    if (spinner) {
        spinner.stop();
    }

    if (errorCount === 0) {
        console.log(chalk.green(`✅ Converted ${successCount} files, 0 errors`));
    } else {
        console.log(chalk.yellow(`✅ Converted ${successCount} files, ${errorCount} errors`));
    }
}

async function convertSingleImage(
    inputPath: string,
    outputPath: string,
    targetFormat: SupportedFormat,
    options: ConvertOptions
): Promise<void> {
    let pipeline = sharp(inputPath);

    // Apply format-specific settings
    switch (targetFormat) {
        case 'jpg':
        case 'jpeg': {
            const jpegQuality = options.quality ?? 92;
            // Validate quality range
            if (jpegQuality < 1 || jpegQuality > 100) {
                throw new Error(`Error: Quality must be between 1 and 100, got ${jpegQuality}`);
            }
            pipeline = pipeline.jpeg({
                quality: jpegQuality,
                mozjpeg: true,
            });
            break;
        }

        case 'png': {
            const pngCompression = options.compression ?? 6;
            // Validate compression range
            if (pngCompression < 0 || pngCompression > 9) {
                throw new Error(
                    `Error: Compression must be between 0 and 9, got ${pngCompression}`
                );
            }
            pipeline = pipeline.png({
                compressionLevel: pngCompression,
                quality: 100, // PNG is lossless
            });
            break;
        }

        default:
            throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    await pipeline.toFile(outputPath);
}
