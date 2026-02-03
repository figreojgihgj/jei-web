import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const sourceDir = path.join(rootDir, 'temp');
const publicDir = path.join(rootDir, 'public', 'temp');

/**
 * 递归复制目录
 */
function copyDirectory(src, dest) {
  // 确保目标目录存在
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // 读取源目录
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

/**
 * 生成文件列表索引
 */
function generateFileIndex(dir) {
  const indexFile = path.join(dir, 'index.json');
  const files = [];

  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
        files.push({
          name: entry.name,
          path: entry.name
        });
      }
    }
  }

  const indexContent = JSON.stringify({ files }, null, 2);
  fs.writeFileSync(indexFile, indexContent, 'utf-8');
  console.log(`Generated index: ${indexFile} (${files.length} files)`);
}

console.log('Syncing temp files to public directory...');
console.log(`Source: ${sourceDir}`);
console.log(`Destination: ${publicDir}`);

// 复制文件
copyDirectory(sourceDir, publicDir);

// 为 info 目录生成索引
const infoDir = path.join(publicDir, 'info');
if (fs.existsSync(infoDir)) {
  generateFileIndex(infoDir);
}

// 为 catalog 目录生成索引
const catalogDir = path.join(publicDir, 'catalog');
if (fs.existsSync(catalogDir)) {
  generateFileIndex(catalogDir);
}

console.log('Sync completed!');
