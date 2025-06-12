// Utils.js - 環境検出エンジン修正版

/**
 * ========================================
 * 環境検出エンジン - 座標問題修正版
 * ========================================
 */

// 環境検出結果のキャッシュ
let _environmentCache = null;

/**
 * 統一環境検出エンジン - 修正版
 * 座標ズレ問題を解決するための改善版
 * @returns {Object} 環境情報オブジェクト
 */
function detectEnvironment() {
    // キャッシュがあれば返す（5秒でリフレッシュ）
    if (_environmentCache && (Date.now() - _environmentCache.detectedAt < 5000)) {
        return _environmentCache;
    }

    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const isStandalone = window.navigator.standalone;
    
    // 基本検出
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                 (platform === 'MacIntel' && maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent) && 
                    !/chrome/i.test(userAgent);
    const isIPad = /iPad/.test(userAgent) || 
                  (platform === 'MacIntel' && maxTouchPoints > 1);
    const isTouch = maxTouchPoints > 0 || 'ontouchstart' in window;
    
    // WebView検出
    const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent) ||
                     /FMP/.test(document.referrer) ||
                     (isIOS && !userAgent.includes('Safari/'));
    
    // FileMaker環境検出
    const isFileMaker = window.FileMaker !== undefined ||
                       userAgent.indexOf('FileMaker') !== -1 ||
                       document.referrer.indexOf('FMP') !== -1;
    
    // FMWEBV特有の検出（座標問題の修正：位置だけでは判断しない）
    const isFMWEBV = isFileMaker;
    
    // drawArea位置確認
    let drawAreaInfo = null;
    const drawArea = document.querySelector('.draw-area');
    if (drawArea) {
        const rect = drawArea.getBoundingClientRect();
        drawAreaInfo = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
    }
    
    // 座標補正が必要かどうか（FileMaker環境のみに限定）
    const needsCoordinateCorrection = isFileMaker;
    
    // 環境情報をまとめる
    const environment = {
        // 基本情報
        userAgent,
        platform,
        maxTouchPoints,
        isStandalone,
        
        // デバイス検出
        isMobile,
        isIOS,
        isIPad,
        isTouch,
        isSafari,
        isWebView,
        
        // FileMaker環境
        isFileMaker,
        isFMWEBV,
        
        // 画面情報
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        
        // drawArea情報
        drawAreaInfo,
        
        // 座標補正が必要かどうか（明示的なFileMaker環境のみ）
        needsCoordinateCorrection,
        
        // タイムスタンプ
        detectedAt: Date.now()
    };
    
    // キャッシュに保存
    _environmentCache = environment;
    
    // デバッグ情報をコンソールに出力
    console.log('=== 環境検出結果（修正版） ===');
    console.log('isFileMaker:', isFileMaker);
    console.log('isFMWEBV:', isFMWEBV);
    console.log('needsCoordinateCorrection:', needsCoordinateCorrection);
    console.log('drawArea位置:', drawAreaInfo);
    console.log('===================================');
    
    return environment;
}

/**
 * 座標変換エンジン - 修正版
 * 座標計算問題を解決するための改善版
 * @param {Event} event - マウス/タッチイベント
 * @param {HTMLElement} canvas - 対象キャンバス
 * @returns {Object} 変換された座標情報
 */
function calculateCanvasCoordinates(event, canvas) {
    const env = detectEnvironment();
    const rect = canvas.getBoundingClientRect();
    
    // スケールファクターを計算
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // クライアント座標を取得
    let clientX, clientY;
    if (event.changedTouches && event.changedTouches.length) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else if (event.touches && event.touches.length) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    // キャンバス座標に変換（FileMaker環境の補正なし）
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    
    // デバッグ情報
    console.log(`座標変換: (${clientX}, ${clientY}) → (${canvasX}, ${canvasY})`);
    
    return {
        // 元の座標
        originalClientX: clientX,
        originalClientY: clientY,
        
        // キャンバス相対座標
        clientX: clientX - rect.left,
        clientY: clientY - rect.top,
        
        // スケール適用済み座標
        canvasX,
        canvasY,
        
        // 補正情報
        corrected: false,
        environment: env.isFileMaker ? 'FileMaker' : 'Browser'
    };
}

/**
 * 環境に応じたイベントリスナー設定
 * @param {HTMLElement} element - 対象要素
 * @param {Object} handlers - イベントハンドラ群
 */
