// js/web-search-client.js - Tavily APIを使ったWeb検索

class WebSearchClient {
  constructor() {
    // secrets.js から APIキーを取得
    if (typeof SECRETS === "undefined" || !SECRETS.tavilyApiKey) {
      console.error("❌ SECRETS.tavilyApiKey が設定されていません");
      console.error(
        "→ js/secrets.js を作成して、Tavily APIキーを設定してください"
      );
    }
    this.apiKey = SECRETS?.tavilyApiKey || "";
  }

  async search(query, maxResults = 5) {
    if (!this.apiKey) {
      throw new Error(
        "Tavily APIキーが設定されていません。secrets.jsを確認してください。"
      );
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: query,
          search_depth: "basic",
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Tavily API Error:", errorText);
        throw new Error("Web検索に失敗しました");
      }

      const data = await response.json();

      return {
        query: query,
        results:
          data.results?.map((r) => ({
            title: r.title || "",
            url: r.url || "",
            snippet: r.content || "",
          })) || [],
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Web検索エラー:", error);
      throw error;
    }
  }
}