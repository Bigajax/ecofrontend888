💻 Frontend — ECO Interface Reflexiva
📋 Visão Geral

Aplicação React (TypeScript + Vite) que provê:

chat terapêutico com streaming SSE;

modo voz (áudio ↔ texto ↔ voz);

registro automático de memórias emocionais;

relatórios gráficos de intensidade e perfil.

🚀 Quick Start
npm install
npm run dev

📁 Estrutura
src/
├── components/     # ChatMessage, AudioPlayerOverlay, EcoBubble...
├── pages/          # ChatPage, VoicePage, MemoryPage
├── hooks/          # useEcoStream, useQuickSuggestionsVisibility
├── contexts/       # AuthContext, ChatContext
├── api/            # ecoApi, memoriaApi, perfilApi
├── analytics/, lib/, config/
└── utils/, constants/, prompt/, types/

🎨 Tech Stack (chaves)
Área	Tecnologias
Framework	React 18 + TypeScript
Build	Vite + Vitest
Estilo	Tailwind + Framer Motion
Dados	Supabase SDK + REST API
Visualização	Nivo / Recharts
Analítica	Mixpanel (front)
Infra	Vercel (Prod), Render (Backend)
🔧 Variáveis de Ambiente
VITE_API_URL=https://ecobackend888.onrender.com
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MIXPANEL_TOKEN=
VITE_FB_PIXEL_ID=
VITE_ENABLE_PASSIVE_SIGNALS=true

📜 Scripts Principais
Script	Ação
dev	Vite dev server
build	Build produção
preview	Preview local
test	Vitest
lint	ESLint fix
🧩 Componentes Chave
Nome	Função
ChatMessage	Renderiza mensagens do usuário e da Eco com voz/imagem
MessageList	Controla scroll e histórico em tempo real
VoiceRecorderPanel	Grava voz e mostra onda visual (AssemblyAI)
AudioPlayerOverlay	Toca respostas TTS com controles mínimos
🪝 Hooks Customizados
const { messages, send } = useEcoStream(); // stream texto ↔ IA
const visible = useQuickSuggestionsVisibility(); // chips contextuais

🧭 Arquitetura UI ↔ Core
flowchart LR
UI[Components] --> Hooks --> API --> Backend
Hooks <-- Contexts --> UI
Analytics --> Mixpanel

📊 Relatórios e Memórias

Memórias ≥ 7 salvas automaticamente (Supabase)

Relatórios 2D/3D com intensidade e domínios da vida

Perfil emocional alimentado pelos blocos JSON da Eco

🧩 Design System

Estilo Apple-like minimalista (SF Pro, glassmorphism)

Cores principais: branco + azul #007AFF

Interações fluídas e calmas (sem sombra excessiva)

🔄 Integração Completa
Módulo	Comunicação
Frontend Chat	SSE / Fetch → /api/ask-eco
Voice Page	Web Audio → /api/voice/transcribe-and-respond
TTS	/api/voice/tts → ElevenLabs
Supabase	Memórias, perfil, analytics
Mixpanel	Eventos UI/UX + Eco Analytics (backend)
sequenceDiagram
User->>Frontend: envia mensagem/áudio
Frontend->>Backend: POST /api/ask-eco (SSE)
Backend->>OpenRouter: gera resposta IA
Backend->>ElevenLabs: sintetiza voz
Backend-->>Frontend: stream parcial + voz final
Frontend-->>User: exibe resposta + som

🧩 Resumo de Deploy & Infra
Camada	Hospedagem	Notas
Frontend	Vercel	Build Vite, SSR desativado
Backend	Render	Node 18 build, SSE aberto
Banco	Supabase	Tabelas memories, referencias_temporarias, analytics
LLM / TTS	OpenRouter + ElevenLabs	Chaves seguras em .env
💡 Notas Finais

Para modo dev, abra duas abas: npm run dev em backend e frontend.

O stream usa SSE nativo; não funciona em proxy sem X-Accel-Buffering: no.

O StrictMode pode reexecutar streams — use a v2 fix idempotente.

O sistema atual atua como MVP avaliado por telemetria Mixpanel + Supabase Analytics.