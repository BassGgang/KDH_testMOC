# Karate Scoring & Athlete Analytics System — Architecture

最終更新: 2026-05-24

本ドキュメントは、空手の試合得点管理と選手データ分析を行うシステムの設計判断を記録したものである。実装の唯一の真実の源として参照する。

---

## 1. プロジェクト概要

### 目的
1. 空手の試合（組手）における**得点入力・進行管理**を、試合会場で安定動作させる
2. 選手・コーチが**過去の戦績と統計分析**をモバイル端末で閲覧できる
3. 大会主催者がトーナメント運営を一元管理できる

### 想定ユーザ
- **運営スタッフ（operator）**: 大会・試合・選手データの管理
- **コーチ（coach）**: 自分が担当する選手のデータ閲覧
- **選手（athlete）**: 自分のデータ閲覧

---

## 2. スコープ

### MVP に含むもの
- 組手（Kumite）の採点・進行管理
- 試合中のオフライン採点（PWA + IndexedDB）
- 試合終了後のサーバ同期
- 試合中のイベント単位逐次同期（オンライン時のみ、ベストエフォート）
- 選手プロフィール・戦績・統計表示
- レーダーチャート・時系列スコアグラフ
- シングルエリミネーション形式のトーナメント
- WKF 準拠の年齢・体重カテゴリテンプレート
- 道場名は自由記述テキスト
- 日本語 UI のみ

### MVP に含まないもの（将来検討）
- 形（Kata）の採点
- ダブルエリミネーション / 予選リーグ / リーグ戦
- 道場のマスタテーブル化
- 選手プロフィール画像
- AI / Gemini を使った自然言語コメント生成
- 動画アップロード・連携・解析
- 観客向け公開ライブビュー
- 結果の PDF / CSV エクスポート
- スコアボード／大型ディスプレイ出力
- プッシュ通知
- 多言語対応

---

## 3. アーキテクチャ全体像

```
┌────────────────────────────────────────────────────────────────┐
│                        現場（試合会場）                          │
│                                                                │
│  各タタミに1端末（PWA）が独立して動作                            │
│  ┌──────────────────────────────────┐                          │
│  │  Scoring App (PWA)               │                          │
│  │  ・IndexedDB に試合データを保持   │                          │
│  │  ・Service Worker でオフライン化  │                          │
│  │  ・端末で UUIDv7 採番             │                          │
│  │  ・採点ルールはクライアント側で実行 │                          │
│  └──────────┬───────────────────────┘                          │
└─────────────┼──────────────────────────────────────────────────┘
              │ オンライン時: イベント単位逐次同期
              │ 試合終了時: match/finish で確定
              │   (Idempotency-Key 必須)
              ▼
┌────────────────────────────────────────────────────────────────┐
│                       Backend (Vercel)                         │
│                                                                │
│  ・POST /api/sync/events         ← outbox からの逐次受信         │
│  ・POST /api/sync/match/finish   ← 試合終了の確定                │
│  ・GET  /api/sync/state/:matchId ← 端末復旧時の状態取得          │
│  ・GET  /api/athletes/:id        ← 選手プロフィール              │
│  ・GET  /api/athletes/:id/stats  ← 集計統計                      │
│  ・GET  /api/tournaments/:id/bracket ← ブラケット取得            │
│                                                                │
│  内部構造（Clean Architecture 層分け）:                          │
│  app/api/         Route Handlers（薄い）                        │
│  application/     ユースケース層                                 │
│  packages/domain  ドメイン層（採点ルール、純粋関数）             │
│  infrastructure/  Supabase クライアント                          │
└─────────────┬──────────────────────────────────────────────────┘
              ▼
       ┌───────────────┐
       │  Supabase     │  リージョン: ap-northeast-1 (Tokyo)
       │  ├ Postgres   │
       │  ├ Auth (OTP) │
       │  └ RLS        │
       └───────┬───────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Viewer App (Web, モバイル最適化)                              │
│  ・選手プロフィール、戦績、レーダーチャート                      │
│  ・統計とグラフのみ（AI 機能なし）                              │
└──────────────────────────────────────────────────────────────┘
```

### 設計原則

