
export enum ToolType {
  DASHBOARD = 'dashboard',
  IMAGE = 'image',
  VIDEO = 'video',
  VECTOR = 'vector',
  PROMPT_GEN = 'prompt_gen',
  PROMPT_IMAGE = 'prompt_image',
  PROMPT_VIDEO = 'prompt_video',
  PROMPT_IMAGE_CHECK = 'prompt_image_check',
  PROMPT_VIDEO_CHECK = 'prompt_video_check',
  VECTOR_EPS = 'vector_eps',
  CALENDAR_GEN = 'calendar_gen',
  MUTE_VIDEO = 'mute_video',
  MOTION_GEN = 'motion_gen',
  REMOVAL_GEN = 'removal_gen'
}

export const toolToPath: Record<ToolType, string> = {
  [ToolType.DASHBOARD]: '/Dashboard',
  [ToolType.IMAGE]: '/GenMetadataGambar',
  [ToolType.VIDEO]: '/GenMetadataVideo',
  [ToolType.VECTOR]: '/GenMetadataVektor',
  [ToolType.PROMPT_GEN]: '/SeoTextPrompt',
  [ToolType.PROMPT_IMAGE]: '/ImageToPrompt',
  [ToolType.PROMPT_VIDEO]: '/VideoKeywordAnalyzer',
  [ToolType.PROMPT_IMAGE_CHECK]: '/AiQualityCheck',
  [ToolType.PROMPT_VIDEO_CHECK]: '/AiVideoQualityCheck',
  [ToolType.VECTOR_EPS]: '/EpsConverter',
  [ToolType.CALENDAR_GEN]: '/NicheCalendar',
  [ToolType.MUTE_VIDEO]: '/MuteVideoGen',
  [ToolType.MOTION_GEN]: '/MotionGen',
  [ToolType.REMOVAL_GEN]: '/RemovalGen'
};

export enum GenerationMode {
  STANDARD = 'standard',
  BATCH = 'batch'
}

export interface AdobeCategory {
  id: number;
  name: string;
}

export interface StockMetadata {
  title: string;
  description: string;
  keywords: string[];
  category_id: number;
  shutterstock_category_1: string;
  shutterstock_category_2: string;
  category_reason?: string;
}

export interface FileItem {
  id: string;
  file: File;
  customFileName?: string;
  thumbnail: string | null;
  analysisFrames: string[];
  title: string;
  description: string;
  keywords: string[];
  adobeCategoryId: number | '';
  shutterstockCategory1: string;
  shutterstockCategory2: string;
  categoryReason?: string;
  isGenerating: boolean;
  isExtracting?: boolean;
  error: string | null;
  exifMetadata?: any;
}

export interface ProgressInfo {
  current: number;
  total: number;
  duration: number;
}

export interface VideoAnalysisResult {
  keyword: string;
  demandPotential: 'Tinggi' | 'Menengah' | 'Rendah';
  demandType: 'Evergreen' | 'Seasonal' | 'Trend-fading';
  marketInsight: string;
  targetBuyer: string;
  useCase: string;
  recommendedFormat: string;
  formatReason: string;
  competitionLevel: 'Sangat Tinggi' | 'Tinggi' | 'Menengah' | 'Rendah';
  competitionNotes: string;
  cinematicPotential: 'YA' | 'TIDAK';
  cinematicReason: string;
  status: 'LAYAK PRODUKSI' | 'TIDAK LAYAK';
  conclusion: string;
  solution: string;
}

export interface VideoPrompt {
  id: string;
  subject: string;
  movement: string;
  environment: string;
  lighting: string;
  camera_angle: string;
  camera_movement: string;
  style: 'cinematic' | 'documentary';
}

export interface MarketTrend {
  keyword: string;
  searchVolumeLevel: 'Very High' | 'High' | 'Medium' | 'Low';
  searchVolumeScore: number;
  totalSupply: number;
  opportunityScore: number;
  statusBadge: 'Excellent' | 'High Potential' | 'Moderate' | 'Oversaturated';
}
