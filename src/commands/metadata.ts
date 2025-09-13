import fs from 'node:fs/promises';
import path from 'node:path';
import { Glob } from 'bun';
import chalk from 'chalk';
import { exiftool, type Tags } from 'exiftool-vendored';
import ora, { type Ora } from 'ora';

// Using ExifTool for unified metadata handling

interface MetadataOptions {
    recursive?: boolean;
    progress?: boolean;
    verbose?: boolean; // Show detailed validation output
}

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
    options: MetadataOptions
): Promise<void> {
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
        await processSingleFile(inputPath, outputPath, options);
        console.log(chalk.green('✅ Metadata stripped successfully!'));
    } else if (stats.isDirectory()) {
        await processDirectory(inputPath, outputPath, options);
    } else {
        throw new Error(`Invalid input path: ${inputPath}`);
    }
}

async function processSingleFile(
    inputPath: string,
    outputPath: string,
    options: MetadataOptions
): Promise<void> {
    // Create output directory if needed
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Copy file to output location first
    await fs.copyFile(inputPath, outputPath);

    // Get original metadata for validation
    let originalMetadata: Tags = {};
    if (options.verbose) {
        try {
            originalMetadata = await exiftool.read(inputPath);
        } catch (_error) {
            console.warn(chalk.yellow('Warning: Could not read original metadata'));
        }
    }

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

    // Show verbose validation output if requested
    if (options.verbose) {
        try {
            const newMetadata = await exiftool.read(outputPath);
            const originalCount = Object.keys(originalMetadata).length;
            const newCount = Object.keys(newMetadata).length;
            const strippedCount = originalCount - newCount;

            // Get relative filename for display
            const filename = path.basename(inputPath);

            if (strippedCount > 0) {
                // Find which specific tags were removed
                const originalKeys = new Set(Object.keys(originalMetadata));
                const newKeys = new Set(Object.keys(newMetadata));
                const removedTags = Array.from(originalKeys).filter((key) => !newKeys.has(key));

                console.log(
                    chalk.blue(`📄 ${filename} - Stripped ${strippedCount} metadata fields:`)
                );

                // Group removed tags by category for better readability
                const exifTags = removedTags.filter((tag) => tag.startsWith('EXIF'));
                const gpsTags = removedTags.filter((tag) => tag.startsWith('GPS'));
                const xmpTags = removedTags.filter((tag) => tag.startsWith('XMP'));
                const iptcTags = removedTags.filter((tag) => tag.startsWith('IPTC'));
                const iccTags = removedTags.filter((tag) => tag.startsWith('ICC'));
                const otherTags = removedTags.filter(
                    (tag) =>
                        !tag.startsWith('EXIF') &&
                        !tag.startsWith('GPS') &&
                        !tag.startsWith('XMP') &&
                        !tag.startsWith('IPTC') &&
                        !tag.startsWith('ICC')
                );

                if (exifTags.length > 0) {
                    console.log(
                        chalk.gray(
                            `  EXIF (${exifTags.length}): ${exifTags.slice(0, 5).join(', ')}${exifTags.length > 5 ? '...' : ''}`
                        )
                    );
                }
                if (gpsTags.length > 0) {
                    console.log(chalk.gray(`  GPS (${gpsTags.length}): ${gpsTags.join(', ')}`));
                }
                if (xmpTags.length > 0) {
                    console.log(
                        chalk.gray(
                            `  XMP (${xmpTags.length}): ${xmpTags.slice(0, 5).join(', ')}${xmpTags.length > 5 ? '...' : ''}`
                        )
                    );
                }
                if (iptcTags.length > 0) {
                    console.log(
                        chalk.gray(
                            `  IPTC (${iptcTags.length}): ${iptcTags.slice(0, 5).join(', ')}${iptcTags.length > 5 ? '...' : ''}`
                        )
                    );
                }
                if (iccTags.length > 0) {
                    console.log(chalk.gray(`  ICC (${iccTags.length}): ${iccTags.join(', ')}`));
                }
                if (otherTags.length > 0) {
                    console.log(
                        chalk.gray(
                            `  Other (${otherTags.length}): ${otherTags.slice(0, 5).join(', ')}${otherTags.length > 5 ? '...' : ''}`
                        )
                    );
                }
            } else {
                console.log(chalk.yellow(`⚠️  ${filename} - No metadata was found to strip`));
            }
        } catch (_error) {
            console.warn(chalk.yellow('Warning: Could not validate metadata stripping'));
        }
    }
}

