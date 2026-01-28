import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

// デフォルトの重み設定
const defaultWeights = {
  revenuePotential: 30,
  timeToRevenue: 20,
  competitiveAdvantage: 20,
  executionFeasibility: 15,
  hqContribution: 10,
  mergerSynergy: 5,
};

// GET: ユーザーのスコア設定を取得
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const config = await prisma.userScoreConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      // 設定がない場合はデフォルト値を返す
      return NextResponse.json({
        config: null,
        weights: defaultWeights,
        isDefault: true,
      });
    }

    return NextResponse.json({
      config: {
        id: config.id,
        userId: config.userId,
        updatedAt: config.updatedAt,
      },
      weights: {
        revenuePotential: config.revenuePotential,
        timeToRevenue: config.timeToRevenue,
        competitiveAdvantage: config.competitiveAdvantage,
        executionFeasibility: config.executionFeasibility,
        hqContribution: config.hqContribution,
        mergerSynergy: config.mergerSynergy,
      },
      isDefault: false,
    });
  } catch (error) {
    console.error("Score config GET error:", error);
    return NextResponse.json(
      { error: "スコア設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: ユーザーのスコア設定を保存
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();

    const {
      revenuePotential,
      timeToRevenue,
      competitiveAdvantage,
      executionFeasibility,
      hqContribution,
      mergerSynergy,
    } = body;

    // バリデーション
    const weights = [
      revenuePotential,
      timeToRevenue,
      competitiveAdvantage,
      executionFeasibility,
      hqContribution,
      mergerSynergy,
    ];

    for (const w of weights) {
      if (typeof w !== "number" || w < 0 || w > 100) {
        return NextResponse.json(
          { error: "重みは0〜100の数値で指定してください" },
          { status: 400 }
        );
      }
    }

    // upsert: 既存なら更新、なければ作成
    const config = await prisma.userScoreConfig.upsert({
      where: { userId },
      update: {
        revenuePotential,
        timeToRevenue,
        competitiveAdvantage,
        executionFeasibility,
        hqContribution,
        mergerSynergy,
      },
      create: {
        userId,
        revenuePotential,
        timeToRevenue,
        competitiveAdvantage,
        executionFeasibility,
        hqContribution,
        mergerSynergy,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        userId: config.userId,
        updatedAt: config.updatedAt,
      },
      weights: {
        revenuePotential: config.revenuePotential,
        timeToRevenue: config.timeToRevenue,
        competitiveAdvantage: config.competitiveAdvantage,
        executionFeasibility: config.executionFeasibility,
        hqContribution: config.hqContribution,
        mergerSynergy: config.mergerSynergy,
      },
    });
  } catch (error) {
    console.error("Score config POST error:", error);
    return NextResponse.json(
      { error: "スコア設定の保存に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: ユーザーのスコア設定を削除（デフォルトに戻す）
export async function DELETE() {
  try {
    const userId = await getCurrentUserId();

    await prisma.userScoreConfig.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "スコア設定をデフォルトに戻しました",
    });
  } catch (error) {
    console.error("Score config DELETE error:", error);
    return NextResponse.json(
      { error: "スコア設定の削除に失敗しました" },
      { status: 500 }
    );
  }
}