1. **オフラインファースト**: 試合中の信頼できる単一情報源は端末。サーバは "受信後 SSOT"。
2. **ID は端末側で発番**: UUIDv7 を端末発番、サーバ採番に依存しない。
3. **冪等性**: 同じデータを二度送っても重複しない（Idempotency-Key 必須）。
4. **試合データの送信単位は試合 1 件まるごと**: 部分送信は許可しない（match/finish）。ただし途中経過の逐次送信は事故対策のベストエフォートで行う。
5. **ドメイン層を独立**: 採点ルールは純粋関数 + テスト。フロント/バック両方から共有。
6. **1試合 = 1端末**: 複数端末で同一試合を採点しない（CRDT 不要）。各タタミに 1 端末独立。

---

## 4. 技術スタック

| レイヤ | 採用 | 理由 |
|---|---|---|
| Scoring App | Next.js + React 19 + Tailwind v4 + Dexie.js (IndexedDB) + Service Worker | PWA 構成。ストア配信不要。 |
| Viewer App | Next.js + React 19 + Tailwind v4 + recharts | モバイル最適化。グラフ描画。 |
| Backend | Next.js Route Handlers | Vercel と統合、別サーバ不要。 |
| DB | Supabase Postgres | 関係型データに適合、無料枠 500MB。 |
| Auth | Supabase Auth（OTP） | 標準でメール OTP 対応、自前実装不要。 |
| RLS | Supabase Row Level Security | 選手・コーチ間のアクセス制御を DB レイヤで担保。 |
| Realtime（任意） | Supabase Realtime | 運営ダッシュボードでタタミ進行状況を表示する場合に使用。 |
| バリデーション | Zod | API I/O 契約を型 + ランタイム検証。 |
| ホスティング | Vercel Hobby + Supabase Tokyo | 月額 $0 スタート可能。 |
| パッケージ管理 | pnpm workspaces | モノレポ標準。 |

### 不要になったライブラリ
- `@google/genai` — AI 機能をスコープ外にしたため
- `express` / `dotenv` — Next.js Route Handlers に置換

---

## 5. プロジェクト構成（モノレポ）

```
karate-system/
├─ apps/
│  ├─ scoring/                      # PWA — タタミ用採点
│  │  └─ src/
│  │     ├─ components/             # test_moc から流用
│  │     │  ├─ AuthOTP.tsx
│  │     │  ├─ Workspace.tsx
│  │     │  ├─ MatchSelection.tsx
│  │     │  ├─ MatchSettings.tsx
│  │     │  ├─ ScoringInterface.tsx
│  │     │  └─ CommandPalette.tsx
│  │     ├─ db/                     # Dexie (IndexedDB) 定義
│  │     ├─ sync/                   # outbox / リトライ / 同期ワーカー
│  │     └─ service-worker.ts
│  │
│  ├─ viewer/                       # 選手・コーチ閲覧Web
│  │  └─ src/
│  │     ├─ components/             # test_moc から流用
│  │     │  ├─ AuthOTP.tsx
│  │     │  └─ AthleteInsights.tsx
│  │     └─ app/                    # Next.js App Router
│  │
│  └─ api/                          # Next.js Route Handlers
│     └─ app/api/
│        ├─ sync/events/route.ts
│        ├─ sync/match/finish/route.ts
│        ├─ sync/state/[matchId]/route.ts
│        ├─ athletes/[id]/route.ts
│        ├─ athletes/[id]/stats/route.ts
│        └─ tournaments/[id]/bracket/route.ts
│
├─ packages/
│  ├─ ui/                           # 共通デザイントークン + 汎用コンポーネント
│  │  ├─ src/styles.css             # @theme 定義（test_moc/index.css 由来）
│  │  └─ src/components/            # Button, Card, OTPInput など共通化
│  │
│  ├─ domain/                       # WKF Kumite 採点ルール
│  │  ├─ src/
│  │  │  ├─ scoring/rules.ts        # 勝敗判定、senshu、ポイント差、atoshibaraku
│  │  │  ├─ scoring/penalty.ts      # C1/C2 累積、Hansoku-chui、Hansoku
│  │  │  ├─ scoring/score.ts        # events → ScoreDetail 集計
│  │  │  ├─ analytics/stats.ts      # 試合データから stats 計算（暫定式）
│  │  │  ├─ bracket/single-elim.ts  # シングルエリミ生成
│  │  │  ├─ wkf/categories.ts       # 年齢・体重区分テンプレート
│  │  │  └─ types.ts
│  │  └─ tests/                     # ルールのユニットテスト
│  │
│  ├─ schemas/                      # Zod API契約
│  │  └─ src/
│  │     ├─ syncEvents.ts
│  │     ├─ syncMatchFinish.ts
│  │     └─ athlete.ts
│  │
│  └─ db/                           # Supabase クライアントラッパ
│     └─ src/
│        ├─ server.ts               # service_role 用
│        └─ client.ts               # anon key 用
│
├─ supabase/
│  ├─ migrations/                   # SQL マイグレーション
│  │  ├─ 0001_init.sql
│  │  └─ 0002_rls.sql
│  └─ seed.sql                      # 開発用シードデータ
│
├─ pnpm-workspace.yaml
├─ package.json
└─ ARCHITECTURE.md
```

