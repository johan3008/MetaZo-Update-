import React from 'react';
import { 
  AbsoluteFill, 
  Sequence, 
  interpolate, 
  spring, 
  useCurrentFrame, 
  useVideoConfig 
} from 'remotion';
import { 
  MotionProject, 
  MotionScene, 
  MotionElement, 
  IconType 
} from '../../types/motionSchema';

// Inline Vector Icons to ensure 100% self-contained standalone execution without external bundling glitches
const RenderVectorIcon: React.FC<{ name?: IconType; size?: number; color?: string }> = ({ 
  name = 'sparkles', 
  size = 28, 
  color = '#ffffff' 
}) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  switch (name) {
    case 'zap':
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...props}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" fillOpacity="0.3" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case 'award':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 'trending-up':
      return (
        <svg {...props}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'play':
      return (
        <svg {...props}>
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...props}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor" fillOpacity="0.3" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...props}>
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      );
    case 'dollar':
      return (
        <svg {...props}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'shopping-cart':
      return (
        <svg {...props}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case 'cpu':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2" />
        </svg>
      );
    case 'video':
      return (
        <svg {...props}>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'sparkles':
    default:
      return (
        <svg {...props}>
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="currentColor" fillOpacity="0.3" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
          <path d="M3 5h4" />
          <path d="M17 19h4" />
        </svg>
      );
  }
};

