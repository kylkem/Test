/**
 * Generates iPad splash screen PNGs from the app icon.
 * Uses @vite-pwa/assets-generator's sharp dependency.
 */
import { createRequire } from 'module'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Lazy-load sharp (installed as a dep of @vite-pwa/assets-generator)
const require = createRequire(import.meta.url)
let sharp
try {
  sharp = require('sharp')
} catch {
  console.error('sharp not found. Run: npm install -D sharp')
  process.exit(1)
}

const splashDir = join(rootDir, 'public', 'splash')
if (!existsSync(splashDir)) mkdirSync(splashDir, { recursive: true })

const iconPath = join(rootDir, 'public', 'pwa-512x512.png')
const BG = { r: 30, g: 58, b: 95, alpha: 1 }  // #1e3a5f

// [filename, width, height]
const SIZES = [
  ['apple-splash-2048-2732.png', 2048, 2732],
  ['apple-splash-1668-2388.png', 1668, 2388],
  ['apple-splash-1620-2160.png', 1620, 2160],
  ['apple-splash-1640-2360.png', 1640, 2360],
  ['apple-splash-1488-2266.png', 1488, 2266],
]

const ICON_SIZE = 256  // icon rendered at this size in center

for (const [filename, w, h] of SIZES) {
  const outPath = join(splashDir, filename)

  // Create background canvas
  const bg = sharp({
    create: { width: w, height: h, channels: 4, background: BG }
  }).png()

  // Resize icon
  const icon = await sharp(iconPath)
    .resize(ICON_SIZE, ICON_SIZE)
    .toBuffer()

  // Compose icon centered on background
  const left = Math.round((w - ICON_SIZE) / 2)
  const top  = Math.round((h - ICON_SIZE) / 2 - 40)

  await sharp({
    create: { width: w, height: h, channels: 4, background: BG }
  })
  .composite([{ input: icon, left, top }])
  .png()
  .toFile(outPath)

  console.log(`✓ ${filename} (${w}×${h})`)
}

console.log('\nAll splash screens generated in public/splash/')
