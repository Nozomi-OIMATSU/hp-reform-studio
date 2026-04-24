import { NextRequest, NextResponse } from "next/server";
import { parsePageMeta, preparePreviewHtml } from "@/lib/parse";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }
    if (!/^https?:\/\//.test(url)) {
      return NextResponse.json(
        { error: "URLは http:// または https:// で始めてください" },
        { status: 400 }
      );
    }

    // タイムアウト10秒
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; HPReformStudio/0.4; +https://vercel.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.5",
        },
        signal: ctl.signal,
        redirect: "follow",
      });
    } catch (e: any) {
      clearTimeout(timer);
      const msg = e?.name === "AbortError" ? "取得がタイムアウトしました(10秒)" : e?.message || String(e);
      return NextResponse.json({ error: `取得失敗: ${msg}` }, { status: 502 });
    }
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { error: `取得失敗: HTTP ${res.status} ${res.statusText}` },
        { status: 502 }
      );
    }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return NextResponse.json(
        { error: `HTMLではありません (content-type: ${ct || "unknown"})` },
        { status: 415 }
      );
    }

    const html = await res.text();
    if (!html || html.length < 50) {
      return NextResponse.json({ error: "空のレスポンスでした" }, { status: 502 });
    }

    // サイズ制限 (2MB)
    const MAX = 2 * 1024 * 1024;
    const trimmed = html.length > MAX ? html.slice(0, MAX) : html;

    const meta = parsePageMeta(trimmed, url);
    const preview = preparePreviewHtml(trimmed, url);

    return NextResponse.json({
      url,
      meta,
      preview,
      rawHtml: trimmed,
      bytes: trimmed.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "unknown error" },
      { status: 500 }
    );
  }
}
