/**
 * Diário Estoico - Get Today's Maxim Utility
 *
 * Extracts the logic from DiarioEstoicoPage to get the most recent available maxim.
 * Returns today's maxim card for display in meditation completion screens.
 */

export interface DailyMaxim {
  date: string;
  month: string;
  dayNumber: number;
  title: string;
  subtitle?: string;
  text: string;
  author: string;
  source?: string;
  comment?: string;
  background?: string;
}

// Imagens rotativas para as reflexões de dezembro
const DECEMBER_BACKGROUNDS = [
  'url("/images/meditacao-19-nov.webp")',
  'url("/images/meditacao-20-nov.webp")',
  'url("/images/meditacao-21-nov.webp")',
];

// Reflexões de janeiro (19 a 31)
const JANUARY_REFLECTIONS: DailyMaxim[] = [
  {
    date: '19 de janeiro',
    month: 'janeiro',
    dayNumber: 19,
    title: 'Aonde quer que vá, lá está sua escolha',
    text: 'Um pódio e uma prisão são ambos lugares, um elevado e o outro baixo, mas nos dois tua liberdade de escolha pode ser mantida se assim desejares.',
    author: 'Epicteto',
    source: 'Discursos, 2.6.25',
    comment: 'Todos os estoicos ocupavam posições muito diferentes na vida. Alguns eram ricos, já outros haviam nascido na base da rígida hierarquia romana. Para alguns as coisas eram fáceis, para outros, inconcebidamente difícil. Isso também é verdade a respeito de nós — todos chegamos à filosofia vindos de diferentes origens, e mesmo em nossa vida experimentamos períodos de boa e má sorte.\n\nMas em todas as situações, adversas ou vantajosas, devemos fazer apenas uma coisa: nos concentrarmos no que está sob nosso controle, em oposição ao que não está. Agora mesmo poderíamos estar abatidos com as lutas, ao passo que apenas alguns anos atrás talvez tivéssemos vivido no luxo, e dentro de apenas poucos dias poderíamos estar tão bem que o sucesso seria realmente um fardo. Uma coisa permanecerá constante: nossa liberdade de escolha — tanto no quadro geral quanto no restrito.\n\nNa verdade, isso é clareza. Não importa quem somos ou onde estamos, o que interessa são nossas escolhas. O que são elas? Como iremos avaliá-las? De que maneira faremos a maioria delas? Essas são as perguntas que a vida nos faz, seja lá qual for nossa posição. Como você responderá?',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '20 de janeiro',
    month: 'janeiro',
    dayNumber: 20,
    title: 'Reacenda seus pensamentos',
    text: 'Teus princípios não podem ser extintos a menos que apagues os pensamentos que os alimentam, pois está sempre em teu poder reacender novos. […] É possível começar a viver de novo! Vê as coisas de forma diferente como fazias outrora: é assim que se reinicia a vida!',
    author: 'Marco Aurélio',
    source: 'Meditações, 7.2',
    comment: 'Você teve semanas ruins? Afastou-se dos princípios e crenças que lhe são caros? Isso é completamente normal. Acontece com todos nós.\n\nProvavelmente aconteceu com Marco Aurélio — pode ter sido por isso que ele escreveu a nota acima para si mesmo. Talvez ele estivesse lidando com senadores difíceis ou tendo dificuldades com seu filho problemático. Talvez nessas situações ele tenha perdido as estribeiras, ficado deprimido ou deixado de entrar em contato consigo mesmo. Quem não faria isso?\n\nMas o que devemos lembrar aqui é que, não importa o que aconteça, não importa como nossa atitude foi decepcionante no passado, os próprios princípios permanecem inalterados. Podemos retornar e abraçá-los a qualquer momento. O que aconteceu ontem — o que aconteceu cinco minutos atrás — é o passado. Podemos reacender nossos pensamentos e recomeçar sempre que quisermos.\n\nPor que não fazer isso agora mesmo?',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '21 de janeiro',
    month: 'janeiro',
    dayNumber: 21,
    title: 'Um ritual matinal',
    text: 'Pergunta a ti mesmo o seguinte, antes de mais nada, todas as manhãs:\n• O que me falta para estar livre da paixão?\n• E quanto à tranquilidade?\n• O que sou? Um mero corpo, um proprietário, ou uma reputação? Nenhuma dessas coisas.\n• O quê, então? Um ser racional.\n• O que é exigido de mim? Que medites sobre tuas ações.\n• Como me desviei da serenidade?\n• O que fiz de hostil, antissocial ou desatencioso?\n• O que deixei de fazer em todos esses casos?',
    author: 'Epicteto',
    source: 'Discursos, 4.6.34–35',
    comment: 'Muitas pessoas bem-sucedidas têm seu ritual matinal. Para algumas, é meditar. Para outras, é se exercitar. Para muitas, é escrever num diário: apenas algumas páginas em que elas registram seus pensamentos, medos, esperanças. Nesses casos, o que interessa não é tanto a atividade em si, mas o ritual da reflexão. A ideia é dedicar um tempo para olhar dentro de si mesmo e examinar-se.\n\nTirar esse tempo é o que os estoicos defendiam mais do que qualquer outra coisa. Não sabemos se Marco Aurélio escrevia suas Meditações de manhã ou à noite, mas sabemos que ele arranjava seus momentos de tranquilidade solitária — e que ele escrevia para si mesmo, não para alguém. Se você está procurando um lugar para começar o próprio ritual, não pode fazer melhor que o exemplo de Marco Aurélio e a lista de perguntas de Epicteto.\n\nTodos os dias, a partir de hoje, faça essas perguntas difíceis a si mesmo. Deixe a filosofia e o trabalho árduo guiarem-no para respostas melhores, uma manhã de cada vez, ao longo de uma vida.',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '22 de janeiro',
    month: 'janeiro',
    dayNumber: 22,
    title: 'A revisão do dia',
    text: 'Manterei constante vigilância sobre mim mesmo e — muito proveitosamente — submeterei cada dia a uma revisão. Porque é isso que nos torna maus — que nenhum de nós rememora a própria vida. Refletimos apenas sobre o que estamos prestes a fazer. Entretanto, nossos planos para o futuro provêm do passado.',
    author: 'Sêneca',
    source: 'Cartas Morais, 83.2',
    comment: 'Numa carta a seu irmão mais velho, Novato, Sêneca descreve um exercício bom que pegou emprestado de outro proeminente filósofo. No fim de cada dia ele fazia a si mesmo variações das seguintes questões: Que mau hábito reprimi hoje? Como estou melhor? Minhas ações foram justas? Como posso melhorar?\n\nNo início ou no fim de cada dia, o estoico se senta com seu diário e revisa o que fez, o que pensou, o que poderia ser melhorado. É por essa razão que as Meditações de Marco Aurélio é um livro um tanto impenetrável — era para sua própria clareza, não para benefício público. Tomar nota de exercícios estoicos era, e ainda é, uma forma de os praticar, tal como poderia ser repetir uma prece ou um hino.\n\nMantenha um diário, seja ele um arquivo no computador, seja um pequeno caderno. Dedique tempo para recordar conscientemente os acontecimentos do dia anterior. Seja resoluto em suas avaliações. Observe o que contribuiu para sua felicidade e o que a depreciou. Escreva sobre o que você gostaria de aprimorar ou anote citações que aprecia. Fazendo o esforço de registrar tais pensamentos, você fica menos propenso a esquecê-los. Mais um benefício: você acumulará uma boa quantidade de registros para acompanhar seu progresso também.',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '23 de janeiro',
    month: 'janeiro',
    dayNumber: 23,
    title: 'A verdade sobre o dinheiro',
    text: 'Passemos aos realmente ricos — quantas vezes eles se parecem muito com os pobres? Quando viajam ao exterior, precisam restringir sua bagagem, e quando estão com pressa, dispensam comitiva. E aqueles que estão no exército, quão poucos de seus bens conseguem conservar…',
    author: 'Sêneca',
    source: 'Consolação à Minha Mãe Hélvia, 12.1.B–2',
    comment: 'O autor F. Scott Fitzgerald, que muitas vezes glamorizou os estilos de vida dos ricos e famosos em livros como O grande Gatsby, abre um de seus contos com as frases agora clássicas: "Deixe-me falar-lhe sobre os muito ricos. Eles são diferentes de você e de mim." Alguns anos depois que esse conto foi publicado, seu amigo Ernest Hemingway caçoou de Fitzgerald ao escrever: "Sim, eles têm mais dinheiro."\n\nÉ disso que Sêneca está nos lembrando. Um dos homens mais ricos de Roma, ele sabia em primeira mão que o dinheiro só muda a vida em parte. O dinheiro não resolve os problemas que as pessoas pobres pensam que ele resolverá. Na verdade, nenhuma posse material o fará. Coisas externas não podem resolver questões internas.\n\nSempre nos esquecemos disso — o que causa muita confusão e dor. Como Hemingway escreveria mais tarde sobre Fitzgerald: "Ele pensou [que os ricos] eram uma raça glamorosa especial, e quando descobriu que não eram, isso o destruiu tanto quanto qualquer outra coisa que o tenha destruído." Se não mudarmos, isso também será verdade em relação a nós.',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '24 de janeiro',
    month: 'janeiro',
    dayNumber: 24,
    title: 'Buscar uma compreensão profunda',
    text: 'Com Rústico […] aprendi a ler atentamente e a não me satisfazer com uma compreensão aproximada do todo, e a não concordar depressa demais com aqueles que têm muito a dizer sobre alguma coisa.',
    author: 'Marco Aurélio',
    source: 'Meditações, 1.7.3',
    comment: 'O primeiro livro das Meditações de Marco Aurélio começa com uma lista de agradecimentos. Ele agradece, uma por uma, às principais influências em sua vida. Uma dessas pessoas é Quinto Júnio Rústico, um professor que desenvolveu em seu aluno um amor pela clareza e pela compreensão profundas — um desejo de não parar na superfície quando se trata de aprendizado.\n\nFoi também por meio de Rústico que Marco Aurélio foi apresentado a Epicteto. Na verdade, Rústico emprestou ao aluno seu exemplar das palestras de Epicteto. Marco Aurélio claramente não ficou satisfeito em apenas entender a ideia básica dessas palestras, nem as aceitou simplesmente por recomendação de seu professor. Paul Johnson gracejou uma vez que Edmund Wilson lia livros "como se a vida do autor estivesse em julgamento". Foi assim que Marco Aurélio leu Epicteto — e quando as lições se mostraram satisfatórias, ele as absorveu. Elas se tornaram parte de seu DNA. Ele as citou extensivamente ao longo da vida, encontrando clareza e força reais em suas palavras, mesmo em meio ao luxo e ao poder imensos que viria a possuir.\n\nEsse é o tipo de leitura e estudo profundos que precisamos cultivar, razão por que estamos lendo apenas uma página por dia em vez de um capítulo de cada vez. Para que possamos ter tempo de ler com atenção e profundidade.',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '25 de janeiro',
    month: 'janeiro',
    dayNumber: 25,
    title: 'O único prêmio',
    text: 'O que resta para ser apreciado? Isto, eu penso — limitar nossa ação ou inação apenas ao que está de acordo com as necessidades de nossa preparação […] é nisso que consistem os esforços da educação e do ensino — aqui está a coisa a ser apreciada! Se conseguires isso, vais parar de tentar conquistar todas as outras coisas. […] Se não o fizeres, não serás livre, autossuficiente ou liberto da paixão, mas necessariamente cheio de inveja, ciúme e desconfiança por quem quer que tenha o poder de tomá-las, e vais conspirar contra aqueles que têm o que aprecia. […] No entanto, respeitando e apreciando tua própria mente, agradarás a ti mesmo e estarás em mais harmonia com teus semelhantes e mais sintonizado com os deuses — louvando tudo que eles puseram em ordem e atribuíram a ti.',
    author: 'Marco Aurélio',
    source: 'Meditações, 6.16.2B–4A',
    comment: 'Warren Buffett, cuja fortuna líquida é de aproximadamente 65 bilhões de dólares, vive na mesma casa que comprou, em 1958, por 31.500 dólares. John Urschel, um atacante do time de futebol americano Baltimore Ravens, recebe milhões, mas vive com 25 mil dólares por ano. A estrela do time de basquete San Antonio Spurs, Kawhi Leonard, circula por aí no mesmo Chevy Tahoe de 1997 desde a adolescência, mesmo tendo um contrato de cerca de 94 milhões de dólares. Por quê? Não porque sejam avarentos. É porque as coisas que importam para eles são baratas.\n\nBuffett, Urschel e Leonard não acabaram desse jeito por acidente. O estilo de vida deles é resultado de priorização. Eles cultivam interesses que estão sem dúvida abaixo de seus recursos financeiros e, em consequência, qualquer renda lhes proporcionaria liberdade para buscar as coisas que mais lhes interessam.\n\nAcontece simplesmente que eles enriqueceram acima de qualquer expectativa. Esse tipo de clareza — sobre aquilo que eles mais amam no mundo — significa que eles podem aproveitar a vida. Significa que ainda seriam felizes mesmo se houvesse uma reviravolta nos negócios ou se suas carreiras fossem interrompidas por uma lesão.\n\nQuanto mais coisas desejamos e mais temos de fazer para ganhar ou alcançá-las, menos aproveitamos verdadeiramente a vida — e menos livres somos.',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '26 de janeiro',
    month: 'janeiro',
    dayNumber: 26,
    title: 'O poder de um mantra',
    text: 'Apaga as falsas impressões de tua mente repetindo para ti mesmo: tenho em minha alma o poder de me manter afastado de qualquer mal, desejo ou perturbação — em vez disso, vendo a verdadeira natureza das coisas, eu lhes darei somente o que lhes é devido. Sempre te lembra desse poder que a natureza te deu.',
    author: 'Marco Aurélio',
    source: 'Meditações, 8.29',
    comment: 'Qualquer pessoa que tenha feito uma aula de ioga ou sido apresentada ao pensamento hindu ou budista provavelmente ouviu falar do conceito de mantra. Em sânscrito, a palavra significa "fala sagrada" — basicamente, uma palavra, uma frase, um pensamento, até um som — destinada a fornecer clareza ou orientação espiritual. Um mantra pode ser especialmente útil durante a meditação porque nos permite bloquear todas as distrações e nos concentrarmos.\n\nEra apropriado, portanto, que Marco Aurélio sugerisse esse mantra estoico — um lembrete ou frase de alerta para usar quando somos acometidos por falsas impressões, distrações ou sentimos a pressão da vida cotidiana sobre nós. Ele diz, essencialmente: "Tenho dentro de mim o poder de manter isso afastado. Posso ver a verdade."\n\nMude o fraseado como quiser. Essa parte depende de você. Mas tenha um mantra e use-o para encontrar a clareza pela qual anseia.',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '27 de janeiro',
    month: 'janeiro',
    dayNumber: 27,
    title: 'As três áreas de treinamento',
    text: 'Há três áreas em que a pessoa sensata e boa deve ser treinada. A primeira tem a ver com desejos e aversões: que ela nunca erre o alvo em seus desejos nem caia naquilo que a repele. A segunda se refere aos impulsos de agir e não agir — e mais amplamente, ao dever: que ela possa agir deliberadamente, motivada por boas razões, e não sem pensar. A terceira diz respeito a livrar-se do engano, autocontrole e toda a área do julgamento, o consentimento que nossa mente dá às suas percepções. Dessas três áreas, a principal e a mais urgente é a primeira, referente às paixões, pois fortes emoções só surgem quando fracassamos em nossos desejos e aversões.',
    author: 'Epicteto',
    source: 'Discursos, 3.2.1–3A',
    comment: 'Hoje, vamos nos concentrar nas três áreas de treinamento que Epicteto nos mostrou.\n\nPrimeiro, precisamos considerar o que devemos desejar e o que devemos rejeitar. Por quê? Para desejarmos o que é bom e evitarmos o que é mau. Não basta apenas ouvir seu corpo — porque nossas atrações muitas vezes nos desencaminham.\n\nEm seguida, devemos examinar o que nos impulsiona a agir — isto é, nossas motivações. Estamos agindo pelas razões corretas? Ou porque não paramos para pensar? Ou acreditamos que temos de fazer algo?\n\nFinalmente, há nosso julgamento. Nossa capacidade de ver as coisas claramente e de forma apropriada chega quando usamos nossa grande dádiva da natureza: a razão.\n\nEssas são as três áreas distintas de treinamento, mas, na prática, elas estão inextricavelmente entrelaçadas. Nosso julgamento afeta o que desejamos, nossos desejos afetam nossas ações e nosso julgamento as determina. Mas não podemos apenas esperar que isso aconteça. Em todas as áreas da vida, devemos refletir e empregar nossa energia com empenho. Se o fizermos, encontraremos clareza e seremos bem-sucedidos.',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '28 de janeiro',
    month: 'janeiro',
    dayNumber: 28,
    title: 'Observando os sábios',
    text: 'Observa com bastante atenção o princípio orientador das pessoas, especialmente dos sábios, tanto do que eles fogem quanto o que eles buscam.',
    author: 'Marco Aurélio',
    source: 'Meditações, 4.38',
    comment: 'Sêneca disse: "Sem uma régua com a qual fazê-lo, não podemos endireitar o que está torto." Esse é o papel das pessoas sábias em nossa vida: servir de modelo e de inspiração. Fazer nossas ideias reverberarem e pôr nossas presunções à prova.\n\nQuem essa pessoa será depende de você. Talvez seja seu pai ou sua mãe. Pode ser que um filósofo, um escritor ou um pensador cumpra esse papel. Talvez perguntar "o que Jesus faria?" seja o modelo certo para você.\n\nMas escolha alguém, observe o que essa pessoa faz (e o que ela não faz) e esforce-se ao máximo para fazer o mesmo.',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '29 de janeiro',
    month: 'janeiro',
    dayNumber: 29,
    title: 'Mantenha a simplicidade',
    text: 'Em todos os momentos, mantém a mente firme na tarefa a realizar, como romano e como ser humano, fazendo-a com estrita e simples dignidade, afeição, liberdade e justiça — dando a ti mesmo uma trégua com relação a todas as outras considerações. Podes fazer isso se abordares cada tarefa como se ela fosse a última, abandonando toda distração, subversão passional da razão e todo drama, vaidade e queixa com relação à parte que coube a ti. Tu podes ver que basta dominar alguns princípios para se viver uma vida abundante e devota — pois, se mantiveres a vigilância sobre essas coisas, os deuses não pedirão mais.',
    author: 'Marco Aurélio',
    source: 'Meditações, 2.5',
    comment: 'Cada dia nos apresenta a possibilidade de pensarmos além do necessário sobre tudo. O que eu deveria vestir? Será que eles gostam de mim? Estou comendo bem? O que acontecerá na minha vida? Será que meu chefe está satisfeito com o meu trabalho?\n\nHoje, vamos nos concentrar no que está diante de nós. Seguiremos a máxima que o técnico Bill Belichick, do time de futebol americano New England Patriots, diz aos seus jogadores: "Faça seu trabalho." Como um romano, como um bom soldado, como um mestre de nosso ofício. Não precisamos nos perder em mil outras distrações ou nos assuntos alheios.\n\nMarco Aurélio diz que devemos encarar cada tarefa como se fosse a última, porque ela de fato poderia ser. E mesmo que não seja, fazer de qualquer jeito o que você tem em mãos não ajuda em nada. Encontre clareza na simplicidade de fazer seu trabalho hoje.',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '30 de janeiro',
    month: 'janeiro',
    dayNumber: 30,
    title: 'Você não tem de estar no comando de tudo',
    text: 'Se desejas melhorar, contenta-te em parecer desinformado ou estúpido em assuntos que desconheces; não desejes parecer informado. E se alguns te consideram alguém importante, desconfia de ti mesmo.',
    author: 'Epicteto',
    source: 'Encheirídion, 13A',
    comment: 'Uma das coisas mais extraordinárias que você pode fazer como ser humano em nosso mundo midiático hiperconectado 24 horas por dia, sete dias por semana, é dizer "não sei". Ou, de maneira mais provocativa, "não me importo".\n\nA maior parte da sociedade parece ter adotado como mandamento que devemos saber de tudo o que está acontecendo, assistir a todos os episódios de todas as séries de televisão aclamadas pela crítica, acompanhar os noticiários religiosamente e nos apresentarmos para os outros como indivíduos informados e conhecedores do mundo.\n\nMas onde estão as provas de que isso é mesmo necessário? Essa obrigação é imposta por lei? Ou será que você simplesmente tem medo de parecer meio bobinho num jantar? Sim, você tem para com seu país e sua família o dever de saber daquilo que pode afetá-los diretamente, mas é só isso.\n\nQuanto tempo, energia e capacidade mental você teria a mais se cortasse drasticamente seu consumo de mídia? O quanto se sentiria mais descansado e presente se parasse de se abalar e se indignar diante de cada escândalo, furo de reportagem e possível crise (muitas das quais nunca chegam a ocorrer, no fim das contas)?',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '31 de janeiro',
    month: 'janeiro',
    dayNumber: 31,
    title: 'Filosofia como um remédio para a alma',
    text: 'Não retornes à filosofia como um capataz, mas como os pacientes que buscam alívio num tratamento para olhos inflamados, ou em um curativo para uma queimadura, ou em um unguento. Encarando-a dessa maneira, obedecerás à razão sem a exibir e repousarás tranquilo aos cuidados dela.',
    author: 'Marco Aurélio',
    source: 'Meditações, 5.9',
    comment: 'Quanto mais ocupados ficamos, quanto mais trabalhamos, e aprendemos, e lemos, maior a chance de ficarmos à deriva. Entramos num ritmo. Estamos ganhando dinheiro, sendo criativos, nos sentindo estimulados e atarefados. Parece que tudo vai bem, contudo nos afastamos cada vez mais da filosofia.\n\nEssa negligência acabará acarretando um problema — o estresse se acumula, nossa mente fica confusa, esquecemos o que é importante, e isso nos causa um mal. Quando algo desse tipo acontece, é importante pisarmos no freio, pormos de lado todo o ímpeto e o momento. Retornemos ao modus operandi e às práticas que sabemos estarem enraizados na clareza, no bom julgamento, nos bons princípios e na boa saúde.\n\nO estoicismo foi concebido para ser um remédio para a alma. Ele nos livra das vulnerabilidades da vida moderna. Ele nos restaura com o vigor de que precisamos para prosperar na vida. Entre em contato com essa filosofia hoje, e deixe-a curá-lo.',
    background: DECEMBER_BACKGROUNDS[0],
  },
];

