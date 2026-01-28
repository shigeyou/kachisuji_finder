"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";

interface WebSource {
  id: string;
  name: string;
  url: string;
  description: string | null;
}

export function RagTab() {
  const { ragDocuments, fetchRAGDocuments } = useApp();

  // ネット情報
  const [webSources, setWebSources] = useState<WebSource[]>([]);
  const [webSourceLoading, setWebSourceLoading] = useState(true);
  const [showAddWebSource, setShowAddWebSource] = useState(false);
  const [newWebSourceName, setNewWebSourceName] = useState("");
  const [newWebSourceUrl, setNewWebSourceUrl] = useState("");
  const [webSourceMessage, setWebSourceMessage] = useState("");

  // RAG
  const [ragMessage, setRagMessage] = useState("");
  const [ragUploading, setRagUploading] = useState(false);
  const [ragExplanationOpen, setRagExplanationOpen] = useState(false);
  const ragFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRagDoc, setSelectedRagDoc] = useState<{
    filename: string;
    content: string;
    fileType: string;
  } | null>(null);
  const [ragDocLoading, setRagDocLoading] = useState(false);

  // ネット情報の取得
  const fetchWebSources = async () => {
    try {
      const res = await fetch("/api/web-sources");
      const data = await res.json();
      setWebSources(data.webSources || []);
    } catch (error) {
      console.error("Failed to fetch web sources:", error);
    } finally {
      setWebSourceLoading(false);
    }
  };

  useEffect(() => {
    fetchWebSources();
  }, []);

  // ネット情報の追加
  const handleAddWebSource = async () => {
    if (!newWebSourceName.trim() || !newWebSourceUrl.trim()) {
      setWebSourceMessage("名前とURLを入力してください");
      return;
    }

    try {
      const res = await fetch("/api/web-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWebSourceName.trim(),
          url: newWebSourceUrl.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setWebSourceMessage(data.message);
        setNewWebSourceName("");
        setNewWebSourceUrl("");
        setShowAddWebSource(false);
        fetchWebSources();
      } else {
        setWebSourceMessage("エラー: " + data.error);
      }
    } catch (error) {
      console.error("Failed to add web source:", error);
      setWebSourceMessage("追加に失敗しました");
    }
  };

  // ネット情報の削除
  const handleDeleteWebSource = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;

    try {
      const res = await fetch("/api/web-sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (data.success) {
        setWebSourceMessage(`${name} を削除しました`);
        fetchWebSources();
      } else {
        setWebSourceMessage("エラー: " + data.error);
      }
    } catch (error) {
      console.error("Failed to delete web source:", error);
      setWebSourceMessage("削除に失敗しました");
    }
  };

  // RAG管理
  const handleRAGUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRagUploading(true);
    setRagMessage("");

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        body: uploadFormData,
      });
      const data = await res.json();
      if (data.success) {
        setRagMessage(data.message);
        fetchRAGDocuments();
      } else {
        setRagMessage("エラー: " + data.error);
      }
    } catch (error) {
      console.error("RAG upload error:", error);
      setRagMessage("アップロードに失敗しました");
    } finally {
      setRagUploading(false);
      if (ragFileInputRef.current) {
        ragFileInputRef.current.value = "";
      }
    }
  };

  const handleRAGDelete = async (id: string, filename: string) => {
    if (!confirm(`「${filename}」を削除しますか？`)) return;
    try {
      await fetch("/api/rag", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchRAGDocuments();
      setRagMessage(`${filename} を削除しました`);
    } catch (error) {
      console.error("RAG delete error:", error);
      setRagMessage("削除に失敗しました");
    }
  };

  const viewRAGDocument = async (id: string) => {
    setRagDocLoading(true);
    try {
      const res = await fetch(`/api/rag?id=${id}`);
      const data = await res.json();
      if (data.document) {
        setSelectedRagDoc({
          filename: data.document.filename,
          content: data.document.content,
          fileType: data.document.fileType,
        });
      }
    } catch (error) {
      console.error("RAG view error:", error);
      setRagMessage("ドキュメントの取得に失敗しました");
    } finally {
      setRagDocLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">RAG情報</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            登録した情報は探索時にAIが自動で参照し、より的確な勝ち筋を生成します。
          </p>
        </div>
      </div>

      {/* 案内メッセージ */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        ドキュメントの登録が完了したら、SWOT分析に進んでください。登録内容はいつでも追加・削除できます。
      </p>

      {/* RAGの説明（折り畳み式） */}
      <div className="mb-6 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
        <button
          onClick={() => setRagExplanationOpen(!ragExplanationOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors rounded-lg"
        >
          <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
            RAG（Retrieval-Augmented Generation）とは？
          </p>
          <span className="text-sky-600 dark:text-sky-400">
            {ragExplanationOpen ? "▼" : "▶"}
          </span>
        </button>

        {ragExplanationOpen && (
          <div className="px-4 pb-4 space-y-3 text-xs text-sky-700 dark:text-sky-300">
            <div>
              <p className="font-medium text-sky-800 dark:text-sky-200 mb-1">
                RAGとは
              </p>
              <p>
                RAG（Retrieval-Augmented Generation）は、<span className="font-medium">AIが回答を生成する際に外部の情報源を検索・参照する技術</span>です。
                通常のAIは学習時のデータのみで回答しますが、RAGを使うことで<span className="font-medium">最新の情報や専門的な資料</span>を踏まえた、より正確で具体的な回答が可能になります。
              </p>
            </div>

            <div>
              <p className="font-medium text-sky-800 dark:text-sky-200 mb-1">
                実施目的（なぜ行うのか）
              </p>
              <p>
                AIは汎用的な知識を持っていますが、<span className="font-medium">あなたの会社固有の情報</span>は知りません。
                RAGは、会社案内・事業計画・技術資料などを登録することで、AIがそれらを参照しながら
                <span className="font-medium">「あなたの会社に特化した勝ち筋」</span>を生成できるようにする仕組みです。
              </p>
            </div>

            <div>
              <p className="font-medium text-sky-800 dark:text-sky-200 mb-1">
                得られるメリット（何が有効なのか）
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><span className="font-medium">勝ち筋の具体性向上</span>：自社の強み・サービス・技術を踏まえた実現可能な勝ち筋が提案される</li>
                <li><span className="font-medium">ハルシネーション防止</span>：AIの「知ったかぶり」を減らし、事実に基づいた提案を促進</li>
                <li><span className="font-medium">探索精度の向上</span>：業界用語・社内用語を理解した上で勝ち筋を考えてくれる</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-sky-800 dark:text-sky-200 mb-1">
                考え方の整理（どのようなロジックか）
              </p>
              <p>
                探索実行時、AIは登録されたドキュメントを自動的に検索・参照します。
                (1) 会社案内やパンフレット → 自社の強み・サービスを把握、
                (2) 事業計画や戦略資料 → 目指す方向性を理解、
                (3) 技術資料や業界レポート → 実現可能性を判断。
                登録情報が充実するほど、AIの提案精度が向上します。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RAGドキュメントセクション */}
      <div className="p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
            RAGドキュメント
          </h2>
        </div>

        {ragMessage && (
          <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm flex items-center justify-between">
            <span>{ragMessage}</span>
            <button
              className="text-blue-900 dark:text-blue-100 font-bold ml-2"
              onClick={() => setRagMessage("")}
            >
              ×
            </button>
          </div>
        )}

        {/* ネット情報 */}
        <div className="mb-4 pb-4 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-700 dark:text-blue-300 font-medium">ネット情報</p>
            <button
              onClick={() => setShowAddWebSource(!showAddWebSource)}
              className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              {showAddWebSource ? "キャンセル" : "+ 追加"}
            </button>
          </div>

          {webSourceMessage && (
            <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center justify-between">
              <span>{webSourceMessage}</span>
              <button
                className="text-blue-900 dark:text-blue-100 font-bold ml-2"
                onClick={() => setWebSourceMessage("")}
              >
                ×
              </button>
            </div>
          )}

          {/* 追加フォーム */}
          {showAddWebSource && (
            <div className="mb-3 p-3 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="表示名（例：商船三井）"
                  value={newWebSourceName}
                  onChange={(e) => setNewWebSourceName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="url"
                  placeholder="URL（例：https://www.mol.co.jp/）"
                  value={newWebSourceUrl}
                  onChange={(e) => setNewWebSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={handleAddWebSource}
                  className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  追加する
                </button>
              </div>
            </div>
          )}

          {webSourceLoading ? (
            <p className="text-sm text-blue-500 dark:text-blue-400 text-center py-2">読み込み中...</p>
          ) : webSources.length === 0 ? (
            <p className="text-sm text-blue-500 dark:text-blue-400 text-center py-2 ml-4">
              ネット情報がまだ登録されていません
            </p>
          ) : (
            <ul className="space-y-2 ml-4">
              {webSources.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 p-3 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      {source.name}
                    </a>
                  </div>
                  <button
                    onClick={() => handleDeleteWebSource(source.id, source.name)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2 p-1"
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 文書情報 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-700 dark:text-blue-300 font-medium">文書情報</p>
            <label>
              <span
                className={`px-3 py-1.5 text-xs rounded cursor-pointer ${
                  ragUploading
                    ? "bg-slate-300 text-slate-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {ragUploading ? "アップロード中..." : "+ 追加"}
              </span>
              <input
                ref={ragFileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.json,.docx,.csv,.pptx"
                className="hidden"
                onChange={handleRAGUpload}
                disabled={ragUploading}
              />
            </label>
          </div>
          <p className="text-xs text-blue-500 dark:text-blue-400 mb-3 ml-4">
            対応形式: PDF, TXT, MD, JSON, DOCX, CSV, PPTX
          </p>

          {ragDocuments.length === 0 ? (
            <p className="text-sm text-blue-500 dark:text-blue-400 text-center py-4">
              ドキュメントがまだ登録されていません
            </p>
          ) : (
            <ul className="space-y-2 ml-4">
              {ragDocuments.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 p-3 rounded"
              >
                <button
                  className="flex items-center gap-2 text-left hover:text-blue-900 dark:hover:text-blue-100"
                  onClick={() => viewRAGDocument(doc.id)}
                >
                  <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-blue-800 dark:text-blue-200 uppercase font-mono text-xs">
                    {doc.fileType}
                  </span>
                  <span className="hover:underline">{doc.filename}</span>
                </button>
                <button
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2 p-1"
                  onClick={() => handleRAGDelete(doc.id, doc.filename)}
                  title="削除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        </div>

      </div>

      {/* RAGドキュメント内容表示モーダル */}
      {selectedRagDoc && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRagDoc(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded text-blue-800 dark:text-blue-200 uppercase font-mono text-sm">
                  {selectedRagDoc.fileType}
                </span>
                <h3 className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-md">
                  {selectedRagDoc.filename}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRagDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                {selectedRagDoc.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* RAGドキュメント読み込み中 */}
      {ragDocLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl">
            <p className="text-slate-700 dark:text-slate-300">読み込み中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
