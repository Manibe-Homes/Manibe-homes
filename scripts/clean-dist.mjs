// Post-build: elimina originales pesados de dist/ — el sitio usa los WebP en */webp/
import { readdirSync, rmSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(import.meta.url), '../../dist');

const rules = [
  { dir: join(root, 'Manibe'), exts: ['.jpg', '.jpeg', '.png'] },
  { dir: join(root, 'Albany'), exts: ['.jpg', '.jpeg', '.png'] },
  { dir: root,                 exts: ['.zip'] },
];

let removed = 0;
let savedBytes = 0;

for (const { dir, exts } of rules) {
  let entries;
  try { entries = readdirSync(dir); } catch { continue; }

  for (const file of entries) {
    if (!exts.includes(extname(file).toLowerCase())) continue;
    const full = join(dir, file);
    try {
      const size = statSync(full).size;
      rmSync(full);
      removed++;
      savedBytes += size;
      console.log('  removed  ' + full.replace(root, 'dist') + '  (' + (size / 1024 / 1024).toFixed(1) + ' MB)');
    } catch (e) {
      console.warn('  warning: ' + file + ': ' + e.message);
    }
  }
}

console.log('\nclean-dist: removed ' + removed + ' file(s), saved ' + (savedBytes / 1024 / 1024).toFixed(1) + ' MB');
