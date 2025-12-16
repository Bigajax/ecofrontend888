import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Lista de arquivos para atualizar (baseado no grep)
const FILES_TO_UPDATE = [
  'src/pages/IntroducaoMeditacaoPage.tsx',
  'src/pages/HomePage.tsx',
  'src/data/sounds.ts',
  'src/components/home/DrJoeMeditationCard.tsx',
  'src/pages/CreateProfilePage.tsx',
  'src/pages/LoginPage.tsx',
  'src/components/home/HeroCarousel.tsx',
  'src/pages/DrJoeDispenzaPage.tsx',
  'src/pages/ProgramasPage.tsx',
  'src/pages/CaleidoscopioMindMovieProgramPage.tsx'
];

// Padrões a serem substituídos
const PNG_PATTERNS = [
  { regex: /\.png(['"])/g, replacement: '.webp$1' },
  { regex: /\.png(\))/g, replacement: '.webp$1' }
];

const stats = {
  filesUpdated: 0,
  totalReplacements: 0,
  files: []
};

async function updateFile(filePath) {
  try {
    const fullPath = path.join(ROOT_DIR, filePath);
    let content = await fs.readFile(fullPath, 'utf-8');
    const originalContent = content;
    let replacements = 0;

    // Aplicar todos os padrões
    PNG_PATTERNS.forEach(({ regex, replacement }) => {
      const matches = content.match(regex);
      if (matches) {
        replacements += matches.length;
        content = content.replace(regex, replacement);
      }
    });

    if (replacements > 0) {
      await fs.writeFile(fullPath, content, 'utf-8');
      stats.filesUpdated++;
      stats.totalReplacements += replacements;
      stats.files.push({
        file: filePath,
        replacements
      });

      console.log(`✅ ${filePath}`);
      console.log(`   ${replacements} referência(s) atualizada(s)\n`);
    } else {
      console.log(`⏭️  ${filePath} - Nenhuma alteração necessária\n`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Atualizando referências PNG → WebP no código\n');
  console.log('-------------------------------------------\n');

  for (const file of FILES_TO_UPDATE) {
    await updateFile(file);
  }

  console.log('============================================');
  console.log('📊 RESUMO\n');
  console.log(`✅ Arquivos atualizados: ${stats.filesUpdated}`);
  console.log(`🔄 Total de substituições: ${stats.totalReplacements}`);
  console.log('============================================\n');

  if (stats.totalReplacements > 0) {
    console.log('✨ Atualização concluída!\n');
    console.log('⚠️  PRÓXIMOS PASSOS:');
    console.log('   1. Teste a aplicação para garantir que as imagens carregam corretamente');
    console.log('   2. Verifique o console do navegador para erros');
    console.log('   3. Se tudo estiver OK, pode deletar a pasta backup-original-images\n');
  } else {
    console.log('ℹ️  Nenhuma atualização necessária\n');
  }

  // Salvar relatório
  const reportPath = path.join(ROOT_DIR, 'png-references-update-report.json');
  await fs.writeFile(reportPath, JSON.stringify(stats, null, 2));
  console.log(`📄 Relatório salvo em: ${path.basename(reportPath)}\n`);
}

main();
