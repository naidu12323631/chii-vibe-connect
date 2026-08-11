// Renders the milo app icons from an inline SVG source.
//
//   npm run icons
//
// Outputs the PWA icons (public/icons, public/apple-touch-icon.png) and, when the
// Android project exists, its launcher mipmaps. Re-run after changing the brand
// colour or wordmark. Requires the `sharp` devDependency.
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = "#673ddc";

/**
 * @param size    pixel size of the square canvas
 * @param inset   fraction of the canvas kept clear around the glyph. Maskable
 *                icons need ~10% so Android's circular crop can't clip the mark.
 * @param radius  corner radius as a fraction of the size (0 = full bleed)
 */
const iconSvg = ({ size, inset = 0, radius = 0.22 }) => {
  const rx = Math.round(size * radius);
  const fontSize = Math.round(size * (0.66 - inset * 1.4));
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<rect width="${size}" height="${size}" rx="${rx}" fill="${BRAND}"/>` +
      `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" ` +
      `font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" ` +
      `fill="#ffffff">m</text>` +
      `</svg>`,
  );
};

const TARGETS = [
  { file: "public/icons/icon-192.png", size: 192, radius: 0.22 },
  { file: "public/icons/icon-512.png", size: 512, radius: 0.22 },
  // Full bleed with padding — Android masks this to a circle/squircle.
  { file: "public/icons/maskable-512.png", size: 512, radius: 0, inset: 0.12 },
  // iOS applies its own rounding, so ship a square with no transparency.
  { file: "public/apple-touch-icon.png", size: 180, radius: 0 },
];

const render = async (file, options) => {
  const png = await sharp(iconSvg(options)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(resolve(root, file), png);
  console.log(`wrote ${file} (${options.size}x${options.size}, ${(png.length / 1024).toFixed(1)} kB)`);
};

await mkdir(resolve(root, "public/icons"), { recursive: true });
for (const { file, size, radius, inset } of TARGETS) {
  await render(file, { size, radius, inset });
}

// ------------------------------------------------------- android launcher icons
// Only when `npx cap add android` has been run. Densities are the standard
// mdpi→xxxhdpi ladder; the foreground layer is padded for the adaptive-icon mask.
const ANDROID_RES = "android/app/src/main/res";
const DENSITIES = [
  { dir: "mipmap-mdpi", size: 48 },
  { dir: "mipmap-hdpi", size: 72 },
  { dir: "mipmap-xhdpi", size: 96 },
  { dir: "mipmap-xxhdpi", size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

const hasAndroid = await access(resolve(root, ANDROID_RES)).then(() => true, () => false);

if (!hasAndroid) {
  console.log(`skipped android icons — run "npx cap add android" first`);
} else {
  for (const { dir, size } of DENSITIES) {
    await mkdir(resolve(root, ANDROID_RES, dir), { recursive: true });
    await render(`${ANDROID_RES}/${dir}/ic_launcher.png`, { size, radius: 0.22 });
    await render(`${ANDROID_RES}/${dir}/ic_launcher_round.png`, { size, radius: 0.5 });
    // Adaptive foreground: 108dp canvas where only the middle 72dp is guaranteed
    // visible, so the glyph needs generous padding.
    await render(`${ANDROID_RES}/${dir}/ic_launcher_foreground.png`, {
      size: Math.round(size * 2.25),
      radius: 0,
      inset: 0.2,
    });
  }
  // Match the adaptive-icon background to the brand colour.
  await writeFile(
    resolve(root, ANDROID_RES, "values/ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND}</color>\n</resources>\n`,
  );
  console.log(`wrote ${ANDROID_RES}/values/ic_launcher_background.xml (${BRAND})`);
}