// Reflexões de fevereiro (1 a 28)
const FEBRUARY_REFLECTIONS: DailyMaxim[] = [
  {
    date: '2 de fevereiro',
    month: 'fevereiro',
    dayNumber: 2,
    title: 'Um bom estado de espírito',
    text: 'Formula teus pensamentos assim: és uma pessoa idosa, não te deixarás mais ser escravizado por isso, não mais manipulado como um fantoche por todos os impulsos, e vais parar de te queixar de tua sorte atual ou de temer o futuro.',
    author: 'Marco Aurélio',
    source: 'Meditações, 2.2',
    comment: 'Ficamos com raiva da pessoa que vem e tenta nos dar ordens.\nNão me diga como devo me vestir, como devo pensar, como devo fazer meu trabalho, como devo viver. Isso ocorre porque somos pessoas independentes, autossuficientes.\nOu, pelo menos, é o que dizemos a nós mesmos.\n\nContudo se alguém diz algo de que discordamos, alguma coisa dentro de nós nos indica que temos de discutir com ele. Se há um prato de biscoitos diante de nós, temos de comê-los. Se alguém faz alguma coisa de que não gostamos, temos de ficar furiosos. Quando surge um contratempo, temos de ficar tristes, deprimidos ou preocupados. Mas se alguma coisa boa acontece alguns minutos depois, de repente ficamos felizes, empolgados e queremos mais.\n\nNão deveríamos nunca deixar outra pessoa nos sacudir para cá e para lá da maneira como fazem nossos impulsos. É hora de começarmos a perceber isso desta forma: que não somos fantoches que podem ser levados a dançar desse ou daquele jeito só porque nos apetece. Deveríamos ser aqueles que estão no controle — e não nossas emoções — porque somos pessoas independentes, autossuficientes.',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '3 de fevereiro',
    month: 'fevereiro',
    dayNumber: 3,
    title: 'A FONTE DA SUA ANSIEDADE',
    text: 'Quando vejo uma pessoa ansiosa, pergunto a mim mesmo: o que ela quer? Pois se a pessoa não estivesse querendo algo que está fora de seu controle, por que sentiria ansiedade?',
    author: 'Epicteto',
    source: 'Discursos, 2.13.1',
    comment: 'O pai ansioso, preocupado com o filho. O que ele quer? Um mundo que seja sempre seguro. Uma viajante inquieta. O que ela quer? Que o tempo continue firme e o trânsito esteja livre para que ela possa embarcar em seu voo. E um investidor nervoso? Quer que o mercado mude de rumo e um investimento valha a pena.\n\nTodas essas situações têm uma coisa em comum. Como diz Epicteto, é querer algo que está fora de nosso controle. Ficar tenso, afobado, andar de um lado para outro nervosamente — esses momentos intensos, dolorosos e ansiosos nos revelam nosso lado mais fútil e servil. Olhar fixamente para o relógio, para o registrador de cotações na bolsa, para a próxima fila do caixa terminada, para o céu: é como se nós todos pertencêssemos a um culto religioso que acredita que os deuses da sorte só nos darão o que queremos se sacrificarmos nossa paz de espírito.\n\nHoje, quando perceber que está ansioso, pergunte a você mesmo: Por que estou com o estômago embrulhado? Sou eu que estou no controle aqui ou é a minha ansiedade? E mais importante: Minha ansiedade está me fazendo algum bem?',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '4 de fevereiro',
    month: 'fevereiro',
    dayNumber: 4,
    title: 'SOBRE SER INVENCÍVEL',
    text: 'Então quem é o invencível? É aquele que não pode ser perturbado por nada que esteja fora de sua escolha racional.',
    author: 'Epicteto',
    source: 'Discursos, 1.18.21',
    comment: 'Você já observou um profissional experiente lidando com a imprensa? Nenhuma pergunta é difícil demais, nenhum tom é mordaz ou ofensivo demais. Eles se desviam de cada golpe com humor, equilíbrio e paciência. Mesmo quando ofendidos ou provocados, escolhem não se esquivar ou reagir. São capazes de fazer isso não só graças a um treinamento e a sua experiência, mas porque compreendem que reagir emocionalmente só tornará a situação pior. Os jornalistas esperam que os entrevistados tropecem ou fiquem desconcertados; assim, para se saírem bem em coletivas de imprensa, bons entrevistados internalizaram a importância de se manterem calmos e sob controle.\n\nÉ pouco provável que você vá enfrentar, hoje, uma multidão de repórteres inquisitivos bombardeando-o com perguntas insensíveis. Poderia ser útil, porém, ter em mente essa imagem e usá-la como modelo para lidar com qualquer sobrecarga, motivo de estresse ou frustração que lhe sobrevenham. Nossa escolha racional — nossa prohairesis, como os estoicos a chamavam — é uma espécie de invencibilidade que pode ser cultivada.\n\nÉ possível ignorar os ataques hostis e lidar tranquilamente com a pressão ou os problemas. E, como em nosso modelo, quando terminamos, podemos apontar de volta para a multidão e dizer: "Próximo!"',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '5 de fevereiro',
    month: 'fevereiro',
    dayNumber: 5,
    title: 'EQUILIBRE SEUS IMPULSOS',
    text: 'Não sejas impelido de um lado para outro, mas submete todos os impulsos às exigências da justiça e protege tua clara convicção em todos os aspectos.',
    author: 'Marco Aurélio',
    source: 'Meditações, 4.22',
    comment: 'Pense nas pessoas maníacas em sua vida. Não as que sofrem de um lamentável transtorno, mas aquelas cuja vida e escolhas estão em desordem. Elas transitam o tempo todo entre altos eufóricos ou baixos massacrantes; o dia é maravilhoso ou horrível. Essas pessoas não são exaustivas? Você não gostaria que elas tivessem simplesmente um filtro, através do qual pudessem experimentar os impulsos bons em vez dos maus?\n\nEsse filtro existe. Justiça. Razão. Filosofia. Se há uma mensagem principal no pensamento estoico, é esta: impulsos de todos os tipos chegarão, e seu trabalho é controlá-los, como se adestrasse um cão. Ou simplesmente: pense antes de agir. Pergunte: Quem está no controle aqui? Quais princípios estão me guiando?',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '6 de fevereiro',
    month: 'fevereiro',
    dayNumber: 6,
    title: 'NÃO PROCURE LUTA',
    text: 'Não concordo com aqueles que mergulham de cabeça no meio da inundação e que, aceitando uma vida turbulenta, enfrentam diariamente com grande disposição de espírito circunstâncias difíceis. A pessoa sensata suportará isso, mas não por decisão própria — ela escolherá estar em paz, não em guerra.',
    author: 'Sêneca',
    source: 'Cartas Morais, 28.7',
    comment: 'Tornou-se um clichê citar o discurso de Theodore Roosevelt, "O homem na arena", que idolatra "aquele cujo rosto está sujo de poeira, suor e sangue; que luta com valentia...", comparado com o crítico que fica sentado no canto. Roosevelt fez esse discurso pouco depois de deixar o cargo, no auge de sua popularidade. Em poucos anos, ele iria se opor a um antigo protegido seu numa tentativa de recuperar a Casa Branca, sofrendo uma derrota fragorosa e quase sendo assassinado. Ele também quase morreria durante uma exploração de um rio na Amazônia; mataria milhares de animais em safáris africanos e tempos depois suplicaria a Woodrow Wilson que permitisse que se alistasse na Primeira Guerra Mundial, apesar de ter 59 anos. Ele iria fazer muitas coisas que, agora, parecem um tanto desconcertantes.\n\nTheodore Roosevelt era de fato um grande homem. Mas era também movido por uma compulsão, um vício em trabalho e em manter-se ativo que parecia sem fim. Muitos de nós compartilhamos dessa aflição, ser movidos por algo que não podemos controlar. Temos medo de ficar parados, por isso procuramos luta e ação como uma distração. Escolhemos estar em guerra — em alguns casos, literalmente — quando a paz é, na verdade, a mais honrosa e adequada escolha. Sim, o homem na arena é admirável. Assim como o soldado, o político, a mulher de negócios e todas as outras ocupações. Mas, e este é um grande mas, somente se estivermos na arena pelas razões corretas.',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '7 de fevereiro',
    month: 'fevereiro',
    dayNumber: 7,
    title: 'O MEDO É UMA PROFECIA QUE SE AUTORREALIZA',
    text: '"Muitos são prejudicados pelo próprio medo, e muitos podem ter chegado a seu destino enquanto o temiam."',
    author: 'Sêneca',
    source: 'Édipo, 992',
    comment: '"Só o paranoide sobrevive", foi uma frase famosa de Andy Grove, ex-CEO da Intel. Talvez ela seja verdadeira. Mas também sabemos que o paranoide destrói a si mesmo mais depressa e mais espetacularmente que a qualquer inimigo. Sêneca, tendo acesso à elite mais poderosa de Roma e a conhecendo muito bem, teria visto essa dinâmica se desenrolar vividamente. Nero, o discípulo cujos excessos Sêneca tentou refrear, matou não apenas a própria mãe e a esposa, mas, por fim, voltou-se também contra Sêneca, seu mentor.\n\nA combinação de poder, medo e mania pode ser mortal. O líder, certo de que pode ser traído, decide trair os outros primeiro. Temendo não ser apreciado, ele se empenha tanto para conseguir que as pessoas gostem dele que acaba provocando o efeito contrário. Convencido de que a administração vai mal, ele gerencia cada pormenor, controlando os funcionários, e se torna a fonte da má administração. E assim por diante — acabamos por infligir cegamente a nós mesmos coisas que tememos ou que nos apavoram.\n\nA próxima vez que estiver com medo de algum resultado supostamente desastroso, lembre-se de que se não controlar seus impulsos, se perder o autocontrole, você pode ser a própria fonte do desastre que teme. Isso aconteceu com pessoas mais inteligentes, mais poderosas e mais bem-sucedidas. Pode acontecer conosco também.',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '8 de fevereiro',
    month: 'fevereiro',
    dayNumber: 8,
    title: 'ISSO O FEZ SENTIR-SE MELHOR?',
    text: '"Tu choras — estou sofrendo forte dor! Mas essa dor é de algum modo aliviada, se a suportas de uma maneira pouco viril?"',
    author: 'Sêneca',
    source: 'Cartas Morais, 78.17',
    comment: 'Da próxima vez que alguém ficar transtornado perto de você — chorando, gritando, quebrando alguma coisa, sendo mordaz ou cruel —, observe como esta declaração os fará parar imediatamente: "Espero que isso esteja fazendo com que se sinta melhor." Porque, é claro, não está. Somente no calor da extrema emoção podemos justificar um comportamento desse tipo — e quando precisamos explicá-lo, geralmente nos sentimos envergonhados.\n\nVale a pena aplicar esse padrão a você mesmo. Na próxima vez que se encontrar em meio a uma crise de nervos, ou resmungando e reclamando porque suspeita estar pegando um resfriado, ou chorando lágrimas de arrependimento, apenas pergunte: Isto realmente está fazendo com que eu me sinta melhor? Está aliviando algum dos sintomas que eu desejaria que desaparecessem?',
    background: DECEMBER_BACKGROUNDS[0],
  },
];

