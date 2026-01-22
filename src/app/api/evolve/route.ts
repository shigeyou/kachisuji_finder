import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AzureOpenAI } from "openai";

// 進化生成の型
type EvolveMode = "mutation" | "crossover" | "refutation" | "all";

interface EvolvedStrategy {
  name: string;
  reason: string;
  howToObtain: string;
  metrics: string;
  sourceStrategies: string[]; // 元になった戦略名
  evolveType: "mutation" | "crossover" | "refutation";
  improvement: string; // 元からの改善点
}

interface EvolveResult {
  strategies: EvolvedStrategy[];
  thinkingProcess: string;
}

// 採用された戦略を取得
async function getAdoptedStrategies(limit: number = 10): Promise<
  {
    name: string;
    reason: string;
    howToObtain?: string;
    question: string;
    scores?: string;
  }[]
> {
  // StrategyDecisionから採用された戦略を取得
  const decisions = await prisma.strategyDecision.findMany({
    where: { decision: "adopt" },
    orderBy: { createdAt: "desc" },
    take: limit * 2, // 重複を考慮して多めに取得
  });

  if (decisions.length === 0) {
    // TopStrategyから高スコア戦略を取得（フォールバック）
    const topStrategies = await prisma.topStrategy.findMany({
      orderBy: { totalScore: "desc" },
      take: limit,
    });

    return topStrategies.map((s) => ({
      name: s.name,
      reason: s.reason,
      howToObtain: s.howToObtain || undefined,
      question: s.question,
      scores: s.scores,
    }));
  }

  // 関連する探索結果を取得
  const explorationIds = [...new Set(decisions.map((d) => d.explorationId))];
  const explorations = await prisma.exploration.findMany({
    where: { id: { in: explorationIds } },
  });

  const explorationMap = new Map(explorations.map((e) => [e.id, e]));

  const strategies: {
    name: string;
    reason: string;
    howToObtain?: string;
    question: string;
    scores?: string;
  }[] = [];

  for (const decision of decisions) {
    const exploration = explorationMap.get(decision.explorationId);
    if (!exploration?.result) continue;

    try {
      const result = JSON.parse(exploration.result);
      const strategy = result.strategies?.find(
        (s: { name: string }) => s.name === decision.strategyName
      );

      if (strategy && !strategies.some((s) => s.name === strategy.name)) {
        strategies.push({
          name: strategy.name,
          reason: strategy.reason || "",
          howToObtain: strategy.howToObtain,
          question: exploration.question,
          scores: strategy.scores ? JSON.stringify(strategy.scores) : undefined,
        });

        if (strategies.length >= limit) break;
      }
    } catch {
      // JSON parse error - skip
    }
  }

  return strategies;
}

// AIで進化生成を実行
async function evolveStrategies(
  strategies: { name: string; reason: string; howToObtain?: string; question: string }[],
  mode: EvolveMode,
  coreServices: string,
  coreAssets: string
): Promise<EvolveResult> {
  const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: "2024-08-01-preview",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  });

  const strategiesText = strategies
    .map(
      (s, i) =>
        `${i + 1}. ${s.name}
   元の問い: ${s.question}
   なぜ勝てる: ${s.reason}
   ${s.howToObtain ? `実現ステップ: ${s.howToObtain}` : ""}`
    )
    .join("\n\n");

  const modeInstructions = {
    mutation: `
## 変異生成（Mutation）
各戦略の一部要素だけを変えて、新しい戦略を生成してください。
変更する要素の例：
- 顧客セグメント（B2B→B2C、大企業→中小企業など）
- 課金モデル（サブスク→従量課金、買い切り→レンタルなど）
- 提供価値（コスト削減→売上向上、効率化→品質向上など）
- 技術基盤（オンプレ→クラウド、手動→自動化など）

各元戦略から1〜2個の変異を生成してください。`,

    crossover: `
## 交叉生成（Crossover）
複数の戦略の良い要素を組み合わせて、新しい戦略を生成してください。
組み合わせの例：
- 戦略Aの顧客セグメント × 戦略Bの収益モデル
- 戦略Aの技術基盤 × 戦略Bの提供価値
- 戦略Aの強み × 戦略Bのチャネル

3〜5個の交叉戦略を生成してください。`,

    refutation: `
## 反証生成（Refutation）
各戦略の弱点・リスクを特定し、それを克服した改良版を生成してください。
検討する弱点の例：
- 競合優位性の脆弱さ
- 実行上のボトルネック
- 市場の不確実性
- 技術的な制約
- 組織的な障壁

各元戦略の弱点を克服した改良版を生成してください。`,

    all: `
## 3種類の進化生成を実行

### 1. 変異生成（Mutation）
各戦略の一部要素を変えて新戦略を生成

### 2. 交叉生成（Crossover）
複数の戦略の要素を組み合わせて新戦略を生成

### 3. 反証生成（Refutation）
各戦略の弱点を克服した改良版を生成

各タイプ2〜3個ずつ、合計6〜9個の新戦略を生成してください。`,
  };

  const prompt = `あなたは戦略コンサルタントです。以下の採用された戦略を基に、進化した新戦略を生成してください。

## 採用済み戦略（ベースとなる成功戦略）
${strategiesText}

## 企業の資産・強み
${coreServices || "未登録"}
${coreAssets || "未登録"}

${modeInstructions[mode]}

## 出力形式（JSON）
{
  "strategies": [
    {
      "name": "新戦略名",
      "reason": "なぜこの新戦略が勝てるか",
      "howToObtain": "具体的な実現ステップ",
      "metrics": "成功を測る指標",
      "sourceStrategies": ["元になった戦略名1", "元になった戦略名2"],
      "evolveType": "mutation" | "crossover" | "refutation",
      "improvement": "元戦略からの改善点・進化ポイント"
    }
  ],
  "thinkingProcess": "どのような思考で進化戦略を導いたか"
}

重要：
- 元の戦略の良さを活かしつつ、明確な改善点を持つ戦略を生成
- 実行可能性を重視し、絵に描いた餅にならないように
- 各戦略の元になった戦略を明記すること`;

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8, // 創造性を高める
    max_completion_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  try {
    return JSON.parse(content) as EvolveResult;
  } catch {
    throw new Error("Failed to parse AI response");
  }
}

