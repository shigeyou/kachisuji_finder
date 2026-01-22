import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 採否を記録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { explorationId, strategyName, decision, reason, feasibilityNote } = body;

    // バリデーション
    if (!explorationId || !strategyName || !decision) {
      return NextResponse.json(
        { error: "explorationId, strategyName, decision は必須です" },
        { status: 400 }
      );
    }

    if (!["adopt", "reject", "pending"].includes(decision)) {
      return NextResponse.json(
        { error: "decision は adopt, reject, pending のいずれかです" },
        { status: 400 }
      );
    }

    // upsert: 既存なら更新、なければ作成
    const result = await prisma.strategyDecision.upsert({
      where: {
        explorationId_strategyName: {
          explorationId,
          strategyName,
        },
      },
      update: {
        decision,
        reason: reason || null,
        feasibilityNote: feasibilityNote || null,
      },
      create: {
        explorationId,
        strategyName,
        decision,
        reason: reason || null,
        feasibilityNote: feasibilityNote || null,
      },
    });

    return NextResponse.json({
      success: true,
      decision: result,
    });
  } catch (error) {
    console.error("Decision POST error:", error);
    return NextResponse.json(
      { error: "採否の記録に失敗しました" },
      { status: 500 }
    );
  }
}

// 採否ログを取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const explorationId = searchParams.get("explorationId");
    const decisionFilter = searchParams.get("decision");
    const stats = searchParams.get("stats") === "true";

    // 統計情報を返す
    if (stats) {
      const [total, adopted, rejected, pending] = await Promise.all([
        prisma.strategyDecision.count(),
        prisma.strategyDecision.count({ where: { decision: "adopt" } }),
        prisma.strategyDecision.count({ where: { decision: "reject" } }),
        prisma.strategyDecision.count({ where: { decision: "pending" } }),
      ]);

      // よくある却下理由を取得
      const rejectReasons = await prisma.strategyDecision.findMany({
        where: { decision: "reject", reason: { not: null } },
        select: { reason: true },
        take: 100,
      });

      // 理由をカウント
      const reasonCounts: Record<string, number> = {};
      rejectReasons.forEach((r) => {
        if (r.reason) {
          reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
        }
      });

      const topRejectReasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      return NextResponse.json({
        stats: {
          total,
          adopted,
          rejected,
          pending,
          adoptionRate: total > 0 ? ((adopted / total) * 100).toFixed(1) : 0,
          topRejectReasons,
        },
      });
    }

    // 特定のExplorationの採否を取得
    if (explorationId) {
      const decisions = await prisma.strategyDecision.findMany({
        where: { explorationId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ decisions });
    }

    // フィルター付き一覧取得
    const where = decisionFilter ? { decision: decisionFilter } : {};
    const decisions = await prisma.strategyDecision.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ decisions });
  } catch (error) {
    console.error("Decision GET error:", error);
    return NextResponse.json(
      { error: "採否ログの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 採否を削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id は必須です" },
        { status: 400 }
      );
    }

    await prisma.strategyDecision.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Decision DELETE error:", error);
    return NextResponse.json(
      { error: "採否の削除に失敗しました" },
      { status: 500 }
    );
  }
}
