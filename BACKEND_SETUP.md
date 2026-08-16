# バックエンド セットアップ手順書
> **最終更新: 2026-08-16**(組織メンバーとして参加する場合の手順を追加)

---

## 全体の流れ

```
0. 前提ツールの準備 (Node / pnpm / Supabase CLI)
1. Supabase プロジェクト作成
2. API キーの取得
3. 環境変数 (.env.local) の設定  ← 置き場所に注意
4. CLI でプロジェクトをリンク & マイグレーション適用
5. 認証(email OTP)の設定  ← メールテンプレート変更が必須
6. 起動して初回ログイン
7. 自分を operator に昇格  ← これを忘れると全ての書き込みが 403
8. (任意) シードデータ投入
9. (本番運用時) デプロイと本番設定
```

---

## 既に招待された方へ(組織メンバーとして参加する場合)

Supabase の組織に招待された方は、**Step 1(プロジェクト作成)を飛ばして** Step 0 → 2 → 3 → …
と進んでください。以下の点だけ、新規作成の場合と異なります。

**招待の承認** — 招待リンクの**有効期限は 24 時間**です。切れた場合は管理者に再送を依頼してください。
承認後、https://supabase.com/dashboard に既存プロジェクトが表示されます。

**Step 2(キー取得)の注意** — Secret key は**新規作成せず、既存のものを Reveal してコピー**してください。
メンバーが各自「Create new secret key」で発行すると、キーが人数分増えて失効・棚卸しが困難になります。
(新規発行が必要なのは、キーを漏洩などでローテートするときだけです。)

**Step 4(CLI リンク)** — `supabase/.temp/` は gitignore されているため、**リンクは各自で実行が必要**です。
`supabase link` で DB パスワードを聞かれた場合は管理者に確認してください。

**Step 7(operator 昇格)** — 自分では実行できません(SQL Editor へのアクセスが必要)。
**管理者に依頼してください。** 昇格前は閲覧のみ可能で、書き込みは 403 になります。

### キーの取り扱い

> ⚠️ **`.env.local` やキーを他のメンバーに直接渡さないでください。**
> `sb_secret_...`(旧 service_role)は **RLS を完全にバイパス**し、全テーブルの読み書き・削除が可能です。
> 渡すことは実質 DB の管理者権限を渡すことと同じで、取り消すにはキーのローテーションが必要になります。

メンバーを増やすときは、キーを共有するのではなく **Supabase の組織に招待**してください
(ダッシュボード → Organization → **Team** → Invite)。**Free プランでもメンバー数は無制限**です。
これならアクセス権を個別に剥奪でき、各自がダッシュボードから自分でキーを取得できます。

> Free / Pro プランのロールは**組織スコープ**のため、メンバーは組織内の全プロジェクトにアクセスできます。
> プロジェクト単位で権限を分けるには Team プラン以上が必要です。
> なお Free の「アクティブプロジェクト 2 つまで」の枠は、**Owner / Administrator として所属する
> 全組織で合算**されます(Developer ロールなら影響しません)。

---

## 0. 前提ツールの準備

| ツール | 要件 | 確認コマンド | インストール (macOS) |
|---|---|---|---|
| Node.js | >= 20 | `node --version` | `brew install node` |
| pnpm | 10.x | `pnpm --version` | `npm install -g pnpm@10.26.1` |
| Supabase CLI | 2.x | `supabase --version` | `brew install supabase/tap/supabase` |

依存関係のインストール(リポジトリルートで):

```bash
make install        # = pnpm install
```

---

## 1. Supabase プロジェクトの作成

> **既にプロジェクトを作成済みの場合**(例: `karate-system` / ref `shgliwapnlmnpyrcsgrc`)は
> このステップを飛ばして「2. API キーの取得」へ。

1. https://supabase.com/dashboard にサインイン(GitHub または Google)
2. **New project** をクリック
3. 以下を入力:
   - **Organization**: 自分の org を選択
   - **Project name**: `karate-system`(任意)
   - **Database Password**: 「Generate a password」で生成し、**必ずパスワードマネージャ等に保管**
     (後で `supabase link` や `psql` 接続に必要になることがあります)
   - **Region**: `Northeast Asia (Tokyo)`
   - **Pricing plan**: `Free` で可
4. **Create new project** → プロビジョニング完了まで **1〜2分** 待つ

---

## 2. API キーの取得

