// src/components/assinar/goalsData.ts

export const OBJETIVOS = [
  { id: "sono",      label: "Durma bem" },
  { id: "ansiedade", label: "Gerenciar a ansiedade" },
  { id: "estresse",  label: "Reduzir o estresse" },
  { id: "presenca",  label: "Esteja presente e consciente" },
  { id: "calma",     label: "Sinta-se calmo e relaxado" },
  { id: "outro",     label: "Outra coisa" },
] as const;

export type GoalId = (typeof OBJETIVOS)[number]["id"];

export const VALIDATION_CARDS = [
  {
    id: "estresse",
    text: "Reduza o estresse com o apoio diário do ECO, seu companheiro de IA empático.",
    icon: "/images/onboarding/icon-estresse.webp",
  },
  {
    id: "ansiedade",
    text: "Controle a ansiedade com meditações guiadas e exercícios de respiração.",
    icon: "/images/onboarding/icon-ansiedade.webp",
  },
  {
    id: "sono",
    text: "Durma melhor com podcasts relaxantes e técnicas de relaxamento desenvolvidas com a Ecotopia.",
    icon: "/images/onboarding/icon-sono.webp",
  },
  {
    id: "presenca",
    text: "Esteja mais presente com pausas curtas para redefinir o foco ao longo do dia.",
    icon: "/images/onboarding/icon-presenca.webp",
  },
] as const;

// URLs reais virão de produto/legal. Manter "#" garante render sem 404.
export const LEGAL_LINKS = {
  termos: "#",
  cookies: "#",
  avisoCalifornia: "#",
  privacidade: "#",
  opcoesPrivacidade: "#",
  dadosSaude: "#",
};