---

## 6. データモデル

### 6.1 認証・ユーザ
```sql
-- Supabase Auth の auth.users を拡張
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('operator', 'coach', 'athlete')),
  display_name text not null,
  created_at timestamptz default now()
);
```

### 6.2 選手とコーチ
```sql
create table athletes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,  -- 選手本人のログイン
  name text not null,
  rank text not null,
  affiliation text,                  -- MVP は自由記述
  birth_date date,
  gender text check (gender in ('male', 'female')),
  weight_kg numeric,
  created_at timestamptz default now()
);

create table athlete_coach (
  athlete_id uuid references athletes(id) on delete cascade,
  coach_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (athlete_id, coach_id)
);
```

### 6.3 大会・トーナメント
```sql
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  status text not null check (status in ('Draft', 'Ongoing', 'Completed')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table tournament_categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  age_division text not null,        -- 'SENIOR', 'JUNIOR', 'CADET', 'U14', etc.
  gender text not null check (gender in ('male', 'female')),
  weight_class text not null,        -- '-60kg', '-67kg', '+84kg', etc.
  match_type text not null check (match_type in ('Kumite'))  -- MVP は Kumite のみ
);

create table brackets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references tournament_categories(id) on delete cascade,
  format text not null check (format in ('single_elim', 'double_elim', 'round_robin', 'league_to_knockout')),
  size int not null,
  generated_at timestamptz default now()
);

create table bracket_slots (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references brackets(id) on delete cascade,
  round int not null,
  position int not null,
  athlete_id uuid references athletes(id),
  match_id uuid references matches(id),
  advances_to_slot_id uuid references bracket_slots(id)
);
```

### 6.4 試合とスコアリングイベント
```sql
create table matches (
  id uuid primary key,               -- 端末発番 UUIDv7
  tournament_id uuid references tournaments(id) on delete cascade,
  category_id uuid references tournament_categories(id),
  type text not null check (type in ('Kumite')),  -- MVP は Kumite のみ
  round int not null,
  aka_athlete_id uuid references athletes(id),
  ao_athlete_id uuid references athletes(id),
  winner_id uuid references athletes(id),
  win_reason text check (win_reason in ('point_gap', 'target_score', 'time_up', 'hansoku', 'kiken', 'shikkaku', 'hantei')),
  senshu_holder text check (senshu_holder in ('AKA', 'AO')),
  referee_id uuid references auth.users(id),
  tatami_no int,
  start_time timestamptz,
  end_time timestamptz,
  status text not null check (status in ('Scheduled', 'Live', 'Completed')),
  settings jsonb not null,           -- duration, target_score, point_gap, senshu_enabled
  created_at timestamptz default now(),
  finalized_at timestamptz           -- match/finish 受信日時
);

-- 追記型イベント（Event Sourcing 風）
create table scoring_events (
  id uuid primary key,               -- 端末発番 UUIDv7
  match_id uuid not null references matches(id) on delete cascade,
  side text not null check (side in ('AKA', 'AO')),
  kind text not null check (kind in ('ippon', 'waza_ari', 'yuko', 'c1', 'c2', 'hansoku', 'kiken', 'shikkaku')),
  technique text,                    -- '中段突き', '場外' 等
  occurred_at_ms int not null,       -- 試合開始からの経過ms
  created_by uuid references auth.users(id),
  received_at timestamptz default now()
);
```

