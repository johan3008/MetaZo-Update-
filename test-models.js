import fs from 'fs';

async function check() {
  const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY || 'gsk_invalid'}` }});
  const data = await r.json();
  console.log(data);
}
check();
