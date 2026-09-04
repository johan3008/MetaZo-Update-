import { jsx, jsxs } from "react/jsx-runtime";
import { RefreshCcw, Zap, ArrowRight, Loader2, Sparkles, Globe, Cpu, Sliders, Hash, Type } from "lucide-react";
import { ToolType } from "../../types";
export const AiConfigPanel = ({
  activeTool,
  customPrompt,
  setCustomPrompt,
  keywordCount,
  setKeywordCount,
  keywordMode,
  setKeywordMode,
  titleLength,
  setTitleLength,
  metadataLanguage,
  setMetadataLanguage,
  aiCreativity,
  setAiCreativity,
  aiModelPerformance = "detail",
  setAiModelPerformance = (val) => {
  },
  isLoading,
  progressInfo,
  isPaused,
  filesToGenerateCount,
  filesWithErrorCount,
  handleGenerateAll,
  handleStopGeneration,
  mobileTab,
  setMobileTab,
  t,
  hasFiles
}) => {
  const getCreativityLabel = (val) => {
    if (val <= 0.3) return "Strict & Factual";
    if (val <= 0.6) return "Standard Microstock";
    if (val <= 0.8) return "Balanced Creative";
    return "High Variety";
  };
  return /* @__PURE__ */ jsxs("div", { className: `bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-xl shadow-black/5 flex flex-col justify-between min-h-[480px] relative overflow-hidden transition-all duration-300 ${mobileTab === "ai" ? "flex animate-in fade-in slide-in-from-bottom-5 duration-300" : "hidden lg:flex"}`, children: [
    /* @__PURE__ */ jsx("div", { className: "bg-slate-50/70 dark:bg-slate-850/50 py-3.5 px-5 border-b border-slate-200/60 dark:border-white/5 flex justify-between items-center", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/20", children: "02" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("h3", { className: "m-0 font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider", children: "AI Generation Engine" }),
        /* @__PURE__ */ jsxs("span", { className: "hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full", children: [
          /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" }),
          "CLIP Rank V2"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "p-5 sm:p-6 flex-grow flex flex-col justify-between relative z-10 space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5", children: [
            /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-1.5", children: /* @__PURE__ */ jsxs("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Globe, { size: 13, className: "text-violet-500" }),
              /* @__PURE__ */ jsx("span", { children: "Metadata Language" })
            ] }) }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: metadataLanguage,
                onChange: (e) => setMetadataLanguage(e.target.value),
                className: "w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-bold transition-all",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "en", children: "\u{1F1FA}\u{1F1F8} English (Default)" }),
                  /* @__PURE__ */ jsx("option", { value: "id", children: "\u{1F1EE}\u{1F1E9} Indonesian / Bahasa" }),
                  /* @__PURE__ */ jsx("option", { value: "ja", children: "\u{1F1EF}\u{1F1F5} Japanese / \u65E5\u672C\u8A9E" }),
                  /* @__PURE__ */ jsx("option", { value: "ko", children: "\u{1F1F0}\u{1F1F7} Korean / \uD55C\uAD6D\uC5B4" }),
                  /* @__PURE__ */ jsx("option", { value: "es", children: "\u{1F1EA}\u{1F1F8} Spanish / Espa\xF1ol" }),
                  /* @__PURE__ */ jsx("option", { value: "fr", children: "\u{1F1EB}\u{1F1F7} French / Fran\xE7ais" }),
                  /* @__PURE__ */ jsx("option", { value: "de", children: "\u{1F1E9}\u{1F1EA} German / Deutsch" }),
                  /* @__PURE__ */ jsx("option", { value: "it", children: "\u{1F1EE}\u{1F1F9} Italian / Italiano" }),
                  /* @__PURE__ */ jsx("option", { value: "pt", children: "\u{1F1F5}\u{1F1F9} Portuguese / Portugu\xEAs" }),
                  /* @__PURE__ */ jsx("option", { value: "ru", children: "\u{1F1F7}\u{1F1FA} Russian / \u0420\u0443\u0441\u0441\u043A\u0438\u0439" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5", children: [
            /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-1.5", children: /* @__PURE__ */ jsxs("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Cpu, { size: 13, className: "text-violet-500" }),
              /* @__PURE__ */ jsx("span", { children: "AI Model Profile" })
            ] }) }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-1.5", children: [
              { value: "speed", label: "\u26A1 Speed" },
              { value: "detail", label: "\u{1F3AF} Detail" }
            ].map((opt) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setAiModelPerformance?.(opt.value),
                className: `py-1.5 px-2 text-[11px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${aiModelPerformance === opt.value ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"}`,
                children: opt.label
              },
              opt.value
            )) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5 flex flex-col justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1", children: [
              /* @__PURE__ */ jsxs("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(Hash, { size: 12, className: "text-violet-500" }),
                /* @__PURE__ */ jsx("span", { children: "Count" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: [30, 40, 49].map((c) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setKeywordCount(c),
                  className: `px-1.5 py-0.5 text-[9px] font-extrabold rounded ${keywordCount === c ? "bg-violet-600 text-white" : "bg-slate-200/70 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"}`,
                  children: c
                },
                c
              )) })
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                min: "1",
                max: "49",
                value: keywordCount,
                onChange: (e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setKeywordCount("");
                  } else {
                    const num = Math.min(49, Math.max(1, parseInt(val) || 1));
                    setKeywordCount(num);
                  }
                },
                className: "w-full h-8.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-center text-xs font-black text-slate-800 dark:text-white transition-all focus:ring-2 focus:ring-violet-500/40 outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5", children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5", children: "Keyword Style" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-1", children: [
              { value: "mixed", label: "Mix" },
              { value: "single", label: "Single" },
              { value: "multi", label: "Multi" }
            ].map((opt) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setKeywordMode(opt.value),
                className: `py-1.5 text-[10px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${keywordMode === opt.value ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"}`,
                children: opt.label
              },
              opt.value
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5", children: [
            /* @__PURE__ */ jsxs("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Type, { size: 12, className: "text-violet-500" }),
              /* @__PURE__ */ jsx("span", { children: "Title Length" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-1", children: [
              { value: "short", label: "Short" },
              { value: "medium", label: "Mid" },
              { value: "long", label: "Long" }
            ].map((opt) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setTitleLength(opt.value),
                className: `py-1.5 text-[10px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${titleLength === opt.value ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"}`,
                children: opt.label
              },
              opt.value
            )) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5 mb-3.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
            /* @__PURE__ */ jsxs("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Sparkles, { size: 12, className: "text-violet-500" }),
              /* @__PURE__ */ jsx("span", { children: t.custom_prompt_optional })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded", children: "Prompt Anchor" })
          ] }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              className: "w-full p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/80 outline-none text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none min-h-[60px] max-h-[90px] font-medium placeholder-slate-400",
              value: customPrompt,
              onChange: (e) => setCustomPrompt(e.target.value),
              placeholder: t.custom_prompt_placeholder
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxs("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Sliders, { size: 12, className: "text-amber-500" }),
              /* @__PURE__ */ jsx("span", { children: "AI Creativity" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-slate-400", children: getCreativityLabel(aiCreativity) }),
              /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 text-xs font-black rounded-md border border-slate-200 dark:border-slate-700 font-mono", children: aiCreativity.toFixed(1) })
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "range",
              min: "0.1",
              max: "1.0",
              step: "0.1",
              value: aiCreativity,
              onChange: (e) => setAiCreativity(parseFloat(e.target.value)),
              className: "w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3 w-full pt-2", children: [
        isLoading && progressInfo && /* @__PURE__ */ jsxs("div", { className: "p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl animate-in zoom-in-95 duration-200", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] font-extrabold uppercase tracking-wider mb-1.5", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-violet-600 dark:text-violet-400 flex items-center", children: [
              /* @__PURE__ */ jsx(RefreshCcw, { size: 11, className: "animate-spin mr-1.5" }),
              activeTool === ToolType.VIDEO ? "Decoding Frames" : activeTool === ToolType.VECTOR ? "Parsing Vector Data" : "Analyzing Visuals",
              " ",
              progressInfo.current,
              "/",
              progressInfo.total
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "text-slate-500 font-mono font-bold", children: [
              progressInfo.duration,
              "s elapsed"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
            "div",
            {
              className: "h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300 shadow-sm",
              style: { width: `${progressInfo.current / progressInfo.total * 100}%` }
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => handleGenerateAll(false),
              disabled: isLoading || !filesToGenerateCount,
              className: `flex-1 py-3.5 px-4 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer duration-200 active:scale-[0.98] ${isLoading && !isPaused ? "bg-violet-500 cursor-not-allowed" : isPaused ? "bg-amber-500 hover:bg-amber-600" : !filesToGenerateCount ? "bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none" : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30"}`,
              children: [
                isLoading ? /* @__PURE__ */ jsx(Loader2, { size: 16, className: "animate-spin" }) : /* @__PURE__ */ jsx(Zap, { size: 16, className: "fill-current" }),
                /* @__PURE__ */ jsx("span", { className: "text-xs sm:text-sm uppercase tracking-wider font-extrabold", children: isPaused ? "Rate-limited (Auto Retrying...)" : isLoading ? t.generating : `${t.generate_all} (${filesToGenerateCount})` })
              ]
            }
          ),
          isLoading && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleStopGeneration,
              className: "px-4 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center active:scale-[0.98] text-xs uppercase tracking-wider cursor-pointer",
              title: "Stop Processing",
              children: /* @__PURE__ */ jsx("span", { children: "STOP" })
            }
          )
        ] }),
        filesWithErrorCount > 0 && !isLoading && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => handleGenerateAll(true),
            className: "w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer",
            children: [
              /* @__PURE__ */ jsx(RefreshCcw, { size: 12 }),
              /* @__PURE__ */ jsxs("span", { children: [
                t.retry_failed,
                " (",
                filesWithErrorCount,
                ")"
              ] })
            ]
          }
        ),
        hasFiles && !isLoading && /* @__PURE__ */ jsx("div", { className: "flex lg:hidden pt-1 w-full", children: /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => {
              if ("vibrate" in navigator) {
                try {
                  navigator.vibrate(20);
                } catch (e) {
                }
              }
              setMobileTab("review");
            },
            className: "w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black rounded-xl flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider shadow active:scale-[0.98] transition-all",
            children: [
              /* @__PURE__ */ jsx("span", { children: "Next: Review & Export" }),
              /* @__PURE__ */ jsx(ArrowRight, { size: 14 })
            ]
          }
        ) })
      ] })
    ] })
  ] });
};
