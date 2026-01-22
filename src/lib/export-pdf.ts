import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface WinningStrategy {
  name: string;
  reason: string;
  howToObtain: string;
  metrics: string;
  confidence: "high" | "medium" | "low";
  tags: string[];
}

interface ExplorationResult {
  strategies: WinningStrategy[];
  thinkingProcess: string;
  followUpQuestions?: string[];
}

// Convert exploration result to Markdown format
export function resultToMarkdown(
  question: string,
  result: ExplorationResult
): string {
  const timestamp = new Date().toLocaleString("ja-JP");

  let md = `# 勝ち筋探索レポート\n\n`;
  md += `**生成日時:** ${timestamp}\n\n`;
  md += `## 問い\n\n${question}\n\n`;

  if (result.thinkingProcess) {
    md += `## 思考プロセス\n\n${result.thinkingProcess}\n\n`;
  }

  md += `## 勝ち筋一覧（${result.strategies?.length || 0}件）\n\n`;

  result.strategies?.forEach((strategy, index) => {
    const confidenceLabel = {
      high: "高",
      medium: "中",
      low: "低",
    }[strategy.confidence] || strategy.confidence;

    md += `### ${index + 1}. ${strategy.name}\n\n`;
    md += `**確度:** ${confidenceLabel}\n\n`;

    if (strategy.tags?.length > 0) {
      md += `**タグ:** ${strategy.tags.join(", ")}\n\n`;
    }

    md += `#### なぜ勝てる\n\n${strategy.reason}\n\n`;
    md += `#### 入手方法\n\n${strategy.howToObtain}\n\n`;
    md += `#### 指標例\n\n${strategy.metrics}\n\n`;
    md += `---\n\n`;
  });

  if (result.followUpQuestions?.length) {
    md += `## フォローアップ質問\n\n`;
    result.followUpQuestions.forEach((q, i) => {
      md += `${i + 1}. ${q}\n`;
    });
  }

  return md;
}

// Export result as PDF by capturing HTML element
export async function exportToPdf(
  elementId: string,
  filename: string = "kachisuji-report"
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Export element not found");
  }

  // Capture the element as canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  // Add first page
  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  // Add additional pages if content is longer than one page
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(`${filename}.pdf`);
}

// Export Markdown as downloadable file
export function exportToMarkdown(
  question: string,
  result: ExplorationResult,
  filename: string = "kachisuji-report"
): void {
  const markdown = resultToMarkdown(question, result);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 1枚サマリーPDF出力（凝縮版）
interface SummaryData {
  title: string;
  situation: string;
  topStrategies: { name: string; reason: string }[];
  nextAction: string;
  generatedAt?: string;
}

export async function exportSummaryPdf(data: SummaryData): Promise<void> {
  // 一時的なHTML要素を作成して日本語を正しくレンダリング
  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 794px;
    padding: 40px;
    background: white;
    font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
    color: #1a1a1a;
  `;

  const generatedAt = data.generatedAt || new Date().toLocaleString("ja-JP");

  container.innerHTML = `
    <div style="border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #1e293b;">
        ${escapeHtml(data.title || "戦略サマリー")}
      </h1>
      <p style="font-size: 12px; color: #64748b; margin: 0;">
        生成日時: ${escapeHtml(generatedAt)}
      </p>
    </div>

    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 16px; font-weight: bold; color: #4f46e5; margin: 0 0 12px 0;">
        📊 状況認識
      </h2>
      <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
        ${escapeHtml(data.situation)}
      </p>
    </div>

    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 16px; font-weight: bold; color: #4f46e5; margin: 0 0 12px 0;">
        🎯 主要な勝ち筋
      </h2>
      <ul style="margin: 0; padding-left: 0; list-style: none;">
        ${data.topStrategies.map((s, i) => `
          <li style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #4f46e5;">
            <strong style="font-size: 14px; display: block; margin-bottom: 4px;">
              ${i + 1}. ${escapeHtml(s.name)}
            </strong>
            <span style="font-size: 13px; color: #475569;">
              ${escapeHtml(s.reason)}
            </span>
          </li>
        `).join("")}
      </ul>
    </div>

    <div style="background: #fef3c7; padding: 16px; border-radius: 8px;">
      <h2 style="font-size: 16px; font-weight: bold; color: #92400e; margin: 0 0 8px 0;">
        ⚡ 次のアクション
      </h2>
      <p style="font-size: 14px; margin: 0; color: #78350f;">
        ${escapeHtml(data.nextAction)}
      </p>
    </div>

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        勝ち筋ファインダー Ver.0.6 | Powered by AI
      </p>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // html2canvasで日本語を含む要素をキャプチャ
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // 最初のページ
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    // 追加ページ（コンテンツが長い場合）
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    pdf.save("strategic-summary.pdf");
  } finally {
    document.body.removeChild(container);
  }
}

// HTMLエスケープ用ヘルパー
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