### 6.5 集計キャッシュ
```sql
create table athlete_stats_cache (
  athlete_id uuid primary key references athletes(id) on delete cascade,
  attack numeric,
  defense numeric,
  speed numeric,
  stamina numeric,
  win_rate numeric,
  match_count int,
  updated_at timestamptz default now()
);
```

試合が同期されるたび、対象選手の stats を再計算してこのテーブルを更新する。

---

## 7. オフラインファースト同期プロトコル

### 7.1 Outbox Pattern

端末側で発生する書き込みは、すべて IndexedDB のトランザクション内で「データ本体 + outbox エントリ」を同時に書き込む。

```
ユーザがポイント加算をタップ
        │
        ▼
IndexedDB トランザクション（1回で2つ書く）
  ① scoring_events に追記
  ② outbox に "未送信" として追記
        │
        ├─ オンライン → 同期ワーカーが outbox を即座にドレイン
        │              成功したら outbox から削除
        │
        └─ オフライン → outbox に滞留したまま
                       ネットワーク回復時に自動再送
```

### 7.2 同期エンドポイント

#### POST /api/sync/events
イベント単位の逐次同期。オンライン時の途中経過反映に使う。
```http
POST /api/sync/events
Authorization: Bearer <session-jwt>
Idempotency-Key: <event-uuidv7>
Content-Type: application/json

{
  "matchId": "01J9XK8VN5Q...",
  "events": [
    { "id": "...", "matchId": "...", "ts": 45000, "side": "AO", "kind": "yuko", "technique": "中段突き" }
  ]
}
```

#### POST /api/sync/match/finish
試合終了の確定。サーバ側で再検証して winner を決定する。
```http
POST /api/sync/match/finish
Authorization: Bearer <session-jwt>
Idempotency-Key: <match-uuidv7>

{
  "matchId": "01J9XK8VN5Q...",
  "tournamentId": "...",
  "categoryId": "...",
  "type": "Kumite",
  "round": 1,
  "tatamiNo": 3,
  "startedAt": "2026-05-24T10:23:00+09:00",
  "endedAt":   "2026-05-24T10:26:42+09:00",
  "aka": { "athleteId": "..." },
  "ao":  { "athleteId": "..." },
  "settings": { "duration": 180, "targetScore": 8, "pointGap": 8, "senshuEnabled": true },
  "events": [ ... ],
  "result": {
    "winnerId": "...",
    "reason": "point_gap",
    "senshuHolder": "AO"
  }
}
```

レスポンス:
- `201 Created` 受理
- `200 OK` 既に受理済み（冪等性ヒット）
- `409 Conflict` 同じ matchId で異なる内容が既にある
- `422 Unprocessable Entity` ドメインルール違反

#### GET /api/sync/state/:matchId
端末故障 → 別端末で再開時、サーバ側の状態を取得する。

---

## 8. ユーザロールと権限（RLS）

| 操作 | operator | coach | athlete |
|---|---|---|---|
| 大会作成・編集 | ○ | × | × |
| 選手データ参照（全件） | ○ | × | × |
| 選手データ参照（担当のみ） | ○ | ○ | × |
| 選手データ参照（本人のみ） | ○ | ○ | ○ |
| 試合採点（書き込み） | ○ | × | × |
| 自分の戦績閲覧 | ○ | ○ | ○ |

RLS ポリシー方針:
- `athletes` の SELECT: 本人または担当コーチまたは operator
- `matches` の SELECT: 関係選手・コーチ・operator
- `scoring_events` の INSERT: API 経由（service_role）のみ
- `tournaments` の編集: operator のみ

---

## 9. ドメインロジック（WKF Kumite）

### 9.1 採点の基本
- Ippon: 3 点（上段蹴り、投げ後の打突など）
- Waza-ari: 2 点（中段蹴り、上段への効果的打突）
- Yuko: 1 点（突き、打ち）

### 9.2 試合終了条件
1. **目標点達成**（成人男子 8 点、ジュニアは 6 点）
2. **ポイント差到達**（8 点差で即終了）
3. **時間切れ**（成人 3 分、ジュニア 2 分等）
4. **失格**（Hansoku, Shikkaku）
5. **棄権**（Kiken）

### 9.3 同点時の勝敗判定
1. **Senshu**: 試合中に先に有効打を出した側が勝ち（双方未取得の場合は適用外）
2. **Hantei**: 審判の判定（多数決）
3. **延長戦 (Encho-sen)**: MVP では未実装、将来追加検討

