import { jsx, jsxs } from "react/jsx-runtime";
import { Check, Download, FileSpreadsheet, FileJson } from "lucide-react";
export const ExportPanel = ({
  exportAdobe,
  setExportAdobe,
  exportShutterstock,
  setExportShutterstock,
  exportVecteezy,
  setExportVecteezy,
  exportCanva,
  setExportCanva,
  exportFreepik,
  setExportFreepik,
  exportPond5,
  setExportPond5,
  exportDepositPhotos,
  setExportDepositPhotos,
  exportMiriCanvas,
  setExportMiriCanvas,
  export123RF,
  setExport123RF,
  shutterstockDescMode,
  setShutterstockDescMode,
  autoDownloadCSV,
  setAutoDownloadCSV,
  canDownload,
  handleExport,
  handleBackupJSON,
  handleDownloadEmbedded,
  embedDownloading,
  t
}) => {
  const platforms = [
    {
      id: "adobe",
      name: "Adobe Stock",
      tag: "AD",
      desc: "Categories & CLIP keywords",
      checked: exportAdobe,
      setChecked: setExportAdobe,
      color: "border-slate-800 dark:border-violet-500 bg-slate-900/5 dark:bg-violet-500/10 text-slate-900 dark:text-violet-300"
    },
    {
      id: "shutterstock",
      name: "Shutterstock",
      tag: "SST",
      desc: "Dual category formatting",
      checked: exportShutterstock,
      setChecked: setExportShutterstock,
      color: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
    },
    {
      id: "vecteezy",
      name: "Vecteezy",
      tag: "VZ",
      desc: "Standard vector indexing",
      checked: exportVecteezy,
      setChecked: setExportVecteezy,
      color: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    },
    {
      id: "canva",
      name: "Canva",
      tag: "CNV",
      desc: "Simplified comma tags",
      checked: exportCanva,
      setChecked: setExportCanva,
      color: "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
    },
    {
      id: "freepik",
      name: "Freepik",
      tag: "FP",
      desc: "Category & split keywords",
      checked: exportFreepik,
      setChecked: setExportFreepik,
      color: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    },
    {
      id: "pond5",
      name: "Pond5",
      tag: "P5",
      desc: "Footage & audio metadata",
      checked: exportPond5,
      setChecked: setExportPond5,
      color: "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400"
    },
    {
      id: "depositphotos",
      name: "DepositPhotos",
      tag: "DP",
      desc: "Standard CSV structure",
      checked: exportDepositPhotos,
      setChecked: setExportDepositPhotos,
      color: "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400"
    },
    {
      id: "miricanvas",
      name: "MiriCanvas",
      tag: "MC",
      desc: "Korean/Global market tags",
      checked: exportMiriCanvas,
      setChecked: setExportMiriCanvas,
      color: "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
    },
    {
      id: "123rf",
      name: "123RF",
      tag: "123",
      desc: "Standard microstock CSV",
      checked: export123RF,
      setChecked: setExport123RF,
      color: "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400"
    }
  ];
  const selectedCount = platforms.filter((p) => p.checked).length;
  return /* @__PURE__ */ jsxs("div", { className: "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-xl shadow-black/5 flex flex-col relative overflow-hidden transition-all duration-300", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-slate-50/70 dark:bg-slate-850/50 py-3.5 px-5 border-b border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/20", children: "04" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "m-0 font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider", children: "Bulk Multi-Platform Export Controls" }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-400 font-semibold hidden sm:block", children: "Select stock platforms to export CSV metadata or embed tags directly into files" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg self-start sm:self-auto", children: [
        selectedCount,
        " platform",
        selectedCount !== 1 ? "s" : "",
        " selected"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-5 sm:p-6 space-y-5", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5", children: "Select Target Marketplaces" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5", children: platforms.map((plat) => /* @__PURE__ */ jsxs(
          "label",
          {
            className: `flex flex-col justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${plat.checked ? `${plat.color} shadow-xs` : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 hover:border-slate-300 dark:hover:border-slate-700"}`,
            children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  className: "hidden",
                  checked: plat.checked,
                  onChange: (e) => plat.setChecked(e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between w-full mb-2", children: [
                /* @__PURE__ */ jsx("span", { className: `text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${plat.checked ? "bg-black/10 dark:bg-white/10" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`, children: plat.tag }),
                /* @__PURE__ */ jsx("div", { className: `w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${plat.checked ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"}`, children: plat.checked && /* @__PURE__ */ jsx(Check, { size: 11, strokeWidth: 3 }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-xs font-black block truncate", children: plat.name }),
                /* @__PURE__ */ jsx("span", { className: "text-[9px] opacity-70 mt-0.5 block truncate leading-tight font-medium", children: plat.desc })
              ] })
            ]
          },
          plat.id
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1", children: [
        exportShutterstock && /* @__PURE__ */ jsxs("div", { className: "p-3.5 bg-slate-50/70 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-in fade-in duration-200", children: [
          /* @__PURE__ */ jsx("label", { className: "text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block", children: "Shutterstock Description Mode" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setShutterstockDescMode("desc"),
                className: `py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${shutterstockDescMode === "desc" ? "bg-rose-600 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`,
                children: "Description Only"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setShutterstockDescMode("title_desc"),
                className: `py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${shutterstockDescMode === "title_desc" ? "bg-rose-600 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`,
                children: "Title + Description"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block", children: "Auto-Download CSV" }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-medium", children: "Trigger CSV package download automatically" })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setAutoDownloadCSV(!autoDownloadCSV),
              className: `w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${autoDownloadCSV ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`,
              children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: `w-5 h-5 rounded-full bg-white transition-all shadow-sm transform ${autoDownloadCSV ? "translate-x-5" : "translate-x-0"}`
                }
              )
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-2.5", children: [
        handleBackupJSON && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleBackupJSON,
            disabled: !canDownload,
            className: `px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${canDownload ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750" : "bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800"}`,
            children: [
              /* @__PURE__ */ jsx(FileJson, { size: 15 }),
              /* @__PURE__ */ jsx("span", { children: "Backup as JSON" })
            ]
          }
        ),
        handleDownloadEmbedded && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleDownloadEmbedded,
            disabled: !canDownload || embedDownloading,
            className: `px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${canDownload && !embedDownloading ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"}`,
            children: [
              embedDownloading ? /* @__PURE__ */ jsx("span", { className: "animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" }) : /* @__PURE__ */ jsx(Download, { size: 15 }),
              /* @__PURE__ */ jsx("span", { children: embedDownloading ? "Embedding Tags..." : "Download Embedded Files" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleExport,
            disabled: !canDownload,
            className: `px-6 py-3 text-xs font-black uppercase tracking-wider rounded-xl text-white transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${canDownload ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25" : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"}`,
            children: [
              /* @__PURE__ */ jsx(FileSpreadsheet, { size: 16 }),
              /* @__PURE__ */ jsx("span", { children: "Export Compiled CSV Package" })
            ]
          }
        )
      ] })
    ] })
  ] });
};
