# test_moc — NexTep デザインモック(視覚リファレンス)

Google AI Studio 由来の Vite + React デザインモック。本番アプリ(`apps/web`)の
**デザインと採点体験の手本**として残しています。ビルド対象ではなく(pnpm workspace 外)、
参照専用です。

- `src/App.tsx` … 認証ゲート → Workspace + CommandPalette
- `src/components/ScoringInterface.tsx` … 採点ロジックとUIの正典(先取・C反則・逐次入力ロック)
- `src/components/AuthOTP.tsx` … ログイン画面の意匠(`apps/web` の `/login` が踏襲)
- `src/index.css` … カラートークン(navy / accent-red)、`apps/web` は `packages/ui` で再現

本番実装は `apps/web`。採点ルールは `packages/domain` が正(このモックのルールに準拠)。
