import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import sharp from 'sharp';

// Using Bun's built-in glob

interface WatermarkOptions {
    text?: string;
    image?: string;
    position?: string;
    opacity?: string;
    size?: string;
    paddingX?: string;
    paddingY?: string;
    textColor?: string;
    recursive?: boolean;
    progress?: boolean;
}

export async function addWatermark(
    input: string,
    output: string,
    options: WatermarkOptions
): Promise<void> {
    const inputPath = path.resolve(input);
    const outputPath = path.resolve(output);

    // Validate options
    if (!options.text && !options.image) {
        throw new Error('Please specify either --text or --image for watermark');
    }

    if (options.text && options.image) {
        throw new Error('Please specify either --text or --image, not both');
    }

    // Check if input exists
    try {
        await fs.access(inputPath);
    } catch {
        throw new Error(`Input path does not exist: ${inputPath}`);
    }

    const stats = await fs.stat(inputPath);

    if (stats.isFile()) {
        await processSingleFile(inputPath, outputPath, options);
        console.log(chalk.green('✅ Watermark added successfully!'));
    } else if (stats.isDirectory()) {
        await processDirectory(inputPath, outputPath, options);
    } else {
        throw new Error(`Invalid input path: ${inputPath}`);
    }
}

async function processSingleFile(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
): Promise<void> {
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    let pipeline = sharp(inputPath);
    const metadata = await pipeline.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (options.text) {
        // Text watermark
        const opacity = parseFloat(options.opacity || '1.0');
        const position = options.position || 'bottom-right';
        const textColor = (options.textColor || 'white').toLowerCase();

        // Calculate font size from size percentage (similar to image watermarks)
        const sizePercent = parseFloat(options.size || '5');
        const fontSize = Math.max(20, Math.round(Math.min(width, height) * (sizePercent / 100)));
        // Parse padding values (ignore for center position)
        const paddingX = position === 'center' ? 0 : parsePadding(options.paddingX || '20', width);
        const paddingY = position === 'center' ? 0 : parsePadding(options.paddingY || '20', height);

        // Calculate text position
        const { x, y } = calculateTextPosition(
            position,
            width,
            height,
            paddingX,
            paddingY,
            fontSize
        );

        // Determine colors
        const fillColor = textColor === 'black' ? 'black' : 'white';
        const shadowColor = textColor === 'black' ? 'white' : 'black';

        // Create text watermark with glow shadow
        const textSvg = `
        <svg width="${width}" height="${height}" opacity="${opacity}">
          <defs>
            <filter id="textGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blurOut"/>
              <feFlood flood-color="${shadowColor}"/>
              <feComposite in2="blurOut" operator="in" result="shadow"/>
              <feBlend in="SourceGraphic" in2="shadow" mode="normal"/>
            </filter>
          </defs>
          <text x="${x}" y="${y}" 
                font-family="Nunito, Arial" 
                font-size="${fontSize}" 
                font-weight="bold"
                fill="${fillColor}"
                filter="url(#textGlow)"
                text-anchor="${getTextAnchor(position)}"
                dominant-baseline="middle"
                letter-spacing="-0.05em"
                >
          ${options.text}
        </text>
      </svg>
    `;

        pipeline = pipeline.composite([
            {
                input: Buffer.from(textSvg),
                top: 0,
                left: 0,
                blend: 'over',
            },
        ]);
    } else if (options.image) {
        // Image watermark
        const watermarkPath = path.resolve(options.image);

        try {
            await fs.access(watermarkPath);
        } catch {
            throw new Error(`Watermark image not found: ${watermarkPath}`);
        }

        const opacity = parseFloat(options.opacity || '1.0');
        const position = options.position || 'bottom-right';

        // Parse padding values (ignore for center position)
        const paddingX = position === 'center' ? 0 : parsePadding(options.paddingX || '20', width);
        const paddingY = position === 'center' ? 0 : parsePadding(options.paddingY || '20', height);

        // Load and resize watermark
        const watermark = sharp(watermarkPath);
        const watermarkMetadata = await watermark.metadata();

        // Validate overlay image format
        const supportedFormats = ['jpeg', 'png', 'svg', 'webp'];
        if (!watermarkMetadata.format || !supportedFormats.includes(watermarkMetadata.format)) {
            throw new Error(
                `Unsupported overlay image format: ${watermarkMetadata.format || 'unknown'}. Supported formats: ${supportedFormats.join(', ')}`
            );
        }

        // Calculate watermark size using proper aspect ratio preservation
        const sizePercent = parseFloat(options.size || '5');
        if (Number.isNaN(sizePercent) || sizePercent <= 0 || sizePercent > 100) {
            throw new Error('Size must be a number between 1 and 100 (percentage)');
        }

        const { width: watermarkWidth, height: watermarkHeight } = calculateWatermarkSize(
            watermarkMetadata.width || 0,
            watermarkMetadata.height || 0,
            width,
            height,
            sizePercent
        );

        const resizedWatermark = await watermark
            .resize(watermarkWidth, watermarkHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .png()
            .toBuffer();

        // Calculate watermark position
        const { x, y } = calculateImagePosition(
            position,
            width,
            height,
            watermarkWidth,
            watermarkHeight,
            paddingX,
            paddingY
        );

        // Check if watermark is JPG format
        const watermarkFormat = watermarkMetadata.format;
        let watermarkWithOpacity: Buffer;

        if (watermarkFormat === 'jpeg') {
            // For JPG images, use ensureAlpha() with opacity as suggested in Stack Overflow
            // https://stackoverflow.com/a/75388467
            watermarkWithOpacity = await sharp(resizedWatermark)
                .ensureAlpha(opacity)
                .png()
                .toBuffer();
        } else {
            // For PNG/SVG/WebP images, manipulate alpha channel directly
            // Solution based on https://github.com/lovell/sharp/issues/554
            const { width: w, height: h, channels } = await sharp(resizedWatermark).metadata();

            // Get raw pixel data
            const { data } = await sharp(resizedWatermark)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Modify alpha channel (4th channel in RGBA)
            for (let i = 3; i < data.length; i += 4) {
                data[i] = Math.round((data?.[i] ?? 0) * opacity);
            }

            // Create new image with modified alpha
            watermarkWithOpacity = await sharp(data, {
                raw: {
                    width: w,
                    height: h,
                    channels: channels,
                },
            })
                .png()
                .toBuffer();
        }

        // Composite the watermarked image
        pipeline = pipeline.composite([
            {
                input: watermarkWithOpacity,
                top: y,
                left: x,
                blend: 'over',
            },
        ]);
    }

    // Save with appropriate format
    const ext = path.extname(outputPath).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            pipeline = pipeline.jpeg();
            break;
        case '.png':
            pipeline = pipeline.png();
            break;
        case '.webp':
            pipeline = pipeline.webp();
            break;
    }

    await pipeline.toFile(outputPath);
}

