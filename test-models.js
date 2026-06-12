import fs from 'fs';
async function test() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
      console.log("No GROQ_API_KEY");
      return;
  }
  
  const models = ['meta-llama/llama-3.2-90b-vision-preview', 'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];
  
  for (const model of models) {
    console.log("Testing " + model);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [{role: "user", content: "Hi"}]
        })
    });
    console.log(model, await r.json());
  }
}
test();
