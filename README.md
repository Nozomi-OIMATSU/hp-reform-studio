# HP Reform Studio

任意のホームページをAIが診断し、その場で書き換えるデモツール。

## 構成

- Next.js 14 (App Router) on Vercel
- Anthropic Claude API (server-side)
- ページ取得は Next.js の API Route (`/api/fetch`) がサーバー側で実行

## 環境変数

| 変数名 | 必須 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | https://console.anthropic.com/ で発行 |
| `ANTHROPIC_MODEL` | — | 既定: `claude-sonnet-4-5` |

## ローカル開発

```bash
npm install
cp .env.local.example .env.local
# .env.local を編集してAPIキーを入れる
npm run dev
```

http://localhost:3000 を開く。

## Vercelへのデプロイ

1. このリポジトリをGitHubにpush
2. https://vercel.com/new でリポジトリをImport
3. Environment Variables に `ANTHROPIC_API_KEY` を登録
4. Deploy → URL発行

## ルート一覧

- `GET /` — UI
- `POST /api/fetch` — URLからHTML取得・解析
- `POST /api/analyze` — Claudeで改善案生成
- `POST /api/rewrite` — Claudeでパッチ生成・HTML書換