function calculateTextPosition(
    position: string,
    width: number,
    height: number,
    paddingX: number,
    paddingY: number,
    fontSize: number
): { x: number; y: number } {
    switch (position) {
        case 'top-left':
            return { x: paddingX, y: paddingY + fontSize / 2 };
        case 'top-right':
            return { x: width - paddingX, y: paddingY + fontSize / 2 };
        case 'bottom-left':
            return { x: paddingX, y: height - paddingY - fontSize / 2 };
        case 'bottom-right':
            return { x: width - paddingX, y: height - paddingY - fontSize / 2 };
        case 'center':
            return { x: width / 2, y: height / 2 };
        default:
            return { x: width - paddingX, y: height - paddingY - fontSize / 2 };
    }
}

function calculateImagePosition(
    position: string,
    width: number,
    height: number,
    watermarkWidth: number,
    watermarkHeight: number,
    paddingX: number,
    paddingY: number
): { x: number; y: number } {
    switch (position) {
        case 'top-left':
            return { x: paddingX, y: paddingY };
        case 'top-right':
            return { x: width - watermarkWidth - paddingX, y: paddingY };
        case 'bottom-left':
            return { x: paddingX, y: height - watermarkHeight - paddingY };
        case 'bottom-right':
            return { x: width - watermarkWidth - paddingX, y: height - watermarkHeight - paddingY };
        case 'center':
            return { x: (width - watermarkWidth) / 2, y: (height - watermarkHeight) / 2 };
        default:
            return { x: width - watermarkWidth - paddingX, y: height - watermarkHeight - paddingY };
    }
}

