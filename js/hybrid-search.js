// js/hybrid-search.js - ベクトル検索 + BM25 ハイブリッド検索

class HybridSearchEngine {
  constructor() {
    this.documents = [];
    this.embeddings = [];
    this.llm = new EducationLLMClient(API_CONFIG.studentId);

    this.k1 = 1.5;
    this.b = 0.75;
    this.avgDocLength = 0;
    this.idf = new Map();
  }

  async addDocument(text, metadata = {}) {
    try {
      const embedding = await this.llm.getEmbedding(text);
      const docId = this.documents.length;
      const tokens = this.tokenize(text);

      this.documents.push({
        id: docId,
        text: text,
        tokens: tokens,
        tokenCount: tokens.length,
        metadata: metadata,
      });
      this.embeddings.push(embedding);
      this.updateBM25Stats();

      return docId;
    } catch (error) {
      console.error("文書追加エラー:", error);
      throw error;
    }
  }

  tokenize(text) {
    const tokens = text
      .toLowerCase()
      .replace(/[、。！？「」『』（）\[\]{},.!?()]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 0);

    const additionalTokens = [];
    for (const token of tokens) {
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(token)) {
        for (let i = 0; i < token.length - 1; i++) {
          additionalTokens.push(token.substring(i, i + 2));
        }
      }
    }

    return [...tokens, ...additionalTokens];
  }

  updateBM25Stats() {
    const totalLength = this.documents.reduce(
      (sum, doc) => sum + doc.tokenCount,
      0
    );
    this.avgDocLength = totalLength / this.documents.length || 0;

    const termDocFreq = new Map();

    for (const doc of this.documents) {
      const uniqueTokens = new Set(doc.tokens);
      for (const token of uniqueTokens) {
        termDocFreq.set(token, (termDocFreq.get(token) || 0) + 1);
      }
    }

    const N = this.documents.length;
    for (const [term, df] of termDocFreq) {
      this.idf.set(term, Math.log((N - df + 0.5) / (df + 0.5)));
    }
  }

  calculateBM25Score(queryTokens, docId) {
    const doc = this.documents[docId];
    if (!doc) return 0;

    let score = 0;
    const docLength = doc.tokenCount;
    const termFreq = new Map();

    for (const token of doc.tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    for (const queryTerm of queryTokens) {
      const tf = termFreq.get(queryTerm) || 0;
      const idfValue = this.idf.get(queryTerm) || 0;

      const numerator = tf * (this.k1 + 1);
      const denominator =
        tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

      score += idfValue * (numerator / denominator);
    }

    return score;
  }

  cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) return 0;

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const normA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    return dotProduct / (normA * normB);
  }

  async search(query, topK = 5, options = {}) {
    if (this.documents.length === 0) return [];

    const { vectorWeight = 0.6, bm25Weight = 0.4 } = options;

    try {
      const queryEmbedding = await this.llm.getEmbedding(query);
      const queryTokens = this.tokenize(query);

      const results = this.documents.map((doc, idx) => {
        const vectorScore = this.cosineSimilarity(
          queryEmbedding,
          this.embeddings[idx]
        );
        const bm25RawScore = this.calculateBM25Score(queryTokens, idx);

        return {
          docId: idx,
          document: doc,
          vectorScore: vectorScore,
          bm25Score: bm25RawScore,
          similarity: vectorScore,
        };
      });

      const maxBM25 = Math.max(...results.map((r) => r.bm25Score), 0.001);
      results.forEach((r) => {
        r.bm25ScoreNormalized = r.bm25Score / maxBM25;
        r.hybridScore =
          r.vectorScore * vectorWeight + r.bm25ScoreNormalized * bm25Weight;
        r.similarity = r.hybridScore;
      });

      results.sort((a, b) => b.hybridScore - a.hybridScore);
      console.log(
        `🔍 ハイブリッド検索 (ベクトル:${vectorWeight * 100}%, BM25:${
          bm25Weight * 100
        }%)`
      );

      return results.slice(0, topK);
    } catch (error) {
      console.error("ハイブリッド検索エラー:", error);
      throw error;
    }
  }

  async vectorSearchOnly(query, topK = 5) {
    if (this.documents.length === 0) return [];

    const queryEmbedding = await this.llm.getEmbedding(query);

    const results = this.documents.map((doc, idx) => ({
      docId: idx,
      document: doc,
      similarity: this.cosineSimilarity(queryEmbedding, this.embeddings[idx]),
    }));

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  bm25SearchOnly(query, topK = 5) {
    if (this.documents.length === 0) return [];

    const queryTokens = this.tokenize(query);

    const results = this.documents.map((doc, idx) => ({
      docId: idx,
      document: doc,
      similarity: this.calculateBM25Score(queryTokens, idx),
    }));

    const maxScore = Math.max(...results.map((r) => r.similarity), 0.001);
    results.forEach((r) => (r.similarity = r.similarity / maxScore));

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }
}