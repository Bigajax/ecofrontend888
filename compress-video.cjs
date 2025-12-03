const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

// Configurar caminho do FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

const inputPath = path.join(__dirname, 'public', 'videos', 'caleidoscopio-dinheiro.mp4');
const outputPath = path.join(__dirname, 'public', 'videos', 'caleidoscopio-dinheiro-compressed.mp4');

console.log('🎬 Iniciando compressão do vídeo...');
console.log('📁 Input:', inputPath);
console.log('📁 Output:', outputPath);

ffmpeg(inputPath)
  .outputOptions([
    '-c:v libx264',      // Codec de vídeo H.264
    '-crf 23',           // Qualidade (18-28, menor = melhor)
    '-preset medium',    // Velocidade de encoding
    '-c:a aac',          // Codec de áudio
    '-b:a 128k'          // Bitrate do áudio
  ])
  .on('start', (commandLine) => {
    console.log('🚀 Comando FFmpeg:', commandLine);
  })
  .on('progress', (progress) => {
    if (progress.percent) {
      console.log(`⏳ Progresso: ${Math.round(progress.percent)}%`);
    }
  })
  .on('end', () => {
    console.log('✅ Compressão concluída com sucesso!');
    console.log('📦 Arquivo salvo em:', outputPath);

    const fs = require('fs');
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`\n📊 Estatísticas:`);
    console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Comprimido: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Redução: ${reduction}%`);
  })
  .on('error', (err) => {
    console.error('❌ Erro durante a compressão:', err.message);
  })
  .save(outputPath);
