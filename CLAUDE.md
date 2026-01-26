# 勝ち筋ファインダー - Claude Code プロジェクトルール

## 基本ルール

### 変更後は必ずURLを提示
- アプリに変更を加えた後は、**必ず該当ページのURLを提示**する
- ローカル、Azure、本番環境いずれの場合も同様
- ユーザーが`Ctrl+クリック`でページを開けるようにする
- 例: `http://localhost:3006/explore`

## 開発サーバー

### ポート番号は固定（3006）
- 開発サーバーは **常にポート3006** で起動する（旧バージョンの3000と区別）
- ポート3006が使用中の場合は、**別のポートに変更せず**、以下の手順で対応：
  1. `netstat -ano | findstr ":3006"` でプロセスIDを確認
  2. `powershell -Command "Stop-Process -Id <PID> -Force"` でプロセスを終了
  3. ポートが解放されたことを確認してから `npm run dev` を実行

### サーバー起動手順
```bash
# 1. ポート確認
netstat -ano | findstr ":3006"

# 2. 使用中なら解放
powershell -Command "Stop-Process -Id <PID> -Force"

# 3. ロックファイル削除（必要に応じて）
rm -rf .next/dev/lock

# 4. サーバー起動
npm run dev
```

## テスト

### 変更後は必ずテストを実行
アプリに変更を加えた後は、以下のテストを実施すること：

1. **APIテスト**（curl）
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/api/core/services
   ```

2. **Playwrightテスト**（ブラウザ操作テスト）
   ```bash
   npx playwright test
   ```

3. **統合テスト**
   ```bash
   npx playwright test tests/integration.spec.ts
   ```

### テスト対象ページ
- `/` - ホーム
- `/swot` - SWOT分析
- `/explore` - 勝ち筋探索
- `/core` - コア情報管理
- `/history` - 探索履歴

## デプロイ（Azure）

### RAGドキュメント自動シード機能

**アプリ起動時に自動でRAGドキュメントをシードする機能が実装済み。**

- シードファイル: `prisma/seed-data/rag-documents.json`
- 起動時にRAGドキュメントが0件の場合、自動的にシードデータを読み込む
- `src/instrumentation.ts` で実装

### シードデータの更新方法

ローカルのRAGドキュメントをシードファイルに反映する場合：

```bash
# 1. ローカルからRAGドキュメントをエクスポート
node -e "
const ids = [/* ローカルのドキュメントIDリスト - api/ragで取得 */];
async function main() {
  const docs = [];
  for (const id of ids) {
    const res = await fetch('http://localhost:3006/api/rag?id=' + id);
    const data = await res.json();
    if (data.document) {
      docs.push({
        filename: data.document.filename,
        fileType: data.document.fileType,
        content: data.document.content,
        metadata: data.document.metadata
      });
    }
  }
  console.log(JSON.stringify({ documents: docs }));
}
main();
" 2>/dev/null > prisma/seed-data/rag-documents.json

# 2. コミット・プッシュ
git add prisma/seed-data/rag-documents.json
git commit -m "chore: Update RAG seed data"
git push origin master
```

### 手動シードAPI

自動シードが動作しない場合の手動実行：
- `GET /api/seed` - シード状態確認
- `POST /api/seed` - 手動シード実行

### デプロイ手順チェックリスト
1. [ ] シードデータが最新か確認（`prisma/seed-data/rag-documents.json`）
2. [ ] `git push origin master` でコードをプッシュ
3. [ ] GitHub Actionsのデプロイ完了を確認
4. [ ] Azure版でRAGドキュメント件数を確認（自動シード済みのはず）
5. [ ] 動作確認（SWOT、勝ち筋探索など）

### 文字化け対策（手動インポート時）
- インポート時は必ず `charset=utf-8` を指定する
- `--data-binary` を使用してバイナリデータとして送信する

## 技術スタック
- Next.js 16 (Turbopack)
- TypeScript
- Tailwind CSS v4
- Prisma (SQLite)
- Azure OpenAI
- Tavily API (Web検索)

## 環境変数
必要な環境変数は `.env` に記述：
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`
- `TAVILY_API_KEY`
