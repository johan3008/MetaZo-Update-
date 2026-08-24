const fs = require('fs');

// 1. Update types.ts
let types = fs.readFileSync('types.ts', 'utf8');
if (!types.includes('dreamstime_category')) {
  types = types.replace(
    'shutterstock_category_2: string;',
    'shutterstock_category_2: string;\n  dreamstime_category: string;\n  miricanvas_category: string;'
  );
  fs.writeFileSync('types.ts', types);
}

// 2. Update server/gemini.ts
let gemini = fs.readFileSync('server/gemini.ts', 'utf8');

gemini = gemini.replace(
  /import \{ ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO \} from "\.\.\/constants";/g,
  'import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO, DREAMSTIME_CATEGORIES, MIRICANVAS_CATEGORIES } from "../constants";'
);

gemini = gemini.replace(
  /"shutterstock_category_2": ".*?"/g,
  '$&\n      "dreamstime_category": "",\n      "miricanvas_category": ""'
);
gemini = gemini.replace(
  /shutterstock_category_2: heur\.shutterstock_category_2/g,
  '$&,\n      dreamstime_category: "Abstract",\n      miricanvas_category: "Background"'
);
gemini = gemini.replace(
  /recovery\.shutterstock_category_2 = heur\.shutterstock_category_2;/g,
  '$&\n        recovery.dreamstime_category = "Abstract";\n        recovery.miricanvas_category = "Background";'
);
gemini = gemini.replace(
  /shutterstock_category_2: "Backgrounds\/Textures",/g,
  '$&\n        dreamstime_category: "Abstract",\n        miricanvas_category: "Background",'
);

fs.writeFileSync('server/gemini.ts', gemini);
console.log("Patched successfully!");