> **重要(2026年時点の最新事情)**: Supabase は APIキーを刷新中です。
> - **新キー**: `sb_publishable_...`(公開可) / `sb_secret_...`(秘匿)
> - **旧キー**: `anon` / `service_role`(JWT形式)— **2026年末に廃止予定**
>
> 両方とも当面併用できますが、**これから設定するなら新キーを推奨**します。
> このアプリのコードはどちらのキーでもそのまま動きます(環境変数名は変わりません)。

ダッシュボードで:

1. 左メニュー **Project Settings**(歯車)→ **API Keys**
2. 以下をコピーして手元に控える:

| 控えるもの | 場所 | 用途 |
|---|---|---|
| **Project URL** | Project Settings → Data API(`https://xxxx.supabase.co`) | 接続先 |
| **Publishable key**(`sb_publishable_...`) | API Keys タブ | ブラウザ公開用(旧 anon 相当) |
| **Secret key**(`sb_secret_...`) | API Keys タブ →「Create new secret key」で作成 | **サーバ専用・絶対に公開しない**(旧 service_role 相当) |

> 新キーのタブが見当たらない場合は「Legacy API Keys」タブの **anon** / **service_role** を
> 使っても動きます(将来移行が必要になるだけです)。

---

## 3. 環境変数の設定

> ⚠️ **置き場所に注意**: `.env.local` は**リポジトリルートではなく `apps/web/` に置きます**。
> Next.js は自分のアプリディレクトリ(`apps/web`)の env ファイルしか読みません。

```bash
cp .env.example apps/web/.env.local
```

`apps/web/.env.local` を編集して、Step 2 で控えた値を貼り付け:

```dotenv
# ブラウザに公開される(publishable / anon キー)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# サーバ専用(secret / service_role キー)。絶対にコミット・公開しない
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

- `NEXT_PUBLIC_` が付く2つ → ブラウザに埋め込まれます。**publishable キーのみ**を入れること
- 付かない2つ → サーバ(API Route / RPC)専用。**secret キー**を入れること
- `.env.local` は `.gitignore` 済みでコミットされません

> **別案**: リポジトリルートに `.env.local` を置いて `apps/web/` からリンクする方法もあります。
> ルートの env を参照するツール(CLI / スクリプト)と実体を1つで共有したい場合に便利です。
>
> ```bash
> cp .env.example .env.local          # ルートに実体を作成して編集
> ln -s ../../.env.local apps/web/.env.local
> ```
>
> どちらの方式でも動作します。**両方に実体を置くと片方だけ古くなる**ので、必ずどちらか一方にしてください。

---

## 4. プロジェクトのリンク & マイグレーション適用

リポジトリルートで:

```bash
supabase login                                  # ブラウザが開いて認証
supabase link --project-ref <YOUR_PROJECT_REF>  # DB パスワードを聞かれたら Step 1 のものを入力
```

`<YOUR_PROJECT_REF>` は Project URL の `https://` 直後の英数字
(例: `https://shgliwapnlmnpyrcsgrc.supabase.co` → `shgliwapnlmnpyrcsgrc`)。

続けてマイグレーションを適用:

```bash
make db-push        # = supabase db push
```

以下の **5本** が順に適用されます:

| # | ファイル | 内容 |
|---|---|---|
| 1 | `20260525120000_init.sql` | 10テーブル + インデックス |
| 2 | `20260525120001_rls.sql` | RLS ポリシー |
| 3 | `20260710120000_scoring_v2_and_security.sql` | 統合c採点モデル / pgcrypto / **profiles自動生成トリガ** / `app_current_role()` |
| 4 | `20260710120001_rpcs_and_bracket.sql` | **トランザクションRPC**(finish_match / create_tournament)/ ブラケット自動進出+BYE / stats キャッシュ |
| 5 | `20260711150000_privacy_hardening.sql` | 個人情報列の遮断 / 監査ログ / 内部RPC封鎖 / 試合開始の原子化 |

適用状態の確認:

```bash
make db-status      # = supabase migration list — Local と Remote が4本揃っていればOK
```

> 途中で `NOTICE: ... does not exist, skipping` が出るのは正常です(冪等化のための表示)。

---

## 5. 認証(email OTP)の設定 ← **最重要**

このアプリのログインは「メールに届く **6桁コード** を入力する」方式です。
**Supabase の初期設定のままだとコードではなく Magic Link(URL)が送られてしまう**ため、
メールテンプレートの変更が必須です。

### 5-1. Email プロバイダの確認

