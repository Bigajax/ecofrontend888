import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup-original-audio');

// Configurações de bitrate por tipo de áudio
const BITRATE_CONFIG = {
  // Meditações guiadas (voz)
  meditation: '96k',
  // Sons ambiente (natureza, frequências)
  ambient: '128k',
  // Música/mantras
  music: '160k'
};

// Classificação de arquivos por tipo
const AUDIO_TYPES = {
  meditation: [
    'intro-primeiros-passos',
    'observando-respiracao',
    'sentindo',
    'energy-blessings-meditation',
    'sintonizar-novos-potenciais',
    'recondicionar-corpo-nova-mente',
    'meditacao-caminhando',
    'meditacao-espaco-tempo'
  ],
  ambient: [
    'chuva-suave',
    'tempestade-leve',
    'cachoeira',
    '432hz-frequency',
    'tibetan-bowl'
  ],
  music: [
    'aum_02_528hz',
    'flute-recorder',
    'mantras'
  ]
};

const stats = {
  optimized: 0,
  failed: 0,
  totalOriginalSize: 0,
  totalOptimizedSize: 0,
  files: []
};

// Verificar se ffmpeg está instalado
async function checkFFmpeg() {
  try {
    await execPromise('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

// Determinar tipo de áudio
function getAudioType(filename) {
  const name = filename.toLowerCase().replace(/\.(mp3|wav|m4a)$/i, '');

  for (const [type, patterns] of Object.entries(AUDIO_TYPES)) {
    if (patterns.some(pattern => name.includes(pattern.toLowerCase()))) {
      return type;
    }
  }

  // Padrão: meditação
  return 'meditation';
}

// Encontrar todos os arquivos de áudio
async function findAudioFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await findAudioFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && /\.(mp3|wav|m4a)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// Criar backup
async function createBackup(filePath) {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  const backupDir = path.dirname(backupPath);

  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(filePath, backupPath);

  return backupPath;
}

// Otimizar áudio com ffmpeg
async function optimizeAudio(audioPath) {
  try {
    const filename = path.basename(audioPath);
    const audioType = getAudioType(filename);
    const bitrate = BITRATE_CONFIG[audioType];
    const tempPath = audioPath.replace(/\.(mp3|wav|m4a)$/i, '.optimized.mp3');

    // Obter tamanho original
    const originalStats = await fs.stat(audioPath);
    const originalSize = originalStats.size;

    console.log(`🎵 Processando: ${filename}`);
    console.log(`   Tipo: ${audioType} | Bitrate: ${bitrate}`);

    // Criar backup
    const backupPath = await createBackup(audioPath);
    console.log(`   ✅ Backup criado`);

    // Otimizar com ffmpeg
    // -i: input file
    // -b:a: audio bitrate
    // -ar 44100: sample rate 44.1kHz (CD quality)
    // -ac 2: stereo (ou 1 para mono se preferir)
    // -y: overwrite output file
    const ffmpegCommand = `ffmpeg -i "${audioPath}" -b:a ${bitrate} -ar 44100 -ac 2 -y "${tempPath}"`;

    await execPromise(ffmpegCommand, { maxBuffer: 50 * 1024 * 1024 });

    // Verificar se o arquivo otimizado foi criado
    const optimizedStats = await fs.stat(tempPath);
    const optimizedSize = optimizedStats.size;

    // Calcular economia
    const savedBytes = originalSize - optimizedSize;
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

    // Se o arquivo otimizado for maior, manter o original
    if (optimizedSize >= originalSize) {
      console.log(`   ⚠️  Otimização não reduziu o tamanho - mantendo original`);
      await fs.unlink(tempPath);
      await fs.unlink(backupPath);
      return false;
    }

    // Substituir original pelo otimizado
    await fs.unlink(audioPath);
    await fs.rename(tempPath, audioPath);

    // Atualizar estatísticas
    stats.optimized++;
    stats.totalOriginalSize += originalSize;
    stats.totalOptimizedSize += optimizedSize;
    stats.files.push({
      file: filename,
      type: audioType,
      bitrate,
      originalSize: (originalSize / 1024 / 1024).toFixed(2) + ' MB',
      optimizedSize: (optimizedSize / 1024 / 1024).toFixed(2) + ' MB',
      saved: savedPercent + '%'
    });

    console.log(`   ✅ Otimizado: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(optimizedSize / 1024 / 1024).toFixed(2)} MB (${savedPercent}% menor)`);
    console.log(`   🗑️  Original substituído (backup salvo)\n`);

    return true;
  } catch (error) {
    console.error(`   ❌ Erro ao otimizar:`, error.message);
    stats.failed++;
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando otimização de áudio\n');

  // Verificar ffmpeg
  console.log('🔍 Verificando ffmpeg...');
  const hasFFmpeg = await checkFFmpeg();

  if (!hasFFmpeg) {
    console.log('\n❌ ERRO: ffmpeg não está instalado!\n');
    console.log('Para instalar o ffmpeg no Windows:');
    console.log('1. Baixe em: https://www.gyan.dev/ffmpeg/builds/');
    console.log('2. Extraia o arquivo');
    console.log('3. Adicione a pasta bin ao PATH do sistema');
    console.log('4. Reinicie o terminal\n');
    console.log('Ou instale via Chocolatey: choco install ffmpeg\n');
    process.exit(1);
  }

  console.log('✅ ffmpeg encontrado!\n');

  console.log(`📁 Diretório: ${PUBLIC_DIR}`);
  console.log(`💾 Backup: ${BACKUP_DIR}\n`);

  try {
    // Criar diretório de backup
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Encontrar todos os áudios
    console.log('🔍 Procurando arquivos de áudio...\n');
    const audioFiles = await findAudioFiles(PUBLIC_DIR);

    if (audioFiles.length === 0) {
      console.log('ℹ️  Nenhum arquivo de áudio encontrado em public/');
      return;
    }

    console.log(`📊 Encontrados ${audioFiles.length} arquivos de áudio\n`);
    console.log('-------------------------------------------\n');

    // Otimizar cada arquivo
    for (const audioFile of audioFiles) {
      await optimizeAudio(audioFile);
    }

    // Exibir resumo
    console.log('============================================');
    console.log('📊 RESUMO DA OTIMIZAÇÃO\n');
    console.log(`✅ Otimizados com sucesso: ${stats.optimized}`);
    console.log(`❌ Falhas: ${stats.failed}`);
    console.log(`\n📦 Tamanho original total: ${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 Tamanho otimizado total: ${(stats.totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);

    const totalSaved = stats.totalOriginalSize - stats.totalOptimizedSize;
    const totalSavedPercent = ((totalSaved / stats.totalOriginalSize) * 100).toFixed(1);

    console.log(`\n💾 Economia total: ${(totalSaved / 1024 / 1024).toFixed(2)} MB (${totalSavedPercent}%)`);
    console.log('\n============================================\n');

    // Salvar relatório
    const reportPath = path.join(ROOT_DIR, 'audio-optimization-report.json');
    await fs.writeFile(reportPath, JSON.stringify(stats, null, 2));
    console.log(`📄 Relatório salvo em: ${path.basename(reportPath)}\n`);

    console.log('✨ Otimização concluída!\n');
    console.log('⚠️  PRÓXIMOS PASSOS:');
    console.log('   1. Teste os áudios na aplicação');
    console.log('   2. Verifique a qualidade do som');
    console.log('   3. Se tudo estiver OK, pode deletar a pasta backup-original-audio\n');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();
