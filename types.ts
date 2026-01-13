export type ImportanceLevel = 'Critical' | 'High' | 'Medium';
export type MissingFrom = 'Client' | 'Competitor' | 'Both';

export interface CompetitorGap {
  topic: string;
  importance: ImportanceLevel;
  description: string;
  missingFrom: MissingFrom;
}

export interface LinkableAssetRecommendation {
  type: string;
  reason: string;
  exampleFromCompetitor: string;
  competitorUrl?: string;
}

export interface CompetitorComparison {
  url: string;
  title?: string;
  wordCount?: number;
  topKeywords?: string[];
}

export interface CompetitorAnalysisResult {
  strategicOverview: string;
  searchIntent: string;
  topRankingOpportunities: string[];
  contentGaps: CompetitorGap[];
  linkableAssets: {
    recommendations: LinkableAssetRecommendation[];
  };
  actionPlan: string[];
  competitorComparisons?: CompetitorComparison[];
  gscData?: GSCDataPoint[];
  notes?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface CompetitorInput {
  id: string;
  url: string;
  content: string;
}

export interface GSCDataPoint {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
