const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// CSS content with Tailwind directives
const css = `
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

// Process the CSS with PostCSS and Tailwind
postcss([
  tailwind(require('./tailwind.config.js')),
  autoprefixer,
])
  .process(css, { from: undefined })
  .then((result) => {
    const outputPath = path.join(__dirname, 'public', 'tailwind-output.css');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result.css);
    console.log(`CSS file generated at ${outputPath}`);
  })
  .catch((error) => {
    console.error('Error generating CSS:', error);
  });