function setupEnvironmentOptimizedEvents(element, handlers) {
    const env = detectEnvironment();
    
    if (env.isTouch) {
        // タッチデバイス向け設定
        if (handlers.move) {
            element.addEventListener('mousemove', handlers.move);
            element.addEventListener('touchmove', handlers.move, { passive: false });
        }
        
        if (handlers.start) {
            element.addEventListener('mousedown', handlers.start);
            element.addEventListener('touchstart', handlers.start, { passive: false });
        }
        
        if (handlers.end) {
            element.addEventListener('mouseup', handlers.end);
            element.addEventListener('click', handlers.end);
            element.addEventListener('touchend', handlers.end, { passive: false });
        }
    } else {
        // 通常デスクトップ向け設定
        if (handlers.move) {
            element.addEventListener('mousemove', handlers.move);
        }
        
        if (handlers.start) {
            element.addEventListener('mousedown', handlers.start);
        }
        
        if (handlers.end) {
            element.addEventListener('mouseup', handlers.end);
            element.addEventListener('click', handlers.end);
        }
    }
}

/**
 * ========================================
 * 既存のFileMaker連携関数（保持）
 * ========================================
 */

/**
 * FileMaker連携用のキャンバス画像取得関数
 * レイヤーマネージャを使用して全レイヤーを合成した画像を返す
 * @returns {string} 合成画像のDataURL
 */
function GetDrawImageFunction() {
    console.log('GetDrawImageFunction: 呼び出し');

    // レイヤーマネージャが存在するか確認
    if (!window.layerManager) {
        console.error('GetDrawImageFunction: layerManagerが見つかりません');
        return null;
    }

    try {
        // レイヤーマネージャから合成画像を取得
        const imageData = window.layerManager.mergeLayersToDataURL();

        // FileMakerに送信
        if (window.FileMaker) {
            console.log('GetDrawImageFunction: FileMakerにデータを送信');
            FileMaker.PerformScript('SetImageToField', imageData);
        } else {
            console.log('GetDrawImageFunction: FileMakerオブジェクトが見つかりません');
        }

        // デバッグ用に返す
        return imageData;
    } catch (error) {
        console.error('GetDrawImageFunction: エラー発生', error);
        return null;
    }
}

/**
 * FileMaker連携用のデータ保存関数
 * データモデルをJSON形式でFileMakerに送信
 * @returns {string} 保存したJSONデータ
 */
function SaveCanvasData() {
    console.log('SaveCanvasData: 呼び出し');

    // データモデルが存在するか確認
    if (!window.canvasDataModel) {
        console.error('SaveCanvasData: canvasDataModelが見つかりません');
        return null;
    }

    try {
        // データモデルからJSON形式でデータを取得
        const jsonData = window.canvasDataModel.exportToFileMaker();

        // FileMakerに送信
        if (window.FileMaker) {
            console.log('SaveCanvasData: FileMakerにデータを送信');
            FileMaker.PerformScript('SetCanvasDataToField', jsonData);
        } else {
            console.log('SaveCanvasData: FileMakerオブジェクトが見つかりません');
        }

        // デバッグ用に返す
        return jsonData;
    } catch (error) {
        console.error('SaveCanvasData: エラー発生', error);
        return null;
    }
}

/**
 * FileMaker連携用のデータ読み込み関数
 * FileMakerから受け取ったJSONデータをデータモデルに読み込む
 * @param {string} jsonData - FileMakerから受け取ったJSONデータ
 * @returns {boolean} 読み込み成功時はtrue
 */
function LoadCanvasData(jsonData) {
    console.log('LoadCanvasData: 呼び出し');

    // データモデルが存在するか確認
    if (!window.canvasDataModel) {
        console.error('LoadCanvasData: canvasDataModelが見つかりません');
        return false;
    }

    // レイヤーマネージャが存在するか確認
    if (!window.layerManager) {
        console.error('LoadCanvasData: layerManagerが見つかりません');
        return false;
    }

    try {
        // データモデルにJSONデータを読み込む
        const success = window.canvasDataModel.importFromFileMaker(jsonData);

        if (success) {
            // レイヤーを再描画
            window.layerManager.redrawAllLayers();
            console.log('LoadCanvasData: データを読み込み、レイヤーを再描画しました');
        } else {
            console.error('LoadCanvasData: データの読み込みに失敗しました');
        }

        return success;
    } catch (error) {
        console.error('LoadCanvasData: エラー発生', error);
        return false;
    }
}

/**
 * 背景画像を設定する統一関数（すべてのモジュールで使用）
 * BackgroundManagerと連携してデータモデルにも保存
 * @param {string} base64Image - Base64エンコードされた画像データ
 * @param {Object} options - 背景オプション
 * @returns {Promise} 背景設定処理のPromise
 */
