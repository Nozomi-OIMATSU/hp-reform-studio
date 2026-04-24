"use client";

import { useState } from "react";
import {
  Globe,
  Sparkles,
  Eye,
  Palette,
  Type,
  Search,
  Compass,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Columns2,
  ExternalLink,
  RotateCcw,
  Wand2,
  FileCode,
  Check,
  X,
  ChevronRight,
  Link2,
  Download,
} from "lucide-react";
import {
  ASPECTS,
  SAMPLE_URLS,
  PRIORITY_STYLES,
  type AspectKey,
  type Suggestion,
  type PageMeta,
  type Patch,
} from "@/lib/types";

const ASPECT_ICONS: Record<AspectKey, any> = {
  design: Palette,
  copy: Type,
  seo: Search,
  ux: Compass,
  image: ImageIcon,
};

const C = {
  bg: "#F5EFE4",
  bgCard: "#FCFAF5",
  bgSoft: "#EDE5D4",
  ink: "#1C1A17",
  inkSoft: "#4A4640",
  stone: "#8B847A",
  stoneLight: "#D4CCBE",
  line: "#E0D6C4",
  accent: "#B8432A",
  accentSoft: "#F2D9CF",
  accentBg: "#FAECE4",
  ok: "#4F6B2E",
};

type FetchResponse = {
  url: string;
  meta: PageMeta;
  preview: string;
  rawHtml: string;
  bytes: number;
};

