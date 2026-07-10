# Karate Scoring & Athlete Analytics System

空手の試合得点管理と選手データ分析を行う Web システム。
オフラインファースト PWA + Next.js + Supabase で構成。

設計の詳細は [ARCHITECTURE.md](ARCHITECTURE.md) を参照。

---

## クイックスタート

```bash
make setup        # 初回セットアップガイド表示
make dev          # 開発サーバ起動 (http://localhost:3000)
make check        # typecheck + test
```

全コマンドは `make help` で確認できます。

Supabase のセットアップは [supabase/README.md](supabase/README.md) を参照してください。

---

## 実装済み機能

### Scoring App (採点アプリ・PWA)
試合会場で各タタミに置いて使うオフラインファースト採点アプリ。

- **試合作成** — 選手名、タイマー、目標点、ポイント差、senshu の有無を設定
- **ライブ採点** — Yuko (1) / Waza-ari (2) / Ippon (3) / C1 / C2 / Hansoku / Kiken / Shikkaku をワンタップ入力
- **リアルタイム勝敗判定** — WKF ルール準拠 (point_gap, target_score, time_up, senshu, hantei, hansoku)
- **タイマー** — Start / Stop / 残り時間表示、終了時に自動停止
- **ペナルティ累積表示** — C1 / C2 を 4 段階ドットで可視化 (chukoku → keikoku → hansoku_chui → hansoku)
- **Undo / Reset** — 直前イベント取り消し、全リセット
- **オフライン動作** — IndexedDB (Dexie) で完全ローカル動作
- **背景同期 (Outbox Pattern)** — オンライン復帰時に自動でサーバへ送信、指数バックオフ
- **同期ステータス表示** — OFFLINE / SYNCING / SYNCED / RETRY バッジ

### Viewer App (選手データ閲覧)
選手とコーチが過去の戦績と統計を閲覧する画面。モバイル最適化。

- **選手一覧** — 名前 / 所属でインクリメンタル検索
- **選手プロフィール** — 段位、所属、性別、体重
- **レーダーチャート** — 攻撃力 / 守備力 / スピード / スタミナ / 勝率 (recharts)
- **stats 自動計算** — 試合データから集計 (現状は暫定式)
- **戦績履歴** — 直近 50 試合、対戦相手・スコア・勝敗

### Tournament Manager (大会管理)
大会の作成からブラケット表示、試合開始までを一元管理。

- **大会作成** — 名前、日付、カテゴリ (年齢 / 性別 / 体重) を設定
- **ブラケット自動生成** — シングルエリミネーション、BYE 対応 (2-64 選手)
- **ブラケット可視化** — Round ごとの列表示、勝者ハイライト、Champion カード
- **試合開始 → 採点画面遷移** — ブラケットの Start ボタンから採点画面へ
- **完了試合の反映** — 試合が同期されると勝者が表示される

### バックエンド API
すべて Next.js Route Handlers (Vercel デプロイ可)。

| Endpoint | 機能 |
|---|---|
| `POST /api/sync/events` | 試合イベントの逐次同期 (match の upsert も対応) |
| `POST /api/sync/match/finish` | 試合終了の確定 + domain ルールでサーバ側再検証 |
| `GET /api/sync/state/:matchId` | 端末復旧用のサーバ状態取得 |
| `GET /api/athletes` | 選手一覧 |
| `GET /api/athletes/:id` | 選手プロフィール + stats + 戦績 |
| `GET /api/tournaments` | 大会一覧 |
| `POST /api/tournaments` | 大会作成 (categories + bracket + slots を一括生成) |
| `GET /api/tournaments/:id` | 大会詳細 (bracket + athletes + matches) |
| `POST /api/brackets/start-match` | ブラケットスロットから match 生成 |

### Domain Layer
フロントとバックの両方から import される純粋関数群。**54 ユニットテスト通過**。