function SetBackgroundImage(base64Image, options = {}) {
    console.log('SetBackgroundImage: 統一関数呼び出し');

    // 背景管理インスタンスの存在確認
    if (!window.backgroundManager) {
        console.error('SetBackgroundImage: backgroundManagerが見つかりません。作成を試みます');
        try {
            const canvas = document.getElementById('background-layer');
            if (!canvas) {
                console.error('SetBackgroundImage: background-layer要素が見つかりません');
                return Promise.reject('background-layer not found');
            }
            window.backgroundManager = new BackgroundManager(canvas);
        } catch (error) {
            console.error('SetBackgroundImage: BackgroundManagerの作成に失敗しました', error);
            return Promise.reject(error);
        }
    }

    // オプションが文字列として渡された場合はJSONとしてパース
    if (typeof options === 'string') {
        try {
            options = JSON.parse(options);
        } catch (e) {
            console.error('SetBackgroundImage: 背景オプションのパースに失敗', e);
            options = {};
        }
    }

    // BackgroundManagerのインスタンスメソッドを直接呼び出し
    return window.backgroundManager.setBackground(base64Image, options)
        .then(() => {
            // データモデルにも背景情報を保存
            if (window.canvasDataModel) {
                window.canvasDataModel.setBackground(base64Image, options);
                console.log('SetBackgroundImage: 背景をデータモデルに保存');
            }
            return true;
        })
        .catch(error => {
            console.error('SetBackgroundImage: 背景設定エラー', error);
            return Promise.reject(error);
        });
}

/**
 * キャンバスをクリアする関数
 * すべてのレイヤーをクリアし、データモデルもリセット
 * @returns {boolean} クリア成功時はtrue
 */
function ClearCanvas() {
    console.log('ClearCanvas: 呼び出し');

    try {
        // レイヤーマネージャが存在するか確認
        if (window.layerManager) {
            window.layerManager.clearAllLayers();
            console.log('ClearCanvas: すべてのレイヤーをクリア');
        } else {
            console.error('ClearCanvas: layerManagerが見つかりません');
            return false;
        }

        // データモデルが存在するか確認
        if (window.canvasDataModel) {
            window.canvasDataModel.clearAll();
            console.log('ClearCanvas: データモデルをクリア');
        } else {
            console.error('ClearCanvas: canvasDataModelが見つかりません');
            return false;
        }

        return true;
    } catch (error) {
        console.error('ClearCanvas: エラー発生', error);
        return false;
    }
}

/**
 * 指定したレイヤーをクリアする関数
 * @param {string} layerName - クリアするレイヤー名
 * @returns {boolean} クリア成功時はtrue
 */
function ClearLayer(layerName) {
    console.log(`ClearLayer: 呼び出し (${layerName})`);

    try {
        // レイヤーマネージャが存在するか確認
        if (!window.layerManager) {
            console.error('ClearLayer: layerManagerが見つかりません');
            return false;
        }

        // レイヤー名が有効か確認
        if (!window.layerManager.layers[layerName]) {
            console.error(`ClearLayer: レイヤー "${layerName}" が見つかりません`);
            return false;
        }

        // レイヤーをクリア
        window.layerManager.clearLayer(layerName);

        // データモデルが存在するか確認
        if (window.canvasDataModel) {
            // レイヤー名からデータモデルのタイプに変換
            let dataType = null;
            switch (layerName) {
                case 'freedraw':
                    dataType = 'freedraw';
                    break;
                case 'stamp':
                    dataType = 'stamp';
                    break;
                case 'text':
                    dataType = 'text';
                    break;
            }

            // データモデルの該当タイプをクリア
            if (dataType) {
                window.canvasDataModel.clearElementsByType(dataType);
                console.log(`ClearLayer: データタイプ "${dataType}" をクリア`);
            }
        } else {
            console.warn('ClearLayer: canvasDataModelが見つかりません');
        }

        return true;
    } catch (error) {
        console.error('ClearLayer: エラー発生', error);
        return false;
    }
}

/**
 * すべてのレイヤーを再描画する関数
 * データモデルから全レイヤーのコンテンツを再描画
 * @returns {boolean} 再描画成功時はtrue
 */
function RedrawAllLayers() {
    console.log('RedrawAllLayers: 呼び出し');

    try {
        // レイヤーマネージャが存在するか確認
        if (!window.layerManager) {
            console.error('RedrawAllLayers: layerManagerが見つかりません');
            return false;
        }

        // すべてのレイヤーを再描画
        window.layerManager.redrawAllLayers();
        console.log('RedrawAllLayers: すべてのレイヤーを再描画');

        return true;
    } catch (error) {
        console.error('RedrawAllLayers: エラー発生', error);
        return false;
    }
}

// グローバルスコープで関数を利用可能にする
window.GetDrawImageFunction = GetDrawImageFunction;
window.SaveCanvasData = SaveCanvasData;
window.LoadCanvasData = LoadCanvasData;
window.SetBackgroundImage = SetBackgroundImage;
window.ClearCanvas = ClearCanvas;
window.ClearLayer = ClearLayer;
window.RedrawAllLayers = RedrawAllLayers;

// 環境検出エンジン関数をグローバルに公開
window.detectEnvironment = detectEnvironment;
window.calculateCanvasCoordinates = calculateCanvasCoordinates;
window.setupEnvironmentOptimizedEvents = setupEnvironmentOptimizedEvents;