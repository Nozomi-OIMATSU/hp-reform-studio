import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { ASPECTS, type AspectKey, type PageMeta } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { meta, url, aspects } = (await req.json()) as {
      meta: PageMeta;
      url: string;
      aspects: AspectKey[];
    };

    if (!meta || !url || !Array.isArray(aspects) || aspects.length === 0) {
      return NextResponse.json(
        { error: "meta, url, aspects(配列) が必要です" },
        { status: 400 }
      );
    }

    const aspectList = aspects
      .map((a) => {
        const d = ASPECTS.find((x) => x.key === a);
        return d ? `${a}(${d.label})` : a;
      })
      .join("、");

    const prompt = `あなたはWeb制作とUXのエキスパートです。以下のページを分析し、改善提案を厳密なJSON形式で出力してください。

【URL】${url}
【title】${meta.title}
【meta description】${meta.metaDesc || "(未設定)"}
【H1】${meta.h1s.slice(0, 3).join(" / ") || "(なし)"}
【主なH2】${meta.h2s.slice(0, 8).join(" / ") || "(なし)"}
【画像】${meta.imageCount}枚中、alt設定あり${meta.altCount}枚 / なし${meta.imageCount - meta.altCount}枚
【本文抜粋】
${meta.bodyText.slice(0, 1500)}

【対象観点】${aspectList}

【指示】
- 各観点から1〜3件、合計5〜9件の具体提案を出す
- 日本の商習慣・リフォーム業界の文脈を踏まえる
- priorityは「課題の顕在化度×集客/CVへの寄与」で判定
- titleは20字以内、issueは60字以内、solutionは120字以内

【出力形式(JSONのみ・マークダウン禁止)】
{
  "summary": "ページ全体の総評(80字以内)",
  "suggestions": [
    {
      "id": "s1",
      "category": "design|copy|seo|ux|image",
      "priority": "HIGH|MED|LOW",
      "title": "短いタイトル",
      "issue": "現状の課題",
      "solution": "具体的な改善方法"
    }
  ]
}`;

    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("\n");

    const json = JSON.parse(stripFences(raw));

    const valid = ASPECTS.map((a) => a.key) as string[];
    json.suggestions = (json.suggestions || []).filter(
      (s: any) => s.title && s.solution && valid.includes(s.category)
    );

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "analyze failed" },
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
