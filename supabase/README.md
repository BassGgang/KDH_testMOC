# Supabase Setup Guide

このディレクトリには、karate-system の DB スキーマと RLS ポリシーが入っています。

> **📘 完全なセットアップ手順は [BACKEND_SETUP.md](../BACKEND_SETUP.md) を参照してください。**
> プロジェクト作成 → キー取得 → 環境変数 → マイグレーション → **email OTP 設定** →
> **operator 昇格** → 本番デプロイまで、迷わず進める順序でまとめてあります。
> 以下は DB まわりの参考情報です。

---

## 1. Supabase プロジェクトの作成（ブラウザ）

1. https://supabase.com/dashboard にサインイン（GitHub または Google）
2. **New project** をクリック
3. 以下を入力:
   - **Name**: `karate-system`（任意）
   - **Database Password**: 強力なパスワードを生成して**安全に保管**
   - **Region**: `Northeast Asia (Tokyo)` を選択
   - **Pricing plan**: `Free`
4. **Create new project** → 約 2 分でプロビジョニング完了

## 2. API キーの取得

プロジェクトダッシュボードで:

1. 左メニュー **Project Settings** → **API**
2. 以下 3 つをコピー:
   - **Project URL**（例: `https://abcdefgh.supabase.co`）
   - **anon public** キー（ブラウザに公開してよい）
   - **service_role secret** キー（**絶対に公開しない**、サーバ専用）

## 3. ローカル環境変数の設定

> ⚠️ `.env.local` の置き場所は **`apps/web/`** です(リポジトリルートに置いても
> Next.js は読み込みません)。

```bash
cp .env.example apps/web/.env.local
```

`apps/web/.env.local` を編集し、上記 3 つを貼り付け:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

`.env.local` は `.gitignore` 済みで、コミットされません。

## 4. Supabase CLI のインストール

macOS:

```bash
brew install supabase/tap/supabase
```

その他 OS: https://supabase.com/docs/guides/local-development/cli/getting-started

バージョン確認:

```bash
supabase --version
```

## 5. プロジェクトのリンク

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

`<your-project-ref>` は Project URL の `https://` の直後（例: `abcdefgh`）。

## 6. マイグレーションの適用

リポジトリルートで:

```bash
supabase db push
```

これにより migrations/ 配下の **4本**(init → rls → scoring_v2_and_security → rpcs_and_bracket)が
タイムスタンプ順に適用されます。

### 代替: SQL Editor で手動実行

CLI を使わない場合、Supabase ダッシュボードの **SQL Editor** で
各 .sql ファイルの内容を貼り付けて実行してもかまいません。

## 7. シードデータの投入（任意）

開発用ダミーデータを入れる:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

または SQL Editor で [seed.sql](seed.sql) を実行。

## 8. 動作確認

```bash
# パッケージレベルの import チェック（既に Step 1 で確認済み）
pnpm --filter @karate/db typecheck

# 実際に Supabase に接続してテーブル一覧を取得
node -e "
import('@karate/db/server').then(async (mod) => {
  const sb = mod.getServerSupabase();
  const { data, error } = await sb.from('profiles').select('id').limit(1);
  console.log({ data, error });
});
"
```

`data: []` が返れば接続成功。

---

## マイグレーションを追加するとき

1. `supabase/migrations/<YYYYMMDDHHMMSS>_xxx.sql` を作成（タイムスタンプ命名規則）
2. SQL を書く
3. `supabase db push` で反映
4. 本ファイルに変更内容を追記

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `supabase: command not found` | Homebrew でインストール (`brew install supabase/tap/supabase`) |
| `Auth error: ...` | `supabase login` を再実行 |
| `permission denied for table xxx` | RLS ポリシーが効きすぎている可能性。`SUPABASE_SERVICE_ROLE_KEY` を使うか、ポリシーを見直す |
| `function gen_random_uuid() does not exist` | `create extension if not exists "pgcrypto";` を最初のマイグレーションに追加 |

---

## ファイル一覧

| ファイル | 内容 |
|---|---|
| [migrations/20260525120000_init.sql](migrations/20260525120000_init.sql) | テーブル定義、インデックス、ヘルパー関数 |
| [migrations/20260525120001_rls.sql](migrations/20260525120001_rls.sql) | Row Level Security ポリシー |
| [migrations/20260710120000_scoring_v2_and_security.sql](migrations/20260710120000_scoring_v2_and_security.sql) | 統合c採点モデル / pgcrypto / profiles 自動生成トリガ / app_current_role() |
| [migrations/20260710120001_rpcs_and_bracket.sql](migrations/20260710120001_rpcs_and_bracket.sql) | トランザクション RPC(finish_match / create_tournament)/ ブラケット自動進出 + BYE / stats キャッシュ / RLS 張り替え |
| [seed.sql](seed.sql) | 開発用シードデータ + operator 昇格(psql 専用の `\set` を含む点に注意) |
