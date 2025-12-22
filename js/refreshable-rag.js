// js/refreshable-rag.js - 手動で最新情報を取得できるRAGシステム

class RefreshableRAGSystem {
    constructor() {
        this.semanticRAG = null;
        this.webSearch = null;
        this.currentQuery = null;
        this.currentResult = null;
        this.webSearchResult = null;
        this.initialized = false;
    }

    async initialize(documents, ontologyData) {
        console.log('🚀 更新可能RAGシステム初期化中...');
        
        this.semanticRAG = new SemanticRAGSystem();
        await this.semanticRAG.initialize(documents, ontologyData);
        
        this.webSearch = new WebSearchClient(API_CONFIG.studentId);
        
        this.initialized = true;
        console.log('✅ 準備完了！');
    }

    // 通常のRAG検索（知識ベースのみ）
    async query(question, options = {}) {
        if (!this.initialized) {
            throw new Error('システムが初期化されていません');
        }

        this.currentQuery = question;
        this.webSearchResult = null; // リセット
        
        // 知識ベースで検索
        this.currentResult = await this.semanticRAG.semanticQuery(question, options);
        
        // 日付情報を抽出して表示用に追加
        this.currentResult.dateInfo = this.extractDateInfo(this.currentResult);
        
        return this.currentResult;
    }

    // 日付情報の抽出（回答やソースから）
    extractDateInfo(result) {
        const datePatterns = [
            /(\d{4})年/g,
            /(\d{4})シーズン/g,
            /(\d{4})年度/g
        ];
        
        const foundYears = new Set();
        const textToSearch = [
            result.answer,
            ...result.sources.map(s => s.document.text)
        ].join(' ');
        
        for (const pattern of datePatterns) {
            const matches = textToSearch.matchAll(pattern);
            for (const match of matches) {
                foundYears.add(parseInt(match[1]));
            }
        }
        
        const years = Array.from(foundYears).sort((a, b) => b - a);
        const currentYear = new Date().getFullYear();
        const latestYear = years[0] || null;
        
        return {
            foundYears: years,
            latestYear: latestYear,
            currentYear: currentYear,
            mightBeOutdated: latestYear && latestYear < currentYear,
            message: latestYear 
                ? `この情報は ${latestYear}年 のデータを含んでいます`
                : '情報の時点は特定できませんでした'
        };
    }

    // 最新情報を取得（ユーザーがボタンを押したとき）
    async fetchLatestInfo() {
        if (!this.currentQuery) {
            throw new Error('先に質問を入力してください');
        }

        console.log('🔄 最新情報を取得中...');
        
        // 検索クエリを最適化（今年の情報を探す）
        const currentYear = new Date().getFullYear();
        const optimizedQuery = this.optimizeQueryForLatest(this.currentQuery, currentYear);
        
        // Web検索実行
        this.webSearchResult = await this.webSearch.search(optimizedQuery);
        
        return this.webSearchResult;
    }

    // 検索クエリの最適化
    optimizeQueryForLatest(query, currentYear) {
        // 「今年」「最新」などを具体的な年に
        let optimized = query
            .replace(/今年|今シーズン/g, `${currentYear}年`)
            .replace(/去年|昨年/g, `${currentYear - 1}年`);
        
        // 年が含まれていなければ追加
        if (!/\d{4}年/.test(optimized)) {
            optimized += ` ${currentYear}年 最新`;
        }
        
        return optimized;
    }

    // 最新情報を踏まえて再回答
    async regenerateWithLatestInfo(options = {}) {
        if (!this.webSearchResult || !this.currentResult) {
            throw new Error('先に最新情報を取得してください');
        }

        const webContext = this.webSearchResult.results
            .map((r, i) => `[最新${i + 1}] ${r.title}\n${r.snippet}`)
            .join('\n\n');

        const prompt = `あなたは学習支援AIです。最新のWeb検索結果を優先して回答してください。

【元の質問】
${this.currentQuery}

【知識ベースの情報】
${this.currentResult.sources.map((s, i) => `[知識${i + 1}] ${s.document.text}`).join('\n\n')}

【最新のWeb検索結果】（${this.webSearchResult.retrievedAt} 取得）
${webContext}

【回答の指針】
1. Web検索結果の最新情報を優先してください
2. 知識ベースの情報は背景説明に使ってください
3. 情報の出典や時点を明記してください
4. 矛盾がある場合は新しい情報を優先してください

回答:`;

        const response = await this.semanticRAG.llm.chat(prompt, options);
        
        return {
            answer: response.response,
            basedOnWebSearch: true,
            webSources: this.webSearchResult.results,
            usage: response.usage
        };
    }

    // 結果表示
    displayResult(result, container) {
        let html = `
            <div class="rag-result">
                <h3>🤖 AI回答:</h3>
                <div class="answer-box">
                    ${result.answer.replace(/\n/g, '<br>')}
                </div>
        `;

        // 日付情報の警告
        if (result.dateInfo && result.dateInfo.mightBeOutdated) {
            html += `
                <div class="date-warning">
                    <span class="warning-icon">⚠️</span>
                    <span>${result.dateInfo.message}</span>
                    <span class="current-year">（現在: ${result.dateInfo.currentYear}年）</span>
                </div>
            `;
        } else if (result.dateInfo) {
            html += `
                <div class="date-info">
                    <span class="info-icon">ℹ️</span>
                    <span>${result.dateInfo.message}</span>
                </div>
            `;
        }

        // 最新情報取得ボタン
        html += `
            <div class="refresh-section">
                <button class="refresh-btn" onclick="fetchAndDisplayLatest()">
                    🔄 最新情報を取得する
                </button>
                <p class="refresh-hint">
                    💡 情報が古いと感じたら、ボタンを押してWeb検索で最新情報を取得できます
                </p>
            </div>
        `;

        // Web検索結果（取得済みの場合）
        html += `<div id="web-search-results"></div>`;

        // ソース表示
        html += `
            <div class="sources-section">
                <h4>📚 知識ベースの参照元:</h4>
                ${result.sources.map((s, i) => `
                    <div class="source-item">
                        <strong>文書${i + 1}</strong>
                        <span class="score">(スコア: ${(s.combinedScore * 100).toFixed(1)}%)</span>
                        <p>${s.document.text.substring(0, 150)}...</p>
                    </div>
                `).join('')}
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    // Web検索結果の表示
    displayWebResults(webResult, regeneratedAnswer = null) {
        const container = document.getElementById('web-search-results');
        if (!container) return;

        let html = `
            <div class="web-results">
                <h4>🌐 最新情報（Web検索結果）</h4>
                <p class="retrieved-at">取得日時: ${new Date(webResult.retrievedAt).toLocaleString('ja-JP')}</p>
                
                <div class="web-results-list">
                    ${webResult.results.map((r, i) => `
                        <div class="web-result-item">
                            <strong>${i + 1}. ${r.title}</strong>
                            <p>${r.snippet}</p>
                            <a href="${r.url}" target="_blank" class="source-link">🔗 出典を見る</a>
                        </div>
                    `).join('')}
                </div>
        `;

        if (regeneratedAnswer) {
            html += `
                <div class="regenerated-answer">
                    <h4>🤖 最新情報を踏まえた回答:</h4>
                    <div class="answer-box updated">
                        ${regeneratedAnswer.answer.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        } else {
            html += `
                <button class="regenerate-btn" onclick="regenerateAnswer()">
                    ✨ この情報を使って再回答を生成
                </button>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }
}
