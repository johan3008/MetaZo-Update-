import fs from 'fs';

async function testNvidia() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
      console.log("No NVIDIA_API_KEY");
      return;
  }
  
  const models = ['step-3.5-flash'];
  
  for (const model of models) {
    console.log("Testing NVIDIA model: " + model);
    const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [{role: "user", content: "Hi, test message"}]
        })
    });
    const result = await r.json();
    console.log(`[${model}] Status: ${r.status}, Response:`, result);
  }
}

testNvidia();