### 9.4 Atoshibaraku（残り 15 秒ルール）
残り 15 秒のアナウンス以降、Senshu の効果は失効する（同点時は Hantei に進む）。

### 9.5 ペナルティ（C1 / C2）
- C1: 場外、過度な接触回避等
- C2: 掴み、危険な技、ルール違反等
- 各 4 回累積で Hansoku-chui → Hansoku（失格 = 相手勝利）

### 9.6 採点ルールはすべて `packages/domain/scoring/` に純粋関数として実装
ユニットテストで境界条件を網羅する。

---

## 10. ビジュアルデザインシステム

`test_moc` のデザインを継承する。

### 10.1 カラーパレット
```css
--color-navy-950: #020617  /* メイン文字色・ボタン背景 */
--color-navy-900: #0A192F  /* ホバー */
--color-navy-800: #112240  /* スクロールバー */
--color-accent-red: #B91C1C /* アクセント・警告 */
背景: 白 (#FFFFFF)
```

### 10.2 タイポグラフィ
- フォント: Inter（system-ui フォールバック）
- 見出し: `font-black tracking-tighter uppercase italic`
- ラベル: `text-[10px] font-bold tracking-[0.2em] uppercase`
- 数値: `font-mono font-black`

### 10.3 スタイル特徴（Brutalist 系）
- 太いボーダー: `border-2 border-navy-950`
- ハードシャドウ: `shadow-[12px_12px_0px_0px_rgba(2,6,23,1)]`
- 直角中心
- ドットパターン背景: `bg-[radial-gradient(#020617_0.5px,transparent_0.5px)]`

### 10.4 流用ライブラリ
```
lucide-react, recharts, input-otp, cmdk, motion,
react-dnd, react-resizable-panels, react-hook-form,
clsx, tailwind-merge, tailwindcss v4, date-fns
```

### 10.5 流用元コンポーネント
| ファイル | 用途 | 行き先 |
|---|---|---|
| `AuthOTP.tsx` | OTPログイン | apps/scoring, apps/viewer |
| `Workspace.tsx` | アプリ全体レイアウト | apps/scoring, apps/viewer |
| `MatchSelection.tsx` | 試合選択 | apps/scoring |
| `MatchSettings.tsx` | 試合設定 | apps/scoring |
| `ScoringInterface.tsx` | 採点UI | apps/scoring |
| `AthleteInsights.tsx` | 選手分析グラフ | apps/viewer |
| `CommandPalette.tsx` | コマンドパレット | apps/scoring |

各コンポーネントは JSX マークアップ・スタイルを流用し、モックデータ参照を実データ接続に差し替える。

---

## 11. トーナメント形式

### 11.1 MVP
**シングルエリミネーション**のみ実装する。

### 11.2 データモデルは 4 形式に対応
`brackets.format` で以下を識別:
- `single_elim`（MVP 実装）
- `double_elim`（将来）
- `round_robin`（将来）
- `league_to_knockout`（将来）

`bracket_slots` の構造は 4 形式すべてを表現可能な汎用設計とする。

### 11.3 段階導入計画
1. MVP: シングルエリミネーション
2. v1.1: リーグ戦
3. v1.2: 予選リーグ → 決勝トーナメント
4. v2.0: ダブルエリミネーション

---

## 12. WKF カテゴリ

### 12.1 年齢区分（テンプレート）
| コード | ラベル | 年齢 |
|---|---|---|
| U12 | 12歳以下 | 0–11 |
| U14 | 14歳以下 | 12–13 |
| CADET | カデット | 14–15 |
| JUNIOR | ジュニア | 16–17 |
| U21 | U21 | 18–20 |
| SENIOR | シニア | 18+ |

### 12.2 体重区分（シニア Kumite）
- 男子: -60kg / -67kg / -75kg / -84kg / +84kg
- 女子: -50kg / -55kg / -61kg / -68kg / +68kg

その他の年齢区分も WKF 公式に準拠したテンプレートを `packages/domain/wkf/categories.ts` に定義する。

### 12.3 大会作成 UI
ドロップダウンで「年齢区分 × 性別 × 体重」を選択 → `tournament_categories` レコードを生成。

---

## 13. stats 計算（暫定式）

