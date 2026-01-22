import { NextRequest, NextResponse } from "next/server";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, searchType = "general" } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "検索クエリが必要です" }, { status: 400 });
    }

    if (!TAVILY_API_KEY || TAVILY_API_KEY === "your_tavily_api_key_here") {
      // Tavily APIキーがない場合はモック結果を返す
      return NextResponse.json({
        results: [
          {
            title: "【モック】外部検索はAPIキー設定後に有効になります",
            url: "https://tavily.com",
            content: "TAVILY_API_KEYを.envに設定してください。無料アカウントで月1000回まで検索可能です。",
            score: 1.0,
          },
        ],
        answer: "Tavily APIキーを設定すると、最新のWeb情報を取得できます。",
        isMock: true,
      });
    }

    // Tavilyで検索
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: searchType === "detailed" ? "advanced" : "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();

    return NextResponse.json({
      results: data.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
      answer: data.answer,
      isMock: false,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "検索に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}

// 複数のクエリで一括検索（SWOT分析用）
export async function PUT(request: NextRequest) {
  try {
    const { queries } = await request.json();

    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json({ error: "queries配列が必要です" }, { status: 400 });
    }

    const results: Record<string, unknown> = {};

    for (const q of queries) {
      const { key, query } = q;

      if (!TAVILY_API_KEY || TAVILY_API_KEY === "your_tavily_api_key_here") {
        results[key] = {
          results: [],
          answer: `【${key}】Tavily APIキーを設定すると検索結果が表示されます`,
          isMock: true,
        };
        continue;
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: query,
          search_depth: "basic",
          include_answer: true,
          max_results: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        results[key] = {
          results: data.results,
          answer: data.answer,
        };
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Batch search error:", error);
    return NextResponse.json({ error: "一括検索に失敗しました" }, { status: 500 });
  }
}
