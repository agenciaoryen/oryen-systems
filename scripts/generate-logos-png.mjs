/**
 * Gera versões PNG dos logos SVG em múltiplas resoluções.
 * Uso: node scripts/generate-logos-png.mjs
 */

import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, basename } from 'path'

const OUTPUT_DIR = resolve('outputs/logos-png')
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

const LOGOS = [
  { file: 'public/logo.svg', name: 'oryen-logo-dark', sizes: [256, 512, 1024, 2048] },
  { file: 'public/logo-light.svg', name: 'oryen-logo-light', sizes: [256, 512, 1024, 2048] },
  { file: 'public/logo-icon.svg', name: 'oryen-icon', sizes: [16, 32, 64, 128, 256, 512, 1024] },
  { file: 'public/logo-icon-gradient.svg', name: 'oryen-icon-gradient', sizes: [128, 256, 512, 1024] },
  { file: 'outputs/logo-v2-mono.svg', name: 'oryen-logo-mono', sizes: [256, 512, 1024] },
]

async function generate() {
  console.log('Gerando PNGs...\n')

  for (const logo of LOGOS) {
    const svgBuffer = readFileSync(resolve(logo.file))

    for (const size of logo.sizes) {
      const outputName = `${logo.name}-${size}px.png`
      const outputPath = resolve(OUTPUT_DIR, outputName)

      // For horizontal logos, size = height, width auto
      // For square icons, size = both
      const isIcon = logo.name.includes('icon')

      try {
        if (isIcon) {
          await sharp(svgBuffer, { density: 300 })
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(outputPath)
        } else {
          await sharp(svgBuffer, { density: 300 })
            .resize({ height: size, withoutEnlargement: false })
            .png()
            .toFile(outputPath)
        }
        console.log(`  ✓ ${outputName}`)
      } catch (err) {
        console.log(`  ✗ ${outputName} — ${err.message}`)
      }
    }
    console.log('')
  }

  console.log(`Pronto! Arquivos salvos em: ${OUTPUT_DIR}`)
}

generate()