| モジュール | 内容 |
|---|---|
| `scoring/score` | events → ScoreDetail 集計、合計点計算 |
| `scoring/penalty` | C1 / C2 ペナルティ進行 (chukoku → keikoku → hansoku_chui → hansoku) |
| `scoring/rules` | WKF Kumite 勝敗判定、senshu 計算 |
| `analytics/stats` | 試合データから選手 stats 計算 (暫定式) |
| `bracket/single-elim` | シングルエリミブラケット生成、BYE パディング |

### PWA
- Web App Manifest (`manifest.webmanifest`)
- Service Worker (`sw.js`) — network-first ナビゲーション + cache-first 静的アセット + API バイパス
- ホーム画面追加対応 (iOS / Android)
- アプリショートカット: New Match, Athletes
- オフライン起動可能

### データベース (Supabase Postgres + RLS)
- 10 テーブル: profiles, athletes, athlete_coach, tournaments, tournament_categories, brackets, bracket_slots, matches, scoring_events, athlete_stats_cache
- Row Level Security ポリシー設定済み (operator / coach / athlete の 3 ロール)
- マイグレーション + シードデータ完備

### Visual Design
- Tailwind v4 + カスタムデザイントークン (navy + accent-red)
- Inter フォント、太字 italic uppercase の見出し
- Lucide React アイコン
- test_moc のデザイン言語を継承

---

## プロジェクト構成

```
karate-system/
├─ apps/
│  └─ web/                          # Next.js 15 + React 19 + Tailwind v4 (PWA)
│     └─ src/
│        ├─ app/                    # App Router pages + API routes
│        │  ├─ scoring/             # Scoring App
│        │  ├─ tournaments/         # Tournament Manager
│        │  ├─ viewer/              # Viewer App
│        │  └─ api/                 # Route Handlers
│        ├─ components/             # SyncStatus, SwRegister
│        └─ lib/
│           ├─ db/                  # Dexie (IndexedDB)
│           ├─ scoring/             # match actions
│           ├─ sync/                # outbox sync engine
│           └─ api/                 # error helpers
│
├─ packages/
│  ├─ domain/                       # 採点ルール + analytics + bracket
│  ├─ schemas/                      # Zod API 契約
│  ├─ db/                           # Supabase クライアントラッパ
│  └─ ui/                           # 共有デザイントークン
│
├─ supabase/
│  ├─ migrations/                   # SQL マイグレーション
│  ├─ seed.sql                      # 開発用シードデータ
│  └─ README.md                     # Supabase セットアップガイド
│
├─ test_moc/                        # オリジナルのデザインモック (視覚リファレンス)
│
├─ ARCHITECTURE.md                  # 設計ドキュメント
├─ Makefile                         # 一括コマンド
└─ README.md
```

---

## 技術スタック

| レイヤ | 採用 |
|---|---|
| フロント | Next.js 15 + React 19 + Tailwind v4 |
| ローカル DB | Dexie (IndexedDB) |
| バックエンド | Next.js Route Handlers (Node.js runtime) |
| データベース | Supabase Postgres (Tokyo) |
| 認証 | Supabase Auth (email OTP, @supabase/ssr) |
| バリデーション | Zod |
| UI コンポーネント | lucide-react, recharts |
| ホスティング (想定) | Vercel + Supabase Free Tier |
| パッケージ管理 | pnpm workspaces |
| テスト | Vitest |

---

## データフロー

### オフラインファースト同期 (Outbox Pattern)
```
ユーザがポイント加算をタップ
        │
        ▼
IndexedDB トランザクション (1回で2つ書く)
  ① events に追記
  ② outbox に "未送信" として追記
        │
        ▼
バックグラウンドワーカー (5 秒間隔 + online イベント)
  ├─ navigator.onLine === false → スキップ
  ├─ outbox から due な entries を取得
  └─ POST /api/sync/events
        │
        ▼ サーバ
   matches を upsert (初回時) + scoring_events を INSERT
   既存 ID は冪等に無視
```

