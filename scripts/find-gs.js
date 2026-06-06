import { execSync } from 'child_process';

try {
    const url = 'https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs1000/ghostscript-10.0.0-linux-x86_64.tgz';
    execSync(`curl -L -o /tmp/gs.tgz ${url}`);
    execSync(`mkdir -p /tmp/gs_extracted`);
    execSync(`tar -xzf /tmp/gs.tgz -C /tmp/gs_extracted`);
    const files = execSync(`find /tmp/gs_extracted -type f`).toString();
    console.log(files);
} catch (e) {
    console.error(e);
}
