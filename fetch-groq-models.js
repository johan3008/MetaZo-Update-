async function run() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("No key");
    return;
  }
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const data = await res.json();
  data.data.forEach(m => console.log(m.id));
}
run();
