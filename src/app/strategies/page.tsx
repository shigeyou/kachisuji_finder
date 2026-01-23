"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

type TabType = "adopted" | "ranking" | "evolution" | "auto-explore";

interface Strategy {
  id?: string;
  name: string;
  reason: string;
  howToObtain?: string;
  totalScore: number;
  scores?: Record<string, number>;
  question: string;
  judgment?: string;
  createdAt?: string;
}

interface Decision {
  strategyName: string;
  decision: string;
  reason?: string;
  explorationId: string;
}

interface EvolvedStrategy {
  name: string;
  reason: string;
  howToObtain: string;
  metrics: string;
  sourceStrategies: string[];
  evolveType: "mutation" | "crossover" | "refutation";
  improvement: string;
}

interface EvolveInfo {
  canEvolve: boolean;
  adoptedCount: number;
  topStrategyCount: number;
}

interface AutoExploreResult {
  questionsGenerated: number;
  explorationsCompleted: number;
  highScoresFound: number;
  topScore: number;
  topStrategy: string | null;
  errors: string[];
  runId?: string;
  baselineScore?: number;
  achievedScore?: number;
  improvement?: string | null;
  archived?: number;
  duration?: string;
  timestamp?: string;
}

interface AutoExploreHistory {
  id: string;
  question: string;
  createdAt: string;
}

