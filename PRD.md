# プロダクト要求仕様書 (PRD)

## 1. 製品名

**Local DocSearch & Chat Assistant**

## 2. 背景と目的

- *背景*: エンジニアがローカルで管理する Markdown ドキュメントを、即座に全文検索・要約取得・チャット形式で Q&A できる環境が乏しい。
- *目的*: Git で管理された Markdown を **唯一の真実 (SSOT)** とし、変更差分だけをベクトル DB (Qdrant) と同期。React UI 上で閲覧・チャット可能にする。

## 3. スコープ

| 含む                        | 含まない               |
| ------------------------- | ------------------ |
| ローカル PC での動作              | クラウド / SaaS へのデプロイ |
| Markdown (`.md`) ファイル     | PDF, Word など他形式    |
| Qdrant / Redis / Node サーバ | 外部 LLM 呼び出しコスト管理   |

## 4. ターゲットユーザ / ペルソナ

- **ソフトウェアエンジニア** (個人 or 小規模チーム)
  - Git 上の設計資料を頻繁に参照
  - LLM による高速検索・要約を求める

## 5. ユースケース (代表例)

1. エンジニアが新しい API 仕様を確認したい → ファイルを開かずチャットに質問し要約を得る。
2. Markdown を編集・保存 → 即座に検索結果へ反映。
3. 同期失敗 (ネットワーク遮断) → 自動リトライで回復を確認。

## 6. 主要機能要件

| ID | 要件                               | 優先度    |
| -- | -------------------------------- | ------ |
| F1 | Markdown 変更検知 (chokidar)         | High   |
| F2 | SHA‑1 マニフェスト差分比較                 | High   |
| F3 | Embedding 生成 (OpenAI or OSS)     | High   |
| F4 | Qdrant への Upsert/Delete          | High   |
| F5 | BullMQ による Job & 再試行             | Medium |
| F6 | React UI: DocTree / MarkdownPane | High   |
| F7 | React UI: ChatPane + SSE         | High   |
| F8 | ソース行ハイライト (任意)                   | Low    |

## 7. 非機能要件

| 区分      | 指標                               |
| ------- | -------------------------------- |
| パフォーマンス | 検索レスポンス < 1.5s (95 パーセンタイル)      |
| 信頼性     | 同期 Job 成功率 99%+ (自動リトライ込)        |
| セキュリティ  | ローカル環境のみ。外部通信は LLM API のみ TLS 利用 |
| 可搬性     | Docker Compose 一発起動              |

## 8. アーキテクチャ図 (テキスト)

```
Markdown (.md) ─▶ Sync Agent (Node) ─▶ Redis/BullMQ ─▶ Qdrant
                                 │                        ▲
                                 └───── Search API ───────┘
React UI (DocTree / Chat) ◀──── SSE/REST ────────────────────┘
```

## 9. 同期フロー詳細

1. chokidar が `add/change/unlink` を検知
2. SHA‑1 計算 → manifest 比較
3. 差分のみ BullMQ キュー投入 (attempts=5, exponential back‑off)
4. Worker が Embedding → Qdrant Upsert/Delete
5. 成功時 manifest 更新

## 10. UI 要件

### 10.1 レイアウト

| 領域   | 幅   | 内容                            |
| ---- | --- | ----------------------------- |
| 左ペイン | 20% | DocTree (MUI TreeView)        |
| 中央   | 45% | MarkdownPane (react‑markdown) |
| 右ペイン | 35% | ChatPane (LLM Q&A)            |

### 10.2 チャット仕様

- SSE でトークンストリーム表示 (0.1s バッファ)
- ユーザ入力 → `/chat` POST (JSON)
- Claude Code SDK が RAG 生成

## 11. KPI / 指標

| KPI          | 目標値           |
| ------------ | ------------- |
| 初回フル同期時間     | < 60s (10k 行) |
| 1 ファイル変更時反映  | < 2s          |
| RAG 正答率 (@5) | > 80%         |

## 12. マイルストーン

| フェーズ | 内容                        | 完了条件            |
| ---- | ------------------------- | --------------- |
| M1   | Sync Agent + manifest     | 差分 upsert 動作確認  |
| M2   | Search API + RAG          | CLI で回答取得       |
| M3   | React UI DocTree/Markdown | ドキュメント閲覧可       |
| M4   | ChatPane ストリーム            | 連携チャット完動        |
| M5   | バックオフ & リトライ監視            | 30 分間エラー注入テスト通過 |

## 13. リスク & 想定対策

| リスク            | 対策                                  |
| -------------- | ----------------------------------- |
| LLM API レート制限  | Embedding キューにトークン制限を実装             |
| 大容量 Markdown   | max‑token 以上で再分割／OSS Embeddings へ切替 |
| chokidar 監視数上限 | `atomic: true` / `cwd` 絞り込み         |

## 14. 今後の拡張 (Out‑of‑Scope)

- MCP Tool 化により外部 LLM クライアントと連携
- PDF 生成, Docusaurus サイト自動ビルド
- Docker Desktop 用 GUI (Electron)

---

*更新履歴*

- 2025‑07‑26  初版作成
