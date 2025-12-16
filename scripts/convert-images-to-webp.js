import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup-original-images');

// Configurações
const WEBP_QUALITY = 85;
const EXCLUDE_PATTERNS = ['node_modules', 'dist', '.git', 'backup-'];

// Estatísticas
const stats = {
  converted: 0,
  failed: 0,
  totalOriginalSize: 0,
  totalWebpSize: 0,
  files: []
};

// Função para verificar se o caminho deve ser excluído
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

// Função para encontrar todos os arquivos PNG recursivamente
async function findPngFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldExclude(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await findPngFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Função para criar backup
async function createBackup(filePath) {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  const backupDir = path.dirname(backupPath);

  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(filePath, backupPath);

  return backupPath;
}

// Função para converter PNG para WebP
async function convertToWebp(pngPath) {
  try {
    const webpPath = pngPath.replace(/\.png$/i, '.webp');

    // Obter tamanho original
    const originalStats = await fs.stat(pngPath);
    const originalSize = originalStats.size;

    // Criar backup
    const backupPath = await createBackup(pngPath);
    console.log(`✅ Backup criado: ${path.basename(backupPath)}`);

    // Converter para WebP
    await sharp(pngPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);

    // Obter tamanho do WebP
    const webpStats = await fs.stat(webpPath);
    const webpSize = webpStats.size;

    // Calcular economia
    const savedBytes = originalSize - webpSize;
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

    // Atualizar estatísticas
    stats.converted++;
    stats.totalOriginalSize += originalSize;
    stats.totalWebpSize += webpSize;
    stats.files.push({
      original: path.basename(pngPath),
      originalSize: (originalSize / 1024 / 1024).toFixed(2) + ' MB',
      webpSize: (webpSize / 1024 / 1024).toFixed(2) + ' MB',
      saved: savedPercent + '%'
    });

    console.log(`✅ Convertido: ${path.basename(pngPath)} → ${path.basename(webpPath)}`);
    console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB → WebP: ${(webpSize / 1024 / 1024).toFixed(2)} MB (${savedPercent}% menor)`);

    // Remover PNG original (já temos backup)
    await fs.unlink(pngPath);
    console.log(`   🗑️  PNG original removido (backup salvo)\n`);

    return true;
  } catch (error) {
    console.error(`❌ Erro ao converter ${path.basename(pngPath)}:`, error.message);
    stats.failed++;
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando conversão PNG → WebP\n');
  console.log(`📁 Diretório: ${PUBLIC_DIR}`);
  console.log(`💾 Backup: ${BACKUP_DIR}`);
  console.log(`🎨 Qualidade WebP: ${WEBP_QUALITY}%\n`);

  try {
    // Criar diretório de backup
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Encontrar todos os PNGs
    console.log('🔍 Procurando arquivos PNG...\n');
    const pngFiles = await findPngFiles(PUBLIC_DIR);

    if (pngFiles.length === 0) {
      console.log('ℹ️  Nenhum arquivo PNG encontrado em public/');
      return;
    }

    console.log(`📊 Encontrados ${pngFiles.length} arquivos PNG\n`);
    console.log('-------------------------------------------\n');

    // Converter cada arquivo
    for (const pngFile of pngFiles) {
      await convertToWebp(pngFile);
    }

    // Exibir resumo
    console.log('============================================');
    console.log('📊 RESUMO DA CONVERSÃO\n');
    console.log(`✅ Convertidos com sucesso: ${stats.converted}`);
    console.log(`❌ Falhas: ${stats.failed}`);
    console.log(`\n📦 Tamanho original total: ${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 Tamanho WebP total: ${(stats.totalWebpSize / 1024 / 1024).toFixed(2)} MB`);

    const totalSaved = stats.totalOriginalSize - stats.totalWebpSize;
    const totalSavedPercent = ((totalSaved / stats.totalOriginalSize) * 100).toFixed(1);

    console.log(`\n💾 Economia total: ${(totalSaved / 1024 / 1024).toFixed(2)} MB (${totalSavedPercent}%)`);
    console.log('\n============================================\n');

    // Salvar relatório
    const reportPath = path.join(ROOT_DIR, 'image-conversion-report.json');
    await fs.writeFile(reportPath, JSON.stringify(stats, null, 2));
    console.log(`📄 Relatório salvo em: ${path.basename(reportPath)}\n`);

    console.log('✨ Conversão concluída!\n');
    console.log('⚠️  PRÓXIMOS PASSOS:');
    console.log('   1. Atualize as referências .png → .webp no código');
    console.log('   2. Teste a aplicação');
    console.log('   3. Se tudo estiver OK, pode deletar a pasta backup-original-images');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();
