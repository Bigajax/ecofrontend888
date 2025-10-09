import { parseTextModule } from './frontMatter';
import type { PromptModule } from './types';

import BLOCO_TECNICO_MEMORIA_RAW from './modules/BLOCO_TECNICO_MEMORIA.txt?raw';
import DETECCAO_CRISE_RAW from './modules/DETECÇÃOCRISE.txt?raw';
import ECO_ESTRUTURA_RAW from './modules/ECO_ESTRUTURA_DE_RESPOSTA.txt?raw';
import ENCERRAMENTO_SENSIVEL_RAW from './modules/ENCERRAMENTO_SENSIVEL.txt?raw';
import ESCALA_ABERTURA_RAW from './modules/ESCALA_ABERTURA_1a3.txt?raw';
import ESCALA_INTENSIDADE_RAW from './modules/ESCALA_INTENSIDADE_0a10.txt?raw';
import IDENTIDADE_RAW from './modules/IDENTIDADE.txt?raw';
import LINGUAGEM_NATURAL_RAW from './modules/LINGUAGEM_NATURAL.txt?raw';
import METODO_VIVA_ENXUTO_RAW from './modules/METODO_VIVA_ENXUTO.txt?raw';
import MODULACAO_TOM_RAW from './modules/MODULACAO_TOM_REGISTRO.txt?raw';
import NV1_CORE_RAW from './modules/NV1_CORE.txt?raw';
import NV2_CORE_RAW from './modules/NV2_CORE.txt?raw';
import NV3_CORE_RAW from './modules/NV3_CORE.txt?raw';
import PRINCIPIOS_CHAVE_RAW from './modules/PRINCIPIOS_CHAVE.txt?raw';
import USO_MEMORIAS_RAW from './modules/USOMEMÓRIAS.txt?raw';

const modules: PromptModule[] = [
  IDENTIDADE_RAW,
  PRINCIPIOS_CHAVE_RAW,
  LINGUAGEM_NATURAL_RAW,
  ECO_ESTRUTURA_RAW,
  ESCALA_INTENSIDADE_RAW,
  ESCALA_ABERTURA_RAW,
  MODULACAO_TOM_RAW,
  METODO_VIVA_ENXUTO_RAW,
  USO_MEMORIAS_RAW,
  DETECCAO_CRISE_RAW,
  NV1_CORE_RAW,
  NV2_CORE_RAW,
  NV3_CORE_RAW,
  ENCERRAMENTO_SENSIVEL_RAW,
  BLOCO_TECNICO_MEMORIA_RAW,
].map(parseTextModule);

export default modules;
