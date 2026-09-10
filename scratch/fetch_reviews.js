const https = require('https');

const url = 'https://qhucqnkewjoihffhpatd.supabase.co/rest/v1/reviews?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodWNxbmtld2pvaWhmZmhwYXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjQ5MTUsImV4cCI6MjA5ODg0MDkxNX0.MIavu-lS1-d7KiwisOXBDEcNzoeakSIgDxz3bK0ZXLw';

const options = {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data);
  });
}).on('error', (err) => {
  console.error('ERROR:', err);
});