// POST: 進化生成を実行
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode: EvolveMode = body.mode || "all";
    const limit = body.limit || 5;
    const saveAsExploration = body.save || false;

    // 採用された戦略を取得
    const strategies = await getAdoptedStrategies(limit);

    if (strategies.length === 0) {
      return NextResponse.json(
        { error: "採用された戦略がありません。まず探索で戦略を採用してください。" },
        { status: 400 }
      );
    }

    // コア情報を取得
    const [coreServices, coreAssets] = await Promise.all([
      prisma.coreService.findMany(),
      prisma.coreAsset.findMany(),
    ]);

    const servicesText = coreServices
      .map((s) => `- ${s.name}${s.category ? ` (${s.category})` : ""}`)
      .join("\n");

    const assetsText = coreAssets
      .map((a) => `- ${a.name} [${a.type}]`)
      .join("\n");

    // 進化生成を実行
    const result = await evolveStrategies(strategies, mode, servicesText, assetsText);

    // 探索として保存（オプション）
    let explorationId: string | null = null;
    if (saveAsExploration && result.strategies.length > 0) {
      const exploration = await prisma.exploration.create({
        data: {
          question: `[進化生成] ${mode}モード - ${strategies.slice(0, 3).map((s) => s.name).join(", ")}から`,
          context: `元戦略: ${strategies.map((s) => s.name).join(", ")}`,
          constraints: "[]",
          status: "completed",
          result: JSON.stringify({
            strategies: result.strategies.map((s) => ({
              name: s.name,
              reason: s.reason,
              howToObtain: s.howToObtain,
              metrics: s.metrics,
              confidence: "medium",
              tags: [s.evolveType, "進化生成"],
            })),
            thinkingProcess: result.thinkingProcess,
            evolveMetadata: {
              mode,
              sourceStrategies: strategies.map((s) => s.name),
            },
          }),
        },
      });
      explorationId = exploration.id;
    }

    return NextResponse.json({
      success: true,
      mode,
      sourceCount: strategies.length,
      generatedCount: result.strategies.length,
      strategies: result.strategies,
      thinkingProcess: result.thinkingProcess,
      explorationId,
    });
  } catch (error) {
    console.error("Evolve error:", error);
    return NextResponse.json(
      { error: "進化生成に失敗しました" },
      { status: 500 }
    );
  }
}

// GET: 進化生成の情報を取得
export async function GET() {
  try {
    // 採用された戦略数を取得
    const adoptedCount = await prisma.strategyDecision.count({
      where: { decision: "adopt" },
    });

    // TopStrategy数を取得
    const topStrategyCount = await prisma.topStrategy.count();

    // 最近の進化生成を取得
    const recentEvolutions = await prisma.exploration.findMany({
      where: {
        question: { startsWith: "[進化生成]" },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        question: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      canEvolve: adoptedCount > 0 || topStrategyCount > 0,
      adoptedCount,
      topStrategyCount,
      recentEvolutions,
    });
  } catch (error) {
    console.error("Evolve GET error:", error);
    return NextResponse.json(
      { error: "情報取得に失敗しました" },
      { status: 500 }
    );
  }
}