1. ダッシュボード左メニュー **Authentication** → **Sign In / Providers**
2. **Email** が有効(Enabled)であることを確認(デフォルトで有効)
3. 同じ画面の **Email OTP Expiration**: デフォルト 3600秒(1時間)。
   運用に合わせて短縮可(例: 600 = 10分)。86400秒(1日)超は設定不可

### 5-2. メールテンプレートを「6桁コード」に変更(必須)

1. **Authentication** → **Emails**(または **Email Templates**)
2. **Magic Link** テンプレートを開く
3. 本文中の `{{ .ConfirmationURL }}` を **`{{ .Token }}`** に置き換える

例(そのまま貼り付け可):

```html
<h2>NexTep 認証コード</h2>
<p>以下の6桁コードをログイン画面に入力してください。</p>
<p style="font-size:28px; font-weight:bold; letter-spacing:6px;">{{ .Token }}</p>
<p>このコードの有効期限は発行から1時間です。心当たりがない場合は無視してください。</p>
```

4. **Save** をクリック

> 新規ユーザーの初回サインアップ時は **Confirm signup** テンプレートが使われる設定の場合が
> あります。同様に `{{ .Token }}` を含めておくと安全です。

### 5-3. メール送信の制限を理解する(開発中のハマりどころ)

- **内蔵メールサービスは 2通/時 まで**しか送れません(2026年現在)。
  テスト中に「メールが来ない」場合、まずこの制限を疑ってください
- OTP の再送は **同一ユーザーに対し60秒に1回** まで
- 本格運用では **カスタム SMTP**(Resend / SendGrid / AWS SES 等)の設定がほぼ必須:
  **Project Settings** → **Auth** → **SMTP Settings** で設定。
  設定後は **Authentication → Rate Limits** で送信上限を引き上げ可能

### 5-4. サインアップポリシー(任意・要検討)

本番ビルドは `shouldCreateUser: false` 相当の**招待制**です。事前に管理者が作成した
ユーザーだけがOTPでログインできます。加えてSupabase側でも:

- **Authentication** → **Sign In / Providers** → **Allow new users to sign up** を **OFF**

にして、既存ユーザーのみログイン可能にしてください(未登録メールへのOTPは拒否されます)。
開発ビルドだけはローカル検証のため新規ユーザー作成を許可します。本番設定を開発用へ
戻さないでください。

---

## 6. 起動して初回ログイン

```bash
make dev            # http://localhost:3000
```

1. ブラウザで http://localhost:3000 を開く → 未ログインなので `/login` へリダイレクトされる
2. 自分のメールアドレスを入力 → 「コードを送信」
3. メールに届いた **6桁コード** を入力 → サインイン
4. ホーム(試合 / 大会 / 分析 の3カード)が表示されれば成功

> この時点のあなたのロールは **athlete**(最小権限)です。閲覧はできますが、
> 大会作成・採点などの書き込み操作は **403 Forbidden** になります。次のステップへ。

---

## 7. 自分を operator に昇格 ← **忘れると何も書き込めません**

セキュリティ上、**自動で operator になる仕組みは意図的にありません**
(初回ユーザー自動昇格は乗っ取りの穴になるため排除済み)。昇格は明示的な管理操作です。

### 方法A: ダッシュボードの SQL Editor(推奨・最も簡単)

1. ダッシュボード左メニュー **SQL Editor** → **New query**
2. 以下を貼り付け、メールアドレスを自分のものに書き換えて **Run**:

```sql
update public.profiles p
set role = 'operator'
from auth.users u
where u.id = p.id
  and u.email = 'あなたのメールアドレス@example.com';
```

3. `Success. Rows updated: 1` と出ればOK
4. 確認:

```sql
select u.email, p.role from public.profiles p join auth.users u on u.id = p.id;
```

### 方法B: psql + seed.sql

```bash
# 接続文字列は Project Settings → Database → Connection string からコピー
psql "<CONNECTION_STRING>" \
  -v OPERATOR_EMAIL="'あなたのメールアドレス@example.com'" \
  -f supabase/seed.sql
```

> ⚠️ `seed.sql` の先頭にある `\set OPERATOR_EMAIL ...` は **psql 専用**の記法です。
> SQL Editor に seed.sql を丸ごと貼ると `\set` の行でエラーになります。
> SQL Editor を使う場合は方法Aの UPDATE 文と、必要なら下記シードの INSERT 部分だけを
> 貼ってください。

昇格後、**一度サインアウト → 再ログイン**してください(ロールはリクエスト毎に
DB から読まれるため即時反映されますが、画面の状態をリセットする意味で推奨)。

---

## 8. (任意) シードデータの投入

