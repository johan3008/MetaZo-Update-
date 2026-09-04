import { jsx, jsxs } from "react/jsx-runtime";
import { FileCode, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
export const MetricsRow = ({
  filesLength,
  successfulFilesCount,
  filesToGenerateCount,
  filesWithErrorCount
}) => {
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5", children: [
    /* @__PURE__ */ jsxs("div", { className: "group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/5 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-500/30", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/10 transition-colors" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between relative z-10", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
            /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-violet-500" }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Uploaded Queue" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight", children: filesLength }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-400 dark:text-slate-500", children: filesLength === 1 ? "file" : "files" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform", children: /* @__PURE__ */ jsx(FileCode, { size: 20, strokeWidth: 2.2 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500", children: [
        /* @__PURE__ */ jsx("span", { children: "Batch capacity" }),
        /* @__PURE__ */ jsx("span", { className: "text-violet-600 dark:text-violet-400 font-bold", children: "Active Workspace" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/5 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between relative z-10", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
            /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Analysis Complete" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight", children: successfulFilesCount }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md", children: "ready" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform", children: /* @__PURE__ */ jsx(CheckCircle2, { size: 20, strokeWidth: 2.2 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500", children: [
        /* @__PURE__ */ jsx("span", { children: "Success rate" }),
        /* @__PURE__ */ jsx("span", { className: "text-emerald-600 dark:text-emerald-400 font-bold", children: filesLength > 0 ? `${Math.round(successfulFilesCount / filesLength * 100)}%` : "0%" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/5 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/5 hover:border-cyan-500/30", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between relative z-10", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
            /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-cyan-500" }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Pending Queue" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight", children: filesToGenerateCount }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-400 dark:text-slate-500", children: "waiting" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform", children: /* @__PURE__ */ jsx(Clock, { size: 20, strokeWidth: 2.2 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500", children: [
        /* @__PURE__ */ jsx("span", { children: "AI backlog" }),
        /* @__PURE__ */ jsx("span", { className: "text-cyan-600 dark:text-cyan-400 font-bold", children: filesToGenerateCount > 0 ? `${filesToGenerateCount} to run` : "Idle" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: `group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl p-4.5 ${filesWithErrorCount > 0 ? "border-rose-500/40 hover:border-rose-500 hover:shadow-rose-500/10" : "border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"}`, children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between relative z-10", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mb-1.5", children: [
            /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full ${filesWithErrorCount > 0 ? "bg-rose-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}` }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Processing Errors" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: `text-2xl sm:text-3xl font-black tracking-tight ${filesWithErrorCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`, children: filesWithErrorCount }),
            /* @__PURE__ */ jsx("span", { className: `text-xs font-bold ${filesWithErrorCount > 0 ? "text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md" : "text-slate-400"}`, children: filesWithErrorCount > 0 ? "requires retry" : "clean" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: `w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform ${filesWithErrorCount > 0 ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`, children: /* @__PURE__ */ jsx(AlertTriangle, { size: 20, strokeWidth: 2.2 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500", children: [
        /* @__PURE__ */ jsx("span", { children: "Quality status" }),
        /* @__PURE__ */ jsx("span", { className: `font-bold ${filesWithErrorCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`, children: filesWithErrorCount > 0 ? "Action required" : "All clear" })
      ] })
    ] })
  ] });
};