`packages/domain/analytics/stats.ts` で以下の暫定式を実装。後日、空手有識者との協議で見直す。

```typescript
attack   = clamp(平均得点 / 平均試合時間(分) * 25, 0, 100)
defense  = clamp(100 - 平均失点 / 平均試合時間(分) * 25, 0, 100)
speed    = clamp(初得点までの平均秒数の逆数スケール, 0, 100)
stamina  = clamp(試合後半の得点率 / 全体得点率 * 100, 0, 100)
win_rate = 勝ち試合数 / 全試合数 * 100
```

各値は 0–100 にクランプ。UI 上では「暫定」ラベルを表示する。

新しい試合が同期されるたび、対象選手の stats を再計算して `athlete_stats_cache` を更新する。

---

## 14. 実装ロードマップ

| Step | 内容 | 完了基準 |
|---|---|---|
| 1 | モノレポ + デザイントークン抽出 | `pnpm install` 通る、`packages/ui` から色・フォントが import 可能 |
| 2 | packages/domain（WKF Kumite ルール） | 勝敗判定の単体テスト 20+ ケース通過 |
| 3 | packages/schemas（Zod 契約） | 型と検証が動く |
| 4 | Supabase プロジェクト + マイグレーション | テーブル作成、RLS 有効化 |
| 5 | apps/api の sync エンドポイント | curl で POST、DB に書き込み |
| 6 | apps/scoring の最小スコアリング（IndexedDB のみ） | オフラインで採点 → スコア表示できる |
| 7 | apps/scoring の同期（outbox + リトライ） | オフライン採点 → オンライン復帰で自動送信 |
| 8 | apps/viewer の選手プロフィール表示 | Supabase から取得、AthleteInsights 描画 |
| 9 | PWA 化（Service Worker + Manifest） | ホーム画面追加・オフライン起動可能 |
| 10 | 大会・トーナメント表（シングルエリミ） | ブラケット生成 → 試合作成 |

各 Step は完了時点で動くものができることを基準とする（Big Bang を避ける）。

---

## 15. スコープ外（再掲・確認用）

以下は本 MVP では実装しない。将来の検討事項として記録する。

- 形（Kata）採点
- ダブルエリミネーション / 予選リーグ / リーグ戦
- 道場マスタテーブル
- 選手プロフィール画像
- AI / Gemini による分析コメント生成
- 動画アップロード・解析
- 観客向け公開ライブビュー
- PDF / CSV エクスポート
- スコアボード／大型ディスプレイ出力
- プッシュ通知
- 多言語対応
- 主審・副審の記録粒度（誰が採点したかの詳細）
- 大会後の SNS シェア
- 延長戦（Encho-sen）

---

## 16. 今後の検討事項

実装中・実装後に詰める項目。

### 16.1 ドメイン詳細
- 同点時 Hantei の入力 UI
- 延長戦の挙動
- Atoshibaraku の通知タイミング
- 棄権・失格の種別（Kiken / Shikkaku / Hansoku / Hansoku-chui）の記録粒度

### 16.2 運用
- 初回オンボーディング（最初の operator アカウント作成）
- シードデータ（開発用ダミー大会）
- iOS Safari の PWA 制約への対処（オフライン能力、ホーム画面追加促進）
- 試合中の誤タップ防止・Undo・確定ボタン要否

### 16.3 セキュリティ・プライバシー
- 個人情報保護法対応（選手の氏名・所属の取り扱い）
- 未成年選手の保護者同意フロー
- データエクスポート権・削除権
- 自己登録時の本人確認・なりすまし対策

### 16.4 コスト・スケーラビリティ
- Supabase 無料枠（DB 500MB）の限界試算
- 想定ユーザ規模（年間大会数・選手数・コーチ数）
- 有料プラン移行のトリガ

### 16.5 開発プロセス
- テスト戦略（domain 層は必須、E2E はどこまで）
- CI/CD（自動テスト・自動デプロイ）
- 監視・エラートラッキング（Sentry 等）

### 16.6 データ・分析
- stats 計算式の正式定義（空手有識者と協議）
- 選手間比較機能
- 過去大会データの移行（既存データがあれば）

### 16.7 データモデル
- マスタテーブル（道場、技、ペナルティ理由）の事前定義
- 監査ログ（誰がいつ何を編集したか）
- 削除ポリシー（論理削除 vs 物理削除）
