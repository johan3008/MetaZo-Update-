import { jsx, jsxs } from "react/jsx-runtime";
import { Trash2, ImageIcon, Film, FileCode, ArrowRight, UploadCloud, CheckCircle2 } from "lucide-react";
import { HelpIcon } from "./HelpIcon";
import { ToolType } from "../../types";
export const UploadPanel = ({
  activeTool,
  isDragging,
  setIsDragging,
  handleFileChange,
  fileInputRef,
  files,
  setPreviewFile,
  updateFiles,
  mobileTab,
  setMobileTab,
  t
}) => {
  const hasFiles = files.length > 0;
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const getToolTheme = () => {
    if (activeTool === ToolType.IMAGE) {
      return {
        accent: "violet",
        bgGlow: "bg-violet-500/10",
        text: "text-violet-600 dark:text-violet-400",
        borderActive: "border-violet-500 bg-violet-500/5 ring-4 ring-violet-500/10",
        btnBg: "bg-violet-600 hover:bg-violet-700 text-white",
        formats: ["JPG", "JPEG", "PNG", "WEBP"]
      };
    }
    if (activeTool === ToolType.VIDEO) {
      return {
        accent: "purple",
        bgGlow: "bg-purple-500/10",
        text: "text-purple-600 dark:text-purple-400",
        borderActive: "border-purple-500 bg-purple-500/5 ring-4 ring-purple-500/10",
        btnBg: "bg-purple-600 hover:bg-purple-700 text-white",
        formats: ["MP4", "MOV", "WEBM"]
      };
    }
    return {
      accent: "emerald",
      bgGlow: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      borderActive: "border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10",
      btnBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
      formats: ["SVG", "EPS", "AI"]
    };
  };
  const theme = getToolTheme();
  return /* @__PURE__ */ jsxs("div", { className: `bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-xl shadow-black/5 flex flex-col min-h-[480px] relative overflow-hidden transition-all duration-300 ${mobileTab === "upload" ? "flex animate-in fade-in slide-in-from-bottom-5 duration-300" : "hidden lg:flex"}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-slate-50/70 dark:bg-slate-850/50 py-3.5 px-5 border-b border-slate-200/60 dark:border-white/5 flex justify-between items-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/20", children: "01" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("h3", { className: "m-0 font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider", children: t.upload_title }),
          /* @__PURE__ */ jsx(HelpIcon, { title: t.upload_help })
        ] })
      ] }),
      hasFiles && /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => {
            files.forEach((f) => {
              if (f.analysisFrames) {
                f.analysisFrames.forEach((frame) => {
                  if (frame.startsWith("blob:")) {
                    URL.revokeObjectURL(frame);
                  }
                });
              }
            });
            updateFiles(() => []);
          },
          className: "px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all border border-rose-200 dark:border-rose-500/20 flex items-center gap-1.5 text-[11px] font-bold cursor-pointer",
          title: t.upload_reset_title,
          children: [
            /* @__PURE__ */ jsx(Trash2, { size: 13 }),
            /* @__PURE__ */ jsx("span", { children: t.upload_reset })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 flex-grow flex flex-col justify-between", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          onDragOver: (e) => {
            e.preventDefault();
            setIsDragging(true);
          },
          onDragLeave: (e) => {
            e.preventDefault();
            setIsDragging(false);
          },
          onDrop: (e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFileChange({ target: { files: e.dataTransfer.files } });
            }
          },
          onClick: triggerFileInput,
          className: `flex-grow border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] relative group overflow-hidden ${isDragging ? theme.borderActive : "border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-black/20 hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-violet-50/20 dark:hover:bg-violet-950/10"}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none", children: /* @__PURE__ */ jsx("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" }) }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                ref: fileInputRef,
                multiple: true,
                accept: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "*/*" : activeTool === ToolType.IMAGE ? ".jpg,.jpeg,.png,.webp" : activeTool === ToolType.VIDEO ? ".mp4,.mov,.webm" : ".svg,.eps,.ai",
                onChange: handleFileChange,
                className: "hidden"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1", children: [
              /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg shadow-black/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-violet-500/20 group-hover:border-violet-500/30", children: activeTool === ToolType.IMAGE ? /* @__PURE__ */ jsx(ImageIcon, { size: 28, className: theme.text, strokeWidth: 2 }) : activeTool === ToolType.VIDEO ? /* @__PURE__ */ jsx(Film, { size: 28, className: theme.text, strokeWidth: 2 }) : /* @__PURE__ */ jsx(FileCode, { size: 28, className: theme.text, strokeWidth: 2 }) }),
              /* @__PURE__ */ jsx("p", { className: "text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5", children: t.drag_drop }),
              /* @__PURE__ */ jsx("p", { className: "font-black text-base sm:text-lg text-slate-800 dark:text-white tracking-tight mb-3", children: t.click_to_choose }),
              /* @__PURE__ */ jsxs("div", { className: `px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${theme.btnBg}`, children: [
                /* @__PURE__ */ jsx(UploadCloud, { size: 15 }),
                /* @__PURE__ */ jsx("span", { children: "Browse Files" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mt-5 flex-wrap justify-center", children: [
                /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1", children: "Formats:" }),
                theme.formats.map((fmt) => /* @__PURE__ */ jsxs("span", { className: "px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold tracking-wider", children: [
                  ".",
                  fmt
                ] }, fmt))
              ] })
            ] })
          ]
        }
      ),
      hasFiles && /* @__PURE__ */ jsxs("div", { className: "mt-4 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between animate-in fade-in duration-300", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center", children: /* @__PURE__ */ jsx(CheckCircle2, { size: 16 }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("span", { className: "text-slate-700 dark:text-slate-200 text-xs font-black block", children: [
              files.length,
              " ",
              t.files_selected
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-slate-400 text-[10px] font-semibold", children: "Ready for AI processing" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex -space-x-2 overflow-hidden py-1", children: [
          files.slice(0, 5).map((f) => /* @__PURE__ */ jsx(
            "div",
            {
              onClick: (e) => {
                e.stopPropagation();
                setPreviewFile(f);
              },
              className: "w-9 h-9 rounded-xl border-2 border-white dark:border-slate-850 bg-slate-200 dark:bg-slate-800 overflow-hidden cursor-pointer hover:scale-115 hover:z-20 transition-all shadow-sm",
              title: f.file.name,
              children: f.file.type.startsWith("video/") && f.analysisFrames && f.analysisFrames.length >= 3 ? /* @__PURE__ */ jsx("img", { src: f.analysisFrames[1] || void 0, className: "w-full h-full object-cover", loading: "lazy", alt: "" }) : f.thumbnail ? /* @__PURE__ */ jsx("img", { src: f.thumbnail || void 0, className: "w-full h-full object-cover", loading: "lazy", alt: "" }) : /* @__PURE__ */ jsx("div", { className: "w-full h-full bg-slate-700 flex items-center justify-center text-[9px] text-white font-extrabold", children: f.file.name.split(".").pop()?.toUpperCase() || "FILE" })
            },
            f.id
          )),
          files.length > 5 && /* @__PURE__ */ jsxs("div", { className: "w-9 h-9 rounded-xl border-2 border-white dark:border-slate-850 bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shadow-sm", children: [
            "+",
            files.length - 5
          ] })
        ] })
      ] }),
      hasFiles && /* @__PURE__ */ jsx("div", { className: "flex lg:hidden mt-4 pt-3 border-t border-slate-200 dark:border-white/5 w-full", children: /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => {
            if ("vibrate" in navigator) {
              try {
                navigator.vibrate(20);
              } catch (e) {
              }
            }
            setMobileTab("ai");
          },
          className: "w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all",
          children: [
            /* @__PURE__ */ jsx("span", { children: t.upload_next_ai }),
            /* @__PURE__ */ jsx(ArrowRight, { size: 14 })
          ]
        }
      ) })
    ] })
  ] });
};
