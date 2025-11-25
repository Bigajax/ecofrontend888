const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Função para encontrar todos os arquivos PNG recursivamente
function findPngFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorar node_modules e outras pastas desnecessárias
      if (!filePath.includes('node_modules') && !filePath.includes('.git')) {
        findPngFiles(filePath, fileList);
      }
    } else if (file.toLowerCase().endsWith('.png')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Função para converter PNG para WebP
async function convertToWebP(pngPath) {
  const outputPath = pngPath.replace(/\.png$/i, '.webp');

  try {
    await sharp(pngPath)
      .webp({ quality: 90, effort: 6 }) // Quality 90%, effort 6 (0-6, maior = melhor compressão)
      .toFile(outputPath);

    const pngSize = fs.statSync(pngPath).size;
    const webpSize = fs.statSync(outputPath).size;
    const savings = ((1 - webpSize / pngSize) * 100).toFixed(1);

    console.log(`✅ Convertido: ${path.basename(pngPath)}`);
    console.log(`   PNG:  ${(pngSize / 1024).toFixed(1)} KB`);
    console.log(`   WebP: ${(webpSize / 1024).toFixed(1)} KB`);
    console.log(`   Economia: ${savings}%\n`);

    return { success: true, original: pngPath, converted: outputPath, savings };
  } catch (error) {
    console.error(`❌ Erro ao converter ${pngPath}:`, error.message);
    return { success: false, original: pngPath, error: error.message };
  }
}

// Executar conversão
async function main() {
  console.log('🔍 Procurando arquivos PNG em public/...\n');

  const pngFiles = findPngFiles('public');

  if (pngFiles.length === 0) {
    console.log('❌ Nenhum arquivo PNG encontrado em public/');
    return;
  }

  console.log(`📁 Encontrados ${pngFiles.length} arquivos PNG:\n`);
  pngFiles.forEach(file => console.log(`   - ${file}`));
  console.log('\n🔄 Iniciando conversão...\n');

  const results = [];

  for (const pngFile of pngFiles) {
    const result = await convertToWebP(pngFile);
    results.push(result);
  }

  // Resumo
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n📊 Resumo da conversão:');
  console.log(`   ✅ Sucesso: ${successful}`);
  console.log(`   ❌ Falhas: ${failed}`);

  if (successful > 0) {
    console.log('\n💡 Próximos passos:');
    console.log('   1. Atualizar referências no código de .png para .webp');
    console.log('   2. Testar se as imagens carregam corretamente');
    console.log('   3. (Opcional) Remover arquivos PNG antigos após confirmar que tudo funciona');
  }
}

main().catch(console.error);
