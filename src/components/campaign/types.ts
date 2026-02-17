export interface Account {
  id: string;
  name: string;
  customerId: string;
}

export type MatchType = "EXACT" | "PHRASE" | "BROAD";

export interface KeywordResult {
  keyword: string;
  monthlyVolume: number;
  competition: "Alta" | "Média" | "Baixa";
  estimatedCPC: number;
  intent: "Transacional" | "Comercial" | "Informacional";
  matchType: MatchType;
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

export interface WizardData {
  selectedAccount: Account | null;
  seedKeywords: string;
  keywordResults: KeywordResult[];
  structure: CampaignStructure | null;
  urls: Record<string, string>;
}

export const STEP_LABELS = [
  "Conta",
  "Palavras-chave",
  "Estrutura",
  "URLs",
  "Anúncios",
  "Revisão",
];
