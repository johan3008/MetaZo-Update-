import { getEnv } from './test-env.js'; // Just a mock or we pass it
async function test() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("no groq api key found");
    return;
  }
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{role: 'user', content: 'hello'}]
    })
  });
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}
test();
