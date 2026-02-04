/**
 * Cross-platform build script
 * Copies Angular build output to backend/public
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'frontend', 'dist', 'video-call-frontend', 'browser');
const targetDir = path.join(__dirname, 'public');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('Created public directory');
}

// Copy files recursively
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying Angular build to public folder...');
console.log(`Source: ${sourceDir}`);
console.log(`Target: ${targetDir}`);

try {
  copyDir(sourceDir, targetDir);
  console.log('Build files copied successfully!');
} catch (error) {
  console.error('Error copying files:', error.message);
  process.exit(1);
}
