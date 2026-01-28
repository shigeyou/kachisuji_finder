"use client";

import { useApp, TabType } from "@/contexts/AppContext";
import { ThemeToggle } from "@/components/theme-toggle";

interface TabItem {
  id: TabType;
  label: string;
}

// 共通設定（全員共通）
const commonTabs: TabItem[] = [
  { id: "intro", label: "はじめに" },
  { id: "company", label: "対象企業" },
  { id: "rag", label: "RAG情報" },
  { id: "swot", label: "SWOT" },
];

// 個別設定（ユーザーごと）
const personalTabs: TabItem[] = [
  { id: "score", label: "スコア設定" },
  { id: "explore", label: "勝ち筋探索" },
  { id: "ranking", label: "ランキング" },
  { id: "strategies", label: "シン・勝ち筋の探求" },
  { id: "insights", label: "インサイト" },
  { id: "summary", label: "まとめ" },
  { id: "history", label: "探索履歴" },
];

export function Navigation() {
  const { activeTab, setActiveTab, explorationStatus, evolveStatus, autoExploreStatus, metaAnalysisStatus } = useApp();

  return (
    <header className="border-b border-blue-300 dark:border-blue-800 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900">
      <div className="w-full px-3">
        <div className="flex items-center justify-between py-2 gap-4">
          {/* ロゴ */}
          <button
            onClick={() => setActiveTab("explore")}
            className="text-left hover:opacity-80 flex-shrink-0"
          >
            <p className="text-[1.26rem] text-blue-100 dark:text-blue-200">
              企業の勝ち筋をAIで探索する
            </p>
            <p className="text-[1.89rem] font-bold text-white dark:text-white whitespace-nowrap">
              勝ち筋ファインダー <span className="text-[1.72rem] font-normal text-blue-200 dark:text-blue-300">Ver.0.7</span>
            </p>
          </button>

          {/* タブナビゲーション */}
          <nav className="flex items-center gap-1 flex-1 justify-end">
            {/* 共通設定グループ */}
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/30 dark:bg-blue-950/50 rounded-lg">
              <span className="text-[0.91rem] text-blue-100 dark:text-blue-300 px-1 whitespace-nowrap">共通</span>
              {commonTabs.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-2.5 py-1 text-[1.26rem] font-medium rounded-md transition-colors relative ${
                      isActive
                        ? "bg-white dark:bg-blue-700 text-blue-700 dark:text-white shadow-sm"
                        : "text-blue-100 dark:text-blue-200 hover:bg-white/20 dark:hover:bg-blue-700/50 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* セパレーター */}
            <div className="h-6 w-px bg-blue-400/50 dark:bg-blue-600 mx-1"></div>

            {/* 個別設定グループ */}
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-400/30 dark:bg-blue-950/50 rounded-lg">
              <span className="text-[0.91rem] text-yellow-200 dark:text-yellow-300 px-1 whitespace-nowrap">個人</span>
              {personalTabs.map((item) => {
                const isActive = activeTab === item.id;
                const isExploring = item.id === "explore" && explorationStatus === "running";
                const isStrategiesRunning = item.id === "strategies" && (evolveStatus === "running" || autoExploreStatus === "running");
                const isInsightsRunning = item.id === "insights" && metaAnalysisStatus === "running";
                const showIndicator = isExploring || isStrategiesRunning || isInsightsRunning;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-2.5 py-1 text-[1.26rem] font-medium rounded-md transition-colors relative ${
                      isActive
                        ? "bg-white dark:bg-blue-700 text-blue-700 dark:text-white shadow-sm"
                        : "text-blue-100 dark:text-blue-200 hover:bg-white/20 dark:hover:bg-blue-700/50 hover:text-white"
                    }`}
                  >
                    {item.label}
                    {showIndicator && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                          isStrategiesRunning ? "bg-emerald-400" : isInsightsRunning ? "bg-purple-400" : "bg-blue-400"
                        } opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${
                          isStrategiesRunning ? "bg-emerald-500" : isInsightsRunning ? "bg-purple-500" : "bg-blue-500"
                        }`}></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="ml-2">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
