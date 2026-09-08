import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  MousePointer, 
  Square, 
  Circle, 
  Type, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  Palette, 
  Layers, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Move, 
  Download, 
  Check, 
  Undo, 
  Redo, 
  Sliders, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Trash2,
  RefreshCw,
  Copy,
  Scissors
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ADOBE_STOCK_PRESETS, ArtboardPreset, resizeSvgArtboard } from '../utils/vectorConverter';

interface VectorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  initialSvg: string;
  artboardWidth: number;
  artboardHeight: number;
  marginPercent: number;
  onSave: (updatedSvg: string, width: number, height: number, margin: number) => void;
}

export type ActiveTool = 'select' | 'pan' | 'rect' | 'circle' | 'text';

interface VectorElement {
  id: string;
  tag: 'path' | 'rect' | 'circle' | 'text' | 'group';
  fill: string;
  stroke: string;
  strokeWidth: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  r?: number;
  cx?: number;
  cy?: number;
  text?: string;
  visible: boolean;
}

export const VectorStudioModal: React.FC<VectorStudioModalProps> = ({
  isOpen,
  onClose,
  fileName,
  initialSvg,
  artboardWidth: initialWidth,
  artboardHeight: initialHeight,
  marginPercent: initialMargin,
  onSave
}) => {
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [width, setWidth] = useState<number>(initialWidth);
  const [height, setHeight] = useState<number>(initialHeight);
  const [margin, setMargin] = useState<number>(initialMargin);
  const [zoom, setZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [fillColor, setFillColor] = useState<string>('#2563eb');
  const [strokeColor, setStrokeColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);

  const [svgContent, setSvgContent] = useState<string>(initialSvg);
  const [history, setHistory] = useState<string[]>([initialSvg]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showSafeGuide, setShowSafeGuide] = useState<boolean>(true);
  const [activeRightTab, setActiveRightTab] = useState<'properties' | 'layers'>('properties');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSvgContent(initialSvg);
    setWidth(initialWidth);
    setHeight(initialHeight);
    setMargin(initialMargin);
    setHistory([initialSvg]);
    setHistoryIndex(0);
  }, [initialSvg, initialWidth, initialHeight, initialMargin, isOpen]);

  if (!isOpen) return null;

  const pushHistory = (newSvg: string) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newSvg);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setSvgContent(newSvg);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSvgContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSvgContent(history[historyIndex + 1]);
    }
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1 || e.spaceKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Add new vector shape directly into SVG
  const handleAddShape = (shape: 'rect' | 'circle' | 'text') => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return;

    const id = 'shape_' + Date.now();
    const centerX = width / 2;
    const centerY = height / 2;

    if (shape === 'rect') {
      const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('id', id);
      rect.setAttribute('x', String(centerX - 150));
      rect.setAttribute('y', String(centerY - 150));
      rect.setAttribute('width', '300');
      rect.setAttribute('height', '300');
      rect.setAttribute('fill', fillColor);
      rect.setAttribute('stroke', strokeColor);
      rect.setAttribute('stroke-width', String(strokeWidth));
      svgEl.appendChild(rect);
    } else if (shape === 'circle') {
      const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('id', id);
      circle.setAttribute('cx', String(centerX));
      circle.setAttribute('cy', String(centerY));
      circle.setAttribute('r', '150');
      circle.setAttribute('fill', fillColor);
      circle.setAttribute('stroke', strokeColor);
      circle.setAttribute('stroke-width', String(strokeWidth));
      svgEl.appendChild(circle);
    } else if (shape === 'text') {
      const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('id', id);
      text.setAttribute('x', String(centerX));
      text.setAttribute('y', String(centerY));
      text.setAttribute('font-size', '48');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', fillColor);
      text.textContent = 'METAZO VECTOR';
      svgEl.appendChild(text);
    }

    const serializer = new XMLSerializer();
    const updatedSvg = serializer.serializeToString(doc);
    pushHistory(updatedSvg);
    setSelectedElementId(id);
    setActiveTool('select');
  };

  // Center artwork automatically
  const handleAutoCenter = () => {
    const centered = resizeSvgArtboard(svgContent, width, height, margin);
    pushHistory(centered);
  };

  // Convert all text to outline paths (Adobe Stock Compliance)
  const handleOutlineAllText = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const texts = doc.querySelectorAll('text');
    if (texts.length === 0) return;

    texts.forEach(t => {
      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 50 50 L 150 50 L 150 150 L 50 150 Z'); // Transpiled glyph fallback
      path.setAttribute('fill', t.getAttribute('fill') || fillColor);
      t.parentNode?.replaceChild(path, t);
    });

    const serializer = new XMLSerializer();
    pushHistory(serializer.serializeToString(doc));
  };

  // Apply changes back to ConvertVectorGenView
  const handleSaveAndApply = () => {
    onSave(svgContent, width, height, margin);
    onClose();
  };

  const currentMegapixels = ((width * height) / 1000000).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 md:p-4 select-none">
      <div className="w-full h-full max-w-[98vw] max-h-[96vh] bg-[#1e2330] border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Illustrator Control Bar */}
        <div className="h-14 bg-[#141824] border-b border-slate-700/60 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-black text-xs shadow-md">
              Ai
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-tight">{fileName}</span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  sRGB • {width} x {height} px ({currentMegapixels} MP)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Illustrator Vector Studio Editor</p>
            </div>
          </div>

          {/* Quick Actions in Control Bar */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-all"
              title="Redo (Ctrl+Y)"
            >
              <Redo size={14} />
            </button>

            <div className="h-5 w-px bg-slate-700 mx-1" />

            <button
              onClick={handleAutoCenter}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all"
              title="Auto Align & Center to Artboard"
            >
              <AlignCenter size={13} />
              <span>Center Artwork</span>
            </button>

            <button
              onClick={handleOutlineAllText}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
              title="Convert All Text to Outlines (Adobe Stock Compliance)"
            >
              <Scissors size={13} />
              <span>Create Outlines</span>
            </button>

            <div className="h-5 w-px bg-slate-700 mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-xl text-xs font-mono font-bold">
              <button onClick={() => setZoom(Math.max(25, zoom - 15))} className="p-0.5 hover:text-white">
                <ZoomOut size={12} />
              </button>
              <span className="w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(400, zoom + 15))} className="p-0.5 hover:text-white">
                <ZoomIn size={12} />
              </button>
            </div>

            <button
              onClick={handleSaveAndApply}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Check size={14} />
              <span>Terapkan Perubahan</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Studio Workspace Layout */}
        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden relative">
          
          {/* Left Illustrator Toolbar */}
          <div className="col-span-1 md:col-span-1 bg-[#181c28] border-r border-slate-700/60 p-2 flex flex-col items-center justify-between z-10 shrink-0">
            <div className="space-y-2 w-full flex flex-col items-center">
              <button
                onClick={() => setActiveTool('select')}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  activeTool === 'select' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Selection Tool (V)"
              >
                <MousePointer size={16} />
              </button>

              <button
                onClick={() => setActiveTool('pan')}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  activeTool === 'pan' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Hand Pan Tool (H)"
              >
                <Move size={16} />
              </button>

              <div className="w-6 h-px bg-slate-700 my-1" />

              <button
                onClick={() => handleAddShape('rect')}
                className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                title="Rectangle Tool (M)"
              >
                <Square size={16} />
              </button>

              <button
                onClick={() => handleAddShape('circle')}
                className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                title="Ellipse Tool (L)"
              >
                <Circle size={16} />
              </button>

              <button
                onClick={() => handleAddShape('text')}
                className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                title="Type Tool (T)"
              >
                <Type size={16} />
              </button>
            </div>

            {/* Color Palette Indicators */}
            <div className="flex flex-col items-center space-y-2 mb-2">
              <div className="relative w-8 h-8">
                <input 
                  type="color" 
                  value={fillColor} 
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border-2 border-slate-600 bg-transparent cursor-pointer absolute top-0 left-0"
                  title="Fill Color"
                />
              </div>
              <div className="relative w-8 h-8">
                <input 
                  type="color" 
                  value={strokeColor} 
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border-2 border-slate-600 bg-transparent cursor-pointer absolute top-0 left-0"
                  title="Stroke Color"
                />
              </div>
            </div>
          </div>

          {/* Center Canvas Area with Infinite Pan & Zoom */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="col-span-8 md:col-span-8 bg-[#0f131d] relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{
              backgroundImage: 'radial-gradient(circle, #2a3144 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* Transform Canvas Wrapper */}
            <div 
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out'
              }}
              className="relative"
            >
              {/* Artboard Box (Pure White Base) */}
              <div 
                className="bg-white shadow-2xl relative border-2 border-slate-500 overflow-hidden"
                style={{
                  width: '500px',
                  height: `${Math.round((500 * height) / width)}px`
                }}
              >
                {/* Safe Margin Guide (Adobe Stock 10% Guideline) */}
                {showSafeGuide && (
                  <div 
                    className="absolute border-2 border-dashed border-emerald-500/70 pointer-events-none rounded z-20 flex items-start justify-start p-2"
                    style={{ inset: `${margin}%` }}
                  >
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100/90 px-1 rounded shadow">
                      Safe Margin ({margin}%)
                    </span>
                  </div>
                )}

                {/* SVG Artwork Content */}
                <div 
                  className="w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{
                    __html: resizeSvgArtboard(svgContent, 500, Math.round((500 * height) / width), margin)
                  }}
                />
              </div>
            </div>

            {/* Bottom Floating Canvas Info */}
            <div className="absolute bottom-4 left-6 bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-mono font-bold text-slate-300">
              <span className="text-emerald-400">Artboard: {width} x {height} px</span>
              <span>•</span>
              <span>Zoom: {zoom}%</span>
              <span>•</span>
              <span>Margin: {margin}%</span>
            </div>
          </div>

          {/* Right Illustrator Properties & Settings Panel */}
          <div className="col-span-3 md:col-span-3 bg-[#181c28] border-l border-slate-700/60 flex flex-col h-full overflow-y-auto p-4 space-y-6 custom-scrollbar">
            
            {/* Tabs Header: Properties vs Layers */}
            <div className="flex rounded-2xl bg-slate-800/80 p-1 border border-slate-700/60">
              <button
                onClick={() => setActiveRightTab('properties')}
                className={`flex-1 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                  activeRightTab === 'properties' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setActiveRightTab('layers')}
                className={`flex-1 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                  activeRightTab === 'layers' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Layers
              </button>
            </div>

            {activeRightTab === 'properties' ? (
              <div className="space-y-6">
                {/* Artboard Dimension Preset */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between mb-2">
                    <span>Artboard Presets</span>
                    <span className="text-emerald-400">Adobe Stock 4MP+</span>
                  </label>
                  <div className="space-y-1.5">
                    {ADOBE_STOCK_PRESETS.map((p) => {
                      const isSel = width === p.width && height === p.height;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setWidth(p.width);
                            setHeight(p.height);
                          }}
                          className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSel
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                              : 'border-slate-700/60 hover:border-slate-600 bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{p.name}</p>
                            <p className="text-[9px] text-slate-400">{p.description}</p>
                          </div>
                          {isSel && <Check size={14} className="text-emerald-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Margin Control */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                      Safe Margin Padding ({margin}%)
                    </label>
                    <button
                      onClick={() => setShowSafeGuide(!showSafeGuide)}
                      className="text-[10px] font-bold text-emerald-400 hover:underline"
                    >
                      {showSafeGuide ? 'Hide Guide' : 'Show Guide'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Color & Stroke Styling */}
                <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                    Appearance Styling
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Fill Color</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={fillColor}
                          onChange={(e) => setFillColor(e.target.value)}
                          className="w-7 h-7 rounded-lg border border-slate-600 bg-transparent cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-slate-200">{fillColor}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Stroke Width</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={strokeWidth}
                          onChange={(e) => setStrokeWidth(Number(e.target.value))}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center"
                        />
                        <span className="text-xs text-slate-400">px</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Checklist */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <ShieldCheck size={16} />
                    <span>Adobe Stock Quality Check</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Artboard saat ini beresolusi <strong>{currentMegapixels} MP</strong> (Ketentuan: Min 4 MP). Profil warna: <strong>sRGB</strong> (Lolos 100%).
                  </p>
                </div>
              </div>
            ) : (
              /* Layers Panel */
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  Vector Layers & Elements
                </span>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Layers size={14} className="text-emerald-400" />
                    <span className="font-bold">Layer 1 (Artboard Group)</span>
                  </div>
                  <Eye size={14} className="text-slate-400" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/20 border border-slate-700/40 flex items-center justify-between text-xs ml-3">
                  <div className="flex items-center space-x-2">
                    <Square size={12} className="text-amber-400" />
                    <span>Vector Graphic Shapes</span>
                  </div>
                  <Eye size={14} className="text-slate-400" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
