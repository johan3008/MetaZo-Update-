function expandDottedPaths(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}
console.log(expandDottedPaths({ 'settings.mz_gemini_model': 'gemini-1.5-flash', 'other': 1 }));
