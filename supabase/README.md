# Supabase Setup Guide

このディレクトリには、karate-system の DB スキーマと RLS ポリシーが入っています。
Supabase プロジェクトの作成からマイグレーション適用までを以下の手順で行います。

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

リポジトリルートで [.env.example](../.env.example) をコピー:

```bash
cp .env.example .env.local
```

`.env.local` を編集し、上記 3 つを貼り付け:

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

これにより [migrations/20260525120000_init.sql](migrations/20260525120000_init.sql) と
[migrations/20260525120001_rls.sql](migrations/20260525120001_rls.sql) が順に適用されます。

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
| [seed.sql](seed.sql) | 開発用シードデータ |
