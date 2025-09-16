#!/usr/bin/env bun

import fs from 'node:fs/promises';

async function syncVersion(): Promise<void> {
    try {
        // Read package.json
        const packageJsonPath = 'package.json';
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent) as { version: string };
        const version = packageJson.version;
        
        if (!version) {
            throw new Error('Version not found in package.json');
        }
        
        // Read cli.ts
        const cliPath = 'src/cli.ts';
        let cliContent = await fs.readFile(cliPath, 'utf8');
        
        // Update version in cli.ts
        const versionRegex = /\.version\('[\d.]+'\)/;
        const newVersionLine = `.version('${version}')`;
        
        if (versionRegex.test(cliContent)) {
            cliContent = cliContent.replace(versionRegex, newVersionLine);
            await fs.writeFile(cliPath, cliContent, 'utf8');
            console.log(`✅ Updated CLI version to ${version}`);
        } else {
            console.log('⚠️  Could not find version line in cli.ts');
            console.log('Expected pattern: .version(\'x.x.x\')');
        }
        
    } catch (error) {
        console.error('❌ Error syncing version:', error);
        process.exit(1);
    }
}

// Run the sync function
syncVersion();