// Animated Dynamic Background
const DynamicBackground: React.FC<{ config?: MotionProject['background'] }> = ({ config }) => {
  const frame = useCurrentFrame();
  const colors = config?.colors && config.colors.length > 0 
    ? config.colors 
    : ['#0f172a', '#1e1b4b', '#312e81'];
  
  const type = config?.type || 'gradient';
  const baseAngle = config?.angle ?? 135;
  const animatedAngle = config?.animated ? (baseAngle + frame * 0.5) % 360 : baseAngle;

  if (type === 'solid') {
    return <AbsoluteFill style={{ backgroundColor: colors[0] || '#090d16' }} />;
  }

  if (type === 'radial') {
    const pulse = interpolate(Math.sin(frame / 12), [-1, 1], [40, 70]);
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, ${colors[0]} 0%, ${colors[1] || '#030712'} ${pulse}%, ${colors[2] || '#000000'} 100%)`
        }}
      />
    );
  }

  if (type === 'mesh' || type === 'particles') {
    const orb1X = interpolate(Math.sin(frame / 20), [-1, 1], [-50, 50]);
    const orb1Y = interpolate(Math.cos(frame / 25), [-1, 1], [-40, 40]);
    const orb2X = interpolate(Math.cos(frame / 22), [-1, 1], [-50, 50]);
    const orb2Y = interpolate(Math.sin(frame / 28), [-1, 1], [-40, 40]);

    return (
      <AbsoluteFill style={{ backgroundColor: '#030712', overflow: 'hidden' }}>
        {/* Hardware-Accelerated Glow Orb 1 */}
        <div
          style={{
            position: 'absolute',
            left: '30%',
            top: '30%',
            width: '800px',
            height: '800px',
            transform: `translate3d(calc(-50% + ${orb1X}px), calc(-50% + ${orb1Y}px), 0)`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors[0] || '#6366f1'} 0%, rgba(99, 102, 241, 0.4) 35%, transparent 70%)`,
            willChange: 'transform',
            pointerEvents: 'none'
          }}
        />
        {/* Hardware-Accelerated Glow Orb 2 */}
        <div
          style={{
            position: 'absolute',
            left: '70%',
            top: '65%',
            width: '700px',
            height: '700px',
            transform: `translate3d(calc(-50% + ${orb2X}px), calc(-50% + ${orb2Y}px), 0)`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors[1] || '#ec4899'} 0%, rgba(236, 72, 153, 0.35) 35%, transparent 70%)`,
            willChange: 'transform',
            pointerEvents: 'none'
          }}
        />
        {/* Ambient Dark Vignette Overlay */}
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle at center, transparent 35%, rgba(3, 7, 18, 0.85) 100%)',
            pointerEvents: 'none'
          }}
        />
      </AbsoluteFill>
    );
  }

  if (type === 'grid') {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#050811',
          backgroundImage: `radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.12) 0%, rgba(3, 7, 18, 0.95) 80%)'
          }}
        />
      </AbsoluteFill>
    );
  }

  // Default: Linear Gradient
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${animatedAngle}deg, ${colors.join(', ')})`
      }}
    />
  );
};

// Motion Element Renderer
const RenderMotionElement: React.FC<{ 
  element: MotionElement; 
  sceneStartFrame: number; 
  sceneDuration: number;
}> = ({ 
  element, 
  sceneStartFrame, 
  sceneDuration 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Inside <Sequence>, useCurrentFrame() is already local to the scene (starts at 0)
  const relFrame = Math.max(0, frame);
  const anim = element.animation || { type: 'spring-in' };
  const delay = anim.delay ?? 0;
  const activeFrame = Math.max(0, relFrame - delay);

  // Compute Spring Animation Value (0 -> 1)
  const springVal = spring({
    frame: activeFrame,
    fps,
    config: {
      damping: anim.damping ?? 12,
      mass: anim.mass ?? 0.5,
      stiffness: anim.stiffness ?? 100
    }
  });

  // Calculate Transform & Opacity based on animation type
  let opacity = 1;
  let transform = '';

  if (relFrame < delay) {
    opacity = 0;
  } else {
    switch (anim.type) {
      case 'spring-in':
      case 'bounce-in':
        opacity = interpolate(activeFrame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
        transform = `scale(${springVal}) translateY(${(1 - springVal) * 35}px)`;
        break;
      case 'fade-in':
        opacity = interpolate(activeFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
        break;
      case 'slide-up':
        opacity = interpolate(activeFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        transform = `translateY(${(1 - springVal) * 60}px)`;
        break;
      case 'slide-down':
        opacity = interpolate(activeFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        transform = `translateY(${(1 - springVal) * -60}px)`;
        break;
      case 'slide-left':
        opacity = interpolate(activeFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        transform = `translateX(${(1 - springVal) * 80}px)`;
        break;
      case 'slide-right':
        opacity = interpolate(activeFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        transform = `translateX(${(1 - springVal) * -80}px)`;
        break;
      case 'zoom-in':
        opacity = interpolate(activeFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        transform = `scale(${interpolate(activeFrame, [0, 15], [0.3, 1], { extrapolateRight: 'clamp' })})`;
        break;
      case 'float':
        opacity = interpolate(activeFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        const floatOffset = Math.sin((activeFrame + delay) / 10) * 12;
        transform = `translateY(${floatOffset}px)`;
        break;
      case 'pulse':
        const pulseScale = interpolate(Math.sin(activeFrame / 6), [-1, 1], [0.96, 1.04]);
        transform = `scale(${pulseScale * springVal})`;
        break;
      case 'rotate-continuous':
        const rot = (activeFrame * 3) % 360;
        transform = `rotate(${rot}deg) scale(${springVal})`;
        break;
      case 'glow-pulse':
      default:
        opacity = interpolate(activeFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
        break;
    }
  }

  // Handle Exit Animation
  if (element.exitAnimation && sceneDuration > 0) {
    const exitDuration = element.exitAnimation.duration ?? 12;
    const exitStart = sceneDuration - exitDuration;
    if (relFrame >= exitStart) {
      const exitProgress = (relFrame - exitStart) / exitDuration;
      const exitClamp = Math.min(1, Math.max(0, exitProgress));
      opacity *= (1 - exitClamp);
      if (element.exitAnimation.type === 'slide-down') {
        transform += ` translateY(${exitClamp * 40}px)`;
      } else if (element.exitAnimation.type === 'zoom-out') {
        transform += ` scale(${1 - exitClamp * 0.4})`;
      }
    }
  }

  const s = element.style || {};
  const l = element.layout || {};

  // Text Gradient Handler
  const isTextGradient = s.gradient && s.gradient.length > 1;
  const gradientAngle = s.gradientAngle ?? 90;
  const textGradientStyle: React.CSSProperties = isTextGradient ? {
    backgroundImage: `linear-gradient(${gradientAngle}deg, ${s.gradient!.join(', ')})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block'
  } : {};

  // Glowing Shadow calculation
  const glowPulse = anim.type === 'glow-pulse'
    ? interpolate(Math.sin(activeFrame / 8), [-1, 1], [15, 45])
    : null;

  const finalBoxShadow = glowPulse && s.boxShadow
    ? s.boxShadow.replace(/(\d+)px rgba/, `${glowPulse}px rgba`)
    : s.boxShadow;

  // Content string handling (Typewriter or Standard or Counter)
  let displayContent: React.ReactNode = element.content ?? '';

  if (element.type === 'counter') {
    const targetNum = typeof element.content === 'number' ? element.content : parseFloat(String(element.content)) || 100;
    const currentNum = Math.round(interpolate(activeFrame, [0, 30], [0, targetNum], { extrapolateRight: 'clamp' }));
    displayContent = `${element.prefix || ''}${currentNum.toLocaleString()}${element.suffix || ''}`;
  } else if (anim.type === 'typewriter' && typeof element.content === 'string') {
    const charCount = Math.floor(interpolate(activeFrame, [0, 25], [0, element.content.length], { extrapolateRight: 'clamp' }));
    displayContent = element.content.slice(0, charCount);
  } else if (element.prefix || element.suffix) {
    displayContent = `${element.prefix || ''}${displayContent}${element.suffix || ''}`;
  }

  // Common Layout Styling
  const containerStyle: React.CSSProperties = {
    opacity,
    transform,
    zIndex: l.zIndex ?? 1,
    textAlign: s.textAlign || (l.align === 'center' ? 'center' : l.align === 'right' ? 'right' : 'left'),
    maxWidth: l.maxWidth ?? (l.width ?? '90%'),
    width: l.width,
    margin: l.align === 'center' ? '0 auto' : undefined
  };

  // 1. Heading Component
  if (element.type === 'heading') {
    return (
      <div style={containerStyle}>
        <h1
          style={{
            fontSize: `${s.fontSize ?? 64}px`,
            fontWeight: s.fontWeight ?? 800,
            color: isTextGradient ? undefined : (s.color ?? '#ffffff'),
            letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : '-1px',
            textTransform: s.textTransform ?? 'none',
            lineHeight: 1.15,
            margin: 0,
            textShadow: s.boxShadow || '0 4px 20px rgba(0, 0, 0, 0.4)',
            ...textGradientStyle
          }}
        >
          {displayContent}
        </h1>
      </div>
    );
  }

  // 2. Subtitle / Text Component
  if (element.type === 'subtitle' || element.type === 'text') {
    return (
      <div style={containerStyle}>
        <p
          style={{
            fontSize: `${s.fontSize ?? (element.type === 'subtitle' ? 28 : 20)}px`,
            fontWeight: s.fontWeight ?? 400,
            color: isTextGradient ? undefined : (s.color ?? '#cbd5e1'),
            letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : 'normal',
            lineHeight: 1.5,
            margin: 0,
            ...textGradientStyle
          }}
        >
          {displayContent}
        </p>
      </div>
    );
  }

  // 3. Badge Component
  if (element.type === 'badge') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: typeof s.padding === 'number' ? `${s.padding}px` : (s.padding ?? '10px 24px'),
            backgroundColor: s.backgroundColor ?? 'rgba(99, 102, 241, 0.15)',
            border: s.border ?? '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: `${s.borderRadius ?? 999}px`,
            boxShadow: finalBoxShadow ?? '0 0 20px rgba(99, 102, 241, 0.25)',
            backdropFilter: s.backdropBlur ? `blur(${s.backdropBlur}px)` : 'blur(8px)',
            color: s.color ?? '#818cf8',
            fontSize: `${s.fontSize ?? 16}px`,
            fontWeight: s.fontWeight ?? 600,
            letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : '0.5px',
            textTransform: s.textTransform ?? 'uppercase'
          }}
        >
          {element.iconName && (
            <RenderVectorIcon 
              name={element.iconName} 
              size={Math.round((s.fontSize ?? 16) * 1.2)} 
              color={s.color ?? '#818cf8'} 
            />
          )}
          <span>{displayContent}</span>
        </div>
      </div>
    );
  }

  // 4. Glassmorphic Card Container
  if (element.type === 'card') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: l.align === 'center' ? 'center' : 'flex-start',
            gap: '16px',
            padding: typeof s.padding === 'number' ? `${s.padding}px` : (s.padding ?? '32px 40px'),
            backgroundColor: s.backgroundColor ?? 'rgba(15, 23, 42, 0.75)',
            border: s.border ?? '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: `${s.borderRadius ?? 24}px`,
            boxShadow: finalBoxShadow ?? '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)',
            backdropFilter: s.backdropBlur ? `blur(${s.backdropBlur}px)` : 'blur(16px)'
          }}
        >
          {element.iconName && (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: `linear-gradient(135deg, ${s.gradient?.[0] || '#6366f1'}, ${s.gradient?.[1] || '#a855f7'})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
              }}
            >
              <RenderVectorIcon name={element.iconName} size={32} color="#ffffff" />
            </div>
          )}
          {displayContent && (
            <div
              style={{
                fontSize: `${s.fontSize ?? 28}px`,
                fontWeight: s.fontWeight ?? 700,
                color: isTextGradient ? undefined : (s.color ?? '#ffffff'),
                ...textGradientStyle
              }}
            >
              {displayContent}
            </div>
          )}
          {element.subElements && element.subElements.map((sub, i) => (
            <RenderMotionElement
              key={sub.id || `sub-${i}`}
              element={sub}
              sceneStartFrame={sceneStartFrame}
              sceneDuration={sceneDuration}
            />
          ))}
        </div>
      </div>
    );
  }

  // 5. Button / CTA Component
  if (element.type === 'button') {
    const btnBg = s.gradient && s.gradient.length > 1
      ? `linear-gradient(${gradientAngle}deg, ${s.gradient.join(', ')})`
      : (s.backgroundColor ?? '#6366f1');

    return (
      <div style={containerStyle}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: typeof s.padding === 'number' ? `${s.padding}px` : (s.padding ?? '16px 36px'),
            background: btnBg,
            borderRadius: `${s.borderRadius ?? 16}px`,
            boxShadow: finalBoxShadow ?? '0 10px 30px rgba(99, 102, 241, 0.45)',
            color: s.color ?? '#ffffff',
            fontSize: `${s.fontSize ?? 20}px`,
            fontWeight: s.fontWeight ?? 700,
            letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : '0.5px'
          }}
        >
          {element.iconName && (
            <RenderVectorIcon 
              name={element.iconName} 
              size={Math.round((s.fontSize ?? 20) * 1.15)} 
              color={s.color ?? '#ffffff'} 
            />
          )}
          <span>{displayContent}</span>
        </div>
      </div>
    );
  }

  // 6. Icon Standalone Component
  if (element.type === 'icon') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: s.padding ? `${s.padding}px` : '16px',
            backgroundColor: s.backgroundColor ?? 'rgba(255, 255, 255, 0.08)',
            borderRadius: `${s.borderRadius ?? 20}px`,
            boxShadow: finalBoxShadow,
            border: s.border ?? '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          <RenderVectorIcon 
            name={element.iconName || 'sparkles'} 
            size={s.fontSize ?? 48} 
            color={s.color ?? '#6366f1'} 
          />
        </div>
      </div>
    );
  }

  // Fallback / Generic Shape
  return (
    <div style={containerStyle}>
      <div
        style={{
          fontSize: `${s.fontSize ?? 24}px`,
          color: s.color ?? '#ffffff',
          ...textGradientStyle
        }}
      >
        {displayContent}
      </div>
    </div>
  );
};

// Scene Renderer with Remotion Timeline Transitions
const RenderScene: React.FC<{ scene: MotionScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const transitionType = scene.transition || 'fade';
  const duration = scene.durationInFrames || 150;
  const transDuration = Math.min(15, Math.floor(duration / 4));

  // Calculate Scene Entry and Exit Transitions
  let sceneOpacity = 1;
  let sceneTransform = '';

  if (transitionType === 'fade' || transitionType === 'crossfade') {
    if (frame < transDuration) {
      sceneOpacity = interpolate(frame, [0, transDuration], [0, 1], { extrapolateRight: 'clamp' });
    } else if (frame > duration - transDuration) {
      sceneOpacity = interpolate(frame, [duration - transDuration, duration], [1, 0], { extrapolateLeft: 'clamp' });
    }
  } else if (transitionType === 'slide' || transitionType === 'slide-up') {
    if (frame < transDuration) {
      sceneOpacity = interpolate(frame, [0, transDuration], [0, 1], { extrapolateRight: 'clamp' });
      const offsetY = interpolate(frame, [0, transDuration], [40, 0], { extrapolateRight: 'clamp' });
      sceneTransform = `translateY(${offsetY}px)`;
    } else if (frame > duration - transDuration) {
      sceneOpacity = interpolate(frame, [duration - transDuration, duration], [1, 0], { extrapolateLeft: 'clamp' });
      const offsetY = interpolate(frame, [duration - transDuration, duration], [0, -40], { extrapolateLeft: 'clamp' });
      sceneTransform = `translateY(${offsetY}px)`;
    }
  } else if (transitionType === 'zoom') {
    if (frame < transDuration) {
      sceneOpacity = interpolate(frame, [0, transDuration], [0, 1], { extrapolateRight: 'clamp' });
      const scale = interpolate(frame, [0, transDuration], [0.92, 1], { extrapolateRight: 'clamp' });
      sceneTransform = `scale(${scale})`;
    } else if (frame > duration - transDuration) {
      sceneOpacity = interpolate(frame, [duration - transDuration, duration], [1, 0], { extrapolateLeft: 'clamp' });
      const scale = interpolate(frame, [duration - transDuration, duration], [1, 1.08], { extrapolateLeft: 'clamp' });
      sceneTransform = `scale(${scale})`;
    }
  }

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '60px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        opacity: sceneOpacity,
        transform: sceneTransform || undefined
      }}
    >
      {scene.elements.map((elem, idx) => (
        <RenderMotionElement
          key={elem.id || `elem-${idx}`}
          element={elem}
          sceneStartFrame={scene.from}
          sceneDuration={scene.durationInFrames}
        />
      ))}
    </AbsoluteFill>
  );
};

// Main Dynamic Motion Renderer Remotion Composition
export const DynamicMotionRenderer: React.FC<{ project: MotionProject }> = ({ project }) => {
  if (!project || !project.scenes || project.scenes.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#090d16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <h2>No Scenes Defined in Motion Project</h2>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* 1. Universal Animated Background */}
      <DynamicBackground config={project.background} />

      {/* 2. Scene Timeline Sequences */}
      {project.scenes.map((scene, idx) => (
        <Sequence
          key={scene.id || `scene-${idx}`}
          from={scene.from || 0}
          durationInFrames={scene.durationInFrames}
        >
          <RenderScene scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Default export alias for Remotion player compatibility
export default DynamicMotionRenderer;