// Reflexões de dezembro (8 a 27)
const DECEMBER_REFLECTIONS: DailyMaxim[] = [
  {
    date: '8 de dezembro',
    month: 'dezembro',
    dayNumber: 8,
    title: 'Não se esconda dos seus sentimentos',
    text: 'É melhor dominar a dor que enganá-la.',
    author: 'Sêneca, Consolação a Minha Mãe Hélvia, 17.1B',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '9 de dezembro',
    month: 'dezembro',
    dayNumber: 9,
    title: 'Perdulários do tempo',
    text: 'Caso todos os gênios da história se concentrassem neste único assunto, nunca poderiam expressar plenamente sua perplexidade diante da obscuridade da mente humana. Nenhuma pessoa abandonaria sequer uma polegada de sua propriedade, e a menor das brigas com um vizinho pode significar o inferno para pagar; no entanto, deixamos facilmente outros invadirem nossa vida — pior, muitas vezes abrimos caminho para aqueles que vão controlá-la. Ninguém distribui seu dinheiro aos transeuntes, mas a quantos cada um de nós distribuímos nossa vida? Somos sovinas com propriedade e dinheiro, no entanto damos pouquíssima importância à perda de tempo, a coisa em relação à qual deveríamos ser os mais duros avarentos.',
    author: 'Sêneca, Sobre a Brevidade da Vida, 3.1–2',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '10 de dezembro',
    month: 'dezembro',
    dayNumber: 10,
    title: 'Não se venda por um preço muito baixo',
    text: 'Eu digo: que ninguém me roube um único dia sem que vá fazer uma devolução completa da perda.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 1.11B',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '11 de dezembro',
    month: 'dezembro',
    dayNumber: 11,
    title: 'Dignidade e coragem',
    text: 'Como diz Cícero, detestamos gladiadores se eles se apressam a salvar a própria vida a todo custo; nós os preferimos se mostram desprezo pela vida.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 11.4B',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '12 de dezembro',
    month: 'dezembro',
    dayNumber: 12,
    title: 'A batida continua',
    text: 'Percorre a longa galeria do passado, de impérios e reinos sucedendo-se uns aos outros incontáveis vezes. E podes também ver o futuro, pois certamente ele será igual, sem tirar nem pôr, incapaz de se desviar do ritmo atual. É tudo uma só coisa, quer tenhas experimentado quarenta anos, quer tenha sido uma era. O que mais há para ver?',
    author: 'Marco Aurélio, Meditações, 7.49',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '13 de dezembro',
    month: 'dezembro',
    dayNumber: 13,
    title: 'É só um número',
    text: 'Não estás aborrecido porque tens um certo peso e não o dobro. Então por que ficar nervoso porque te foi dado um certo tempo de vida e não mais? Assim como estás satisfeito com teu peso, assim também deverias estar com o tempo que te foi dado.',
    author: 'Marco Aurélio, Meditações, 6.49',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '14 de dezembro',
    month: 'dezembro',
    dayNumber: 14,
    title: 'O que deveríamos saber no fim',
    text: 'Logo vais morrer, e ainda assim não és sincero, sereno ou livre da desconfiança de que coisas externas podem prejudicá-lo; tampouco és indulgente com todos, ciente de que sabedoria e agir com justiça são uma só e mesma coisa.',
    author: 'Marco Aurélio, Meditações, 4.37',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '15 de dezembro',
    month: 'dezembro',
    dayNumber: 15,
    title: 'Uma maneira simples de medir nossos dias',
    text: 'Esta é a marca da perfeição de caráter: passar cada dia como se fosse o último, sem exaltação, preguiça ou fingimento.',
    author: 'Marco Aurélio, Meditações, 7.69',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '16 de dezembro',
    month: 'dezembro',
    dayNumber: 16,
    title: 'Boa saúde perpétua',
    text: 'Eu te digo, tens somente de aprender a viver como a pessoa saudável o faz […] vivendo com completa confiança. Que confiança? A única que vale a pena ter, no que é confiável, desempenhado e não pode ser levado embora — tua escolha racional.',
    author: 'Epicteto, Discursos, 3.26.28B–24',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '17 de dezembro',
    month: 'dezembro',
    dayNumber: 17,
    title: 'Conhece a ti mesmo — antes que seja tarde demais',
    text: 'A morte pesa sobre uma pessoa que, extremamente bem conhecida por todos, morre desconhecida para si mesma.',
    author: 'Sêneca, Tieste, 400',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '18 de dezembro',
    month: 'dezembro',
    dayNumber: 18,
    title: 'O que chega para todos nós',
    text: 'Tanto Alexandre, o Grande, quanto seu condutor de mulas foram levados para o mesmo lugar pela morte — foram ou recebidos na razão generativa de todas as coisas, ou dispersados entre os átomos.',
    author: 'Marco Aurélio, Meditações, 6.24',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '19 de dezembro',
    month: 'dezembro',
    dayNumber: 19,
    title: 'Escala humana',
    text: 'Pensa em todo o universo de matéria e em quão pequena é tua parte. Pensa sobre a extensão do tempo e em quão breve — quase momentânea — é a parte destinada a ti. Pensa nos funcionamentos da sorte e em quão infinitesimal é teu papel.',
    author: 'Marco Aurélio, Meditações, 5.24',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '20 de dezembro',
    month: 'dezembro',
    dayNumber: 20,
    title: 'Tema: o medo da morte',
    text: 'Ponderas então como o supremo dos males humanos, a marca mais segura dos vis e covardes, não é a morte, mas o medo da morte? Exorto-te a te disciplinares contra tal medo, a dirigires todo o teu pensamento, exercícios e leitura nesse sentido — e conhecerás o único caminho para a liberdade humana.',
    author: 'Epicteto, Discursos, 3.26.38–39',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '21 de dezembro',
    month: 'dezembro',
    dayNumber: 21,
    title: 'O que todos os seus anos de vida têm para mostrar?',
    text: 'Muitas vezes um velho não tem outra evidência além de sua idade para provar que viveu longo tempo.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 3.8B',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '22 de dezembro',
    month: 'dezembro',
    dayNumber: 22,
    title: 'Faça sua própria afirmação',
    text: 'Pois é vergonhoso para uma pessoa idosa, ou que se aproxima da velhice, ter apenas o conhecimento carregado em seus cadernos. Zenão disse isso… O que tu dizes? Cleanthes disse isso… O que tu dizes? Por quanto tempo serás compelido pelas afirmações de outrem? Assume o controle e le faz tua própria afirmação — algo que a posteridade vá carregar em seu caderno.',
    author: 'Sêneca, Cartas Morais, 33.7',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '23 de dezembro',
    month: 'dezembro',
    dayNumber: 23,
    title: 'O que você tem tanto medo de perder?',
    text: 'Tens medo de morrer. Mas, vamos lá, em que essa tua vida é algo diferente da morte?',
    author: 'Sêneca, Cartas Morais, 77.18',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '24 de dezembro',
    month: 'dezembro',
    dayNumber: 24,
    title: 'Sem sentido… como um bom vinho',
    text: 'Sabes que sabor têm vinho e licor. Não faz diferença se cem ou mil garrafas passam pela tua bexiga — tu não és mais que um filtro.',
    author: 'Sêneca, Cartas Morais, 77.16',
    background: DECEMBER_BACKGROUNDS[1],
  },
  {
    date: '25 de dezembro',
    month: 'dezembro',
    dayNumber: 25,
    title: 'Não queime a vela pelas duas pontas',
    text: 'A mente deve poder descansar — ela se levantará melhor e mais aguçada após uma boa pausa. Assim como campos ricos não devem ser forçados — pois rapidamente perderão sua fertilidade se nunca lhes for dada uma pausa —, assim também o trabalho constante na bigorna fraturará a força da mente. Mas ela recupera seus poderes se for deixada livre e descansada por algum tempo. Trabalho constante dá origem a um certo tipo de entorpecimento e debilidade da alma racional.',
    author: 'Sêneca, Sobre a Tranquilidade da Alma, 17.5',
    background: DECEMBER_BACKGROUNDS[2],
  },
  {
    date: '26 de dezembro',
    month: 'dezembro',
    dayNumber: 26,
    title: 'A vida é longa — se você souber usá-la',
    text: 'Não se trata nem um pouco de termos um tempo de vida curto demais, mas de desperdiçarmos uma grande parte dele. A vida é bastante longa, e é dada em medida suficiente para fazermos grandes coisas se a aproveitarmos bem. Mas quando ela é escoada pelo ralo do luxo e da negligência, quando não é empregada para nenhuma boa finalidade, somos compelidos a perceber que ela passou antes mesmo que reconhecêssemos que estava passando. E assim é — nós é que recebemos uma vida curta, nós a tornamos curta.',
    author: 'Sêneca, Sobre a Brevidade da Vida, 1.3–4A',
    background: DECEMBER_BACKGROUNDS[0],
  },
  {
    date: '27 de dezembro',
    month: 'dezembro',
    dayNumber: 27,
    title: 'Não deixe sua alma ir antes',
    text: 'É uma desgraça nesta vida quando a alma se rende primeiro, enquanto o corpo se recusa a fazê-lo.',
    author: 'Marco Aurélio, Meditações, 6.29',
    background: DECEMBER_BACKGROUNDS[1],
  },
];

