import fs from 'fs';

async function test() {
    const form = new FormData();
    const blob = new Blob([fs.readFileSync('package.json')]);
    form.append('file', blob, 'package.json');
    
    try {
        const res = await fetch('http://localhost:3000/api/convert-eps', {
            method: 'POST',
            body: form
        });
        console.log('Status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));
        const text = await res.text();
        console.log('Body:', text.substring(0, 200));
    } catch (e) {
        console.error(e);
    }
}
test();
