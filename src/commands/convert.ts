import chalk from 'chalk';
import ora from 'ora';
import { convertImage as convertImageLib } from '../lib/convert';
import type { ConvertOptions } from '../types';

export async function convertImage(
    input: string,
    output: string,
    options: ConvertOptions
): Promise<void> {
    let spinner = null;
    if (options.progress) {
        spinner = ora('Converting images...').start();
    }

    try {
        const result = await convertImageLib(input, output, options);

        if (spinner) {
            spinner.stop();
        }

        if (result.success) {
            if (result.processed === 1) {
                console.log(chalk.green('✅ Image converted successfully!'));
            } else {
                console.log(
                    chalk.green(`✅ Converted ${result.processed} files, ${result.errors} errors`)
                );
            }
        } else {
            console.log(
                chalk.yellow(`✅ Converted ${result.processed} files, ${result.errors} errors`)
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
