import chalk from 'chalk';
import ora from 'ora';
import { cropImage as cropImageLib } from '../lib/crop';
import type { CropOptions } from '../types';

export async function cropImage(
    input: string,
    output: string,
    options: CropOptions
): Promise<void> {
    let spinner = null;
    if (options.progress) {
        spinner = ora('Cropping images...').start();
    }

    try {
        const result = await cropImageLib(input, output, options);

        if (spinner) {
            spinner.stop();
        }

        if (result.success) {
            if (result.processed === 1) {
                console.log(chalk.green('✅ Image cropped successfully!'));
            } else {
                console.log(
                    chalk.green(`✅ Cropped ${result.processed} files, ${result.errors} errors`)
                );
            }
        } else {
            console.log(
                chalk.yellow(`✅ Cropped ${result.processed} files, ${result.errors} errors`)
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
