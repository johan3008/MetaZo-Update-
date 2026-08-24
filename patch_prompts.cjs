const fs = require('fs');
let gemini = fs.readFileSync('server/gemini.ts', 'utf8');

// Add Dreamstime and MiriCanvas rules
gemini = gemini.replace(
  /2\. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same\..*?(?=\\n)/g,
  '$&\n3. Dreamstime: Choose a category from the provided list.\n4. MiriCanvas: Choose a category from the provided list.'
);

// Inject category lists into prompt
gemini = gemini.replace(
  /\$\{categoriesText\}\\n\\nShutterstock Categories:\\n\$\{shutterstockCategoriesText\}/g,
  '\n\nShutterstock Categories:\n\n\nDreamstime Categories:\n\n\nMiriCanvas Categories:\n'
);

fs.writeFileSync('server/gemini.ts', gemini);
console.log("Patched prompts successfully!");
