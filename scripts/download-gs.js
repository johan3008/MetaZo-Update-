import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const binDir = path.join(__dirname, '..', 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

const gsPath = path.join(binDir, 'gs');

console.log('Downloading Ghostscript portable...');
try {
    const version = '10.0.0';
    const versionNoDot = '1000';
    const url = `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs${versionNoDot}/ghostscript-${version}-linux-x86_64.tgz`;
    
    execSync(`curl -L -o /tmp/gs.tgz ${url}`, { stdio: 'inherit' });
    execSync(`mkdir -p /tmp/gs_extracted`, { stdio: 'inherit' });
    execSync(`tar -xzf /tmp/gs.tgz -C /tmp/gs_extracted`, { stdio: 'inherit' });
    
    // Find the binary and copy it to our bin directory
    execSync(`find /tmp/gs_extracted -type f -name "gs-*-linux-x86_64" -exec cp {} ${gsPath} \\;`, { stdio: 'inherit' });
    execSync(`chmod +x ${gsPath}`, { stdio: 'inherit' });
    
    console.log('Ghostscript downloaded and extracted successfully to', gsPath);
} catch (error) {
    console.error('Failed to download Ghostscript:', error);
    process.exit(1);
}
