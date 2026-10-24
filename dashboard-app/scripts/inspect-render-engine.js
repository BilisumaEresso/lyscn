import fs from 'fs';
const lines = fs.readFileSync('dashboard-app/src/lib/cards/slotRenderer.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('renderText') || l.includes("type === 'text'") || l.includes('fillText') || l.includes('.clip(') || l.includes('case \'text\'')) {
    console.log(i + 1, l.trim());
  }
});
