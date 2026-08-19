import React from 'react';
import { Shield, AlertTriangle, Check, Film, Music, Cpu, BarChart2, Eye, Activity, Sparkles, Scissors, Clapperboard } from 'lucide-react';

interface TechnicalMetricsViewProps {
  report: any;
  isIndo: boolean;
}

export const TechnicalMetricsView: React.FC<TechnicalMetricsViewProps> = ({ report, isIndo }) => {
  const details = report?.technical_details;

  if (!details) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
        <Cpu size={32} className="mx-auto mb-2 text-slate-300 animate-pulse" />
        <p className="text-sm font-bold">
          {isIndo 
            ? 'Tidak ada data diagnosa teknis fisik. Jalankan analisis ulang dengan video utuh.' 
            : 'No physical technical diagnostic data available. Re-run analysis with a raw video file.'}
        </p>
      </div>
    );
  }

  const { ffprobe, filters, frameAnalysis, stabilityIndex, stabilityStatus, scene_detection } = details;

  // Format bytes to MB
  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Format bitrate to Mbps
  const formatBitrate = (bps: number) => {
    return (bps / (1024 * 1024)).toFixed(2) + ' Mbps';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Grid: ffprobe stream info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Video Stream properties */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Film size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isIndo ? 'Spesifikasi Video Stream' : 'Video Stream Specification'}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">ffprobe metadata core</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{isIndo ? 'Resolusi' : 'Resolution'}</span>
              <span className="text-slate-800 dark:text-slate-200 font-black">{ffprobe.video.width} x {ffprobe.video.height}</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Frame Rate (FPS)</span>
              <span className="text-slate-800 dark:text-slate-200 font-black">{Math.round(ffprobe.video.fps * 100) / 100} fps</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Codec / Profile</span>
              <span className="text-slate-800 dark:text-slate-200 font-black uppercase">{ffprobe.video.codec} ({ffprobe.video.profile})</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Bitrate Total</span>
              <span className="text-slate-800 dark:text-slate-200 font-black">{formatBitrate(ffprobe.bitrate)}</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{isIndo ? 'Ruang Warna' : 'Color Space'}</span>
              <span className="text-slate-800 dark:text-slate-200 font-black uppercase">{ffprobe.video.color_space || 'N/A'}</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{isIndo ? 'Durasi / Ukuran' : 'Duration / Size'}</span>
              <span className="text-slate-800 dark:text-slate-200 font-black">
                {ffprobe.duration.toFixed(2)}s / {formatSize(ffprobe.size)}
              </span>
            </div>
          </div>
        </div>

        {/* Audio Stream properties or lack thereof */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Music size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {isIndo ? 'Spesifikasi Audio Stream' : 'Audio Stream Specification'}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">channel & frequency analysis</p>
              </div>
            </div>

            {ffprobe.audio ? (
              <div className="grid grid-cols-2 gap-4 font-mono text-xs mt-4">
                <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Audio Codec</span>
                  <span className="text-slate-800 dark:text-slate-200 font-black uppercase">{ffprobe.audio.codec}</span>
                </div>
                <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sample Rate</span>
                  <span className="text-slate-800 dark:text-slate-200 font-black">{ffprobe.audio.sample_rate / 1000} kHz</span>
                </div>
                <div className="space-y-1 bg-white dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-900 col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Channels Layout</span>
                  <span className="text-slate-800 dark:text-slate-200 font-black">
                    {ffprobe.audio.channels === 1 ? '1.0 Mono' : ffprobe.audio.channels === 2 ? '2.0 Stereo' : `${ffprobe.audio.channels} channels`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-white dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/40 text-slate-400 italic text-xs mt-4">
                {isIndo ? 'Video tidak mengandung track audio (Muted / No audio channel)' : 'No audio stream detected in this video.'}
              </div>
            )}
          </div>
          
          <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3.5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-4">
            <strong>💡 Pro-tip:</strong> {isIndo 
              ? 'Standar Adobe Stock menyukai codec H.264/AAC atau ProRes 422 dengan bitrate di atas 15 Mbps untuk jaminan kualitas tanpa artefak kompresi.' 
              : 'Adobe Stock prefers H.264/AAC or ProRes 422 containers with bitrates above 15 Mbps to prevent visual compression blocks.'}
          </div>
        </div>
      </div>

      {/* FFmpeg filters anomaly detection section */}
      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isIndo ? 'Pemeriksaan Anomali FFmpeg Filter' : 'FFmpeg Filter Anomaly Check'}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">real-time black & freeze frame analyzer</p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
            {isIndo ? 'Hasil Filter' : 'Filter Output'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Black Frames alert */}
          <div className={`p-4 rounded-2xl border transition-all ${
            filters.black_frames_detected 
              ? 'bg-rose-500/5 border-rose-500/20 text-rose-900 dark:text-rose-400' 
              : 'bg-emerald-500/[0.02] border-emerald-500/10 text-slate-700 dark:text-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <span>⚫</span> {isIndo ? 'Deteksi Black Frames' : 'Black Frame Detection'}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                filters.black_frames_detected 
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {filters.black_frames_detected ? 'ANOMALY!' : 'SAFE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              {isIndo 
                ? 'Mendeteksi frame hitam kosong di awal, tengah, atau akhir video yang berisiko membuat editor menolak video Anda.'
                : 'Scans for unintentional empty solid black frame sequences that trigger instant metadata refusals.'}
            </p>
            {filters.black_frames_detected ? (
              <div className="space-y-2 max-h-[100px] overflow-y-auto font-mono text-[10px]">
                {filters.black_frames.map((f: any, i: number) => (
                  <div key={i} className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-rose-500/10">
                    <span>⏱️ {f.start.toFixed(2)}s - {f.end.toFixed(2)}s</span>
                    <span className="font-bold text-rose-500">{isIndo ? 'Durasi' : 'Duration'}: {f.duration.toFixed(2)}s</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] italic text-emerald-600 dark:text-emerald-400/80 font-semibold flex items-center gap-1.5 bg-emerald-500/[0.05] p-2 rounded-xl">
                <Check size={12} /> {isIndo ? 'Hebat! Tidak ada frame hitam kosong yang mengganggu.' : 'Perfect! No empty black frames detected.'}
              </p>
            )}
          </div>

          {/* Frozen/static frames alert */}
          <div className={`p-4 rounded-2xl border transition-all ${
            filters.frozen_frames_detected 
              ? 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-400' 
              : 'bg-emerald-500/[0.02] border-emerald-500/10 text-slate-700 dark:text-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <span>❄️</span> {isIndo ? 'Deteksi Frame Membeku' : 'Frozen Frame Detection'}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                filters.frozen_frames_detected 
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {filters.frozen_frames_detected ? 'STUCK!' : 'SAFE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              {isIndo 
                ? 'Mendeteksi macet (lag) atau freeze frame yang menandakan video korup, rendering error, atau lag kamera.'
                : 'Scans for frozen/duplicate frames that indicate rendering issues, lagging, or corrupted file streams.'}
            </p>
            {filters.frozen_frames_detected ? (
              <div className="space-y-2 max-h-[100px] overflow-y-auto font-mono text-[10px]">
                {filters.frozen_frames.map((f: any, i: number) => (
                  <div key={i} className="flex justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-500/10">
                    <span>⏱️ {isIndo ? 'Mulai di' : 'Starts at'} {f.start.toFixed(2)}s</span>
                    <span className="font-bold text-amber-500">{isIndo ? 'Durasi' : 'Duration'}: {f.duration.toFixed(2)}s</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] italic text-emerald-600 dark:text-emerald-400/80 font-semibold flex items-center gap-1.5 bg-emerald-500/[0.05] p-2 rounded-xl">
                <Check size={12} /> {isIndo ? 'Hebat! Transisi gerakan video lancar dan bebas frame lag.' : 'Perfect! Video motion is fluent with no lagging.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PySceneDetect Scene Changes & Cuts */}
      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 text-pink-500 rounded-xl">
              <Scissors size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isIndo ? 'Deteksi Adegan (PySceneDetect-Engine)' : 'Scene Detection (PySceneDetect-Engine)'}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">FFmpeg content-adaptive shot boundary detector</p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
            {scene_detection?.scenes?.length || 1} {isIndo ? 'Adegan' : 'Scenes'}
          </span>
        </div>

        {scene_detection?.scene_changes_detected ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-3">
                {isIndo ? 'Visualisasi Durasi Segmen Adegan' : 'Scene Segment Duration Timeline'}
              </span>
              
              {/* Timeline bar */}
              <div className="flex h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                {scene_detection.scenes.map((scene: any, idx: number) => {
                  const percentage = (scene.duration / ffprobe.duration) * 100;
                  const bgColors = [
                    'bg-indigo-500 hover:bg-indigo-600',
                    'bg-pink-500 hover:bg-pink-600',
                    'bg-emerald-500 hover:bg-emerald-600',
                    'bg-amber-500 hover:bg-amber-600',
                    'bg-purple-500 hover:bg-purple-600',
                    'bg-cyan-500 hover:bg-cyan-600'
                  ];
                  const bgColor = bgColors[idx % bgColors.length];
                  
                  return (
                    <div 
                      key={scene.scene_number}
                      className={`${bgColor} transition-all relative group cursor-help`}
                      style={{ width: `${percentage}%` }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 bg-slate-900 text-white font-mono text-[9px] font-bold py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                        Scene #{scene.scene_number}: {scene.start.toFixed(2)}s - {scene.end.toFixed(2)}s ({scene.duration.toFixed(2)}s)
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 mt-1.5">
                <span>0.00s</span>
                <span>{ffprobe.duration.toFixed(2)}s</span>
              </div>
            </div>

            {/* List of Scenes and Cuts split into nice bento boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: List of Cut Points */}
              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm space-y-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-100 dark:border-slate-900 pb-2">
                  ✂️ {isIndo ? 'Titik Pemotongan Adegan (Cuts)' : 'Adegan Cut Points (Cuts)'}
                </span>
                
                <div className="space-y-2 max-h-[180px] overflow-y-auto font-mono text-[10px]">
                  {scene_detection.scene_changes.map((change: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">
                        {isIndo ? 'Pergantian Adegan' : 'Scene Cut'} #{i + 1}
                      </span>
                      <span className="font-black text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-md">
                        ⏱️ {change.timestamp.toFixed(2)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Scene Timings Table */}
              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm space-y-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-100 dark:border-slate-900 pb-2">
                  🎬 {isIndo ? 'Daftar Durasi Tiap Adegan' : 'Scene Timings & Durations'}
                </span>
                
                <div className="space-y-2 max-h-[180px] overflow-y-auto font-mono text-[10px]">
                  {scene_detection.scenes.map((scene: any) => (
                    <div key={scene.scene_number} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">
                        🎬 {isIndo ? 'Adegan' : 'Scene'} #{scene.scene_number}
                      </span>
                      <div className="flex gap-2">
                        <span className="text-slate-400">
                          {scene.start.toFixed(1)}s - {scene.end.toFixed(1)}s
                        </span>
                        <span className="font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          {scene.duration.toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="p-6 text-center bg-emerald-500/[0.02] border border-dashed border-emerald-500/10 rounded-2xl text-slate-400 italic text-xs leading-relaxed">
            🟢 {isIndo 
              ? 'Tidak ada pergantian adegan signifikan terdeteksi. Video ini merupakan satu klip berkelanjutan (continuous single-shot) utuh.' 
              : 'No significant scene changes detected. This video appears to be a single continuous shot.'}
          </div>
        )}
      </div>

      {/* Frame analysis - Sharpness / Laplacian Variance */}
      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <BarChart2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isIndo ? 'Pengukuran Piksel OpenCV (Frame-by-Frame)' : 'OpenCV Pixel Measurements (Frame-by-Frame)'}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">Laplacian edge variance & light distribution</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 font-extrabold">{isIndo ? 'Stabilitas Lum' : 'Luminance Stability'}:</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
              stabilityStatus === 'STABLE' ? 'bg-emerald-500/10 text-emerald-600' :
              stabilityStatus === 'UNSTABLE' ? 'bg-amber-500/10 text-amber-600' :
              'bg-red-500/10 text-red-600'
            }`}>
              {stabilityStatus} ({stabilityIndex})
            </span>
          </div>
        </div>

        {/* Frames details mapping */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {frameAnalysis.map((frame: any) => {
            const isBlur = frame.blurStatus === 'BLURRED' || frame.blurStatus === 'SOFT';
            
            return (
              <div key={frame.frameIndex} className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                  <span className="text-[10px] font-black tracking-wider text-indigo-500 uppercase font-mono">
                    Frame #{frame.frameIndex}
                  </span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono ${
                    frame.blurStatus === 'SHARP' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                    frame.blurStatus === 'SOFT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                  }`}>
                    {frame.blurStatus}
                  </span>
                </div>

                {/* Sharpness Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400 uppercase">{isIndo ? 'Ketajaman Laplacian' : 'Laplacian Sharpness'}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{frame.sharpness}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        frame.blurStatus === 'SHARP' ? 'bg-emerald-500' :
                        frame.blurStatus === 'SOFT' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, frame.sharpness * 3)}%` }} // Laplacian scales to 100 for graph ease
                    />
                  </div>
                </div>

                {/* Exposure split percentages */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-extrabold uppercase text-slate-400">
                    <span>{isIndo ? 'Bayangan Gelap (<10)' : 'Crushed Shadows (<10)'}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{frame.underexposurePercent}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${frame.underexposurePercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-extrabold uppercase text-slate-400">
                    <span>{isIndo ? 'Overexposure (>245)' : 'Blown Highlights (>245)'}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{frame.overexposurePercent}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${frame.overexposurePercent}%` }}
                    />
                  </div>
                </div>

                {/* Avg color swatch */}
                <div className="flex items-center justify-between text-[10px] font-bold bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-900">
                  <span className="text-slate-400 uppercase">{isIndo ? 'Warna Rata-Rata' : 'Avg Color Swatch'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      rgb({frame.averageColor.r}, {frame.averageColor.g}, {frame.averageColor.b})
                    </span>
                    <div 
                      className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm"
                      style={{ backgroundColor: `rgb(${frame.averageColor.r},${frame.averageColor.g},${frame.averageColor.b})` }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Technical overview footer summary card */}
        <div className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-4 flex items-start gap-3 mt-4">
          <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h5 className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
              {isIndo ? 'Kesimpulan Diagnostik OpenCV' : 'OpenCV Diagnostic Summary'}
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              {isIndo 
                ? `Stabilitas luminansi adalah ${stabilityStatus}. Ketajaman dihitung menggunakan varians kernel Laplacian. Nilai di atas 40 merepresentasikan tepi fokus yang sangat tajam yang cocok untuk Adobe Stock, sedangkan di bawah 15 menunjukkan kekaburan (soft focus) parah.`
                : `Luminance stability is calculated as ${stabilityStatus}. Frame sharpness is checked using Laplacian edge contrasts. Scores above 40 represent clean pin-sharp focuses perfect for high-resolution stock submissions, whereas scores below 15 indicate soft-focus or motion-blur artifacts.`
              }
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
