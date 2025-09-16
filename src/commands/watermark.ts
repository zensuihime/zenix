import chalk from 'chalk';
import ora from 'ora';
import { addWatermark as addWatermarkLib } from '../lib/watermark';
import type { WatermarkOptions } from '../types';

export async function addWatermark(
    input: string,
    output: string,
    options: WatermarkOptions
): Promise<void> {
    let spinner = null;
    if (options.progress) {
        spinner = ora('Adding watermarks...').start();
    }

    try {
        const result = await addWatermarkLib(input, output, options);

        if (spinner) {
            spinner.stop();
        }

        if (result.success) {
            if (result.processed === 1) {
                console.log(chalk.green('✅ Watermark added successfully!'));
            } else {
                console.log(
                    chalk.green(`✅ Watermarked ${result.processed} files, ${result.errors} errors`)
                );
            }
        } else {
            console.log(
                chalk.yellow(`✅ Watermarked ${result.processed} files, ${result.errors} errors`)
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
