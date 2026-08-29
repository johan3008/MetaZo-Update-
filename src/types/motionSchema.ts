export type BackgroundType = 'gradient' | 'mesh' | 'solid' | 'radial' | 'particles' | 'grid';

export type TransitionType = 'fade' | 'slide-up' | 'slide-down' | 'zoom' | 'wipe' | 'none';

export type ElementType = 
  | 'heading' 
  | 'subtitle' 
  | 'text' 
  | 'badge' 
  | 'card' 
  | 'icon' 
  | 'shape' 
  | 'counter' 
  | 'progress' 
  | 'button' 
  | 'avatar';

export type IconType = 
  | 'sparkles' 
  | 'zap' 
  | 'flame' 
  | 'star' 
  | 'check' 
  | 'shield' 
  | 'award' 
  | 'trending-up' 
  | 'play' 
  | 'heart' 
  | 'gift' 
  | 'dollar' 
  | 'shopping-cart' 
  | 'cpu' 
  | 'video' 
  | 'lock';

export type AnimationType = 
  | 'spring-in' 
  | 'bounce-in' 
  | 'slide-up' 
  | 'slide-down' 
  | 'slide-left' 
  | 'slide-right' 
  | 'zoom-in' 
  | 'pulse' 
  | 'float' 
  | 'glow-pulse' 
  | 'typewriter' 
  | 'rotate-continuous' 
  | 'none';

export interface BackgroundConfig {
  type: BackgroundType;
  colors?: string[]; // e.g. ['#0f172a', '#1e1b4b', '#312e81']
  angle?: number; // gradient angle in degrees
  animated?: boolean;
  blur?: number;
  particlesCount?: number;
}

export interface ElementLayout {
  x?: number | string; // e.g. 'center', '50%', or pixel offset
  y?: number | string;
  align?: 'center' | 'left' | 'right';
  width?: number | string;
  maxWidth?: number | string;
  zIndex?: number;
}

export interface ElementStyle {
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  gradient?: string[]; // Linear text/background gradient [startColor, endColor, ...]
  gradientAngle?: number;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: string | number;
  border?: string;
  boxShadow?: string;
  backdropBlur?: number;
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'none' | 'capitalize';
  opacity?: number;
  textAlign?: 'center' | 'left' | 'right';
}

export interface ElementAnimation {
  type: AnimationType;
  delay?: number; // frame delay relative to scene start
  duration?: number; // in frames
  damping?: number; // spring physics damping (default: 12)
  mass?: number; // spring physics mass (default: 0.5)
  stiffness?: number; // spring physics stiffness (default: 100)
  loop?: boolean;
}

export interface ElementExitAnimation {
  type: 'fade-out' | 'slide-down' | 'zoom-out' | 'slide-up';
  duration?: number; // frames before scene end
}

export interface MotionElement {
  id: string;
  type: ElementType;
  content?: string | number; // displayed text or target counter number
  prefix?: string; // e.g. '$', '+', '#'
  suffix?: string; // e.g. '%', 'K', ' OFF'
  iconName?: IconType;
  iconPosition?: 'left' | 'right' | 'center';
  layout?: ElementLayout;
  style?: ElementStyle;
  animation?: ElementAnimation;
  exitAnimation?: ElementExitAnimation;
  subElements?: MotionElement[]; // For cards or grouped containers
}

export interface MotionScene {
  id: string;
  from: number; // start frame
  durationInFrames: number;
  transition?: TransitionType;
  elements: MotionElement[];
}

export interface MotionProject {
  title: string;
  description?: string;
  fps?: number; // default: 30
  durationInFrames: number; // e.g. 150 (5s at 30fps)
  aspectRatio?: '16:9' | '9:16' | '1:1';
  background?: BackgroundConfig;
  scenes: MotionScene[];
}
