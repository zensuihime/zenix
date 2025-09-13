#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

const platform = os.platform();
const ext = platform === 'win32' ? '.exe' : '';

console.log(`🔍 Detected platform: ${platform}`);

// Ensure build directory exists
const buildDir = 'build/bin';
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
    console.log(`📁 Created directory: ${buildDir}`);
}

let target;

switch (platform) {
    case 'win32':
        target = 'bun-windows-x64';
        break;
    case 'linux':
        target = 'bun-linux-x64';
        break;
    case 'darwin':
        target = 'bun-macos-x64';
        break;
    default:
        console.error(`❌ Unsupported platform: ${platform}`);
        process.exit(1);
}

const outfile = `build/bin/zenix${ext}`;

console.log(`📦 Building for ${platform}...`);
console.log(`   Target: ${target}`);
console.log(`   Output: ${outfile}`);

try {
    const command = `bun build src/index.ts --compile --outfile ${outfile} --target ${target}`;
    console.log(`🚀 Running: ${command}`);
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ Successfully compiled: ${outfile}`);
    console.log(`🎉 Build complete! You can now run: ./build/bin/zenix${ext}`);
    
} catch (error) {
    console.error(`❌ Build failed:`, error.message);
    process.exit(1);
}
