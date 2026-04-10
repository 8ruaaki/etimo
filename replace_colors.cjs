const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/components/LearnScreen.tsx',
  'src/components/WordRegistration.tsx',
  'src/components/EtymologyTest.tsx',
  'src/components/ProfileEdit.tsx'
];

targetFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace hex colors
  content = content.replace(/#10b981/g, '#3b82f6');
  
  // Replace rgb/rgba values (16,185,129 -> 59,130,246)
  content = content.replace(/16,185,129/g, '59,130,246');
  
  // Replace --primary-color with --accent-color
  content = content.replace(/--primary-color/g, '--accent-color');
  
  // Also, for LearnScreen's Image Mode, it uses Sky blue (#38bdf8, 14,165,233). 
  // Let's unify EVERYTHING to Accent Color (#3b82f6, 59,130,246).
  content = content.replace(/#38bdf8/g, '#3b82f6');
  content = content.replace(/14,165,233/g, '59,130,246');

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
