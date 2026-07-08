import fs from 'fs';
fetch('http://localhost:3000/api/mute-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
    })
}).then(res => res.text()).then(data => console.log('Response:', data)).catch(console.error);
