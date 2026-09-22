const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  path.join(__dirname, '..', 'src', 'components'),
];

// Files/folders to ignore completely
const IGNORE_PATHS = [
  path.join(__dirname, '..', 'src', 'theme'),
  path.join(__dirname, '..', 'src', 'styles'),
];

const HEX_REGEX = /#([0-9a-fA-F]{3,8})\b/g;

// Exclude flag emojis (regional indicator symbols 1F1E6 to 1F1FF)
// but capture all other common emojis and symbols
const EMOJI_REGEX = /(?![\u{1F1E6}-\u{1F1FF}])[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F09F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F19F}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}]/gu;

let totalFailures = 0;

function shouldIgnore(filePath) {
  return IGNORE_PATHS.some(ignorePath => filePath.startsWith(ignorePath)) || 
         filePath.endsWith('.test.tsx') || 
         filePath.endsWith('.test.ts') ||
         filePath.endsWith('.d.ts');
}

function scanFile(filePath) {
  if (shouldIgnore(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for hardcoded hex colors
    let hexMatch;
    while ((hexMatch = HEX_REGEX.exec(line)) !== null) {
      console.log(`[HEX COLOR] ${relativePath}:${lineNum} - Found "${hexMatch[0]}" in: "${line.trim()}"`);
      totalFailures++;
    }

    // Check for emojis
    let emojiMatch;
    while ((emojiMatch = EMOJI_REGEX.exec(line)) !== null) {
      console.log(`[EMOJI] ${relativePath}:${lineNum} - Found emoji "${emojiMatch[0]}" in: "${line.trim()}"`);
      totalFailures++;
    }
  });
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      scanFile(fullPath);
    }
  });
}

console.log('Starting visual validation scan...');
TARGET_DIRS.forEach(traverse);

// Also scan App.tsx as it is a top-level component
const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
if (fs.existsSync(appPath)) {
  scanFile(appPath);
}

console.log(`\nScan complete. Total infractions found: ${totalFailures}`);
if (totalFailures > 0) {
  process.exit(1);
} else {
  console.log('All checks passed successfully!');
  process.exit(0);
}
