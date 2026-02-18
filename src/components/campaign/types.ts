export interface Account {
  id: string;
  name: string;
  customerId: string;
}

export type MatchType = "EXACT" | "PHRASE" | "BROAD";

export interface KeywordResult {
  keyword: string;
  monthlyVolume: number;
  competition: string;
  estimatedCPC: number;
  intent: "Transacional" | "Comercial" | "Informacional";
  matchType: MatchType;
  conversionPotential?: "high" | "medium" | "low";
  selected: boolean;
}

export interface KeywordCluster {
  clusterName: string;
  totalVolume: number;
  campaignSuggestion: string;
  keywords: KeywordResult[];
  selected: boolean;
}

export interface AdGroup {
  id: string;
  name: string;
  keywords: string[];
  url?: string;
  headlines?: string[];
  descriptions?: string[];
}

export interface CampaignStructure {
  campaignName: string;
  adGroups: AdGroup[];
}

export interface Briefing {
  diferenciais: string;
  oferta: string;
  tom: string;
  proibidas: string;
}

export interface WizardData {
  selectedAccount: Account | null;
  seedKeywords: string;
  keywordResults: KeywordResult[];
  clusters: KeywordCluster[];
  structure: CampaignStructure | null;
  urls: Record<string, string>;
  briefing: Briefing;
}

export const STEP_LABELS = [
  "Conta",
  "Palavras-chave",
  "Estrutura",
  "URLs",
  "Anúncios",
  "Revisão",
];
