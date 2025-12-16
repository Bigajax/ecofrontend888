import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');

async function convertImage(inputPath, outputPath) {
  try {
    console.log(`🎨 Convertendo ${path.basename(inputPath)}...`);

    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);

    const webpStats = await fs.stat(outputPath);
    const webpSize = webpStats.size;

    const savedBytes = originalSize - webpSize;
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

    console.log(`✅ Convertido com sucesso!`);
    console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   WebP: ${(webpSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Economia: ${savedPercent}%`);

    // Remover PNG original
    await fs.unlink(inputPath);
    console.log(`   🗑️  PNG original removido\n`);

    return true;
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
    return false;
  }
}

const inputFile = path.join(ROOT_DIR, 'public/images/meditacao-sono-new.png');
const outputFile = path.join(ROOT_DIR, 'public/images/meditacao-sono-new.webp');

convertImage(inputFile, outputFile);
