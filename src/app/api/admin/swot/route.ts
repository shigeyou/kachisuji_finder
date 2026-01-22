import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: デフォルトSWOTを取得
export async function GET() {
  try {
    const swot = await prisma.defaultSwot.findUnique({
      where: { id: "default" },
    });

    if (!swot) {
      return NextResponse.json({
        exists: false,
        message: "デフォルトSWOTが未設定です",
      });
    }

    return NextResponse.json({
      exists: true,
      swot: {
        strengths: JSON.parse(swot.strengths),
        weaknesses: JSON.parse(swot.weaknesses),
        opportunities: JSON.parse(swot.opportunities),
        threats: JSON.parse(swot.threats),
        summary: swot.summary,
        updatedAt: swot.updatedAt,
        updatedBy: swot.updatedBy,
      },
    });
  } catch (error) {
    console.error("Admin SWOT GET error:", error);
    return NextResponse.json(
      { error: "SWOT取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: デフォルトSWOTを作成/更新（開発者専用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strengths, weaknesses, opportunities, threats, summary, updatedBy } = body;

    // バリデーション
    if (!strengths || !Array.isArray(strengths) || strengths.length === 0) {
      return NextResponse.json(
        { error: "strengths は必須です（配列）" },
        { status: 400 }
      );
    }
    if (!weaknesses || !Array.isArray(weaknesses) || weaknesses.length === 0) {
      return NextResponse.json(
        { error: "weaknesses は必須です（配列）" },
        { status: 400 }
      );
    }
    if (!opportunities || !Array.isArray(opportunities) || opportunities.length === 0) {
      return NextResponse.json(
        { error: "opportunities は必須です（配列）" },
        { status: 400 }
      );
    }
    if (!threats || !Array.isArray(threats) || threats.length === 0) {
      return NextResponse.json(
        { error: "threats は必須です（配列）" },
        { status: 400 }
      );
    }

    // upsert（存在すれば更新、なければ作成）
    const swot = await prisma.defaultSwot.upsert({
      where: { id: "default" },
      update: {
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
        opportunities: JSON.stringify(opportunities),
        threats: JSON.stringify(threats),
        summary: summary || null,
        updatedBy: updatedBy || null,
      },
      create: {
        id: "default",
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
        opportunities: JSON.stringify(opportunities),
        threats: JSON.stringify(threats),
        summary: summary || null,
        updatedBy: updatedBy || null,
      },
    });

    return NextResponse.json({
      success: true,
      swot: {
        strengths: JSON.parse(swot.strengths),
        weaknesses: JSON.parse(swot.weaknesses),
        opportunities: JSON.parse(swot.opportunities),
        threats: JSON.parse(swot.threats),
        summary: swot.summary,
        updatedAt: swot.updatedAt,
        updatedBy: swot.updatedBy,
      },
    });
  } catch (error) {
    console.error("Admin SWOT POST error:", error);
    return NextResponse.json(
      { error: "SWOT保存に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: デフォルトSWOTを削除（開発者専用）
export async function DELETE() {
  try {
    await prisma.defaultSwot.delete({
      where: { id: "default" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin SWOT DELETE error:", error);
    return NextResponse.json(
      { error: "SWOT削除に失敗しました" },
      { status: 500 }
    );
  }
}
