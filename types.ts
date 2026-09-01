
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
  ANTI_SPAM = 'anti_spam',
  REVIEWS = 'reviews',
  FTP_UPLOADER = 'ftp_uploader'
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
  [ToolType.ANTI_SPAM]: '/SimilarContentChecker',
  [ToolType.REVIEWS]: '/CommunityReviews',
  [ToolType.FTP_UPLOADER]: '/FtpUploader'
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
  dreamstime_category: string;
  miricanvas_category: string;
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
  dreamstimeCategory: string;
  miriCanvasCategory: string;
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

export interface CommunityReview {
  id: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  isPro?: boolean;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  tags?: string[];
  photos?: string[];
  createdAt: string;
  helpfulCount?: number;
  verifiedBuyer?: boolean;
  appVersion?: string;
}

export type FtpProtocol = 'ftp' | 'ftps' | 'sftp';

export interface FtpAccountConfig {
  id: string;
  agencyKey: string;
  agencyName: string;
  host: string;
  port: number;
  protocol: FtpProtocol;
  username: string;
  password?: string;
  remoteDir?: string;
  enabled: boolean;
  lastTested?: string;
  lastStatus?: 'success' | 'failed';
  lastError?: string;
}

export interface FtpUploadJobItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  targetAgencyKeys: string[];
  results: Record<string, { status: 'success' | 'failed'; message?: string; timestamp: string }>;
  error?: string;
}

export interface ContentGapItem {
  angle: string;
  format: 'Photo' | 'Video' | '3D Render' | 'Vector' | 'Isolated PNG';
  whyItSells: string;
  competitionNotes: string;
}




