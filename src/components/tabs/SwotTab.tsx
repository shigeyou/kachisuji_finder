"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";

export function SwotTab() {
  const { swot, setSwot, swotLoading, fetchSwot } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [swotProgress, setSwotProgress] = useState(0);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [showAdditionalInput, setShowAdditionalInput] = useState(false);

  const runSwotAnalysis = async () => {
    setIsAnalyzing(true);
    setSwotProgress(0);
    const startTime = Date.now();
    const expectedDuration = 150000; // 150秒想定（20%速度）

    // イージング関数: 中盤ゆっくり→終盤加速→停滞感なし
    const calculateProgress = () => {
      const elapsed = Date.now() - startTime;
      const t = elapsed / expectedDuration;

      let progress: number;
      if (t <= 0.3) {
        // 序盤: 0-20%
        progress = (t / 0.3) * 20;
      } else if (t <= 0.6) {
        // 中盤: 20-45% (ゆっくり)
        progress = 20 + ((t - 0.3) / 0.3) * 25;
      } else if (t <= 1.0) {
        // 終盤: 45-92% (加速)
        const endT = (t - 0.6) / 0.4;
        progress = 45 + Math.pow(endT, 0.7) * 47;
      } else {
        // 超過: 92-99% (少しずつ)
        const overT = t - 1.0;
        progress = 92 + Math.min(overT * 14, 7);
      }
      return Math.min(progress, 99);
    };

    const progressInterval = setInterval(() => {
      setSwotProgress(calculateProgress());
    }, 300);

    try {
      const res = await fetch("/api/admin/swot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenerate: true,
          additionalInfo: additionalInfo.trim() || undefined,
        }),
      });
      clearInterval(progressInterval);
      setSwotProgress(100);

      const data = await res.json();
      if (data.success) {
        setSwot(data.swot);
      } else {
        alert("SWOT分析に失敗しました: " + (data.error || "不明なエラー"));
      }
    } catch (error) {
      console.error("SWOT analysis failed:", error);
      clearInterval(progressInterval);
      alert("SWOT分析に失敗しました");
    } finally {
      setIsAnalyzing(false);
      setSwotProgress(0);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="flex flex-col px-4 py-3 overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">SWOT分析</h1>
          {swot && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              最終更新: {formatDate(swot.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdditionalInput(!showAdditionalInput)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAdditionalInput ? "補足情報を閉じる" : "補足情報を追加"}
          </button>
          <Button
            onClick={runSwotAnalysis}
            disabled={isAnalyzing}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            {isAnalyzing ? "分析中..." : "再分析"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex-shrink-0">
        外部データを検索・参照するRAGの仕組みと、大規模言語モデルが保持する知識を組み合わせて、SWOT分析を行います。
      </p>

      {/* 案内メッセージ */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex-shrink-0">
        このままでよければ次に進んで問題ありません。内容を変更したい場合は「再分析」を実行してください。
      </p>

      {/* 補足情報入力欄（折りたたみ式） */}
      {showAdditionalInput && (
        <div className="mb-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0">
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="市場情報、競合状況など、SWOT分析の参考情報..."
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm resize-none"
            rows={2}
          />
        </div>
      )}

      {/* プログレスバー */}
      {isAnalyzing && (
        <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex-shrink-0">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-green-700 dark:text-green-300 font-medium">
              AIがSWOT分析を実行中...
            </span>
            <span className="text-green-600 dark:text-green-400">{Math.round(swotProgress)}%</span>
          </div>
          <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, swotProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* SWOT表示 */}
      {swotLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
          読み込み中...
        </div>
      ) : swot ? (
        <div className="flex-1 flex flex-col min-h-0 gap-2 overflow-hidden">
          {/* 4象限グリッド */}
          <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 overflow-hidden">
            {/* 強み */}
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 overflow-auto">
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-1.5 text-sm sticky top-0 bg-green-50 dark:bg-green-900/20">
                強み (Strengths)
              </h3>
              <ul className="space-y-1 text-xs text-green-700 dark:text-green-400">
                {swot.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-snug">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 弱み */}
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 overflow-auto">
              <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1.5 text-sm sticky top-0 bg-red-50 dark:bg-red-900/20">
                弱み (Weaknesses)
              </h3>
              <ul className="space-y-1 text-xs text-red-700 dark:text-red-400">
                {swot.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-snug">{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 機会 */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 overflow-auto">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1.5 text-sm sticky top-0 bg-blue-50 dark:bg-blue-900/20">
                機会 (Opportunities)
              </h3>
              <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                {swot.opportunities.map((o, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-snug">{o}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 脅威 */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 overflow-auto">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1.5 text-sm sticky top-0 bg-yellow-50 dark:bg-yellow-900/20">
                脅威 (Threats)
              </h3>
              <ul className="space-y-1 text-xs text-yellow-700 dark:text-yellow-400">
                {swot.threats.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-snug">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* サマリー */}
          {swot.summary && (
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex-shrink-0">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1" style={{ fontSize: '110%' }}>
                サマリー
              </h3>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed" style={{ fontSize: '110%' }}>
                {swot.summary}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-500 dark:text-slate-400 mb-2">
            SWOT分析がまだ実行されていません
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            「再分析」ボタンをクリックしてください
          </p>
        </div>
      )}
    </div>
  );
}
