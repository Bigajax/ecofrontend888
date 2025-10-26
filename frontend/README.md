📋 Visão Geral
Interface React do Eco App focada em chat terapêutico, integra streaming de mensagens, memórias e voz com monitoramento de saúde do backend.

🚀 Quick Start
npm install
npm run dev

📁 Estrutura
src/ — componentes de chat, páginas, layouts
├── components/, layouts/, pages/
├── hooks/, contexts/, providers/
├── api/, analytics/, lib/, config/
└── utils/, constants/, data/, prompt/, types/

🎨 Tech Stack (principais)
React 18 + React Router para navegação protegida.
TypeScript com Vite e Vitest.
Tailwind CSS/PostCSS e Framer Motion para UI.
Supabase SDK e Nivo/Recharts para dados e visualizações.

🔧 Variáveis de Ambiente
VITE_API_URL=Base HTTPS do backend
VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY=Credenciais Supabase
VITE_OPENROUTER_API_KEY · VITE_APP_URL · VITE_MIXPANEL_TOKEN · VITE_FB_PIXEL_ID
VITE_METABASE_URL · VITE_ENABLE_PASSIVE_SIGNALS · VITE_ENABLE_MODULE_USAGE · VITE_ENABLE_ADMIN_COMMANDS

📜 Scripts-chave
dev — servidor Vite
build — bundle produção
preview — preview pós-build · test — Vitest
lint — ESLint

🧩 Componentes Principais (2–3)
ChatMessage — renderiza mensagens do usuário/assistente com mídia.
MessageList — orquestra scroll e agrupamento do histórico.
VoiceRecorderPanel — controla captura e feedback visual da gravação.

🪝 Hooks Customizados (ex.: useEcoStream)
useEcoStream — gerencia streaming e envio de mensagens.
const { messages, send } = useEcoStream();
useQuickSuggestionsVisibility — expõe flags para chips contextuais.

🏗️ Arquitetura (fluxo de dados simples)
flowchart LR
  UI[Components] --> Hooks --> API --> Backend
  Hooks <-- state/context --> UI

❗Observações
Seção omitida se não detectado.
