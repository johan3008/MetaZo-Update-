import fs from 'fs';
async function test() {
  const r = await fetch('https://console.groq.com/docs/models');
  const t = await r.text();
  console.log(t.substring(t.indexOf('llama-4-scout-17b-16e-instruct') - 1000, t.indexOf('llama-4-scout-17b-16e-instruct') + 800));
}
test();
