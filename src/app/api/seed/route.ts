import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

interface SeedDocument {
  filename: string;
  fileType: string;
  content: string;
  metadata: string | null;
}

// GET: シードデータの状態確認
export async function GET() {
  try {
    const ragCount = await prisma.rAGDocument.count();
    const seedFilePath = path.join(process.cwd(), "prisma/seed-data/rag-documents.json");
    const seedFileExists = fs.existsSync(seedFilePath);

    return NextResponse.json({
      ragDocumentCount: ragCount,
      seedFileExists,
      needsSeeding: ragCount === 0 && seedFileExists,
    });
  } catch (error) {
    console.error("Seed status error:", error);
    return NextResponse.json(
      { error: "シード状態の確認に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: シードデータを読み込み
export async function POST() {
  try {
    // 既存のRAGドキュメント数を確認
    const existingCount = await prisma.rAGDocument.count();
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: "RAGドキュメントが既に存在するため、シードをスキップしました",
        existingCount,
        seeded: 0,
      });
    }

    // シードファイルを読み込み
    const seedFilePath = path.join(process.cwd(), "prisma/seed-data/rag-documents.json");

    if (!fs.existsSync(seedFilePath)) {
      return NextResponse.json({
        success: false,
        message: "シードファイルが見つかりません",
        path: seedFilePath,
      });
    }

    const seedData = JSON.parse(fs.readFileSync(seedFilePath, "utf-8"));
    const documents: SeedDocument[] = seedData.documents || [];

    if (documents.length === 0) {
      return NextResponse.json({
        success: false,
        message: "シードファイルにドキュメントがありません",
      });
    }

    // ドキュメントを挿入
    const results = [];
    for (const doc of documents) {
      const created = await prisma.rAGDocument.create({
        data: {
          filename: doc.filename,
          fileType: doc.fileType,
          content: doc.content,
          metadata: doc.metadata,
        },
      });
      results.push({ id: created.id, filename: created.filename });
    }

    console.log(`Seeded ${results.length} RAG documents`);

    return NextResponse.json({
      success: true,
      message: `${results.length}件のRAGドキュメントをシードしました`,
      seeded: results.length,
      documents: results,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: `シードに失敗しました: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
