async function test() {
  const apiKey = process.env.BLUESMINDS_API_KEY || "sk-dummy";
  const model = "gpt-4o";
  try {
    const res = await fetch("https://api.bluesminds.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: "user", 
          content: [
            { type: "text", text: "Part 1 " },
            { type: "text", text: "Part 2" }
          ]
        }],
        stream: false
      })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
