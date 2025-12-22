// js/concept-extractor.js - 文章から概念を抽出

class ConceptExtractor {
  constructor() {
    this.conceptKeywords = new Map([
      [
        "programming",
        ["プログラミング", "プログラム", "コーディング", "coding", "コード"],
      ],
      ["variables", ["変数", "variable", "var", "let", "const", "代入"]],
      [
        "functions",
        ["関数", "function", "メソッド", "method", "引数", "戻り値", "return"],
      ],
      [
        "loops",
        [
          "ループ",
          "for",
          "while",
          "繰り返し",
          "iteration",
          "反復",
          "イテレーション",
        ],
      ],
      [
        "conditionals",
        ["条件分岐", "if", "else", "条件", "conditional", "switch"],
      ],
      [
        "data-structures",
        [
          "データ構造",
          "data structure",
          "配列",
          "array",
          "オブジェクト",
          "object",
          "リスト",
        ],
      ],
      [
        "algorithms",
        ["アルゴリズム", "algorithm", "計算手法", "ソート", "探索", "検索"],
      ],
      ["recursion", ["再帰", "recursion", "再帰的", "再帰関数"]],
    ]);
  }

  extractConcepts(text) {
    const concepts = [];
    const lowerText = text.toLowerCase();

    for (const [concept, keywords] of this.conceptKeywords) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          concepts.push(concept);
          break;
        }
      }
    }

    return [...new Set(concepts)];
  }

  analyzeQuestionIntent(text) {
    const intents = {
      definition: [
        "とは",
        "って何",
        "とはなんですか",
        "意味",
        "定義",
        "what is",
      ],
      example: ["例", "具体的", "サンプル", "実例", "どんな", "example"],
      howto: [
        "方法",
        "やり方",
        "どうやって",
        "手順",
        "使い方",
        "how to",
        "書き方",
      ],
      why: ["なぜ", "どうして", "理由", "わけ", "why"],
      difference: ["違い", "差", "比較", "vs", "対", "difference"],
      error: ["エラー", "うまくいかない", "動かない", "error", "バグ", "bug"],
    };

    const detected = [];
    const lowerText = text.toLowerCase();

    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          detected.push(intent);
          break;
        }
      }
    }

    return detected.length > 0 ? detected : ["general"];
  }

  updateFromOntology(ontology) {
    for (const [conceptId, concept] of ontology.concepts) {
      const keywords = [concept.label];
      if (concept.synonyms) {
        keywords.push(...concept.synonyms);
      }
      this.addConceptKeywords(conceptId, keywords);
    }
    console.log("📝 オントロジーからキーワードを更新しました");
  }

  addConceptKeywords(concept, keywords) {
    if (this.conceptKeywords.has(concept)) {
      const existing = this.conceptKeywords.get(concept);
      const uniqueKeywords = [...new Set([...existing, ...keywords])];
      this.conceptKeywords.set(concept, uniqueKeywords);
    } else {
      this.conceptKeywords.set(concept, keywords);
    }
  }

  analyzeText(text) {
    console.log("=== 概念抽出分析 ===");
    console.log("入力:", text.substring(0, 50) + "...");
    const concepts = this.extractConcepts(text);
    const intents = this.analyzeQuestionIntent(text);
    console.log("概念:", concepts);
    console.log("意図:", intents);
    return { concepts, intents };
  }
}
