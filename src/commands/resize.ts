import chalk from 'chalk';
import ora from 'ora';
import { resizeImage as resizeImageLib } from '../lib/resize';
import type { ResizeOptions } from '../types';

export async function resizeImage(
    input: string,
    output: string,
    options: ResizeOptions
): Promise<void> {
    let spinner = null;
    if (options.progress) {
        spinner = ora('Resizing images...').start();
    }

    try {
        const result = await resizeImageLib(input, output, options);

        if (spinner) {
            spinner.stop();
        }

        if (result.success) {
            if (result.processed === 1) {
                console.log(chalk.green('✅ Image resized successfully!'));
            } else {
                console.log(
                    chalk.green(`✅ Resized ${result.processed} files, ${result.errors} errors`)
                );
            }
        } else {
            console.log(
                chalk.yellow(`✅ Resized ${result.processed} files, ${result.errors} errors`)
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