export default function StrategiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("adopted");
  const [adoptedStrategies, setAdoptedStrategies] = useState<(Strategy & { decision: Decision })[]>([]);
  const [rankingStrategies, setRankingStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  // 進化生成関連
  const [evolveInfo, setEvolveInfo] = useState<EvolveInfo | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolveMode, setEvolveMode] = useState<"mutation" | "crossover" | "refutation" | "all">("all");
  const [evolvedStrategies, setEvolvedStrategies] = useState<EvolvedStrategy[]>([]);
  const [evolveThinking, setEvolveThinking] = useState<string | null>(null);

  // AI自動探索関連
  const [isAutoExploring, setIsAutoExploring] = useState(false);
  const [autoExploreResult, setAutoExploreResult] = useState<AutoExploreResult | null>(null);
  const [autoExploreHistory, setAutoExploreHistory] = useState<AutoExploreHistory[]>([]);

  // 全決定データ（ランキングタブで使用）
  const [allDecisions, setAllDecisions] = useState<Record<string, Decision>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 採否データを取得
      const decisionsRes = await fetch("/api/decisions");
      const decisionsData = await decisionsRes.json();
      const decisions: Decision[] = decisionsData.decisions || [];
      const adoptedDecisions = decisions.filter(d => d.decision === "adopt");

      // 戦略名でインデックス化（ランキングで使用）
      const decisionsByName: Record<string, Decision> = {};
      for (const d of decisions) {
        decisionsByName[d.strategyName] = d;
      }
      setAllDecisions(decisionsByName);

      // ランキングデータを取得
      const rankingRes = await fetch("/api/ranking");
      const rankingData = await rankingRes.json();
      const strategies: Strategy[] = rankingData.strategies || [];
      setRankingStrategies(strategies);

      // 採用された戦略をマッピング
      const adopted = adoptedDecisions.map(d => {
        const strategy = strategies.find(s => s.name === d.strategyName);
        return {
          ...strategy,
          name: d.strategyName,
          reason: strategy?.reason || "",
          totalScore: strategy?.totalScore || 0,
          question: strategy?.question || "",
          decision: d,
        };
      }).filter(s => s.name) as (Strategy & { decision: Decision })[];

      setAdoptedStrategies(adopted);

      // 進化生成情報を取得
      const evolveRes = await fetch("/api/evolve");
      if (evolveRes.ok) {
        const evolveData = await evolveRes.json();
        setEvolveInfo(evolveData);
      }

      // 自動探索履歴を取得
      const autoExploreRes = await fetch("/api/auto-explore");
      if (autoExploreRes.ok) {
        const autoExploreData = await autoExploreRes.json();
        setAutoExploreHistory(autoExploreData.recent || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvolve = async () => {
    setIsEvolving(true);
    setEvolvedStrategies([]);
    setEvolveThinking(null);

    try {
      const res = await fetch("/api/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: evolveMode, save: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`エラー: ${data.error}`);
      } else {
        setEvolvedStrategies(data.strategies || []);
        setEvolveThinking(data.thinkingProcess || null);
      }
    } catch (error) {
      alert("進化生成に失敗しました");
    } finally {
      setIsEvolving(false);
    }
  };

  const handleAutoExplore = async () => {
    setIsAutoExploring(true);
    setAutoExploreResult(null);

    try {
      const res = await fetch("/api/auto-explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`エラー: ${data.error || "自動探索に失敗しました"}`);
      } else {
        setAutoExploreResult(data);
        // 履歴を再取得
        const historyRes = await fetch("/api/auto-explore");
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setAutoExploreHistory(historyData.recent || []);
        }
        // ランキングも更新
        const rankingRes = await fetch("/api/ranking");
        if (rankingRes.ok) {
          const rankingData = await rankingRes.json();
          setRankingStrategies(rankingData.strategies || []);
        }
      }
    } catch (error) {
      alert("自動探索に失敗しました");
    } finally {
      setIsAutoExploring(false);
    }
  };

  // 採否決定を記録（ランキングタブ用）
  const handleDecision = async (
    strategy: Strategy,
    decision: "adopt" | "reject" | "pending"
  ) => {
    // explorationIdがある場合はそれを使う。ない場合は戦略名から推定（仮のID）
    const explorationId = (strategy as Strategy & { explorationId?: string }).explorationId || "ranking-" + strategy.name;

    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          explorationId,
          strategyName: strategy.name,
          decision,
        }),
      });

      if (res.ok) {
        // ローカル状態を更新
        setAllDecisions((prev) => ({
          ...prev,
          [strategy.name]: { strategyName: strategy.name, decision, explorationId },
        }));
        // 採用タブも更新
        if (decision === "adopt") {
          setAdoptedStrategies((prev) => {
            const exists = prev.find((s) => s.name === strategy.name);
            if (!exists) {
              return [
                ...prev,
                {
                  ...strategy,
                  decision: { strategyName: strategy.name, decision, explorationId },
                },
              ];
            }
            return prev;
          });
        } else {
          // 採用から外す
          setAdoptedStrategies((prev) => prev.filter((s) => s.name !== strategy.name));
        }
      } else {
        alert("決定の保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save decision:", error);
      alert("決定の保存に失敗しました");
    }
  };

  const evolveTypeLabel = (type: string) => {
    switch (type) {
      case "mutation": return "変異";
      case "crossover": return "交叉";
      case "refutation": return "反証";
      default: return type;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  const judgmentBadge = (judgment?: string) => {
    if (judgment === "優先投資") {
      return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">優先投資</span>;
    } else if (judgment === "条件付き") {
      return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">条件付き</span>;
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* ヘッダー */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              ← ダッシュボード
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              戦略一覧
            </h1>
          </div>
          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("adopted")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "adopted"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            採用した戦略 ({adoptedStrategies.length})
          </button>
          <button
            onClick={() => setActiveTab("ranking")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "ranking"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            ランキング ({rankingStrategies.length})
          </button>
          <button
            onClick={() => setActiveTab("evolution")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "evolution"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            進化生成
          </button>
          <button
            onClick={() => setActiveTab("auto-explore")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "auto-explore"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            AI自動探索
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            読み込み中...
          </div>
        ) : (
          <>
            {/* 採用した戦略タブ */}
            {activeTab === "adopted" && (
              <div className="space-y-4">
                {adoptedStrategies.length === 0 ? (
                  <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="py-12 text-center">
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        採用した戦略がありません
                      </p>
                      <Link href="/">
                        <Button>探索を始める</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  adoptedStrategies.map((strategy, index) => (
                    <Card key={index} className="dark:bg-slate-800 dark:border-slate-700">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            {strategy.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {strategy.totalScore?.toFixed(1) || "-"}
                            </span>
                            {judgmentBadge(strategy.judgment)}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {strategy.reason}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>元の問い: {strategy.question?.slice(0, 50)}...</span>
                          {strategy.decision?.reason && (
                            <span>採用理由: {strategy.decision.reason}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ランキングタブ */}
            {activeTab === "ranking" && (
              <div className="space-y-4">
                {rankingStrategies.length === 0 ? (
                  <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="py-12 text-center">
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        ランキングデータがありません
                      </p>
                      <Link href="/">
                        <Button>探索を始める</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">#</th>
                          <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">戦略名</th>
                          <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">スコア</th>
                          <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">判定</th>
                          <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">採否</th>
                          <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">日付</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingStrategies.map((strategy, index) => (
                          <tr
                            key={index}
                            className={`border-b border-slate-100 dark:border-slate-700 ${
                              index < 3 ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""
                            }`}
                          >
                            <td className="py-3 px-2">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0 ? "bg-yellow-400 text-yellow-900" :
                                index === 1 ? "bg-slate-300 text-slate-700" :
                                index === 2 ? "bg-orange-300 text-orange-900" :
                                "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm text-slate-900 dark:text-slate-100">
                                {strategy.name}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {strategy.totalScore?.toFixed(1)}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {judgmentBadge(strategy.judgment)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleDecision(strategy, "adopt")}
                                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                    allDecisions[strategy.name]?.decision === "adopt"
                                      ? "bg-green-600 text-white"
                                      : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                  }`}
                                  title="採用"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleDecision(strategy, "reject")}
                                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                    allDecisions[strategy.name]?.decision === "reject"
                                      ? "bg-red-600 text-white"
                                      : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                  title="却下"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(strategy.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 進化生成タブ */}
            {activeTab === "evolution" && (
              <div className="space-y-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-slate-100">進化生成</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      採用された戦略をベースに、変異・交叉・反証で新しい戦略を生成します。
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-700 dark:text-slate-300">生成モード:</label>
                        <select
                          value={evolveMode}
                          onChange={(e) => setEvolveMode(e.target.value as typeof evolveMode)}
                          className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="all">全て（変異+交叉+反証）</option>
                          <option value="mutation">変異のみ</option>
                          <option value="crossover">交叉のみ</option>
                          <option value="refutation">反証のみ</option>
                        </select>
                      </div>

                      <Button
                        onClick={handleEvolve}
                        disabled={isEvolving || !evolveInfo?.canEvolve}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {isEvolving ? "生成中..." : "進化生成を実行"}
                      </Button>

                      {evolveInfo && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          採用済み: {evolveInfo.adoptedCount}件 / TopStrategy: {evolveInfo.topStrategyCount}件
                        </span>
                      )}
                    </div>

                    {!evolveInfo?.canEvolve && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        進化生成には採用された戦略が必要です。まず探索で戦略を採用してください。
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* 生成結果 */}
                {evolvedStrategies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                      生成された戦略（{evolvedStrategies.length}件）
                    </h3>

                    {evolveThinking && (
                      <Card className="mb-4 dark:bg-slate-800 dark:border-slate-700">
                        <CardContent className="py-3">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            <strong>思考プロセス:</strong> {evolveThinking}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <div className="space-y-4">
                      {evolvedStrategies.map((strategy, index) => (
                        <Card
                          key={index}
                          className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20"
                        >
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                {strategy.name}
                              </h4>
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${
                                  strategy.evolveType === "mutation"
                                    ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                                    : strategy.evolveType === "crossover"
                                    ? "bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200"
                                    : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
                                }`}
                              >
                                {evolveTypeLabel(strategy.evolveType)}
                              </span>
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                              <strong>なぜ勝てる:</strong> {strategy.reason}
                            </p>

                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                              <strong>実現ステップ:</strong> {strategy.howToObtain}
                            </p>

                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              <strong>改善点:</strong> {strategy.improvement}
                            </p>

                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-slate-500 dark:text-slate-400">元戦略:</span>
                              {strategy.sourceStrategies.map((source, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded"
                                >
                                  {source}
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI自動探索タブ */}
            {activeTab === "auto-explore" && (
              <div className="space-y-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-slate-100">AI自動探索</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      AIが自動的に問いを生成し、高スコアの勝ち筋を探索します。
                      人の介入なしに広範な探索を行い、有望な戦略を発見します。
                    </p>

                    <div className="flex items-center gap-4 mb-4">
                      <Button
                        onClick={handleAutoExplore}
                        disabled={isAutoExploring}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isAutoExploring ? "探索中..." : "自動探索を実行"}
                      </Button>

                      {isAutoExploring && (
                        <span className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                          数分かかる場合があります...
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ※ 自動探索は5つの問いを生成し、それぞれに対して勝ち筋を探索します。
                      高スコア（3.5以上）の戦略は自動的にランキングに追加されます。
                    </p>
                  </CardContent>
                </Card>

                {/* 実行結果 */}
                {autoExploreResult && (
                  <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20">
                    <CardHeader>
                      <CardTitle className="text-base dark:text-slate-100">
                        実行結果
                        {autoExploreResult.timestamp && (
                          <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                            {new Date(autoExploreResult.timestamp).toLocaleString("ja-JP")}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {autoExploreResult.questionsGenerated}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">生成した問い</div>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {autoExploreResult.explorationsCompleted}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">完了した探索</div>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {autoExploreResult.highScoresFound}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">高スコア発見</div>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {autoExploreResult.topScore.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">最高スコア</div>
                        </div>
                      </div>

                      {autoExploreResult.topStrategy && (
                        <div className="p-3 bg-white dark:bg-slate-700 rounded-lg mb-4">
                          <span className="text-xs text-slate-500 dark:text-slate-400">トップ戦略: </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {autoExploreResult.topStrategy}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                        {autoExploreResult.duration && (
                          <span>所要時間: {autoExploreResult.duration}</span>
                        )}
                        {autoExploreResult.improvement && (
                          <span className="text-green-600 dark:text-green-400">
                            改善: {autoExploreResult.improvement}
                          </span>
                        )}
                        {autoExploreResult.archived !== undefined && (
                          <span>アーカイブ: {autoExploreResult.archived}件</span>
                        )}
                      </div>

                      {autoExploreResult.errors.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
                            エラー（{autoExploreResult.errors.length}件）
                          </p>
                          <ul className="text-xs text-red-500 dark:text-red-400 list-disc list-inside">
                            {autoExploreResult.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 探索履歴 */}
                {autoExploreHistory.length > 0 && (
                  <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-base dark:text-slate-100">
                        最近の自動探索（{autoExploreHistory.length}件）
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {autoExploreHistory.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm"
                          >
                            <span className="text-slate-700 dark:text-slate-300 truncate flex-1 mr-4">
                              {item.question}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
