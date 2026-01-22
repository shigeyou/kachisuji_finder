import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// エクスポート（CSV, JSON, Markdown形式対応）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "services";
    const format = searchParams.get("format") || "csv";

    let data: Record<string, unknown>[] = [];
    let filename = "";
    let headers: string[] = [];

    switch (type) {
      case "services":
        const services = await prisma.coreService.findMany({
          orderBy: { createdAt: "desc" },
        });
        data = services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category || "",
          description: s.description || "",
          url: s.url || "",
          createdAt: s.createdAt.toISOString(),
        }));
        headers = ["id", "name", "category", "description", "url", "createdAt"];
        filename = "services";
        break;

      case "assets":
        const assets = await prisma.coreAsset.findMany({
          orderBy: { createdAt: "desc" },
        });
        data = assets.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          description: a.description || "",
          createdAt: a.createdAt.toISOString(),
        }));
        headers = ["id", "name", "type", "description", "createdAt"];
        filename = "assets";
        break;

      case "history":
        const history = await prisma.exploration.findMany({
          orderBy: { createdAt: "desc" },
        });
        data = history.map((h) => ({
          id: h.id,
          question: h.question,
          context: h.context || "",
          constraints: h.constraints,
          result: h.result,
          createdAt: h.createdAt.toISOString(),
        }));
        headers = ["id", "question", "context", "constraints", "result", "createdAt"];
        filename = "exploration_history";
        break;

      default:
        return NextResponse.json(
          { error: "不正なエクスポートタイプです" },
          { status: 400 }
        );
    }

    if (format === "json") {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }

    if (format === "md") {
      let mdContent = "";

      switch (type) {
        case "services":
          mdContent = "# サービス・機能一覧\n\n";
          mdContent += "エクスポート日時: " + new Date().toLocaleString("ja-JP") + "\n\n";
          if (data.length === 0) {
            mdContent += "登録されているサービスはありません。\n";
          } else {
            data.forEach((item, index) => {
              mdContent += "## " + (index + 1) + ". " + item.name + "\n\n";
              if (item.category) mdContent += "- **カテゴリ**: " + item.category + "\n";
              if (item.description) mdContent += "- **説明**: " + item.description + "\n";
              if (item.url) mdContent += "- **URL**: " + item.url + "\n";
              mdContent += "- **登録日**: " + new Date(item.createdAt as string).toLocaleString("ja-JP") + "\n";
              mdContent += "\n---\n\n";
            });
          }
          break;

        case "assets":
          mdContent = "# アセット一覧\n\n";
          mdContent += "エクスポート日時: " + new Date().toLocaleString("ja-JP") + "\n\n";
          if (data.length === 0) {
            mdContent += "登録されているアセットはありません。\n";
          } else {
            data.forEach((item, index) => {
              mdContent += "## " + (index + 1) + ". " + item.name + "\n\n";
              if (item.type) mdContent += "- **種別**: " + item.type + "\n";
              if (item.description) mdContent += "- **説明**: " + item.description + "\n";
              mdContent += "- **登録日**: " + new Date(item.createdAt as string).toLocaleString("ja-JP") + "\n";
              mdContent += "\n---\n\n";
            });
          }
          break;

        case "history":
          mdContent = "# 探索履歴\n\n";
          mdContent += "エクスポート日時: " + new Date().toLocaleString("ja-JP") + "\n\n";
          if (data.length === 0) {
            mdContent += "探索履歴はありません。\n";
          } else {
            data.forEach((item, index) => {
              mdContent += "## " + (index + 1) + ". " + item.question + "\n\n";
              if (item.context) mdContent += "**コンテキスト**: " + item.context + "\n\n";
              if (item.constraints) mdContent += "**制約**: " + item.constraints + "\n\n";
              mdContent += "### 結果\n\n" + item.result + "\n\n";
              mdContent += "*探索日時: " + new Date(item.createdAt as string).toLocaleString("ja-JP") + "*\n";
              mdContent += "\n---\n\n";
            });
          }
          break;
      }

      return new NextResponse(mdContent, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.md"`,
        },
      });
    }

    // CSV形式
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const value = String(row[h] || "");
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const bom = "\uFEFF";
    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "エクスポート中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
