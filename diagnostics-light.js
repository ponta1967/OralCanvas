// diagnostics-light.js - 軽量版診断ツール

// グローバル変数
window.diagnosticState = {
    initTime: new Date().toISOString(),
    logs: []
};

// 簡易ログ関数
function logEvent(message) {
    const entry = {
        time: new Date().toISOString(),
        message: message
    };
    window.diagnosticState.logs.push(entry);
    console.log(`[${entry.time}] ${message}`);
}

// 基本状態収集
function getBasicState() {
    const state = {
        time: new Date().toISOString(),
        hasBackgroundManager: !!window.backgroundManager,
        hasLayerManager: !!window.layerManager,
        hasCanvasDataModel: !!window.canvasDataModel,
        hasLocalStorage: false
    };
    
    // ローカルストレージの確認
    try {
        const lsData = localStorage.getItem('oralCanvasData');
        state.hasLocalStorage = !!lsData;
    } catch (e) {
        state.localStorageError = e.message;
    }
    
    return state;
}

// FileMakerにシンプルな状態情報を送信
function sendBasicInfo() {
    const state = {
        diagnosticState: window.diagnosticState,
        basicState: getBasicState()
    };
    
    if (window.FileMaker) {
        const jsonData = JSON.stringify(state);
        window.FileMaker.PerformScript('LogDiagnosticData', jsonData);
        logEvent('基本診断情報をFileMakerに送信しました');
    } else {
        logEvent('FileMakerオブジェクトが見つかりません');
    }
}

// 初期化ログ
logEvent('軽量診断ツールを初期化しました');

// 基本イベントのログ
document.addEventListener('DOMContentLoaded', function() {
    logEvent('DOMContentLoaded イベント発生');
});

window.addEventListener('load', function() {
    logEvent('Window Load イベント発生');
    
    // 5秒後に状態を送信
    setTimeout(function() {
        logEvent('5秒タイムアウト - 診断情報を送信します');
        sendBasicInfo();
    }, 5000);
});

// グローバルからアクセス可能な関数を登録
window.OralCanvasDiagnostics = {
    sendBasicInfo: sendBasicInfo,
    getState: function() {
        return {
            diagnosticState: window.diagnosticState,
            basicState: getBasicState()
        };
    }
};

// ページエラーの捕捉
window.addEventListener('error', function(event) {
    logEvent('エラー発生: ' + event.message);
});