export default function Studio() {
  const [url, setUrl] = useState("https://niigata-reform.com/");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage] = useState<FetchResponse | null>(null);

  const [aspects, setAspects] = useState<Record<AspectKey, boolean>>({
    design: true,
    copy: true,
    seo: true,
    ux: true,
    image: true,
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const [afterPreview, setAfterPreview] = useState("");
  const [afterRaw, setAfterRaw] = useState("");
  const [patchResult, setPatchResult] = useState<{
    applied: Patch[];
    failed: Patch[];
    total: number;
  } | null>(null);

  const [viewMode, setViewMode] = useState<"before" | "after" | "compare">("before");

  async function handleFetch(target = url) {
    const u = target.trim();
    if (!u) return;
    setFetching(true);
    setFetchError("");
    setPage(null);
    setAfterPreview("");
    setAfterRaw("");
    setSuggestions([]);
    setPicked({});
    setSummary("");
    setPatchResult(null);
    setViewMode("before");
    try {
      const res = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取得失敗");
      setPage(data);
    } catch (e: any) {
      setFetchError(e.message || String(e));
    } finally {
      setFetching(false);
    }
  }

  async function handleAnalyze() {
    if (!page) return;
    const selected = (Object.entries(aspects)
      .filter(([, v]) => v)
      .map(([k]) => k) as AspectKey[]);
    if (selected.length === 0) {
      setAnalyzeError("観点を1つ以上選んでください");
      return;
    }
    setAnalyzing(true);
    setAnalyzeError("");
    setSuggestions([]);
    setPicked({});
    setSummary("");
    setAfterPreview("");
    setAfterRaw("");
    setPatchResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: page.meta,
          url: page.url,
          aspects: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失敗");
      setSuggestions(data.suggestions || []);
      setSummary(data.summary || "");
      const init: Record<string, boolean> = {};
      (data.suggestions || []).forEach((s: Suggestion) => {
        if (s.priority === "HIGH") init[s.id] = true;
      });
      setPicked(init);
    } catch (e: any) {
      setAnalyzeError(e.message || String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRewrite() {
    if (!page) return;
    const chosen = suggestions.filter((s) => picked[s.id]);
    if (chosen.length === 0) {
      setRewriteError("適用する改善案を1つ以上選んでください");
      return;
    }
    setRewriting(true);
    setRewriteError("");
    setPatchResult(null);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawHtml: page.rawHtml,
          url: page.url,
          picked: chosen,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "書換え失敗");
      setAfterPreview(data.afterPreview);
      setAfterRaw(data.afterRaw);
      setPatchResult({
        applied: data.applied || [],
        failed: data.failed || [],
        total: data.total || 0,
      });
      setViewMode("compare");
    } catch (e: any) {
      setRewriteError(e.message || String(e));
    } finally {
      setRewriting(false);
    }
  }

  function reset() {
    setPage(null);
    setSuggestions([]);
    setPicked({});
    setSummary("");
    setAfterPreview("");
    setAfterRaw("");
    setPatchResult(null);
    setFetchError("");
    setAnalyzeError("");
    setRewriteError("");
    setViewMode("before");
  }

  const selectedAspectCount = Object.values(aspects).filter(Boolean).length;
  const pickedCount = Object.values(picked).filter(Boolean).length;
  const stepDone = {
    fetch: !!page,
    analyze: suggestions.length > 0,
    rewrite: !!afterPreview,
  };

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg, color: C.ink }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-20 backdrop-blur-sm"
        style={{ borderColor: C.line, background: "rgba(245, 239, 228, 0.88)" }}
      >
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6 mb-4">
            <div className="flex items-baseline gap-3">
              <div className="text-[22px] font-bold tracking-tight font-serif" style={{ color: C.ink }}>
                HP Reform Studio
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] font-mono" style={{ color: C.stone }}>
                ver.0.4 — vercel build
              </div>
            </div>
            <div className="flex items-center gap-3">
              {page && (
                <button
                  onClick={reset}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 transition-colors"
                  style={{ color: C.stone }}
                >
                  <RotateCcw size={12} /> リセット
                </button>
              )}
              <div
                className="text-[10px] uppercase tracking-wider px-2 py-1 font-mono"
                style={{ color: C.accent, background: C.accentBg }}
              >
                Powered by Claude
              </div>
            </div>
          </div>

          {/* URL bar */}
          <div className="flex items-center gap-2">
            <div
              className="flex-1 flex items-center gap-3 px-4 py-2.5 border"
              style={{ background: C.bgCard, borderColor: C.line }}
            >
              <Link2 size={15} style={{ color: C.stone }} />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-transparent outline-none text-sm font-mono"
                style={{ color: C.ink }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !fetching) handleFetch();
                }}
              />
              {page && (
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1"
                  style={{ color: C.stone }}
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            <button
              onClick={() => handleFetch()}
              disabled={fetching || !url.trim()}
              className="px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
              style={{ background: C.ink, color: C.bg }}
            >
              {fetching ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> 取得中...
                </>
              ) : (
                <>
                  取得 <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-mono" style={{ color: C.stone }}>
              sample:
            </span>
            {SAMPLE_URLS.map((s) => (
              <button
                key={s.url}
                onClick={() => {
                  setUrl(s.url);
                  handleFetch(s.url);
                }}
                disabled={fetching}
                className="text-[11px] px-2 py-0.5 border transition-colors disabled:opacity-40"
                style={{ borderColor: C.line, color: C.inkSoft }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {fetchError && (
            <div
              className="mt-3 p-3 text-xs flex items-start gap-2"
              style={{
                background: "#FDF0E8",
                color: C.accent,
                border: `1px solid ${C.accentSoft}`,
              }}
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold mb-1">取得に失敗しました</div>
                <div style={{ color: C.inkSoft }}>{fetchError}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {!page ? (
          <EmptyState onPick={(u) => { setUrl(u); handleFetch(u); }} />
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left: Preview */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-8">
              <div className="border overflow-hidden" style={{ borderColor: C.line, background: C.bgCard }}>
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b"
                  style={{ borderColor: C.line, background: C.bg }}
                >
                  <div className="flex items-center gap-1">
                    <TabButton active={viewMode === "before"} onClick={() => setViewMode("before")} icon={Eye}>
                      Before
                    </TabButton>
                    <TabButton
                      active={viewMode === "after"}
                      onClick={() => setViewMode("after")}
                      icon={Sparkles}
                      disabled={!afterPreview}
                    >
                      After
                    </TabButton>
                    <TabButton
                      active={viewMode === "compare"}
                      onClick={() => setViewMode("compare")}
                      icon={Columns2}
                      disabled={!afterPreview}
                    >
                      比較
                    </TabButton>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: C.stone }}>
                    {page.meta.imageCount} imgs · {page.meta.h2s.length} h2 · {(page.bytes / 1024).toFixed(1)}kb
                  </div>
                </div>

                <div className="bg-white" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
                  {viewMode === "before" && <PreviewFrame html={page.preview} title="before" />}
                  {viewMode === "after" && <PreviewFrame html={afterPreview || page.preview} title="after" />}
                  {viewMode === "compare" && (
                    <div className="grid grid-cols-2 h-full">
                      <div className="border-r" style={{ borderColor: C.line }}>
                        <div
                          className="px-3 py-1.5 text-[10px] uppercase tracking-wider border-b font-mono"
                          style={{ color: C.stone, borderColor: C.line, background: C.bg }}
                        >
                          Before
                        </div>
                        <div style={{ height: "calc(100% - 28px)" }}>
                          <PreviewFrame html={page.preview} title="before" />
                        </div>
                      </div>
                      <div>
                        <div
                          className="px-3 py-1.5 text-[10px] uppercase tracking-wider border-b font-mono"
                          style={{ color: C.accent, borderColor: C.line, background: C.accentBg }}
                        >
                          After
                        </div>
                        <div style={{ height: "calc(100% - 28px)" }}>
                          <PreviewFrame html={afterPreview || page.preview} title="after" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-4 border text-xs" style={{ borderColor: C.line, background: C.bgCard, color: C.inkSoft }}>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1 font-mono" style={{ color: C.stone }}>
                      Title
                    </div>
                    <div className="font-medium truncate" style={{ color: C.ink }}>
                      {page.meta.title}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1 font-mono" style={{ color: C.stone }}>
                      Meta Description
                    </div>
                    <div className="truncate">
                      {page.meta.metaDesc || <span style={{ color: C.accent }}>未設定</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1 font-mono" style={{ color: C.stone }}>
                      画像 / alt
                    </div>
                    <div>
                      <span style={{ color: C.ink }}>{page.meta.imageCount}</span>
                      <span style={{ color: C.stone }}> 枚中、alt設定 </span>
                      <span style={{ color: page.meta.altCount < page.meta.imageCount ? C.accent : C.ok }}>
                        {page.meta.altCount}
                      </span>
                      <span style={{ color: C.stone }}> 枚</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Control */}
            <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-5">
              <div className="border p-5" style={{ borderColor: C.line, background: C.bgCard }}>
                <StepLabel n={1} active={!stepDone.analyze} done={stepDone.analyze}>
                  観点を選ぶ
                </StepLabel>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ASPECTS.map((a) => (
                    <AspectChip
                      key={a.key}
                      aspect={a}
                      selected={aspects[a.key]}
                      onToggle={() => setAspects((prev) => ({ ...prev, [a.key]: !prev[a.key] }))}
                    />
                  ))}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || selectedAspectCount === 0}
                  className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: C.accent, color: "#fff" }}
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Claudeが分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> 改善案を生成
                    </>
                  )}
                </button>
                {analyzeError && (
                  <div
                    className="mt-3 p-2 text-xs flex items-start gap-2"
                    style={{ color: C.accent, background: C.accentBg }}
                  >
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    {analyzeError}
                  </div>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="border" style={{ borderColor: C.line, background: C.bgCard }}>
                  <div className="p-5 pb-3">
                    <StepLabel n={2} active={!stepDone.rewrite} done={stepDone.rewrite}>
                      改善案を選ぶ（{pickedCount}/{suggestions.length}）
                    </StepLabel>
                    {summary && (
                      <div
                        className="p-3 mb-4 text-xs leading-relaxed border-l-2 font-serif"
                        style={{ background: C.bgSoft, borderLeftColor: C.accent, color: C.inkSoft }}
                      >
                        {summary}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] mb-2">
                      <button
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          suggestions.forEach((s) => (all[s.id] = true));
                          setPicked(all);
                        }}
                        style={{ color: C.stone }}
                        className="underline"
                      >
                        すべて選択
                      </button>
                      <button
                        onClick={() => setPicked({})}
                        style={{ color: C.stone }}
                        className="underline"
                      >
                        選択解除
                      </button>
                      <button
                        onClick={() => {
                          const hi: Record<string, boolean> = {};
                          suggestions.forEach((s) => {
                            if (s.priority === "HIGH") hi[s.id] = true;
                          });
                          setPicked(hi);
                        }}
                        style={{ color: C.stone }}
                        className="underline"
                      >
                        HIGHのみ
                      </button>
                    </div>
                  </div>
                  <div className="border-t max-h-[50vh] overflow-y-auto" style={{ borderColor: C.line }}>
                    {suggestions.map((s) => (
                      <div key={s.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                        <SuggestionItem
                          s={s}
                          checked={!!picked[s.id]}
                          onToggle={() => setPicked((p) => ({ ...p, [s.id]: !p[s.id] }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="p-5 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
                    <StepLabel n={3} active={pickedCount > 0} done={!!afterPreview}>
                      書き換える
                    </StepLabel>
                    <button
                      onClick={handleRewrite}
                      disabled={rewriting || pickedCount === 0}
                      className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                      style={{ background: C.ink, color: C.bg }}
                    >
                      {rewriting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> ClaudeがHTML生成中...
                        </>
                      ) : (
                        <>
                          <Wand2 size={16} /> 選択した{pickedCount}件を適用
                        </>
                      )}
                    </button>
                    {rewriteError && (
                      <div
                        className="mt-3 p-2 text-xs flex items-start gap-2"
                        style={{ color: C.accent, background: C.accentBg }}
                      >
                        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                        {rewriteError}
                      </div>
                    )}
                    {patchResult && (
                      <div className="mt-3 space-y-1 text-xs" style={{ color: C.inkSoft }}>
                        <div className="flex items-center gap-2">
                          <Check size={13} style={{ color: C.ok }} strokeWidth={3} />
                          {patchResult.applied.length} 件のパッチを適用
                        </div>
                        {patchResult.failed.length > 0 && (
                          <div className="flex items-center gap-2">
                            <X size={13} style={{ color: C.accent }} strokeWidth={3} />
                            {patchResult.failed.length} 件は該当箇所が見つからず未適用
                          </div>
                        )}
                        {afterRaw && (
                          <button
                            onClick={() => {
                              const blob = new Blob([afterRaw], { type: "text/html" });
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = "after.html";
                              a.click();
                            }}
                            className="flex items-center gap-1.5 mt-2 text-[11px] underline"
                            style={{ color: C.stone }}
                          >
                            <Download size={11} /> After HTMLをダウンロード
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {page.meta.images.length > 0 && (
                <details className="border" style={{ borderColor: C.line, background: C.bgCard }}>
                  <summary
                    className="px-5 py-3 cursor-pointer text-xs font-semibold flex items-center justify-between"
                    style={{ color: C.inkSoft }}
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon size={13} />
                      検出された画像（{page.meta.imageCount}枚）
                    </span>
                    <ChevronRight size={13} />
                  </summary>
                  <div className="p-4 pt-0 grid grid-cols-4 gap-2">
                    {page.meta.images.slice(0, 16).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square relative overflow-hidden"
                        style={{ background: C.bgSoft }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.src}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {!img.hasAlt && (
                          <div
                            className="absolute top-1 right-1 px-1 py-0.5 text-[8px] font-bold font-mono"
                            style={{ background: C.accent, color: "#fff" }}
                          >
                            NO ALT
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        <footer
          className="mt-12 pt-6 border-t flex items-center justify-between text-[11px] font-mono"
          style={{ borderColor: C.line, color: C.stone }}
        >
          <div>HP Reform Studio — server-side fetch + Claude API on Vercel</div>
          <div>5/15 demo build</div>
        </footer>
      </div>
    </div>
  );
}

/* ── Sub components ────────────────────────────── */

function EmptyState({ onPick }: { onPick: (u: string) => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="mb-8 relative">
        <div className="w-20 h-20 flex items-center justify-center" style={{ background: C.accentBg, color: C.accent }}>
          <FileCode size={32} strokeWidth={1.5} />
        </div>
        <div
          className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center"
          style={{ background: C.ink, color: C.bg }}
        >
          <Sparkles size={13} />
        </div>
      </div>
      <div className="text-[28px] font-bold leading-tight mb-3 font-serif" style={{ color: C.ink }}>
        任意のHPを <span style={{ color: C.accent }}>AIが診断＆改善</span>
      </div>
      <div className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: C.inkSoft }}>
        URLを入れると、サーバー側でページを取得 → 4観点で改善案を生成 →<br />
        選んだ分だけHTMLを書き換えてBefore/Afterで比較できます。
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {SAMPLE_URLS.map((s) => (
          <button
            key={s.url}
            onClick={() => onPick(s.url)}
            className="px-4 py-2 text-sm border transition-colors flex items-center gap-2"
            style={{ borderColor: C.line, color: C.inkSoft, background: C.bgCard }}
          >
            <ArrowRight size={13} />
            {s.label}を試す
          </button>
        ))}
      </div>
      <div className="mt-10 text-[10px] uppercase tracking-[0.25em] font-mono" style={{ color: C.stone }}>
        or — 上部にURLを直接入力
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-30"
      style={{ background: active ? C.ink : "transparent", color: active ? C.bg : C.inkSoft }}
    >
      <Icon size={12} />
      {children}
    </button>
  );
}

function StepLabel({ n, active, done, children }: { n: number; active: boolean; done: boolean; children: React.ReactNode }) {
  const color = done ? C.ok : active ? C.accent : C.stone;
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold font-mono"
        style={{
          background: active || done ? color : "transparent",
          color: active || done ? "#fff" : C.stone,
          border: active || done ? "none" : `1.5px solid ${C.stoneLight}`,
        }}
      >
        {done ? <Check size={13} strokeWidth={3} /> : n}
      </div>
      <div className="text-[11px] uppercase tracking-[0.18em] font-semibold font-mono" style={{ color }}>
        {children}
      </div>
    </div>
  );
}

function AspectChip({
  aspect,
  selected,
  onToggle,
}: {
  aspect: (typeof ASPECTS)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = ASPECT_ICONS[aspect.key];
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2 transition-all rounded-sm border"
      style={{
        background: selected ? aspect.color : "transparent",
        color: selected ? "#fff" : C.inkSoft,
        borderColor: selected ? aspect.color : C.line,
      }}
    >
      <Icon size={14} strokeWidth={2} />
      <span className="text-xs font-medium tracking-wide">{aspect.label}</span>
    </button>
  );
}

function SuggestionItem({
  s,
  checked,
  onToggle,
}: {
  s: Suggestion;
  checked: boolean;
  onToggle: () => void;
}) {
  const aspect = ASPECTS.find((a) => a.key === s.category);
  const pri = PRIORITY_STYLES[s.priority];
  const Icon = aspect ? ASPECT_ICONS[aspect.key] : FileCode;
  return (
    <label
      className="flex gap-3 p-3.5 cursor-pointer transition-colors border-l-2"
      style={{
        background: checked ? C.bgCard : "transparent",
        borderLeftColor: checked ? aspect?.color || C.accent : "transparent",
      }}
    >
      <div className="pt-0.5">
        <div
          className="w-4 h-4 flex items-center justify-center rounded-sm border transition-all"
          style={{
            background: checked ? C.ink : "transparent",
            borderColor: checked ? C.ink : C.stoneLight,
          }}
        >
          {checked && <Check size={11} strokeWidth={3} color="#fff" />}
        </div>
        <input type="checkbox" checked={checked} onChange={onToggle} className="hidden" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className="px-2 py-0.5 text-[10px] font-mono tracking-wider inline-flex items-center rounded-sm"
            style={{ background: pri.bg, color: pri.color }}
          >
            {s.priority}
          </span>
          <span
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider"
            style={{ color: aspect?.color }}
          >
            <Icon size={10} />
            {aspect?.label}
          </span>
        </div>
        <div className="text-sm font-semibold mb-1 font-serif" style={{ color: C.ink }}>
          {s.title}
        </div>
        <div className="text-xs leading-relaxed mb-1.5" style={{ color: C.inkSoft }}>
          <span style={{ color: C.stone }}>課題：</span>
          {s.issue}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: C.inkSoft }}>
          <span style={{ color: C.stone }}>対応：</span>
          {s.solution}
        </div>
      </div>
    </label>
  );
}

function PreviewFrame({ html, title }: { html: string; title: string }) {
  if (!html) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8" style={{ color: C.stone }}>
        <Globe size={32} strokeWidth={1.2} />
        <div className="mt-3 text-sm font-serif">URLを入力してページを取得</div>
      </div>
    );
  }
  return (
    <iframe
      title={title}
      srcDoc={html}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
}
