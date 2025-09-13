import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import sharp from 'sharp';

interface CropOptions {
    aspect?: string;
    dimensions?: string;
    position?: string;
    recursive?: boolean;
    progress?: boolean;
}

// Valid crop positions
const VALID_POSITIONS = [
    'center',
    'top',
    'bottom',
    'left',
    'right',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
] as const;

// Position offset mapping (x, y coordinates as percentages)
const POSITION_OFFSETS = {
    center: { x: 0.5, y: 0.5 },
    top: { x: 0.5, y: 0 },
    bottom: { x: 0.5, y: 1 },
    left: { x: 0, y: 0.5 },
    right: { x: 1, y: 0.5 },
    'top-left': { x: 0, y: 0 },
    'top-right': { x: 1, y: 0 },
    'bottom-left': { x: 0, y: 1 },
    'bottom-right': { x: 1, y: 1 },
} as const;

export async function cropImage(
    input: string,
    output: string,
    options: CropOptions
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
        console.log(chalk.green('✅ Image cropped successfully!'));
    } else if (stats.isDirectory()) {
        await processDirectory(inputPath, outputPath, options);
    } else {
        throw new Error(`Invalid input path: ${inputPath}`);
    }
}

async function processSingleFile(
    inputPath: string,
    outputPath: string,
    options: CropOptions
): Promise<void> {
    // Create output directory if needed
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const { width: imageWidth, height: imageHeight } = metadata;

    if (!imageWidth || !imageHeight) {
        throw new Error('Could not read image dimensions');
    }

    // Calculate target dimensions
    const { targetWidth, targetHeight } = calculateTargetDimensions(
        options,
        imageWidth,
        imageHeight
    );

    // Validate crop dimensions don't exceed image dimensions
    if (targetWidth > imageWidth || targetHeight > imageHeight) {
        throw new Error(
            `Crop dimensions (${targetWidth}x${targetHeight}) cannot be larger than image dimensions (${imageWidth}x${imageHeight})`
        );
    }

    // Calculate crop area
    const position = options.position || 'center';
    const { cropX, cropY, cropWidth, cropHeight } = calculateCropArea(
        imageWidth,
        imageHeight,
        targetWidth,
        targetHeight,
        position
    );

    // Apply crop
    await sharp(inputPath)
        .extract({
            left: cropX,
            top: cropY,
            width: cropWidth,
            height: cropHeight,
        })
        .toFile(outputPath);
}

function calculateTargetDimensions(
    options: CropOptions,
    imageWidth: number,
    imageHeight: number
): { targetWidth: number; targetHeight: number } {
    if (options.aspect) {
        // Parse aspect ratio (e.g., "4:5" or "16:9")
        const [widthRatio, heightRatio] = options.aspect.split(':').map(Number);
        if (!widthRatio || !heightRatio || widthRatio <= 0 || heightRatio <= 0) {
            throw new Error('Aspect ratio must be in format WIDTH:HEIGHT (e.g., 4:5)');
        }

        const aspectRatio = widthRatio / heightRatio;
        const imageAspect = imageWidth / imageHeight;

        if (imageAspect > aspectRatio) {
            // Image is wider, crop sides
            const targetHeight = imageHeight;
            const targetWidth = Math.round(imageHeight * aspectRatio);
            return { targetWidth, targetHeight };
        } else {
            // Image is taller, crop top/bottom
            const targetWidth = imageWidth;
            const targetHeight = Math.round(imageWidth / aspectRatio);
            return { targetWidth, targetHeight };
        }
    } else if (options.dimensions) {
        // Parse custom dimensions (e.g., "1080x1920")
        const [width, height] = options.dimensions.split('x').map(Number);
        if (!width || !height || width <= 0 || height <= 0) {
            throw new Error('Dimensions must be in format WIDTHxHEIGHT (e.g., 1080x1920)');
        }
        return { targetWidth: width, targetHeight: height };
    } else {
        throw new Error('Please specify either --aspect or --dimensions');
    }
}

function calculateCropArea(
    imageWidth: number,
    imageHeight: number,
    targetWidth: number,
    targetHeight: number,
    position: string
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
    // Calculate crop dimensions (always smaller than or equal to image)
    const cropWidth = Math.min(targetWidth, imageWidth);
    const cropHeight = Math.min(targetHeight, imageHeight);

    // Get position offsets
    const positionOffsets = POSITION_OFFSETS[position as keyof typeof POSITION_OFFSETS];
    if (!positionOffsets) {
        throw new Error(
            `Invalid position: ${position}. Valid positions: ${VALID_POSITIONS.join(', ')}`
        );
    }

    // Calculate crop coordinates
    const cropX = Math.round((imageWidth - cropWidth) * positionOffsets.x);
    const cropY = Math.round((imageHeight - cropHeight) * positionOffsets.y);

    return { cropX, cropY, cropWidth, cropHeight };
}

async function processDirectory(
    inputDir: string,
    outputDir: string,
    options: CropOptions
): Promise<void> {
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
        console.log(chalk.yellow('⚠️  No image files found in directory'));
        return;
    }

    console.log(chalk.blue(`📁 Found ${files.length} image files`));

    await fs.mkdir(outputDir, { recursive: true });

    let spinner: Ora | undefined;
    if (options.progress) {
        spinner = ora('Cropping images...').start();
    }

    let processed = 0;
    let errors = 0;

    const batchSize = 5;
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
                if (spinner) {
                    spinner.text = `Cropped ${processed}/${files.length} files`;
                }
            } catch (error) {
                errors++;
                console.error(chalk.red(`Error cropping ${file}:`), error);
            }
        });

        await Promise.all(promises);
    }

    if (spinner) {
        spinner.succeed(`Completed! Cropped ${processed} files, ${errors} errors`);
    } else {
        console.log(chalk.green(`✅ Cropped ${processed} files, ${errors} errors`));
    }
}
