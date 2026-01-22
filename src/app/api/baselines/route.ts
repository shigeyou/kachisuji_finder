import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentBaseline,
  getBaselineHistory,
  recordBaseline,
} from "@/lib/self-improve";

// ベースライン履歴を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const current = searchParams.get("current") === "true";
    const limit = parseInt(searchParams.get("limit") || "30");

    if (current) {
      const baseline = await getCurrentBaseline();
      return NextResponse.json({ baseline });
    }

    const baselines = await getBaselineHistory(limit);
    return NextResponse.json({ baselines });
  } catch (error) {
    console.error("Baselines GET error:", error);
    return NextResponse.json(
      { error: "ベースラインの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// ベースラインを手動記録
export async function POST() {
  try {
    const baseline = await recordBaseline();

    if (!baseline) {
      return NextResponse.json(
        { error: "記録する戦略がありません" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      baseline,
      message: `ベースラインを記録しました（トップスコア: ${baseline.topScore.toFixed(2)}）`,
    });
  } catch (error) {
    console.error("Baselines POST error:", error);
    return NextResponse.json(
      { error: "ベースラインの記録に失敗しました" },
      { status: 500 }
    );
  }
}
