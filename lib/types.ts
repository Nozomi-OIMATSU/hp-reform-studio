export const ASPECTS = [
  { key: "design", label: "デザイン", color: "#B8432A" },
  { key: "copy",   label: "文言",     color: "#8B5A1B" },
  { key: "seo",    label: "SEO",      color: "#4F6B2E" },
  { key: "ux",     label: "UX・導線", color: "#2A547A" },
  { key: "image",  label: "画像",     color: "#8B2A5A" },
] as const;

export type AspectKey = typeof ASPECTS[number]["key"];

export type Priority = "HIGH" | "MED" | "LOW";

export interface Suggestion {
  id: string;
  category: AspectKey;
  priority: Priority;
  title: string;
  issue: string;
  solution: string;
}

export interface AnalyzeResult {
  summary: string;
  suggestions: Suggestion[];
}

export interface Patch {
  find: string;
  replace: string;
  reason?: string;
}

export interface PageMeta {
  title: string;
  metaDesc: string;
  ogTitle: string;
  h1s: string[];
  h2s: string[];
  images: { src: string; alt: string; hasAlt: boolean }[];
  imageCount: number;
  altCount: number;
  bodyText: string;
}

export const PRIORITY_STYLES: Record<Priority, { color: string; bg: string }> = {
  HIGH: { color: "#B8432A", bg: "#FAECE4" },
  MED:  { color: "#8B5A1B", bg: "#F5E8D0" },
  LOW:  { color: "#6B6B6B", bg: "#EDE8E0" },
};

export const SAMPLE_URLS = [
  { label: "トップ",   url: "https://niigata-reform.com/" },
  { label: "来店予約", url: "https://niigata-reform.com/seminar/raiten/" },
  { label: "強み",     url: "https://niigata-reform.com/strengths/" },
];