### 大会 → 採点フロー
```
1. /tournaments/new で大会作成
   → tournaments + tournament_categories + brackets + bracket_slots
2. /tournaments/[id] でブラケット表示
3. [Start] クリック
   → POST /api/brackets/start-match (matches 行作成 + slots に link)
   → importMatchFromBracket() で LocalMatch を IndexedDB に作成
   → /scoring/[matchId] へ遷移
4. ライブ採点 → Finish → outbox 同期
5. 大会画面に戻ると勝者がハイライト
```

---

## 採点ルール (NexTep モデル)

採点ロジックは `test_moc` のデザインモックの仕様を正としています(WKF 標準から一部意図的に逸脱)。
実装は `packages/domain`、モックの手本は [test_moc/src/components/ScoringInterface.tsx](test_moc/src/components/ScoringInterface.tsx)。

- 得点: 一本 +3 / 技あり +2 / 有効 +1
- 反則 C: 統合カウント。5 回で失格。**10 カウント**は即失格 (c += 5)
- **ラスト 15 秒の反則**: 相手に加点 (当てすぎ +1 / それ以外 +4)
- 先取 (SENSHU): 審判の**手動トグル**
- 勝敗判定順: 失格 → 合計点 → 先取 → 一本数 → 技あり数 → HANTEI(判定投票)
- Admin パネルでのイベント削除に応じた**逆再計算**(終了条件が解けたら試合再開)

---

## 解消済み (この実装で対応)

| 項目 | 対応内容 |
|---|---|
| 認証・認可 | Supabase Auth (email OTP) + JWT 検証 (`getUser`) + role ベース認可 + middleware 保護。書き込み系 API は operator 限定 (アプリ層 + RPC 内の二重ガード) |
| RLS 有効化 | 全ポリシーを `app_current_role()` で稼働。読み取りは anon+RLS、書き込みは限定パス |
| 原子性 | `finish_match` / `create_tournament` を plpgsql RPC 化しトランザクション保証 |
| 勝者の自動進出 | match finish → `advance_winner` で次スロットへ自動反映。BYE は多段自動進出 |
| stats キャッシュ | finish 時に `refresh_athlete_stats` で `athlete_stats_cache` を更新 |
| profiles 自動生成 | `handle_new_user` トリガ(全 signup を least-privilege の athlete で作成) |

## 既知の制約 (MVP)

本番運用前に解消すべき項目。

| 項目 | 現状 | 必要な対応 |
|---|---|---|
| Atoshibaraku | 未実装 | 残り 15 秒で senshu 失効ロジック追加 |
| 延長戦 (Encho-sen) | 未実装 | 同点 hantei 後の延長戦サポート |
| 形 (Kata) 採点 | 未対応 | 別 UI + 別ルール (5-7 審判の点数、最高最低カット) |
| ダブルエリミ / リーグ戦 | 未実装 | bracket format ごとに UI とロジック追加 |
| stats 計算式 | 暫定式 (speed/stamina はプレースホルダ) | 空手有識者と協議して確定 |
| PDF / CSV エクスポート | 未実装 | 結果配布機能 |
| 多言語対応 | 日本語のみ | i18n ライブラリ導入 |
| Athletes マスタ管理 UI | Supabase Dashboard 経由のみ | 運営画面で CRUD |
| API 統合テスト / E2E | 未導入 | Route Handler 統合テスト・Playwright |
| 監査ログ | 未実装 | 誰がいつ何を編集したか |

---

## テスト

```bash
make test
```

```
✓ packages/domain   59 tests  (scoring rules, penalty, stats, bracket)
✓ packages/schemas  19 tests  (Zod schema validation)
```

ドメイン層(採点の数理)とスキーマ契約は単体テストで担保。API Route Handler の統合テストと
E2E (Playwright) は未導入。SQL RPC・ブラケット進出・認可ガードはローカル Postgres で手動検証済み。

---

## ライセンス

未設定。
