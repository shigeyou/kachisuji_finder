export async function register() {
  // サーバーサイドでのみ実行
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("@/lib/db");
    const fs = await import("fs");
    const path = await import("path");

    try {
      // RAGドキュメント数を確認
      const ragCount = await prisma.rAGDocument.count();

      if (ragCount === 0) {
        console.log("[Auto-Seed] RAGドキュメントが0件です。シードを実行します...");

        const seedFilePath = path.join(process.cwd(), "prisma/seed-data/rag-documents.json");

        if (fs.existsSync(seedFilePath)) {
          const seedData = JSON.parse(fs.readFileSync(seedFilePath, "utf-8"));
          const documents = seedData.documents || [];

          for (const doc of documents) {
            await prisma.rAGDocument.create({
              data: {
                filename: doc.filename,
                fileType: doc.fileType,
                content: doc.content,
                metadata: doc.metadata,
              },
            });
          }

          console.log(`[Auto-Seed] ${documents.length}件のRAGドキュメントをシードしました`);
        } else {
          console.log("[Auto-Seed] シードファイルが見つかりません:", seedFilePath);
        }
      } else {
        console.log(`[Auto-Seed] RAGドキュメントが${ragCount}件存在します。シードをスキップします`);
      }
    } catch (error) {
      console.error("[Auto-Seed] エラー:", error);
    }
  }
}