function getTextAnchor(position: string): string {
    switch (position) {
        case 'top-left':
        case 'bottom-left':
            return 'start';
        case 'top-right':
        case 'bottom-right':
            return 'end';
        case 'center':
            return 'middle';
        default:
            return 'end';
    }
}

function parsePadding(value: string, dimension: number): number {
    if (value.endsWith('%')) {
        const percent = parseFloat(value.slice(0, -1));
        if (Number.isNaN(percent) || percent < 0 || percent > 100) {
            throw new Error(`Padding percentage must be between 0 and 100, got: ${value}`);
        }
        return dimension * (percent / 100);
    } else {
        const pixels = parseFloat(value);
        if (Number.isNaN(pixels) || pixels < 0) {
            throw new Error(`Padding must be a positive number or percentage, got: ${value}`);
        }
        return pixels;
    }
}

function calculateWatermarkSize(
    watermarkWidth: number,
    watermarkHeight: number,
    imageWidth: number,
    imageHeight: number,
    sizePercent: number
): { width: number; height: number } {
    // Calculate the maximum dimension the watermark can be
    const maxDimension = Math.min(imageWidth, imageHeight) * (sizePercent / 100);

    // Calculate scale factor to fit within maxDimension while maintaining aspect ratio
    const scaleX = maxDimension / watermarkWidth;
    const scaleY = maxDimension / watermarkHeight;
    const scale = Math.min(scaleX, scaleY); // Use the smaller scale to ensure it fits

    return {
        width: Math.round(watermarkWidth * scale),
        height: Math.round(watermarkHeight * scale),
    };
}

async function processDirectory(
    inputDir: string,
    outputDir: string,
    options: WatermarkOptions
): Promise<void> {
    // Find all supported image files
    const formatPattern = '*.{jpg,jpeg,png,gif,bmp,tiff,tif,webp,svg}';
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
        console.log(chalk.yellow('⚠️  No image files found in directory'));
        return;
    }

    console.log(chalk.blue(`📁 Found ${files.length} image files`));

    await fs.mkdir(outputDir, { recursive: true });

    let spinner: Ora | undefined;
    if (options.progress) {
        spinner = ora('Adding watermarks...').start();
    }

    let processed = 0;
    let errors = 0;

    const batchSize = 3; // Smaller batch size for watermark operations
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const promises = batch.map(async (file: string) => {
            try {
                const relativePath = path.relative(inputDir, file);
                const outputFile = path.join(outputDir, relativePath);
                const outputFileDir = path.dirname(outputFile);

                await fs.mkdir(outputFileDir, { recursive: true });
                await processSingleFile(file, outputFile, options);

                processed++;
                if (spinner) {
                    spinner.text = `Watermarked ${processed}/${files.length} files`;
                }
            } catch (error) {
                errors++;
                console.error(chalk.red(`Error watermarking ${file}:`), error);
            }
        });

        await Promise.all(promises);
    }

    if (spinner) {
        spinner.succeed(`Completed! Watermarked ${processed} files, ${errors} errors`);
    } else {
        console.log(chalk.green(`✅ Watermarked ${processed} files, ${errors} errors`));
    }
}
