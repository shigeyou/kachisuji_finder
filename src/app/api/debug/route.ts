import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId, getCurrentUser } from "@/lib/auth";

// デバッグ用API - ユーザーIDと採否データの状態を確認
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const user = await getCurrentUser();

    // 全StrategyDecisionの件数
    const totalDecisions = await prisma.strategyDecision.count();

    // 現在のユーザーの採否件数
    const userDecisions = await prisma.strategyDecision.count({
      where: { userId },
    });

    // 現在のユーザーのadopt/reject件数
    const userAdopt = await prisma.strategyDecision.count({
      where: { userId, decision: "adopt" },
    });
    const userReject = await prisma.strategyDecision.count({
      where: { userId, decision: "reject" },
    });

    // ユニークなuserIdリスト
    const uniqueUserIds = await prisma.strategyDecision.groupBy({
      by: ["userId"],
      _count: true,
    });

    // 最新の5件の採否データ（全ユーザー）
    const recentDecisions = await prisma.strategyDecision.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        strategyName: true,
        decision: true,
        userId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      currentUser: {
        id: userId,
        name: user.name,
        email: user.email,
      },
      stats: {
        totalDecisions,
        userDecisions,
        userAdopt,
        userReject,
        canExtract: userAdopt >= 5 && userReject >= 5,
      },
      uniqueUserIds: uniqueUserIds.map((u) => ({
        id: u.userId,
        count: u._count,
      })),
      recentDecisions,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