async function processDirectory(
    inputDir: string,
    outputDir: string,
    options: MetadataOptions
): Promise<void> {
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
        console.log(chalk.yellow('⚠️  No supported files found in directory'));
        return;
    }

    console.log(chalk.blue(`📁 Found ${files.length} files`));

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    let spinner: Ora | undefined;
    if (options.progress) {
        spinner = ora('Processing files...').start();
    }

    let processed = 0;
    let errors = 0;

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
                if (spinner) {
                    spinner.text = `Processed ${processed}/${files.length} files`;
                }
            } catch (error) {
                errors++;
                console.error(chalk.red(`Error processing ${file}:`), error);
            }
        });

        await Promise.all(promises);
    }

    if (spinner) {
        spinner.succeed(`Completed! Processed ${processed} files, ${errors} errors`);
    } else {
        console.log(chalk.green(`✅ Processed ${processed} files, ${errors} errors`));
    }
}

async function showMetadataInfo(inputPath: string): Promise<void> {
    try {
        const metadata = await exiftool.read(inputPath);
        console.log(chalk.blue('\n📋 Current metadata:'));

        // Show basic file info
        if (metadata.FileName) {
            console.log(chalk.gray(`  File: ${metadata.FileName}`));
        }
        if (metadata.FileType) {
            console.log(chalk.gray(`  Type: ${metadata.FileType}`));
        }
        if (metadata.FileSize) {
            console.log(chalk.gray(`  Size: ${metadata.FileSize} bytes`));
        }

        // Show image-specific metadata
        if (metadata.ImageWidth && metadata.ImageHeight) {
            console.log(chalk.gray(`  Dimensions: ${metadata.ImageWidth}x${metadata.ImageHeight}`));
        }
        if (metadata.XResolution && metadata.YResolution) {
            console.log(
                chalk.gray(`  Resolution: ${metadata.XResolution}x${metadata.YResolution} DPI`)
            );
        }

        // Show video-specific metadata
        if (metadata.Duration) {
            console.log(chalk.gray(`  Duration: ${metadata.Duration}`));
        }
        if (metadata.VideoFrameRate) {
            console.log(chalk.gray(`  Frame Rate: ${metadata.VideoFrameRate} fps`));
        }

        // Show metadata counts
        const metadataCount = Object.keys(metadata).length;
        console.log(chalk.yellow(`  Total metadata fields: ${metadataCount}`));

        // Show specific metadata types
        const exifCount = Object.keys(metadata).filter((key) => key.startsWith('EXIF')).length;
        const gpsCount = Object.keys(metadata).filter((key) => key.startsWith('GPS')).length;
        const xmpCount = Object.keys(metadata).filter((key) => key.startsWith('XMP')).length;

        if (exifCount > 0) console.log(chalk.yellow(`  EXIF fields: ${exifCount}`));
        if (gpsCount > 0) console.log(chalk.yellow(`  GPS fields: ${gpsCount}`));
        if (xmpCount > 0) console.log(chalk.yellow(`  XMP fields: ${xmpCount}`));

        console.log('');
    } catch (error) {
        console.error(chalk.red('Error reading metadata:'), error);
    }
}

export async function inspectMetadata(
    input: string,
    options: { recursive?: boolean }
): Promise<void> {
    const inputPath = path.resolve(input);

    // Check if input exists
    try {
        await fs.access(inputPath);
    } catch {
        throw new Error(`Input path does not exist: ${inputPath}`);
    }

    const stats = await fs.stat(inputPath);

    if (stats.isFile()) {
        await showMetadataInfo(inputPath);
    } else if (stats.isDirectory()) {
        await inspectDirectory(inputPath, options);
    } else {
        throw new Error(`Invalid input path: ${inputPath}`);
    }
}

async function inspectDirectory(inputDir: string, options: { recursive?: boolean }): Promise<void> {
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
        console.log(chalk.yellow('⚠️  No supported files found in directory'));
        return;
    }

    console.log(chalk.blue(`📁 Found ${files.length} files\n`));

    for (const file of files) {
        const relativePath = path.relative(inputDir, file);
        console.log(chalk.cyan(`📄 ${relativePath}`));
        await showMetadataInfo(file);
        console.log(chalk.gray('─'.repeat(50)));
    }
}
