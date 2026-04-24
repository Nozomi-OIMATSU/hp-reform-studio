import type { PageMeta } from "./types";

/**
 * サーバーサイドでHTML文字列をパース。DOMParserがない環境用。
 * 正規表現ベースの軽量な抽出(完璧ではないがデモには十分)。
 */
export function parsePageMeta(html: string, baseUrl: string): PageMeta {
  const title = extractTag(html, "title") || "(タイトルなし)";

  const metaDesc = extractMeta(html, "description") || "";
  const ogTitle = extractMetaProperty(html, "og:title") || "";

  const h1s = extractAllTags(html, "h1");
  const h2s = extractAllTags(html, "h2");

  const rawImgs = [...html.matchAll(/<img\b[^>]*>/gi)].slice(0, 40);
  const images = rawImgs
    .map((m) => {
      const tag = m[0];
      let src =
        attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-lazy-src") || "";
      try {
        src = new URL(src, baseUrl).href;
      } catch {}
      const altAttr = attr(tag, "alt");
      const hasAlt = altAttr !== null && altAttr.trim().length > 0;
      return { src, alt: (altAttr || "").trim(), hasAlt };
    })
    .filter((i) => i.src && /^https?:/.test(i.src));

  // 本文抽出 (script/style除去してから<>タグ剥がし)
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title,
    metaDesc,
    ogTitle,
    h1s,
    h2s,
    images,
    imageCount: images.length,
    altCount: images.filter((i) => i.hasAlt).length,
    bodyText: body.slice(0, 3500),
  };
}

/**
 * iframe srcdoc向けにHTMLを下ごしらえする。
 * - <base href> を先頭に注入して相対URLが解決できるようにする
 * - script を除去(安全性・描画高速化)
 * - リンクを新タブで開かせる
 */
export function preparePreviewHtml(html: string, baseUrl: string): string {
  // <base>既存分を削除 → 頭に挿入
  let out = html.replace(/<base\b[^>]*>/gi, "");

  // headの直後にbaseを挿入(headがなければhtml直後)
  const baseTag = `<base href="${escapeAttr(baseUrl)}">`;
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  } else {
    out = `<head>${baseTag}</head>` + out;
  }

  // scriptを除去
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*\/>/gi, "");

  // aタグをtarget=_blank化
  out = out.replace(/<a\b([^>]*)>/gi, (full, attrs) => {
    if (/target\s*=/i.test(attrs)) return full;
    return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
  });

  return "<!DOCTYPE html>\n" + out;
}

/* ---------- 小道具 ---------- */

function extractTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = html.match(re);
  if (!m) return null;
  return stripTags(m[1]).trim();
}

function extractAllTags(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const t = stripTags(m[1]).trim();
    if (t) results.push(t);
  }
  return results;
}

function extractMeta(html: string, name: string): string | null {
  // name="description"|name='description' どちらも拾う
  const re = new RegExp(
    `<meta[^>]*name\\s*=\\s*['"]${name}['"][^>]*content\\s*=\\s*['"]([^'"]*)['"]`,
    "i"
  );
  const reRev = new RegExp(
    `<meta[^>]*content\\s*=\\s*['"]([^'"]*)['"][^>]*name\\s*=\\s*['"]${name}['"]`,
    "i"
  );
  return html.match(re)?.[1] ?? html.match(reRev)?.[1] ?? null;
}

function extractMetaProperty(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]*property\\s*=\\s*['"]${prop}['"][^>]*content\\s*=\\s*['"]([^'"]*)['"]`,
    "i"
  );
  const reRev = new RegExp(
    `<meta[^>]*content\\s*=\\s*['"]([^'"]*)['"][^>]*property\\s*=\\s*['"]${prop}['"]`,
    "i"
  );
  return html.match(re)?.[1] ?? html.match(reRev)?.[1] ?? null;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
