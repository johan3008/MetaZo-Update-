import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React from "react";
import { Search, CheckCircle2, Trash2, FileCode, Check, Loader2, Sparkles, Film, Copy, Tag, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { ToolType } from "../../types";
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO, DREAMSTIME_CATEGORIES, MIRICANVAS_CATEGORIES } from "../../constants";
import { copyToClipboard } from "../utils";
import { motion, AnimatePresence } from "motion/react";
import { getHeaders } from "../../services/geminiService";
const ProjectCopyBox = ({
  label,
  value,
  isTextArea,
  themeColor,
  showLengthRating,
  onChange
}) => {
  const [copied, setCopied] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value || "");
  React.useEffect(() => {
    setLocalValue(value || "");
  }, [value]);
  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };
  const handleCopy = async () => {
    const success = await copyToClipboard(localValue);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    }
  };
  const safeValue = localValue || "";
  const len = safeValue.length;
  const isTitle = label.toLowerCase().includes("title") || label.toLowerCase().includes("judul");
  const minLen = isTitle ? 15 : 50;
  const ratingText = len < minLen ? "Too short" : len <= 200 ? "Optimal" : "Too long";
  const ratingColor = len < minLen ? "text-rose-500 bg-rose-500/10" : len <= 200 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10";
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [
      /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx("span", { children: label }),
        showLengthRating && /* @__PURE__ */ jsxs("span", { className: `px-2 py-0.5 rounded-full text-[9px] font-bold ${ratingColor}`, children: [
          len,
          " chars \u2022 ",
          ratingText
        ] })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: handleCopy,
          className: "text-violet-600 dark:text-violet-400 font-extrabold hover:underline flex items-center gap-1 text-[10px] lowercase cursor-pointer",
          children: [
            copied ? /* @__PURE__ */ jsx(Check, { size: 11, className: "text-emerald-500" }) : /* @__PURE__ */ jsx(Copy, { size: 11 }),
            /* @__PURE__ */ jsx("span", { children: copied ? "copied!" : "copy" })
          ]
        }
      )
    ] }),
    isTextArea ? /* @__PURE__ */ jsx(
      "textarea",
      {
        value: safeValue,
        onChange: (e) => setLocalValue(e.target.value),
        onBlur: handleBlur,
        maxLength: isTitle ? 200 : void 0,
        className: "w-full p-3 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs text-slate-800 dark:text-slate-200 transition-all font-medium resize-none min-h-[72px] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/80"
      }
    ) : /* @__PURE__ */ jsx(
      "input",
      {
        type: "text",
        value: safeValue,
        onChange: (e) => setLocalValue(e.target.value),
        onBlur: handleBlur,
        maxLength: isTitle ? 200 : void 0,
        className: "w-full p-2.5 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs text-slate-800 dark:text-slate-200 transition-all font-bold focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/80"
      }
    )
  ] });
};
export const getNearDuplicates = (kws) => {
  const normalized = kws.map((k) => k.toLowerCase().trim());
  const toRemove = /* @__PURE__ */ new Set();
  for (let i = 0; i < normalized.length; i++) {
    const a = normalized[i];
    if (!a) continue;
    for (let j = i + 1; j < normalized.length; j++) {
      const b = normalized[j];
      if (!b) continue;
      if (a === b) {
        toRemove.add(kws[j]);
        continue;
      }
      if (a === b + "s" || b === a + "s" || a === b + "es" || b === a + "es" || a.replace(/ies$/, "y") === b || b.replace(/ies$/, "y") === a) {
        if (a.length > b.length) toRemove.add(kws[i]);
        else toRemove.add(kws[j]);
      }
    }
  }
  return Array.from(toRemove);
};
const ProjectKeywordList = ({
  label,
  keywords = [],
  themeColor,
  onChange,
  title,
  description,
  aiOptions,
  keywordCount,
  hideIndividualFix = false,
  t
}) => {
  const [inputValue, setInputValue] = React.useState("");
  const [draggedIndex, setDraggedIndex] = React.useState(null);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const nearDuplicates = React.useMemo(() => getNearDuplicates(keywords), [keywords]);
  React.useEffect(() => {
    const seen = /* @__PURE__ */ new Set();
    const uniqueKeywords = keywords.filter((k) => {
      const normalized = k.toLowerCase().trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
    if (uniqueKeywords.length !== keywords.length) {
      onChange(uniqueKeywords);
    }
  }, [keywords, onChange]);
  const handleCopy = async () => {
    const success = await copyToClipboard(keywords.join(", "));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    }
  };
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newKeywords = [...keywords];
    const draggedKeyword = newKeywords[draggedIndex];
    newKeywords.splice(draggedIndex, 1);
    newKeywords.splice(index, 0, draggedKeyword);
    onChange(newKeywords);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  const handleAdd = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const clean = inputValue.trim().replace(/,/g, "");
      if (clean && !keywords.includes(clean)) {
        onChange([...keywords, clean]);
      }
      setInputValue("");
    }
  };
  const handleRemove = (kw) => {
    onChange(keywords.filter((k) => k !== kw));
  };
  const handleSmartSuggest = async () => {
    if (!title || !title.trim()) {
      setSuggestError("Enter Title first");
      setTimeout(() => setSuggestError(null), 3e3);
      return;
    }
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const response = await fetch("/api/smart-suggest-keywords", {
        method: "POST",
        headers: getHeaders(aiOptions),
        body: JSON.stringify({
          title,
          description: description || "",
          existingKeywords: keywords,
          model: aiOptions?.model
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Suggestion failed");
      }
      const data = await response.json();
      const suggested = data.keywords || [];
      if (suggested.length === 0) {
        setSuggestError("No suggestions");
        setTimeout(() => setSuggestError(null), 3e3);
      } else {
        const uniqueNew = suggested.filter((kw) => !keywords.includes(kw));
        if (uniqueNew.length > 0) {
          onChange([...keywords, ...uniqueNew]);
        } else {
          setSuggestError("Already comprehensive");
          setTimeout(() => setSuggestError(null), 3e3);
        }
      }
    } catch (err) {
      console.error(err);
      setSuggestError(err.message || "Error");
      setTimeout(() => setSuggestError(null), 5e3);
    } finally {
      setIsSuggesting(false);
    }
  };
  const handleShuffle = () => {
    const shuffled = [...keywords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    onChange(shuffled);
  };
  const handleClean = () => {
    const cleaned = [];
    const seen = /* @__PURE__ */ new Set();
    keywords.forEach((k) => {
      const trimmed = k.trim();
      if (!trimmed) return;
      const normalized = trimmed.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        cleaned.push(trimmed);
      }
    });
    onChange(cleaned);
  };
  const handleClipRank = () => {
    if (!keywords || keywords.length === 0) return;
    const titleWords = (title || "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const descWords = (description || "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const scored = keywords.map((kw, originalIndex) => {
      const cleanKw = kw.toLowerCase().trim();
      let score = 0.5;
      if (titleWords.some((tw) => cleanKw === tw || cleanKw.includes(tw) || tw.includes(cleanKw))) {
        score += 0.45;
      }
      if (descWords.some((dw) => cleanKw === dw || cleanKw.includes(dw))) {
        score += 0.25;
      }
      if (cleanKw.includes(" ") && cleanKw.split(" ").length <= 3) {
        score += 0.15;
      }
      score -= originalIndex * 1e-3;
      return { kw, score };
    });
    scored.sort((a, b) => b.score - a.score);
    onChange(scored.map((item) => item.kw));
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 gap-2", children: [
      /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Tag, { size: 12, className: "text-violet-500" }),
        /* @__PURE__ */ jsx("span", { children: label }),
        /* @__PURE__ */ jsxs("span", { className: "px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold", children: [
          keywords.length,
          "/49"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center flex-wrap gap-1.5", children: [
        suggestError && /* @__PURE__ */ jsx("span", { className: "text-rose-500 font-bold normal-case leading-none animate-pulse mr-1", children: suggestError }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleClipRank,
            title: "Sort keywords by CLIP semantic relevance to title",
            className: "px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer",
            children: /* @__PURE__ */ jsx("span", { children: "\u26A1 CLIP Rank" })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleClean,
            className: "px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer",
            children: "Clean"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleShuffle,
            className: "px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer",
            children: "Shuffle"
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleCopy,
            className: "px-2 py-1 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer",
            children: [
              copied ? /* @__PURE__ */ jsx(Check, { size: 11, className: "text-emerald-500" }) : /* @__PURE__ */ jsx(Copy, { size: 11 }),
              /* @__PURE__ */ jsx("span", { children: copied ? "Copied" : "Copy" })
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleSmartSuggest,
            disabled: isSuggesting || !title || !title.trim(),
            title: !title || !title.trim() ? "Enter title first for context" : "AI will suggest 5 commercial keywords",
            className: "px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 text-[10px] transition-all disabled:opacity-40 cursor-pointer",
            children: isSuggesting ? /* @__PURE__ */ jsx(Loader2, { size: 11, className: "animate-spin" }) : /* @__PURE__ */ jsx("span", { children: "\u2728 Smart Suggest" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-violet-700 dark:text-violet-300 font-semibold flex items-center gap-1.5 py-1.5 px-3 bg-violet-500/8 dark:bg-violet-500/15 rounded-lg border border-violet-500/15", children: [
      /* @__PURE__ */ jsx("span", { children: "\u{1F4A1}" }),
      /* @__PURE__ */ jsx("span", { children: t && t.language === "Bahasa" ? "Urutan kata kunci menentukan peringkat pencarian Adobe Stock. Keyword #1 (\u{1F451}) adalah yang paling utama!" : "Keyword ordering dictates Adobe Stock search ranking. Keyword #1 (\u{1F451}) carries the highest search weight!" })
    ] }),
    nearDuplicates.length > 0 && !hideIndividualFix && /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 text-[10px] font-bold gap-2", children: [
      /* @__PURE__ */ jsxs("span", { className: "truncate", title: nearDuplicates.join(", "), children: [
        "\u26A0\uFE0F Near-duplicates detected (",
        nearDuplicates.slice(0, 3).join(", "),
        ")"
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: async () => {
            const targetCount = Number(keywordCount) || 40;
            const initialCleaned = keywords.filter((k) => !nearDuplicates.includes(k));
            if (initialCleaned.length >= targetCount || !title) {
              onChange(initialCleaned.slice(0, targetCount));
              return;
            }
            setIsSuggesting(true);
            try {
              const res = await fetch("/api/smart-suggest-keywords", {
                method: "POST",
                headers: getHeaders(aiOptions),
                body: JSON.stringify({
                  title,
                  description,
                  existingKeywords: initialCleaned,
                  requestCount: targetCount - initialCleaned.length,
                  model: aiOptions?.model
                })
              });
              if (!res.ok) throw new Error();
              const data = await res.json();
              const suggested = data.keywords || [];
              const merged = [...initialCleaned, ...suggested].slice(0, targetCount);
              onChange(merged);
            } catch (e) {
              onChange(initialCleaned);
            } finally {
              setIsSuggesting(false);
            }
          },
          disabled: isSuggesting,
          className: "px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer font-extrabold",
          children: [
            isSuggesting && /* @__PURE__ */ jsx(Loader2, { size: 11, className: "animate-spin" }),
            " Fix file"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-2.5 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar", children: [
      /* @__PURE__ */ jsx(AnimatePresence, { mode: "popLayout", children: keywords.map((kw, index) => {
        const isFirst = index === 0;
        const isTop5 = index > 0 && index < 5;
        let badgeClass = "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/5 hover:border-slate-300";
        if (isFirst) {
          badgeClass = "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10 font-black";
        } else if (isTop5) {
          badgeClass = "bg-violet-500/15 text-violet-800 dark:text-violet-300 border border-violet-500/30 font-bold";
        }
        return /* @__PURE__ */ jsxs(
          motion.span,
          {
            draggable: true,
            onDragStart: (e) => handleDragStart(e, index),
            onDragOver: (e) => handleDragOver(e, index),
            onDragEnd: handleDragEnd,
            initial: { scale: 0.7, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.7, opacity: 0, transition: { duration: 0.12 } },
            transition: { type: "spring", stiffness: 500, damping: 28 },
            layout: true,
            className: `inline-flex cursor-grab active:cursor-grabbing items-center px-2 py-1 rounded-lg text-[10px] select-none transition-shadow ${badgeClass} ${draggedIndex === index ? "opacity-40 ring-2 ring-violet-500" : ""}`,
            title: isFirst ? "Keyword #1 - Prime Search Importance (\u{1F451} Top 1)" : isTop5 ? `Keyword #${index + 1} - High Search Priority (Top 5)` : `Keyword #${index + 1}`,
            children: [
              /* @__PURE__ */ jsx("span", { className: "opacity-70 mr-1 text-[9px] font-black font-mono shrink-0", children: isFirst ? "\u{1F451}" : `#${index + 1}` }),
              /* @__PURE__ */ jsx("span", { className: "truncate max-w-[140px]", children: kw }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => handleRemove(kw),
                  className: "ml-1 text-slate-400 hover:text-rose-600 font-bold text-xs leading-none p-0.5 rounded cursor-pointer",
                  children: "\xD7"
                }
              )
            ]
          },
          `${kw}-${index}`
        );
      }) }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: inputValue,
          onChange: (e) => setInputValue(e.target.value),
          onKeyDown: handleAdd,
          placeholder: "+ Add keyword (Enter)...",
          className: "bg-transparent border-none outline-none text-xs font-semibold p-1 text-slate-700 dark:text-slate-300 flex-grow min-w-[120px] placeholder-slate-400"
        }
      )
    ] })
  ] });
};
const ExifCollapse = ({ exif }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  if (!exif || Object.keys(exif).length === 0) return null;
  return /* @__PURE__ */ jsxs("div", { className: "border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-black/10", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => setIsOpen(!isOpen),
        className: "w-full px-3.5 py-2 flex items-center justify-between text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors focus:outline-none cursor-pointer",
        children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("span", { children: "\u{1F4CA}" }),
            /* @__PURE__ */ jsx("span", { children: "Technical EXIF Metadata" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-extrabold normal-case bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1", children: isOpen ? /* @__PURE__ */ jsxs(Fragment, { children: [
            "Hide info ",
            /* @__PURE__ */ jsx(ChevronUp, { size: 11 })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            "View info ",
            /* @__PURE__ */ jsx(ChevronDown, { size: 11 })
          ] }) })
        ]
      }
    ),
    isOpen && /* @__PURE__ */ jsx("div", { className: "p-3 border-t border-slate-200 dark:border-slate-800 max-h-[180px] overflow-y-auto text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-1 bg-white dark:bg-black/20", children: Object.entries(exif).map(([key, val]) => {
      if (typeof val === "object" && val !== null) {
        val = JSON.stringify(val);
      }
      return /* @__PURE__ */ jsxs("div", { className: "flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-1 gap-4", children: [
        /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-700 dark:text-slate-300 shrink-0", children: key }),
        /* @__PURE__ */ jsx("span", { className: "text-right truncate max-w-[240px] font-semibold text-slate-500 dark:text-slate-400", title: String(val), children: String(val) })
      ] }, key);
    }) })
  ] });
};
const FileNameInput = ({ initialName, onNameChange }) => {
  const [localName, setLocalName] = React.useState(initialName);
  React.useEffect(() => {
    setLocalName(initialName);
  }, [initialName]);
  const handleBlur = () => {
    if (localName !== initialName) {
      onNameChange(localName);
    }
  };
  return /* @__PURE__ */ jsx(
    "input",
    {
      type: "text",
      value: localName,
      onChange: (e) => setLocalName(e.target.value),
      onBlur: handleBlur,
      className: "text-xs sm:text-sm font-black text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 outline-none w-full truncate cursor-text transition-colors pb-0.5",
      title: "Click to edit filename"
    }
  );
};
export const ReviewQueue = ({
  files,
  activeTool,
  searchQuery,
  setSearchQuery,
  setPreviewFile,
  updateFiles,
  handleDeleteFile,
  handleRegenerateFile,
  mobileTab,
  setMobileTab,
  t,
  isAllFinished,
  successfulFilesCount,
  canDownload,
  isLoading,
  progressInfo,
  aiOptions,
  keywordCount
}) => {
  const hasFiles = files.length > 0;
  const [isFixingBatch, setIsFixingBatch] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [copiedCardId, setCopiedCardId] = React.useState(null);
  const filesWithDuplicates = React.useMemo(() => {
    return files.filter((f) => f.title && getNearDuplicates(f.keywords).length > 0);
  }, [files]);
  const handleFixBatch = async () => {
    if (filesWithDuplicates.length === 0) return;
    setIsFixingBatch(true);
    try {
      const targetCount = Number(keywordCount) || 40;
      const promises = filesWithDuplicates.map(async (file) => {
        const dups = getNearDuplicates(file.keywords);
        const initialCleaned = file.keywords.filter((k) => !dups.includes(k));
        if (initialCleaned.length >= targetCount) {
          return { id: file.id, keywords: initialCleaned.slice(0, targetCount) };
        }
        try {
          const res = await fetch("/api/smart-suggest-keywords", {
            method: "POST",
            headers: getHeaders(aiOptions),
            body: JSON.stringify({
              title: file.title,
              description: file.description || "",
              existingKeywords: initialCleaned,
              requestCount: targetCount - initialCleaned.length,
              model: aiOptions?.model
            })
          });
          if (!res.ok) {
            return { id: file.id, keywords: initialCleaned };
          }
          const data = await res.json();
          const suggested = data.keywords || [];
          const merged = [...initialCleaned, ...suggested].slice(0, targetCount);
          return { id: file.id, keywords: merged };
        } catch (e) {
          console.error("Failed to suggest for file", file.id, e);
          return { id: file.id, keywords: initialCleaned };
        }
      });
      const results = await Promise.all(promises);
      updateFiles((prev) => prev.map((f) => {
        const r = results.find((res) => res.id === f.id);
        if (r) {
          return { ...f, keywords: r.keywords };
        }
        return f;
      }));
    } catch (err) {
      console.error("Batch fix error:", err);
    } finally {
      setIsFixingBatch(false);
    }
  };
  const handleCopyAllMetadata = async (file) => {
    const text = `Title: ${file.title || ""}

Description: ${file.description || ""}

Keywords: ${(file.keywords || []).join(", ")}`;
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedCardId(file.id);
      setTimeout(() => setCopiedCardId(null), 2e3);
    }
  };
  const filteredFiles = files.filter((f) => {
    if (statusFilter === "ready" && !f.title) return false;
    if (statusFilter === "pending" && (f.title || f.error)) return false;
    if (statusFilter === "error" && !f.error) return false;
    const term = searchQuery.toLowerCase();
    if (!term) return true;
    const name = (f.customFileName || f.file.name).toLowerCase();
    const title = (f.title || "").toLowerCase();
    const desc = (f.description || "").toLowerCase();
    const keywords = (f.keywords || []).join(", ").toLowerCase();
    return name.includes(term) || title.includes(term) || desc.includes(term) || keywords.includes(term);
  });
  const isGenerating = isLoading && files.some((f) => f.isGenerating || f.isExtracting);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      id: "review-queue-section",
      className: `bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border rounded-2xl shadow-xl overflow-hidden relative transition-all duration-300 ${isGenerating ? "border-violet-500 ring-2 ring-violet-500/20 shadow-violet-500/10" : "border-slate-200/80 dark:border-white/5 shadow-black/5"} ${mobileTab === "review" ? "block animate-in fade-in slide-in-from-bottom-5 duration-300" : "hidden lg:block"}`,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-50/70 dark:bg-slate-850/50 py-3.5 px-5 border-b border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/20", children: "03" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "m-0 font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider", children: "Review & Refine Queue" }),
              /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-400 font-semibold hidden sm:block", children: "Inspect metadata, drag keywords to reorder, and assign marketplace categories" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: canDownload && /* @__PURE__ */ jsxs("span", { className: "px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { size: 13 }),
            /* @__PURE__ */ jsx("span", { children: "Ready to Export" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-5 sm:p-6", children: [
          hasFiles && /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5", children: [
            /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0", children: [
              { id: "all", label: `All (${files.length})` },
              { id: "ready", label: `Ready (${successfulFilesCount})` },
              { id: "pending", label: `Pending (${files.filter((f) => !f.title && !f.error).length})` },
              { id: "error", label: `Errors (${files.filter((f) => !!f.error).length})` }
            ].map((pill) => /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setStatusFilter(pill.id),
                className: `px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${statusFilter === pill.id ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750"}`,
                children: pill.label
              },
              pill.id
            )) }),
            /* @__PURE__ */ jsxs("div", { className: "relative min-w-[220px]", children: [
              /* @__PURE__ */ jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: searchQuery,
                  onChange: (e) => setSearchQuery(e.target.value),
                  placeholder: "Search queue...",
                  className: "w-full pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-transparent focus:border-violet-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                }
              ),
              searchQuery && /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setSearchQuery(""),
                  className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200",
                  children: "\xD7"
                }
              )
            ] })
          ] }),
          files.length > 1 && filesWithDuplicates.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5", children: [
                "\u26A0\uFE0F Keyword Clean Alert (",
                filesWithDuplicates.length,
                " file",
                filesWithDuplicates.length > 1 ? "s" : "",
                ")"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5", children: "Detected duplicate keywords or sub-optimal count across assets. Clean and top-up all files automatically." })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleFixBatch,
                disabled: isFixingBatch,
                className: "px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0",
                children: isFixingBatch ? /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(Loader2, { size: 13, className: "animate-spin" }),
                  /* @__PURE__ */ jsx("span", { children: "Fixing All Files..." })
                ] }) : /* @__PURE__ */ jsxs("span", { children: [
                  "Fix All Files (",
                  filesWithDuplicates.length,
                  ")"
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "space-y-5 max-h-[620px] overflow-y-auto pr-1.5 custom-scrollbar", children: /* @__PURE__ */ jsx(AnimatePresence, { mode: "wait", children: !hasFiles ? /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              className: "flex flex-col items-center justify-center py-16 text-slate-400",
              children: [
                /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400", children: /* @__PURE__ */ jsx(FileCode, { size: 30, strokeWidth: 1.5 }) }),
                /* @__PURE__ */ jsx("p", { className: "text-sm font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300", children: "No assets uploaded yet" }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Upload images, videos, or vectors in Step 1 to begin." })
              ]
            },
            "empty"
          ) : filteredFiles.length === 0 ? /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              className: "flex flex-col items-center justify-center py-16 text-slate-400",
              children: [
                /* @__PURE__ */ jsx(Search, { size: 36, className: "mb-2 opacity-50" }),
                /* @__PURE__ */ jsx("p", { className: "text-xs font-extrabold uppercase tracking-wider text-slate-500", children: "No matching assets found" }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => {
                      setStatusFilter("all");
                      setSearchQuery("");
                    },
                    className: "mt-2 text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline",
                    children: "Reset all filters"
                  }
                )
              ]
            },
            "no-match"
          ) : filteredFiles.map((file, index) => /* @__PURE__ */ jsxs(
            motion.div,
            {
              layout: true,
              id: `file-card-${file.id}`,
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              className: `relative bg-white dark:bg-slate-850 rounded-2xl border transition-all duration-300 p-5 shadow-sm hover:shadow-md ${file.error ? "border-rose-300 dark:border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10" : file.title ? "border-slate-200/90 dark:border-white/10 hover:border-violet-500/40" : "border-slate-200/70 dark:border-white/5"}`,
              children: [
                file.isGenerating && /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2 rounded-2xl", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center animate-bounce", children: /* @__PURE__ */ jsx(Sparkles, { size: 20 }) }),
                  /* @__PURE__ */ jsx("h5", { className: "text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider", children: "Generating Metadata..." }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-400 font-semibold", children: "Analyzing visual semantics and generating keywords" })
                ] }),
                file.isExtracting && /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2 rounded-2xl", children: [
                  /* @__PURE__ */ jsx(Loader2, { size: 24, className: "text-purple-600 animate-spin" }),
                  /* @__PURE__ */ jsx("h5", { className: "text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider", children: "Decoding Video Frames..." })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "absolute top-4 right-4 flex items-center gap-1.5 z-10", children: [
                  file.title && /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => handleCopyAllMetadata(file),
                      className: "p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer",
                      title: "Copy All Metadata (Title, Desc, Keywords)",
                      children: [
                        copiedCardId === file.id ? /* @__PURE__ */ jsx(Check, { size: 13, className: "text-emerald-500" }) : /* @__PURE__ */ jsx(Copy, { size: 13 }),
                        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline text-[10px] uppercase font-extrabold", children: copiedCardId === file.id ? "Copied" : "Copy All" })
                      ]
                    }
                  ),
                  handleRegenerateFile && /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleRegenerateFile(file),
                      disabled: file.isGenerating || file.isExtracting,
                      className: "p-2 bg-slate-100 hover:bg-violet-50 dark:bg-slate-800 dark:hover:bg-violet-950/30 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-40 rounded-lg transition-all cursor-pointer",
                      title: "Regenerate metadata for this asset",
                      children: /* @__PURE__ */ jsx(Sparkles, { size: 13, className: file.isGenerating ? "animate-spin" : "" })
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleDeleteFile(file.id),
                      className: "p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer",
                      title: "Delete asset from queue",
                      children: /* @__PURE__ */ jsx(Trash2, { size: 13 })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col space-y-4", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4 pr-24", children: [
                    /* @__PURE__ */ jsxs("span", { className: "text-slate-300 dark:text-slate-700 font-black text-sm pt-1 select-none font-mono", children: [
                      "#",
                      index + 1
                    ] }),
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        onClick: () => setPreviewFile(file),
                        className: "w-18 h-18 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-500/50 hover:scale-105 transition-all shadow-sm relative group",
                        title: "Click to zoom preview",
                        children: file.file.type.startsWith("video/") && file.analysisFrames && file.analysisFrames.length >= 3 ? /* @__PURE__ */ jsxs("div", { className: "relative w-full h-full", children: [
                          /* @__PURE__ */ jsx("img", { src: file.analysisFrames[1] || void 0, className: "w-full h-full object-cover", alt: "", loading: "lazy" }),
                          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/30 flex items-center justify-center", children: /* @__PURE__ */ jsx(Film, { size: 16, className: "text-white drop-shadow" }) })
                        ] }) : file.thumbnail ? /* @__PURE__ */ jsx("img", { src: file.thumbnail || void 0, className: "w-full h-full object-cover transition-transform duration-300 group-hover:scale-110", alt: "", loading: "lazy" }) : /* @__PURE__ */ jsxs("div", { className: "w-full h-full flex flex-col items-center justify-center text-slate-400 font-bold text-[10px]", children: [
                          /* @__PURE__ */ jsx(FileCode, { size: 22, className: "mb-0.5 text-slate-500" }),
                          /* @__PURE__ */ jsx("span", { children: file.file.name.split(".").pop()?.toUpperCase() })
                        ] })
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                      /* @__PURE__ */ jsx(
                        FileNameInput,
                        {
                          initialName: file.customFileName ?? file.file.name,
                          onNameChange: (newName) => {
                            updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, customFileName: newName } : f));
                          }
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex flex-wrap gap-1.5 items-center", children: [
                        file.error ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-rose-500/20", children: [
                          "Error: ",
                          file.error
                        ] }) : file.title ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-emerald-500/20", children: [
                          /* @__PURE__ */ jsx(CheckCircle2, { size: 11 }),
                          "Analysis Complete"
                        ] }) : /* @__PURE__ */ jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-md", children: "Waiting in Queue" }),
                        /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-400 font-medium", children: [
                          "\u2022 ",
                          (file.file.size / (1024 * 1024)).toFixed(2),
                          " MB"
                        ] })
                      ] }),
                      file.file.type.startsWith("video/") && file.analysisFrames && file.analysisFrames.length >= 3 && /* @__PURE__ */ jsxs("div", { className: "mt-2.5", children: [
                        /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1", children: "Temporal Storyboards (10%, 50%, 90%)" }),
                        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-1.5 max-w-[260px]", children: file.analysisFrames.slice(0, 3).map((frame, idx) => /* @__PURE__ */ jsxs("div", { className: "aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative", children: [
                          /* @__PURE__ */ jsx("img", { src: frame, className: "w-full h-full object-cover", alt: "" }),
                          /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.2 font-bold", children: idx === 0 ? "10%" : idx === 1 ? "50%" : "90%" })
                        ] }, idx)) })
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(ExifCollapse, { exif: file.exifMetadata }),
                  file.title && /* @__PURE__ */ jsxs("div", { className: "space-y-4 pt-2 border-t border-slate-100 dark:border-white/5 animate-in fade-in duration-200", children: [
                    Array.isArray(file.yolo_detected_objects) && file.yolo_detected_objects.length > 0 && /* @__PURE__ */ jsxs("div", { className: "p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-500/20", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                          /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-indigo-500 animate-ping" }),
                          /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider", children: [
                            "YOLO Grounded Objects (",
                            file.yolo_detected_objects.length,
                            ")"
                          ] })
                        ] }),
                        /* @__PURE__ */ jsx("span", { className: "text-[9px] font-mono text-slate-400 font-bold", children: "100% FACTUAL" })
                      ] }),
                      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: file.yolo_detected_objects.map((obj, idx) => /* @__PURE__ */ jsxs(
                        "span",
                        {
                          className: "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-indigo-100 dark:border-indigo-900/50 shadow-xs",
                          children: [
                            /* @__PURE__ */ jsxs("span", { children: [
                              "\u{1F3AF} ",
                              obj.label
                            ] }),
                            /* @__PURE__ */ jsxs("span", { className: "text-[9px] font-black text-indigo-600 dark:text-indigo-400", children: [
                              Math.round(obj.confidence > 1 ? obj.confidence : obj.confidence * 100),
                              "%"
                            ] })
                          ]
                        },
                        idx
                      )) })
                    ] }),
                    /* @__PURE__ */ jsx(
                      ProjectCopyBox,
                      {
                        label: t.title_label,
                        value: file.title,
                        themeColor: activeTool === ToolType.IMAGE ? "blue" : activeTool === ToolType.VIDEO ? "purple" : "emerald",
                        showLengthRating: true,
                        onChange: (val) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, title: val } : f))
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      ProjectCopyBox,
                      {
                        label: t.description_label,
                        value: file.description,
                        isTextArea: true,
                        themeColor: activeTool === ToolType.IMAGE ? "blue" : activeTool === ToolType.VIDEO ? "purple" : "emerald",
                        onChange: (val) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, description: val } : f))
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      ProjectKeywordList,
                      {
                        label: t.keywords_label,
                        keywords: file.keywords,
                        title: file.title,
                        description: file.description,
                        themeColor: activeTool === ToolType.IMAGE ? "blue" : activeTool === ToolType.VIDEO ? "purple" : "emerald",
                        onChange: (newKeywords) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, keywords: newKeywords } : f)),
                        aiOptions,
                        keywordCount,
                        hideIndividualFix: files.length > 1,
                        t
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "p-3.5 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-3", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [
                        /* @__PURE__ */ jsx(Layers, { size: 13, className: "text-violet-500" }),
                        /* @__PURE__ */ jsx("span", { children: "Marketplace Category Assignments" })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: [
                        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                          /* @__PURE__ */ jsx("label", { className: "text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block", children: t.category_adobe_label }),
                          /* @__PURE__ */ jsxs(
                            "select",
                            {
                              className: "w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all",
                              value: file.adobeCategoryId,
                              onChange: (e) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, adobeCategoryId: parseInt(e.target.value) } : f)),
                              children: [
                                /* @__PURE__ */ jsx("option", { value: "", children: t.select_category }),
                                ADOBE_CATEGORIES.map((cat) => /* @__PURE__ */ jsxs("option", { value: cat.id, children: [
                                  cat.id,
                                  ": ",
                                  cat.name
                                ] }, cat.id))
                              ]
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                          /* @__PURE__ */ jsx("label", { className: "text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block", children: t.category_shutterstock_1_label }),
                          /* @__PURE__ */ jsxs(
                            "select",
                            {
                              className: "w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all",
                              value: file.shutterstockCategory1,
                              onChange: (e) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, shutterstockCategory1: e.target.value } : f)),
                              children: [
                                /* @__PURE__ */ jsx("option", { value: "", children: t.select_category }),
                                (activeTool === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).map((cat) => /* @__PURE__ */ jsx("option", { value: cat, disabled: cat === file.shutterstockCategory2, children: cat }, cat))
                              ]
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                          /* @__PURE__ */ jsx("label", { className: "text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block", children: t.category_shutterstock_2_label }),
                          /* @__PURE__ */ jsxs(
                            "select",
                            {
                              className: "w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all",
                              value: file.shutterstockCategory2,
                              onChange: (e) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, shutterstockCategory2: e.target.value } : f)),
                              children: [
                                /* @__PURE__ */ jsx("option", { value: "", children: t.select_category }),
                                (activeTool === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).map((cat) => /* @__PURE__ */ jsx("option", { value: cat, disabled: cat === file.shutterstockCategory1, children: cat }, cat))
                              ]
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                          /* @__PURE__ */ jsx("label", { className: "text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block", children: "Kategori Dreamstime" }),
                          /* @__PURE__ */ jsxs(
                            "select",
                            {
                              className: "w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all",
                              value: file.dreamstimeCategory || "",
                              onChange: (e) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, dreamstimeCategory: e.target.value } : f)),
                              children: [
                                /* @__PURE__ */ jsx("option", { value: "", children: t.select_category }),
                                DREAMSTIME_CATEGORIES.map((cat) => /* @__PURE__ */ jsx("option", { value: cat, children: cat }, cat))
                              ]
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "space-y-1 sm:col-span-2 lg:col-span-2", children: [
                          /* @__PURE__ */ jsx("label", { className: "text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block", children: "Kategori MiriCanvas" }),
                          /* @__PURE__ */ jsxs(
                            "select",
                            {
                              className: "w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all",
                              value: file.miriCanvasCategory || "",
                              onChange: (e) => updateFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, miriCanvasCategory: e.target.value } : f)),
                              children: [
                                /* @__PURE__ */ jsx("option", { value: "", children: t.select_category }),
                                MIRICANVAS_CATEGORIES.map((cat) => /* @__PURE__ */ jsx("option", { value: cat, children: cat }, cat))
                              ]
                            }
                          )
                        ] })
                      ] }),
                      file.categoryReason && /* @__PURE__ */ jsxs("div", { className: "p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed flex items-start gap-2", children: [
                        /* @__PURE__ */ jsx(Sparkles, { size: 13, className: "mt-0.5 text-indigo-500 shrink-0" }),
                        /* @__PURE__ */ jsxs("div", { children: [
                          /* @__PURE__ */ jsx("span", { className: "font-extrabold", children: "Visual Semantic Reason:" }),
                          " ",
                          file.categoryReason
                        ] })
                      ] })
                    ] }),
                    handleRegenerateFile && /* @__PURE__ */ jsx("div", { className: "pt-1", children: /* @__PURE__ */ jsxs(
                      "button",
                      {
                        onClick: () => handleRegenerateFile(file),
                        disabled: file.isGenerating || file.isExtracting,
                        className: "w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50",
                        children: [
                          /* @__PURE__ */ jsx(Sparkles, { size: 13, className: file.isGenerating ? "animate-spin" : "" }),
                          /* @__PURE__ */ jsx("span", { children: file.isGenerating ? t.generating : t.regenerate })
                        ]
                      }
                    ) })
                  ] })
                ] })
              ]
            },
            file.id
          )) }) })
        ] })
      ]
    }
  );
};
