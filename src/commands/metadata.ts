import chalk from 'chalk';
import ora from 'ora';
import {
    inspectMetadata as inspectMetadataLib,
    stripMetadata as stripMetadataLib,
} from '../lib/metadata';
import type { MetadataOptions } from '../types';

export async function stripMetadata(
    input: string,
    output: string,
    options: MetadataOptions
): Promise<void> {
    let spinner = null;
    if (options.progress) {
        spinner = ora('Processing files...').start();
    }

    try {
        const result = await stripMetadataLib(input, output, options);

        if (spinner) {
            spinner.stop();
        }

        if (result.success) {
            if (result.processed === 1) {
                console.log(chalk.green('✅ Metadata stripped successfully!'));
            } else {
                console.log(
                    chalk.green(`✅ Processed ${result.processed} files, ${result.errors} errors`)
                );
            }
        } else {
            console.log(
                chalk.yellow(`✅ Processed ${result.processed} files, ${result.errors} errors`)
            );
        }

        // Show error messages if any
        if (result.errorMessages && result.errorMessages.length > 0) {
            for (const error of result.errorMessages) {
                console.error(chalk.red(error));
            }
        }
    } catch (error) {
        if (spinner) {
            spinner.stop();
        }
        throw error;
    }
}

export async function inspectMetadata(
    input: string,
    options: { recursive?: boolean }
): Promise<void> {
    const result = await inspectMetadataLib(input, options);

    if (result.fileCount === 0) {
        console.log(chalk.yellow('⚠️  No supported files found'));
        return;
    }

    if (result.fileCount === 1) {
        console.log(chalk.blue('\n📋 Current metadata:'));

        // Show basic file info
        if (result.metadata.FileName) {
            console.log(chalk.gray(`  File: ${result.metadata.FileName}`));
        }
        if (result.metadata.FileType) {
            console.log(chalk.gray(`  Type: ${result.metadata.FileType}`));
        }
        if (result.metadata.FileSize) {
            console.log(chalk.gray(`  Size: ${result.metadata.FileSize} bytes`));
        }

        // Show image-specific metadata
        if (result.metadata.ImageWidth && result.metadata.ImageHeight) {
            console.log(
                chalk.gray(
                    `  Dimensions: ${result.metadata.ImageWidth}x${result.metadata.ImageHeight}`
                )
            );
        }
        if (result.metadata.XResolution && result.metadata.YResolution) {
            console.log(
                chalk.gray(
                    `  Resolution: ${result.metadata.XResolution}x${result.metadata.YResolution} DPI`
                )
            );
        }

        // Show video-specific metadata
        if (result.metadata.Duration) {
            console.log(chalk.gray(`  Duration: ${result.metadata.Duration}`));
        }
        if (result.metadata.VideoFrameRate) {
            console.log(chalk.gray(`  Frame Rate: ${result.metadata.VideoFrameRate} fps`));
        }

        // Show metadata counts
        const metadataCount = Object.keys(result.metadata).length;
        console.log(chalk.yellow(`  Total metadata fields: ${metadataCount}`));

        // Show specific metadata types
        const exifCount = Object.keys(result.metadata).filter((key) =>
            key.startsWith('EXIF')
        ).length;
        const gpsCount = Object.keys(result.metadata).filter((key) => key.startsWith('GPS')).length;
        const xmpCount = Object.keys(result.metadata).filter((key) => key.startsWith('XMP')).length;

        if (exifCount > 0) console.log(chalk.yellow(`  EXIF fields: ${exifCount}`));
        if (gpsCount > 0) console.log(chalk.yellow(`  GPS fields: ${gpsCount}`));
        if (xmpCount > 0) console.log(chalk.yellow(`  XMP fields: ${xmpCount}`));

        console.log('');
    } else {
        console.log(chalk.blue(`📁 Found ${result.fileCount} files`));
        console.log(chalk.yellow('Use --recursive to inspect all files in subdirectories'));
    }
}
