"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  summary: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

interface ActivityStats {
  explorationCount: number;
  adoptedCount: number;
  adoptionRate: number;
  recentStrategies: { name: string; score: number }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [swot, setSwot] = useState<SwotData | null>(null);
  const [swotLoading, setSwotLoading] = useState(true);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [question, setQuestion] = useState("");
  const [isExploring, setIsExploring] = useState(false);
  const [showSwotDetail, setShowSwotDetail] = useState(false);

  // SWOTベースの問い候補
  const suggestedQuestions = swot ? [
    `${swot.strengths[0]}を活かした新規事業の可能性は？`,
    `${swot.opportunities[0]}に対応する戦略は？`,
    `${swot.threats[0]}に対抗するには？`,
  ] : [];

  useEffect(() => {
    fetchSwot();
    fetchStats();
  }, []);

  const fetchSwot = async () => {
    try {
      const res = await fetch("/api/admin/swot");
      const data = await res.json();
      if (data.exists) {
        setSwot(data.swot);
      }
    } catch (error) {
      console.error("Failed to fetch SWOT:", error);
    } finally {
      setSwotLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // 探索数を取得
      const historyRes = await fetch("/api/history");
      const historyData = await historyRes.json();
      const explorationCount = historyData.explorations?.length || 0;

      // 採否統計を取得
      const decisionsRes = await fetch("/api/decisions?stats=true");
      const decisionsData = await decisionsRes.json();
      const adoptedCount = decisionsData.stats?.adopted || 0;
      const total = decisionsData.stats?.total || 0;
      const adoptionRate = total > 0 ? Math.round((adoptedCount / total) * 100) : 0;

      // 最近の採用戦略を取得
      const rankingRes = await fetch("/api/ranking?limit=3");
      const rankingData = await rankingRes.json();
      const recentStrategies = (rankingData.strategies || [])
        .slice(0, 3)
        .map((s: { name: string; totalScore: number }) => ({
          name: s.name,
          score: s.totalScore,
        }));

      setStats({
        explorationCount,
        adoptedCount,
        adoptionRate,
        recentStrategies,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleExplore = async () => {
    if (!question.trim()) return;

    setIsExploring(true);
    try {
      // 探索APIを呼び出し
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context: swot ? `SWOT分析に基づく探索。強み: ${swot.strengths.join(", ")}。機会: ${swot.opportunities.join(", ")}。` : "",
          constraints: [],
        }),
      });

      const data = await res.json();
      if (data.explorationId) {
        // 結果ページへ遷移（インサイトの履歴タブ）
        router.push(`/insights?tab=history&id=${data.explorationId}`);
      }
    } catch (error) {
      console.error("Exploration failed:", error);
      alert("探索に失敗しました");
    } finally {
      setIsExploring(false);
    }
  };

  const selectSuggestion = (q: string) => {
    setQuestion(q);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* ヘッダー */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            勝ち筋ファインダー
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/strategies"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              戦略一覧
            </Link>
            <Link
              href="/insights"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              インサイト
            </Link>
            <Link
              href="/settings"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              設定
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* SWOT セクション */}
        <Card className="mb-6 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg dark:text-slate-100">
                現状認識（SWOT）
              </CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSwotDetail(!showSwotDetail)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showSwotDetail ? "閉じる" : "詳細を見る"}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {swotLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>
            ) : swot ? (
              <>
                {/* コンパクト表示 */}
                {!showSwotDetail && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">💪 強み:</span>{" "}
                      {swot.strengths.slice(0, 3).join("、")}
                      {swot.strengths.length > 3 && "..."}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">🚀 機会:</span>{" "}
                      {swot.opportunities.slice(0, 3).join("、")}
                      {swot.opportunities.length > 3 && "..."}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      最終更新: {formatDate(swot.updatedAt)}
                      {swot.updatedBy && ` by ${swot.updatedBy}`}
                    </p>
                  </div>
                )}

                {/* 詳細表示 */}
                {showSwotDetail && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
                          💪 強み (Strengths)
                        </h4>
                        <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                          {swot.strengths.map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
                          😓 弱み (Weaknesses)
                        </h4>
                        <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                          {swot.weaknesses.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                          🚀 機会 (Opportunities)
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                          {swot.opportunities.map((o, i) => (
                            <li key={i}>• {o}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                          ⚠️ 脅威 (Threats)
                        </h4>
                        <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                          {swot.threats.map((t, i) => (
                            <li key={i}>• {t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {swot.summary && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                          サマリー
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {swot.summary}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      最終更新: {formatDate(swot.updatedAt)}
                      {swot.updatedBy && ` by ${swot.updatedBy}`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  SWOTが未設定です
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  管理者に設定を依頼してください
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 問い入力セクション */}
        <Card className="mb-6 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg dark:text-slate-100">
              💭 問いを立てる
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例: 生成AIで新規事業を立ち上げるには？"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none"
                rows={3}
              />

              {/* SWOT からの問い候補 */}
              {swot && suggestedQuestions.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    💡 SWOTからの問い候補:
                  </p>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => selectSuggestion(q)}
                        className="block w-full text-left p-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        • {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleExplore}
                  disabled={!question.trim() || isExploring}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isExploring ? "探索中..." : "探索する →"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 活動サマリー */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            📈 あなたの活動
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats?.explorationCount || 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">探索回数</p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats?.adoptedCount || 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">採用戦略</p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.adoptionRate || 0}%
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">採用率</p>
              </CardContent>
            </Card>
          </div>

          {/* 最近の採用戦略 */}
          {stats?.recentStrategies && stats.recentStrategies.length > 0 && (
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="py-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  🔥 最近の高スコア戦略
                </h3>
                <ul className="space-y-2">
                  {stats.recentStrategies.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {s.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ({s.score.toFixed(1)})
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/strategies"
                  className="block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  すべて見る →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </main>
  );
}
