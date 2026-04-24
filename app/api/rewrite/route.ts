import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { preparePreviewHtml } from "@/lib/parse";
import type { Patch, Suggestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { rawHtml, url, picked } = (await req.json()) as {
      rawHtml: string;
      url: string;
      picked: Suggestion[];
    };

    if (!rawHtml || !url || !Array.isArray(picked) || picked.length === 0) {
      return NextResponse.json(
        { error: "rawHtml, url, picked(配列) が必要です" },
        { status: 400 }
      );
    }

    const list = picked
      .map(
        (s) =>
          `- [${s.category}/${s.priority}] ${s.title} → ${s.solution}`
      )
      .join("\n");

    const snippet = rawHtml.slice(0, 8000);

    const prompt = `以下のHTMLに改善案を適用するための置換パッチをJSON形式で出力してください。

【元HTML(一部)】
${snippet}

【適用する改善案】
${list}

【制約】
- findは元HTMLに一意に存在する文字列を正確にコピー(40〜150字推奨)
- 画像のsrc属性は変更しない
- 構造を壊す大きな変更はしない。テキスト置換・alt追加・軽微な属性調整が中心
- 3〜7件のパッチに絞る。適用不能な場合はpatches空配列でよい

【出力(JSONのみ・マークダウン禁止)】
{
  "patches": [
    { "find": "HTMLから正確にコピーした文字列", "replace": "変更後の文字列", "reason": "変更理由(40字以内)" }
  ]
}`;

    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("\n");

    const json = JSON.parse(stripFences(raw));
    const patches: Patch[] = (json.patches || []).filter(
      (p: any) => p && p.find && typeof p.replace === "string"
    );

    let html = rawHtml;
    const applied: Patch[] = [];
    const failed: Patch[] = [];
    for (const p of patches) {
      if (html.includes(p.find)) {
        html = html.replace(p.find, p.replace);
        applied.push(p);
      } else {
        failed.push(p);
      }
    }

    const afterPreview = preparePreviewHtml(html, url);

    return NextResponse.json({
      afterPreview,
      afterRaw: html,
      applied,
      failed,
      total: patches.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "rewrite failed" },
      { status: 500 }
    );
  }
}

function stripFences(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/, "");
  t = t.replace(/\s*```$/, "");
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1);
  return t.trim();
}