const ALL_DAILY_MAXIMS: DailyMaxim[] = [
  ...JANUARY_REFLECTIONS,
  ...FEBRUARY_REFLECTIONS,
  ...DECEMBER_REFLECTIONS,
];

/**
 * Gets today's daily maxim (most recent available)
 * Returns the last available maxim from the 3-day sliding window
 *
 * @returns DailyMaxim | null - Today's maxim or null if outside period
 */
export function getTodayMaxim(): DailyMaxim | null {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dez
  const currentDay = now.getDate();

  let monthName = '';
  let startDay = 1;
  let endDay = 31;

  // Define month parameters
  if (currentMonth === 0) { // Janeiro
    monthName = 'janeiro';
    startDay = 19;
    endDay = 31;
  } else if (currentMonth === 1) { // Fevereiro
    monthName = 'fevereiro';
    startDay = 1;
    endDay = 28;
  } else if (currentMonth === 11) { // Dezembro
    monthName = 'dezembro';
    startDay = 8;
    endDay = 27;
  } else {
    // Outside active months: return null
    return null;
  }

  const threeDaysAgo = currentDay - 2;

  const validReflections = ALL_DAILY_MAXIMS.filter(
    (maxim) =>
      maxim.month === monthName &&
      maxim.dayNumber >= threeDaysAgo &&
      maxim.dayNumber <= currentDay &&
      maxim.dayNumber >= startDay &&
      maxim.dayNumber <= endDay
  );

  // Sort and return last item (today's maxim)
  const sorted = validReflections.sort((a, b) => a.dayNumber - b.dayNumber);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}
