import fs from 'fs';
async function test() {
  const r = await fetch('https://console.groq.com/docs/models');
  const t = await r.text();
  const matches = [...t.matchAll(/class="font-mono[^>]*>([^<]+)<\/span>/gi)];
  console.log("Found models:");
  matches.forEach(m => console.log(m[1]));
}
test();
