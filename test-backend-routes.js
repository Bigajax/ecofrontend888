// test-backend-routes.js
// Script para testar se as rotas do backend estão implementadas

const BACKEND_URL = 'https://ecobackend888.onrender.com';

async function testRoutes() {
  console.log('🔍 TESTANDO ROTAS DO BACKEND\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  console.log('═══════════════════════════════════════════\n');

  const results = {
    health: false,
    status: false,
    createPreference: false,
    webhook: false,
  };

  // 1. Testar GET /health
  console.log('1️⃣ Testando GET /health');
  console.log('   (Verifica se servidor está no ar)\n');
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Resposta:`, JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log(`   ✅ FUNCIONANDO!\n`);
      results.health = true;
    } else {
      console.log(`   ⚠️ Resposta inesperada\n`);
    }
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message}\n`);
  }
  console.log('───────────────────────────────────────────\n');

  // 2. Testar GET /api/subscription/status
  console.log('2️⃣ Testando GET /api/subscription/status');
  console.log('   (Deve retornar 401 sem autenticação)\n');
  try {
    const response = await fetch(`${BACKEND_URL}/api/subscription/status`);
    console.log(`   Status: ${response.status}`);

    if (response.status === 401) {
      console.log(`   ✅ ROTA EXISTE! (401 = precisa auth)`);
      results.status = true;
    } else if (response.status === 404) {
      console.log(`   ❌ ROTA NÃO EXISTE! (404)`);
    } else {
      try {
        const data = await response.json();
        console.log(`   Resposta:`, JSON.stringify(data, null, 2));
        results.status = true;
      } catch {
        console.log(`   ⚠️ Resposta sem JSON`);
      }
    }
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message}`);
  }
  console.log('\n───────────────────────────────────────────\n');

  // 3. Testar POST /api/subscription/create-preference
  console.log('3️⃣ Testando POST /api/subscription/create-preference');
  console.log('   (Deve retornar 401 sem autenticação)\n');
  try {
    const response = await fetch(`${BACKEND_URL}/api/subscription/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'monthly' })
    });
    console.log(`   Status: ${response.status}`);

    if (response.status === 401) {
      console.log(`   ✅ ROTA EXISTE! (401 = precisa auth)`);
      results.createPreference = true;
    } else if (response.status === 404) {
      console.log(`   ❌ ROTA NÃO EXISTE! (404)`);
    } else {
      try {
        const data = await response.json();
        console.log(`   Resposta:`, JSON.stringify(data, null, 2));
        results.createPreference = true;
      } catch {
        console.log(`   ⚠️ Resposta sem JSON`);
      }
    }
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message}`);
  }
  console.log('\n───────────────────────────────────────────\n');

  // 4. Testar POST /api/webhooks/mercadopago
  console.log('4️⃣ Testando POST /api/webhooks/mercadopago');
  console.log('   (Deve aceitar POST, mesmo que rejeite payload)\n');
  try {
    const response = await fetch(`${BACKEND_URL}/api/webhooks/mercadopago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    console.log(`   Status: ${response.status}`);

    if (response.status === 404) {
      console.log(`   ❌ ROTA NÃO EXISTE! (404)`);
    } else {
      console.log(`   ✅ ROTA EXISTE!`);
      try {
        const data = await response.json();
        console.log(`   Resposta:`, JSON.stringify(data, null, 2));
      } catch {
        console.log(`   (Sem resposta JSON, mas rota existe)`);
      }
      results.webhook = true;
    }
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message}`);
  }
  console.log('\n═══════════════════════════════════════════\n');

  // Resumo
  console.log('📊 RESUMO DOS TESTES:\n');
  console.log(`   Servidor no ar (/health):           ${results.health ? '✅' : '❌'}`);
  console.log(`   Rota de status:                     ${results.status ? '✅' : '❌'}`);
  console.log(`   Rota de criar assinatura:           ${results.createPreference ? '✅' : '❌'}`);
  console.log(`   Webhook do Mercado Pago:            ${results.webhook ? '✅' : '❌'}`);
  console.log('');

  const allWorking = Object.values(results).every(r => r === true);

  if (allWorking) {
    console.log('🎉 TUDO FUNCIONANDO! Backend está pronto.\n');
  } else {
    console.log('⚠️  ALGUMAS ROTAS ESTÃO FALTANDO!\n');
    console.log('📝 O que fazer:');

    if (!results.health) {
      console.log('   - Verificar se backend está rodando');
      console.log('   - URL: https://ecobackend888.onrender.com');
    }

    if (!results.status || !results.createPreference || !results.webhook) {
      console.log('   - Implementar rotas faltantes no backend');
      console.log('   - Ver arquivo: BACKEND_SUBSCRIPTION_TODO.md');
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════\n');
}

// Executar testes
testRoutes().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
