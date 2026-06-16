import React, { useEffect, useState } from "react";

interface MeteorProps {
  number?: number;
}

export const Meteors: React.FC<MeteorProps> = ({ number = 18 }) => {
  const [meteorStyles, setMeteorStyles] = useState<React.CSSProperties[]>([]);

  useEffect(() => {
    const styles = Array.from({ length: number }).map(() => ({
      top: Math.floor(Math.random() * -50) + "px",
      left: Math.floor(Math.random() * window.innerWidth) + "px",
      animationDelay: Math.random() * (12 - 1) + 1 + "s",
      animationDuration: Math.random() * (10 - 2) + 2 + "s",
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {meteorStyles.map((style, idx) => (
        <span
          key={"meteor" + idx}
          className="absolute h-0.5 w-0.5 rounded-[9999px] bg-slate-400 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rotate-[220deg] animate-meteor"
          style={style}
        />
      ))}
    </div>
  );
};