開発用のダミー選手・大会を入れる場合、SQL Editor で以下を実行:

```sql
insert into public.athletes (id, name, rank, affiliation, gender, weight_kg) values
  ('11111111-1111-7111-8111-111111111111', '田中太郎', 'Black',   '横浜空手クラブ', 'male',   72.5),
  ('22222222-2222-7222-8222-222222222222', '鈴木花子', '2nd Dan', '東京武道館',     'female', 58.0),
  ('33333333-3333-7333-8333-333333333333', '佐藤健',   'Black',   '大阪格闘技院',   'male',   80.2),
  ('44444444-4444-7444-8444-444444444444', '山本美咲', 'Brown',   '京都空手道場',   'female', 60.5);
```

投入後、アプリの「大会 → 新規作成」でこの4名を選んでブラケットを作れます。

---

## 9. (本番運用時) デプロイと本番設定

### 9-1. Vercel へのデプロイ

1. Vercel にリポジトリをインポート
2. **Root Directory** を `apps/web` に設定
3. **Environment Variables** に Step 3 と同じ4変数を登録:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`(publishable)
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`(secret — **Sensitive にチェック**)
4. Deploy

### 9-2. Supabase 側の本番設定チェックリスト

- [ ] **Authentication → URL Configuration → Site URL** を本番URL(`https://あなたのドメイン`)に設定
- [ ] **カスタム SMTP** を設定(内蔵の2通/時では運用不可)
- [ ] **Authentication → Rate Limits** で OTP 送信上限を運用規模に合わせて調整
- [ ] サインアップポリシーを決定(5-4 参照)
- [ ] operator 昇格済みアカウントでログインできることを確認
- [ ] **Allow new users to sign up = OFF** を確認(本番は招待制)
- [ ] 管理者アカウントとSupabase/Vercel管理者にMFAを設定
- [ ] 個人情報の保存期間・削除・事故対応手順を組織内で承認
- [ ] サインアウト時に未同期データ警告と端末データ消去が動作することを共用端末で確認
- [ ] (推奨)Legacy API Keys(anon / service_role)を使っている場合は
      新キー(`sb_publishable_` / `sb_secret_`)へ移行 — **旧キーは2026年末に廃止予定**

---

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| OTP メールに**リンクしか書かれていない** | Magic Link テンプレートが未変更。**5-2** の `{{ .Token }}` 置き換えを実施 |
| メールが**届かない** | ①内蔵メールは**2通/時**の上限(1時間待つかカスタムSMTP設定)②同一ユーザーへの再送は60秒間隔 ③迷惑メールフォルダ確認 |
| ログイン後、大会作成などで **403 Forbidden**(`Requires role: operator`) | operator 昇格を忘れている。**Step 7** を実施 |
| `finish_match requires the operator role` エラー | 同上(RPC 内の二重ガード)。operator でログインしているか確認 |
| ログインしても `/login` に**戻され続ける** | `apps/web/.env.local` の `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` の値が誤り。キーの貼り間違い・前後の空白を確認し、**dev サーバを再起動**(env 変更は再起動必須) |
| `supabase db push` が **check constraint** エラーで失敗 | 旧モデルの scoring_events データが残っている場合。マイグレーション 0003 は c1/c2/hansoku/kiken/shikkaku を自動移送するので通常発生しないが、発生時はエラー行の kind 値を確認 |
| `function gen_random_uuid() does not exist` | `create extension pgcrypto` が未適用。0003 に含まれるため `make db-push` を再実行 |
| `supabase link` で **DB パスワード**を聞かれた | Step 1 で保管したパスワードを入力。紛失時は Project Settings → Database → Reset database password |
| SQL Editor で seed.sql が **`\set` でエラー** | `\set` は psql 専用。**Step 7 方法A** の UPDATE 文を使う |
| dev で `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set` | `.env.local` の置き場所が違う。**ルートではなく `apps/web/.env.local`** に置く(または Step 3 の別案でリンクを張る) |
| `EADDRINUSE: address already in use :::3000` | 既に dev サーバが起動中。既存のものを使うか、そのプロセスを停止してから再実行 |
| 組織の**招待リンクが切れた** | 有効期限は 24 時間。管理者に再送を依頼 |

---

## 参考(一次情報)

- [Understanding API keys(新キー体系)](https://supabase.com/docs/guides/getting-started/api-keys)
- [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Passwordless email logins(email OTP)](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Email Templates({{ .Token }})](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Auth Rate Limits(2通/時ほか)](https://supabase.com/docs/guides/auth/rate-limits)
