// Script para converter imagens PNG para WebP
// Uso: node convert-images.js

const fs = require('fs');
const path = require('path');

const imagesToConvert = [
  'public/images/introducao-meditacao-hero.png',
  'public/images/meditacao-ansiedade-sono.png',
  'public/images/meditacoes-sono-hero.png',
];

async function convertWithSharp() {
  try {
    const sharp = require('sharp');

    for (const imagePath of imagesToConvert) {
      if (!fs.existsSync(imagePath)) {
        console.log(`⚠️  Arquivo não encontrado: ${imagePath}`);
        continue;
      }

      const outputPath = imagePath.replace('.png', '.webp');

      console.log(`🔄 Convertendo ${path.basename(imagePath)}...`);

      await sharp(imagePath)
        .webp({ quality: 85, effort: 6 })
        .toFile(outputPath);

      const originalSize = fs.statSync(imagePath).size;
      const newSize = fs.statSync(outputPath).size;
      const savings = ((1 - newSize / originalSize) * 100).toFixed(1);

      console.log(`✅ ${path.basename(outputPath)} criado`);
      console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   WebP: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Economia: ${savings}%\n`);
    }

    console.log('🎉 Conversão concluída!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ Sharp não está instalado.');
      console.log('\n📦 Instalando sharp...\n');

      const { execSync } = require('child_process');
      try {
        execSync('npm install --save-dev sharp', { stdio: 'inherit' });
        console.log('\n✅ Sharp instalado! Execute o script novamente.\n');
      } catch (installError) {
        console.log('\n❌ Erro ao instalar sharp.');
        printAlternatives();
      }
    } else {
      console.error('Erro:', error);
      printAlternatives();
    }
  }
}

function printAlternatives() {
  console.log('\n📌 Alternativas para converter as imagens:\n');
  console.log('1. Online (recomendado):');
  console.log('   - https://squoosh.app (Google)');
  console.log('   - https://cloudconvert.com/png-to-webp\n');
  console.log('2. Instalar sharp manualmente:');
  console.log('   npm install --save-dev sharp');
  console.log('   node convert-images.js\n');
  console.log('3. Usar cwebp (linha de comando):');
  console.log('   cwebp -q 85 input.png -o output.webp\n');
  console.log('Imagens para converter:');
  imagesToConvert.forEach(img => console.log(`   - ${img}`));
}

convertWithSharp();
