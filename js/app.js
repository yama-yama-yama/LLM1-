// メインアプリケーション
let llmClient;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // LLMクライアントの初期化
    llmClient = new EducationLLMClient(API_CONFIG.studentId);
    
    // 学生IDを表示
    document.getElementById('student-id').textContent = API_CONFIG.studentId;
    
    console.log('🚀 システム初期化完了');
});

// メッセージ送信
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) {
        alert('メッセージを入力してください');
        return;
    }
    
    // ユーザーメッセージを表示
    addMessage(message, 'user');
    input.value = '';
    
    try {
        // API呼び出し
        const response = await llmClient.chat(message);
        
        // AI応答を表示
        addMessage(response.response, 'ai');
        
        // 統計更新
        updateStats();
        
    } catch (error) {
        addMessage('エラーが発生しました: ' + error.message, 'system');
    }
}

async function manzai() {
    const input = document.getElementById('user-input');
    let message = input.value.trim();
    if(!message){
        message = "理想のデートプラン";
    }

    let prompt1 = `あなたは漫才師のボケです。
    以下の注意事項と漫才の内容を踏まえてあなたはボケをしてください。

    # 注意事項
    -一文のボケのみを返答すること。
    -漫才は6ターンある。
    -turn=0の時は自己紹介と小さいボケを挟む。
    -turn=5の時漫才のボケのターンは最終ターンとなる。
    -一文出力したらツッコミを待ってください
    -出力は{ボケ}:{内容}のみとすること

    # 内容
    -内容は${message}
    //ここから漫才スタートturn=0
    `;
    
    let prompt2 = `あなたは漫才師のツッコミです。
    以下の注意事項と漫才の内容を踏まえてあなたはボケに対してツッコミをしてください。

    # 注意事項
    -ボケとツッコミは交互に行われる。
    -漫才は6ターンある。
    -関西弁でツッコミをする
    -ツッコミは前のボケのツッコミどころを探して、簡潔に面白おかしく指摘してください
    -一文でツッコミすること。
    -turn=1の時は自己紹介と前のボケにツッコミをする。
    -turn=6の時漫才は最終ターンでオチとなる。
    -turn=6の時ボケに対してツッコミした後、最後に{もうええわ、ありがとうございました}を追加して出力する。
    -一文出力したらボケを待ってください
    -出力は{ツッコミ}:{内容}のみとすること
    
    # 内容
    -内容は${message}
    //ここから漫才スタートturn=0
    `;

    // ユーザーメッセージを表示
    addMessage(message+"で漫才して", 'user');
    let turn = 0;
    while(turn < 7){
        try {
            console.log(turn);
            // API呼び出し
            let response = await llmClient.chat(prompt1);
            turn++;
            // AI応答を表示
            addMessage(response.response, 'ai');

            prompt2 = prompt2 + response.response + "turn=" + turn;
            response = await llmClient.chat(prompt2);
            turn++;
            addMessage(response.response, 'ai');
            prompt1 = prompt1 + response.response + "turn=" + turn;

            // 統計更新
            updateStats();    
        } catch (error) {
            addMessage('エラーが発生しました: ' + error.message, 'system');
            break;
        }     
    }
    
}

// メッセージをチャットに追加
function addMessage(text, type) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 統計情報を更新
function updateStats() {
    const stats = llmClient.getStats();
    document.getElementById('request-count').textContent = stats.requestCount;
}

// Enterキーで送信
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}