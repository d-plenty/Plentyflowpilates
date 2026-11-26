// Makes the app icon PNGs for iPhone and iPad from src/lib/appicon.ts:
//   node scripts/app-icons.ts
// It writes an icon set per look into ios/App/App/Assets.xcassets, using rsvg-convert
// (Fedora: sudo dnf install librsvg2-tools). Run it after changing a look, then commit the PNGs.
// The names must match ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES in the Xcode project.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ICON_LOOKS, iconSetName, iconSvg } from '../src/lib/appicon.ts';

const root = join(import.meta.dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets');
const names: string[] = [];
// The app's own icon (AppIcon) is left as it is; only the ones you can switch to are made.
for (const l of ICON_LOOKS) {
  const set = iconSetName(l.id);
  if (!set) continue;
  const dir = join(root, `${set}.appiconset`);
  mkdirSync(dir, { recursive: true });
  const svg = join(dir, 'icon.svg');
  writeFileSync(svg, iconSvg(l.id));
  execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', '-b', l.bg, '-o', join(dir, 'AppIcon-512@2x.png'), svg]);
  rmSync(svg);
  writeFileSync(join(dir, 'Contents.json'), JSON.stringify({ images: [{ filename: 'AppIcon-512@2x.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
  names.push(set);
}
console.log(`Made ${names.length} icons. Alternate names: ${names.join(' ')}`);
