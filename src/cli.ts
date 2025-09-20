#!/usr/bin/env bun

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { convertImage } from './commands/convert';
import { cropImage } from './commands/crop';
import { inspectMetadata, stripMetadata } from './commands/metadata';
import { resizeImage } from './commands/resize';
import { addWatermark } from './commands/watermark';

const program = new Command();

program
    .name('zenix')
    .description('Zenix - High-performance image processing utilities by ZensuiHime')
    .version('1.1.4');

// Strip command
program
    .command('strip')
    .description('Strip metadata from images, videos, audio, and documents')
    .argument('<input>', 'Input file or directory')
    .argument('<output>', 'Output file or directory')
    .option('-r, --recursive', 'Process directories recursively')
    .option('-p, --progress', 'Show progress bar')
    .action(async (input, output, options) => {
        try {
            await stripMetadata(input, output, options);
        } catch (error) {
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    });

// Metadata info command
program
    .command('info')
    .description('Inspect metadata of images, videos, audio, and documents without modifying them')
    .argument('<input>', 'Input file or directory')
    .option('-r, --recursive', 'Process directories recursively')
    .action(async (input, options) => {
        try {
            await inspectMetadata(input, options);
        } catch (error) {
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    });

// Resize command
program
    .command('resize')
    .description('Resize images')
    .argument('<input>', 'Input file or directory')
    .argument('<output>', 'Output file or directory')
    .option('-w, --width <number>', 'Target width', (value) => {
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num <= 0) {
            console.error(chalk.red('Error: Width must be a positive integer'));
            process.exit(1);
        }
        return num;
    })
    .option('-h, --height <number>', 'Target height', (value) => {
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num <= 0) {
            console.error(chalk.red('Error: Height must be a positive integer'));
            process.exit(1);
        }
        return num;
    })
    .option('-s, --scale <number>', 'Scale factor (0.1-10)', (value) => {
        const num = parseFloat(value);
        if (Number.isNaN(num) || num <= 0 || num > 10) {
            console.error(chalk.red('Error: Scale must be a number between 0.1 and 10'));
            process.exit(1);
        }
        return num;
    })
    .option('-f, --fit <dimensions>', 'Fit to dimensions (e.g., 1920x1080)', (value) => {
        const match = value.match(/^(\d+)x(\d+)$/);
        if (!match) {
            console.error(
                chalk.red('Error: Fit dimensions must be in format WIDTHxHEIGHT (e.g., 1920x1080)')
            );
            process.exit(1);
        }
        const width = parseInt(match[1] ?? '0', 10);
        const height = parseInt(match[2] ?? '0', 10);
        if (width <= 0 || height <= 0) {
            console.error(chalk.red('Error: Fit dimensions must be positive integers'));
            process.exit(1);
        }
        return value;
    })
    .option('-r, --recursive', 'Process directories recursively')
    .option('-p, --progress', 'Show progress bar')
    .action(async (input, output, options) => {
        // Validate conflicting options
        if (options.width && options.height) {
            console.error(chalk.red('Error: Cannot specify both --width and --height.'));
            console.error(
                chalk.yellow(
                    'Use --fit for specific dimensions or --scale for proportional resizing.'
                )
            );
            process.exit(1);
        }

        try {
            await resizeImage(input, output, options);
        } catch (error) {
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    });

// Crop command
program
    .command('crop')
    .description('Crop images to specific aspect ratios or dimensions')
    .argument('<input>', 'Input file or directory')
    .argument('<output>', 'Output file or directory')
    .option('-a, --aspect <ratio>', 'Aspect ratio (e.g., 4:5, 16:9, 1:1)', (value) => {
        const match = value.match(/^(\d+):(\d+)$/);
        if (!match) {
            console.error(
                chalk.red('Error: Aspect ratio must be in format WIDTH:HEIGHT (e.g., 4:5)')
            );
            process.exit(1);
        }
        const width = parseInt(match[1] ?? '0', 10);
        const height = parseInt(match[2] ?? '0', 10);
        if (width <= 0 || height <= 0) {
            console.error(chalk.red('Error: Aspect ratio dimensions must be positive integers'));
            process.exit(1);
        }
        return value;
    })
    .option('-d, --dimensions <size>', 'Custom dimensions (e.g., 1080x1920)', (value) => {
        const match = value.match(/^(\d+)x(\d+)$/);
        if (!match) {
            console.error(
                chalk.red('Error: Dimensions must be in format WIDTHxHEIGHT (e.g., 1080x1920)')
            );
            process.exit(1);
        }
        const width = parseInt(match[1] ?? '0', 10);
        const height = parseInt(match[2] ?? '0', 10);
        if (width <= 0 || height <= 0) {
            console.error(chalk.red('Error: Dimensions must be positive integers'));
            process.exit(1);
        }
        return value;
    })
    .option('-p, --position <position>', 'Crop position', 'center')
    .option('-r, --recursive', 'Process directories recursively')
    .option('--progress', 'Show progress bar')
    .action(async (input, output, options) => {
        // Check if input is a directory
        const inputPath = path.resolve(input);
        const stats = await fs.stat(inputPath).catch(() => null);
        const isDirectory = stats?.isDirectory();

        // Validate conflicting options
        if (options.aspect && options.dimensions) {
            console.error(chalk.red('Error: Cannot specify both --aspect and --dimensions.'));
            console.error(
                chalk.yellow(
                    'Use either --aspect for aspect ratio cropping or --dimensions for custom size cropping.'
                )
            );
            process.exit(1);
        }

        // Validate required options
        if (!options.aspect && !options.dimensions) {
            console.error(chalk.red('Error: Must specify either --aspect or --dimensions.'));
            process.exit(1);
        }

        // Disable --dimensions for directory input
        if (isDirectory && options.dimensions) {
            console.error(chalk.red('Error: --dimensions cannot be used with directory input.'));
            console.error(
                chalk.yellow(
                    'Use --aspect for directory processing (e.g., --aspect 4:5) or process files individually.'
                )
            );
            process.exit(1);
        }

        // Validate position
        const validPositions = [
            'center',
            'top',
            'bottom',
            'left',
            'right',
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
        ];
        if (!validPositions.includes(options.position)) {
            console.error(chalk.red(`Error: Invalid position '${options.position}'.`));
            console.error(chalk.yellow(`Valid positions: ${validPositions.join(', ')}`));
            process.exit(1);
        }

        try {
            await cropImage(input, output, options);
        } catch (error) {
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    });

// Convert command
program
    .command('convert')
    .description('Convert images between JPEG and PNG formats')
    .argument('<input>', 'Input file or directory')
    .argument('<output>', 'Output file or directory')
    .option('-f, --format <format>', 'Target format for directory conversion (jpeg, png)')
    .option('-q, --quality <number>', 'Quality for lossy formats (1-100, default: 92)', (value) => {
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num < 1 || num > 100) {
            console.error(chalk.red('Error: Quality must be between 1 and 100'));
            process.exit(1);
        }
        return num;
    })
    .option('-c, --compression <level>', 'PNG compression level (0-9, default: 6)', (value) => {
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num < 0 || num > 9) {
            console.error(chalk.red('Error: Compression must be between 0 and 9'));
            process.exit(1);
        }
        return num;
    })
    .option('-r, --recursive', 'Process directories recursively')
    .option('-p, --progress', 'Show progress bar')
    .option('--overwrite', 'Overwrite existing output files')
    .action(async (input, output, options) => {
        // Check if input is a directory
        const inputPath = path.resolve(input);
        const stats = await fs.stat(inputPath).catch(() => null);
        const isDirectory = stats?.isDirectory();

        // Validate directory conversion rules
        if (isDirectory && !options.format) {
            console.error(chalk.red('Error: --format option is required for directory conversion'));
            process.exit(1);
        }

        // Validate single file conversion rules
        if (!isDirectory && options.format) {
            console.error(
                chalk.red('Error: --format option is not allowed for single file conversion')
            );
            process.exit(1);
        }

        try {
            await convertImage(input, output, options);
        } catch (error) {
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    });

// Watermark command
program
    .command('watermark')
    .description('Add watermarks to images')
    .argument('<input>', 'Input file or directory')
    .argument('<output>', 'Output file or directory')
    .option('-t, --text <text>', 'Text watermark')
    .option('-i, --image <path>', 'Image watermark path')
    .option('-p, --position <position>', 'Watermark position', 'bottom-right')
    .option('-o, --opacity <number>', 'Watermark opacity (0-1)', '1.0')
    .option('-s, --size <number>', 'Watermark size as percentage of image (1-100)', '5')
    .option('--padding-x <value>', 'Horizontal padding (pixels or percentage like 10%)')
    .option('--padding-y <value>', 'Vertical padding (pixels or percentage like 10%)')
    .option('--text-color <color>', 'Text color (black or white)', 'white')
    .option('-r, --recursive', 'Process directories recursively')
    .option('--progress', 'Show progress bar')
    .action(async (input, output, options) => {
        // Validate center position doesn't use padding
        if (
            options.position === 'center' &&
            (options.paddingX !== undefined || options.paddingY !== undefined)
        ) {
            console.error(chalk.red('Error: Center position does not support padding options'));
            process.exit(1);
        }

        // Validate text color
        if (options.textColor && !['black', 'white'].includes(options.textColor.toLowerCase())) {
            console.error(chalk.red('Error: Text color must be either "black" or "white"'));
            process.exit(1);
        }

        try {
            await addWatermark(input, output, options);
        } catch (error) {
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    });

// Cleanup function
const cleanup = async () => {
    try {
        const { exiftool } = await import('exiftool-vendored');
        await exiftool.end();
    } catch {
        // Ignore cleanup errors
    }
};

// Handle interruption signals
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⚠️  Interrupted by user. Cleaning up...'));
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n⚠️  Terminated. Cleaning up...'));
    await cleanup();
    process.exit(0);
});

// Parse commands and handle cleanup
program
    .parseAsync()
    .then(async () => {
        // Clean up ExifTool processes after command execution
        await cleanup();
    })
    .catch(async (error) => {
        console.error(chalk.red('Error:'), error);
        await cleanup();
        process.exit(1);
    });
