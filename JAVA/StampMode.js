// StampMode.js v11 - FileMaker WebViewer対応ログ強化版

// グローバルログ関数（OralCanvasの既存のログシステムと連携）
window.debugLog = function(category, message, data) {
    // 通常のコンソールに出力
    const timestamp = new Date().toISOString();
    
    if (data) {
        console.log(`[${timestamp}] [${category}] ${message}`, data);
    } else {
        console.log(`[${timestamp}] [${category}] ${message}`);
    }
    
    // OralCanvasのログシステムがあれば利用
    if (window.diagnostics && typeof window.diagnostics.log === 'function') {
        try {
            if (data) {
                window.diagnostics.log(category, message, data);
            } else {
                window.diagnostics.log(category, message);
            }
        } catch (e) {
            console.error('ログシステム呼び出しエラー:', e);
        }
    }
};

class StampMode {
    constructor(canvas) {
        window.debugLog('init', 'StampMode v11 コンストラクタ開始');
        
        // canvas要素の防御的チェック
        this.canvas = canvas || null;
        if (!this.canvas) {
            window.debugLog('error', 'StampMode初期化失敗: canvas要素がnullまたはundefinedです');
            return; // 初期化中断
        }

        try {
            this.ctx = this.canvas.getContext ? this.canvas.getContext('2d') : null;
            if (!this.ctx) {
                window.debugLog('error', 'StampMode初期化失敗: canvas.getContextが取得できません');
            }
        } catch (err) {
            window.debugLog('error', 'StampMode初期化エラー(getContext):', err.message);
            this.ctx = null;
        }

        // cursorContainer要素の防御的取得
        try {
            this.cursorContainer = document.getElementById('cursorContainer');
            if (!this.cursorContainer) {
                window.debugLog('warn', 'cursorContainerが見つかりません。動的に作成します。');
                this.cursorContainer = document.createElement('div');
                this.cursorContainer.id = 'cursorContainer';
                this.cursorContainer.style.position = 'absolute';
                this.cursorContainer.style.pointerEvents = 'none';
                this.cursorContainer.style.zIndex = '9999';
                document.body.appendChild(this.cursorContainer);
                window.debugLog('info', 'cursorContainerを動的に作成しました');
            }
        } catch (err) {
            window.debugLog('error', 'cursorContainer初期化エラー:', err.message);
            this.cursorContainer = null;
        }

        this.cursorImage = null;
        this.isActive = false;
        this.currentStamp = '';
        this.currentStampType = '';
        this.isFileMaker = this._detectFileMaker();
        this.viewerActivated = false; // FileMaker WebViewer アクティベーション状態
        this.pendingStampAction = null; // 保留中のスタンプアクション
        this.activationAttempts = 0; // アクティベーション試行回数
        this.MAX_ACTIVATION_ATTEMPTS = 3; // 最大試行回数
        
        // ポインターイベント（統合イベント）を使用
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onPointerDown = this._onPointerDown.bind(this);
        this.deactivate = this.deactivate.bind(this);
        
        // 汎用的なイベントリスナー設定
        if (this.canvas) {
            this._setupEventListeners();
        }
        
        // FileMaker WebViewer用のアクティベーション検出
        if (this.isFileMaker && this.canvas) {
            window.debugLog('fm-setup', 'FileMaker環境を検出、アクティベーション設定を開始');
            this._setupFileMakerActivation();
            
            // FileMakerでは強制的に初期アクティベーションを試みる
            this._attemptEarlyActivation();
        }
        
        // グローバル変数に自身を保存（FileMakerからアクセスできるように）
        window.stampModeInstance = this;
        
        // FileMakerコールバック処理関数を登録
        window.handleFileMakerCallback = (action, param) => {
            window.debugLog('fm-callback', 'FileMakerからのコールバック受信', {action, param});
            
            if (action === 'activateViewer' || action === '1') {
                this.setViewerActivated(true);
                
                // 保留中のスタンプアクションがあれば実行
                if (this.pendingStampAction) {
                    window.debugLog('stamp', '保留中のスタンプアクションを実行します', this.pendingStampAction);
                    const { x, y } = this.pendingStampAction;
                    setTimeout(() => {
                        this._placeStampAtClientPos(x, y);
                        this.pendingStampAction = null;
                    }, 100); // 少し遅延させて確実に実行
                }
                
                return 'アクティベーション成功';
            }
            
            return 'アクション不明: ' + action;
        };
        
        window.debugLog('init', 'StampMode v11初期化完了', {
            isFileMaker: this.isFileMaker, 
            hasCanvas: !!this.canvas, 
            hasContext: !!this.ctx,
            hasCursorContainer: !!this.cursorContainer
        });
    }
    
    // FileMaker環境検出 - より確実に検出するための強化
    _detectFileMaker() {
        // いくつかの方法でFileMakerを検出
        const hasFileMakerObj = typeof window.FileMaker !== 'undefined';
        const hasFileMakerInUA = navigator.userAgent.indexOf('FileMaker') !== -1;
        const hasFileMakerClass = document.documentElement.classList.contains('filemaker');
        const hasFMGoInUA = navigator.userAgent.indexOf('FMGo') !== -1;
        const isFMWebView = window.webkit && window.webkit.messageHandlers; // FMウェブビューア特有の特性
        
        const isFileMaker = hasFileMakerObj || hasFileMakerInUA || hasFileMakerClass || hasFMGoInUA || isFMWebView;
        
        if (isFileMaker) {
            window.debugLog('fm-detect', 'FileMaker環境を検出しました', {
                hasFileMakerObj,
                hasFileMakerInUA,
                hasFileMakerClass,
                hasFMGoInUA,
                isFMWebView,
                userAgent: navigator.userAgent
            });
        }
        
        return isFileMaker;
    }
    
    // FileMakerスクリプト呼び出し用のラッパー関数
    _callFileMakerScript(scriptName, parameter) {
        window.debugLog('fm-call', `FileMakerスクリプト呼び出し: ${scriptName}`, parameter);
        
        if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
            try {
                window.FileMaker.PerformScript(scriptName, parameter);
                window.debugLog('fm-call', `スクリプト呼び出し成功: ${scriptName}`);
                return true;
            } catch (e) {
                window.debugLog('error', `スクリプト呼び出しエラー: ${scriptName}`, e.message);
                return false;
            }
        } else {
            window.debugLog('error', 'FileMaker APIが利用できません');
            return false;
        }
    }
    
    // 初期アクティベーションを試みる
    _attemptEarlyActivation() {
        window.debugLog('activation', '初期アクティベーションを試みます');
        
        // 少し遅延させてDOMが完全に読み込まれてから実行
        setTimeout(() => {
            // ダミーのタッチイベントを生成してアクティベーションを促す
            try {
                const event = new TouchEvent('touchstart', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                this.canvas.dispatchEvent(event);
                window.debugLog('activation', '初期アクティベーションイベント(touch)を発行しました');
                
                // アクティベーションフラグを設定
                this.viewerActivated = true;
            } catch (e) {
                window.debugLog('warn', '初期アクティベーション試行エラー:', e.message);
                
                // TouchEventがサポートされていない場合は別の方法を試す
                try {
                    const mouseEvent = new MouseEvent('mousedown', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    this.canvas.dispatchEvent(mouseEvent);
                    window.debugLog('activation', '初期アクティベーション(マウス)イベントを発行しました');
                    
                    // アクティベーションフラグを設定
                    this.viewerActivated = true;
                } catch (err) {
                    window.debugLog('error', '代替アクティベーション方法も失敗:', err.message);
                }
            }
            
            // FileMakerに通知するコールバック
            this._callFileMakerScript('WebViewerActivated', 'StampMode');
            
        }, 500);
    }
    
    // イベントリスナー設定
    _setupEventListeners() {
        if (!this.canvas) return;

        try {
            // タッチイベント - キャプチャフェーズでも捕捉（最優先）
            this.canvas.addEventListener('touchstart', this._onPointerDown, { passive: false, capture: true });
            this.canvas.addEventListener('touchmove', this._onPointerMove, { passive: false, capture: true });
            this.canvas.addEventListener('touchend', this._onPointerUp, { passive: false, capture: true });
            
            // マウスイベント - キャプチャフェーズでも捕捉
            this.canvas.addEventListener('mousedown', this._onPointerDown, { capture: true });
            this.canvas.addEventListener('mousemove', this._onPointerMove, { capture: true });
            this.canvas.addEventListener('mouseup', this._onPointerUp, { capture: true });
            this.canvas.addEventListener('mouseout', this.deactivate);
            
            // ポインターイベント（一部のデバイスでサポート）
            if (window.PointerEvent) {
                this.canvas.addEventListener('pointerdown', this._onPointerDown, { passive: false, capture: true });
                this.canvas.addEventListener('pointermove', this._onPointerMove, { passive: false, capture: true });
                this.canvas.addEventListener('pointerup', this._onPointerUp, { passive: false, capture: true });
            }
            
            window.debugLog('events', 'イベントリスナーを設定しました（キャプチャフェーズ含む）');
        } catch (err) {
            window.debugLog('error', 'イベントリスナー設定エラー:', err.message);
        }
    }
    
    // FileMaker WebViewer アクティベーション検出
    _setupFileMakerActivation() {
        if (!this.canvas) return;

        try {
            // WebViewerアクティベーション検出用のタッチイベント
            const activationHandler = (event) => {
                window.debugLog('activation', `アクティベーションイベント検出: ${event.type}`);
                
                if (!this.viewerActivated) {
                    window.debugLog('activation', 'FileMaker WebViewer アクティベーション成功');
                    this.viewerActivated = true;
                    
                    // アクティベーション後の状態更新
                    if (this.isActive && this.canvas) {
                        // カーソル位置更新などの処理を実行
                        const rect = this.canvas.getBoundingClientRect();
                        this._updateCursorPosition(
                            rect.left + rect.width / 2,
                            rect.top + rect.height / 2
                        );
                    }
                    
                    // FileMakerにアクティベーション状態を通知
                    this._callFileMakerScript('WebViewerActivated', 'true');
                }
            };
            
            // 複数のイベントでアクティベーションを検出 - キャプチャフェーズで捕捉
            this.canvas.addEventListener('touchstart', activationHandler, { passive: true, capture: true });
            this.canvas.addEventListener('mousedown', activationHandler, { passive: true, capture: true });
            window.addEventListener('focus', activationHandler, { passive: true });
            document.addEventListener('visibilitychange', activationHandler, { passive: true });
            
            // iOS特有のイベント
            window.addEventListener('deviceorientation', activationHandler, { passive: true });
            
            window.debugLog('fm-setup', 'FileMakerアクティベーション検出を設定しました');
        } catch (err) {
            window.debugLog('error', 'FileMakerアクティベーション設定エラー:', err.message);
        }
    }
    
    // 外部からのアクティベーション設定メソッド（FileMakerスクリプトから呼び出せる）
    setViewerActivated(activated = true) {
        this.viewerActivated = activated;
        window.debugLog('activation', `WebViewer アクティベーション状態設定: ${activated}`);
        
        // 保留中のスタンプアクションがあれば実行
        if (activated && this.pendingStampAction) {
            window.debugLog('stamp', '保留中のスタンプアクションを実行します', this.pendingStampAction);
            const { x, y } = this.pendingStampAction;
            setTimeout(() => {
                this._placeStampAtClientPos(x, y);
                this.pendingStampAction = null;
            }, 100); // 少し遅延させて確実に実行
        }
    }
    
    // 手動でアクティベーションを実行する（外部から呼び出し可能）
    activateWebViewer() {
        if (this.isFileMaker && !this.viewerActivated) {
            this.activationAttempts++;
            window.debugLog('activation', `WebViewerアクティベーション手動試行 (${this.activationAttempts}回目)`);
            
            // FileMakerスクリプト呼び出し
            const scriptCallSuccess = this._callFileMakerScript('GoToScrapImage', 'activate');
            
            if (!scriptCallSuccess) {
                // スクリプト呼び出し失敗時は代替手段を試す
                try {
                    const event = new MouseEvent('mousedown', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    this.canvas.dispatchEvent(event);
                    window.debugLog('activation', 'マウスイベントによるアクティベーション試行');
                    return true;
                } catch (err) {
                    window.debugLog('error', 'イベントによるアクティベーション失敗:', err.message);
                }
            }
            
            return scriptCallSuccess;
        }
        return false;
    }
    
    activate(stampType, customPath) {
        if (!this.canvas || !this.ctx) {
            window.debugLog('error', 'スタンプモード有効化失敗: canvas/ctx が初期化されていません');
            return;
        }

        window.debugLog('stamp', 'スタンプモード有効化', {stampType, customPath: customPath || ''});
        this.isActive = true;
        this.currentStampType = stampType;
        
        // スタンプパス設定
        if (stampType === 'custom' && customPath) {
            this.currentStamp = customPath;
        } else if (stampType === 'TADS') {
            this.currentStamp = 'Tool/ImpAnc.png';
        } else if (stampType === 'Hook') {
            this.currentStamp = 'Tool/Hook.png';
        } else {
            this.currentStamp = customPath || 'Tool/ImpAnc.png';
        }
        
        // カーソル画像設定
        this._setupCursorImage();
        
        // カーソル非表示
        if (this.canvas) {
            this.canvas.style.cursor = 'none';
        }
        
        // FileMaker環境では明示的にアクティベーションを試みる
        if (this.isFileMaker && !this.viewerActivated) {
            window.debugLog('activation', 'スタンプモード有効化時にアクティベーションを試行');
            this.activateWebViewer();
        }
    }
    
    // カーソル画像設定
    _setupCursorImage() {
        if (!this.cursorContainer) {
            window.debugLog('error', 'カーソル画像設定失敗: cursorContainerがnullです');
            return;
        }

        try {
            // 既存のカーソル画像があれば削除
            if (this.cursorImage && this.cursorContainer.contains(this.cursorImage)) {
                this.cursorContainer.removeChild(this.cursorImage);
            }
            
            this.cursorImage = new Image();
            this.cursorImage.src = this.currentStamp;
            this.cursorImage.classList.add('cursor-image');
            this.cursorImage.style.position = 'absolute';
            this.cursorImage.style.pointerEvents = 'none';
            this.cursorImage.style.width = '30px';
            this.cursorImage.style.height = 'auto';
            this.cursorImage.style.zIndex = '9999';
            this.cursorImage.style.transform = 'translate(-50%, -50%)';
            
            // 画像読み込みエラー処理
            this.cursorImage.onerror = () => {
                window.debugLog('error', 'カーソル画像の読み込みに失敗しました', this.currentStamp);
                // 代替画像またはデフォルト表示を設定
                this.cursorImage.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="rgba(255,0,0,0.5)"/></svg>';
            };
            
            // 画像ロード完了時の処理
            this.cursorImage.onload = () => {
                window.debugLog('info', 'カーソル画像のロードに成功しました', this.currentStamp);
            };
            
            this.cursorContainer.appendChild(this.cursorImage);
            
            // 初期位置を中央に
            if (this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                this._updateCursorPosition(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2
                );
            }
        } catch (err) {
            window.debugLog('error', 'カーソル画像設定エラー:', err.message);
            this.cursorImage = null;
        }
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        window.debugLog('stamp', 'スタンプモード無効化');
        this.isActive = false;
        
        try {
            if (this.cursorImage && this.cursorContainer && this.cursorContainer.contains(this.cursorImage)) {
                this.cursorContainer.removeChild(this.cursorImage);
            }
            this.cursorImage = null;
            
            if (this.canvas) {
                this.canvas.style.cursor = 'default';
            }
        } catch (err) {
            window.debugLog('error', 'スタンプモード無効化エラー:', err.message);
        }
    }
    
    // ポインターダウンハンドラー
    _onPointerDown(event) {
        if (!this.isActive || !this.canvas) return;
        
        window.debugLog('event', `ポインターダウン: ${event.type}`, {
            isFileMaker: this.isFileMaker,
            viewerActivated: this.viewerActivated,
            eventType: event.type
        });
        
        // FileMaker環境かつ未アクティベーションの場合はアクティベーションを試みる
        if (this.isFileMaker && !this.viewerActivated) {
            window.debugLog('activation', 'WebViewer未アクティベーション - アクティベーションを試みます');
            this.viewerActivated = true; // 強制的にアクティブ化
            
            // スクロール抑制（必要な場合のみ）
            if (event.type.startsWith('touch')) {
                event.preventDefault();
            }
            
            // FileMakerスクリプト呼び出し
            this._callFileMakerScript('GoToScrapImage', 'activate');
            
            return;
        }
        
        // スクロール抑制（必要な場合のみ）
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }
        
        // カーソル位置更新
        const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
        const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
        this._updateCursorPosition(clientX, clientY);
        
        // デバッグログ
        window.debugLog('event', 'ポインターダウン座標', { clientX, clientY, viewerActivated: this.viewerActivated });
    }
    
    // ポインタームーブハンドラー
    _onPointerMove(event) {
        if (!this.isActive || !this.canvas) return;
        
        // FileMaker環境かつ未アクティベーションの場合はスキップ
        if (this.isFileMaker && !this.viewerActivated) return;
        
        // スクロール抑制（必要な場合のみ）
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }
        
        const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
        const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
        this._updateCursorPosition(clientX, clientY);
    }
    
    // ポインターアップハンドラー
    _onPointerUp(event) {
        if (!this.isActive || !this.canvas || !this.ctx) return;
        
        const clientX = event.clientX || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0);
        const clientY = event.clientY || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientY : 0);
        
        window.debugLog('event', `ポインターアップ: ${event.type}`, {
            clientX,
            clientY,
            isFileMaker: this.isFileMaker,
            viewerActivated: this.viewerActivated
        });
        
        // FileMaker環境かつ未アクティベーションの場合
        if (this.isFileMaker && !this.viewerActivated) {
            window.debugLog('stamp', 'WebViewer未アクティベーション - スタンプ配置の保留');
            
            // スタンプ配置をキューに入れる
            this.pendingStampAction = { x: clientX, y: clientY };
            
            // アクティベーションを試みる
            this.viewerActivated = true; // 次回からはアクティブ状態
            
            // FileMakerにアクティベーションをリクエスト
            const scriptCallSuccess = this._callFileMakerScript('GoToScrapImage', 'activate_and_stamp');
            
            if (!scriptCallSuccess) {
                window.debugLog('activation', 'スクリプト呼び出し失敗時の自動リカバリを試行');
                // エラーが発生した場合でも、次回のタップで確実に動作するようにする
                setTimeout(() => {
                    if (this.pendingStampAction) {
                        window.debugLog('stamp', '遅延スタンプ配置を実行します', this.pendingStampAction);
                        this._placeStampAtClientPos(clientX, clientY);
                        this.pendingStampAction = null;
                    }
                }, 500);
            }
            
            return;
        }
        
        // スクロール抑制（必要な場合のみ）
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }
        
        // スタンプ配置実行
        this._placeStampAtClientPos(clientX, clientY);
    }
    
    // カーソル位置更新
    _updateCursorPosition(clientX, clientY) {
        // cursorImageがnullでないことを確認
        if (!this.cursorImage) return;
        
        try {
            this.cursorImage.style.left = `${clientX}px`;
            this.cursorImage.style.top = `${clientY}px`;
        } catch (err) {
            window.debugLog('error', 'カーソル位置更新エラー:', err.message);
        }
    }
    
    // スタンプ配置処理
    _placeStampAtClientPos(clientX, clientY) {
        if (!this.isActive || !this.canvas || !this.ctx) {
            window.debugLog('error', 'スタンプ配置条件エラー', {
                isActive: this.isActive,
                hasCanvas: !!this.canvas,
                hasCtx: !!this.ctx
            });
            return;
        }
        
        // キャンバス座標に変換
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        window.debugLog('stamp', 'スタンプ配置試行', {
            x, 
            y, 
            stamp: this.currentStamp,
            clientX,
            clientY,
            canvasRect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            }
        });
        
        // キャンバス範囲チェック
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            window.debugLog('warn', 'キャンバス範囲外でスタンプ配置中止', {x, y, width: rect.width, height: rect.height});
            return;
        }
        
        // スタンプ画像ロード
        const img = new Image();
        
        // 画像ロード完了時の処理
        img.onload = () => {
            try {
                // スタンプサイズ
                const stampSize = 30;
                
                // スタンプ描画
                this.ctx.save();
                this.ctx.drawImage(
                    img,
                    Math.floor(x - stampSize/2),
                    Math.floor(y - stampSize/2),
                    stampSize,
                    stampSize
                );
                this.ctx.restore();
                
                window.debugLog('stamp', 'スタンプ配置成功', {x, y, stampType: this.currentStampType});
                
                // スタンプ配置イベント発火
                this._fireStampPlacedEvent(x, y);
            } catch (err) {
                window.debugLog('error', 'スタンプ描画エラー:', err);
            }
        };
        
        // 画像読み込みエラー処理
        img.onerror = (err) => {
            window.debugLog('error', 'スタンプ画像読み込み失敗:', {
                stamp: this.currentStamp,
                error: err ? err.toString() : 'Unknown error'
            });
            
            // エラー発生時は代替の描画方法を試みる
            try {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255,0,0,0.5)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                
                window.debugLog('stamp', '代替スタンプ（円）を配置しました', {x, y});
                
                // スタンプ配置イベント発火
                this._fireStampPlacedEvent(x, y);
            } catch (drawErr) {
                window.debugLog('error', '代替スタンプ描画エラー:', drawErr);
            }
        };
        
        img.src = this.currentStamp;
    }
    
    // スタンプ配置イベント発火
    _fireStampPlacedEvent(x, y) {
        if (!this.canvas) return;

        try {
            const eventData = {
                x: x,
                y: y,
                type: this.currentStampType,
                stamp: this.currentStamp
            };
            
            const event = new CustomEvent('stampplaced', {
                bubbles: true,
                detail: eventData
            });
            
            this.canvas.dispatchEvent(event);
            window.debugLog('event', 'スタンプ配置イベント発火', eventData);
            
            // ストレージ更新 (try-catchで囲む)
            try {
                const storageData = localStorage.getItem('canvasData') || '{}';
                const data = JSON.parse(storageData);
                data.stampCount = (data.stampCount || 0) + 1;
                localStorage.setItem('canvasData', JSON.stringify(data));
                window.debugLog('data', 'ストレージ更新:', data);
            } catch (e) {
                window.debugLog('warn', 'ストレージ更新エラー:', e.message);
                // FileMaker WebViewerではlocalStorageが使えない場合がある
            }
            
            // FileMakerに通知（可能な場合）
            if (this.isFileMaker) {
                const stampData = JSON.stringify(eventData);
                this._callFileMakerScript('StampPlaced', stampData);
            }
        } catch (err) {
            window.debugLog('error', 'イベント発火エラー:', err.message);
        }
    }
    
    // 遅延スタンプ実行（FileMakerスクリプトから呼び出し可能）
    executeDelayedStamp() {
        if (this.pendingStampAction) {
            window.debugLog('stamp', '遅延スタンプアクションを実行します', this.pendingStampAction);
            const { x, y } = this.pendingStampAction;
            this._placeStampAtClientPos(x, y);
            this.pendingStampAction = null;
            return true;
        }
        window.debugLog('info', '遅延スタンプアクションはありません');
        return false;
    }
    
    // デバッグ情報を取得（FileMakerからのデバッグ用）
    getDebugInfo() {
        const info = {
            version: 'v11',
            isActive: this.isActive,
            isFileMaker: this.isFileMaker,
            viewerActivated: this.viewerActivated,
            hasCanvas: !!this.canvas,
            hasContext: !!this.ctx,
            hasCursorContainer: !!this.cursorContainer,
            hasCursorImage: !!this.cursorImage,
            currentStampType: this.currentStampType,
            currentStamp: this.currentStamp,
            pendingStampAction: this.pendingStampAction,
            activationAttempts: this.activationAttempts,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        window.debugLog('debug', 'デバッグ情報を取得しました', info);
        return JSON.stringify(info);
    }
}

// FileMaker WebViewerで利用するためのグローバル関数
window.activateStampMode = function(stampType, customPath) {
    window.debugLog('api', 'activateStampMode 呼び出し', {stampType, customPath});
    if (window.stampModeInstance) {
        window.stampModeInstance.activate(stampType, customPath);
        return true;
    }
    window.debugLog('error', 'stampModeInstance が見つかりません');
    return false;
};

window.deactivateStampMode = function() {
    window.debugLog('api', 'deactivateStampMode 呼び出し');
    if (window.stampModeInstance) {
        window.stampModeInstance.deactivate();
        return true;
    }
    window.debugLog('error', 'stampModeInstance が見つかりません');
    return false;
};

window.activateWebViewer = function() {
    window.debugLog('api', 'activateWebViewer 呼び出し');
    if (window.stampModeInstance) {
        return window.stampModeInstance.activateWebViewer();
    }
    window.debugLog('error', 'stampModeInstance が見つかりません');
    return false;
};

window.executeDelayedStamp = function() {
    window.debugLog('api', 'executeDelayedStamp 呼び出し');
    if (window.stampModeInstance) {
        return window.stampModeInstance.executeDelayedStamp();
    }
    window.debugLog('error', 'stampModeInstance が見つかりません');
    return false;
};

window.getStampModeDebugInfo = function() {
    window.debugLog('api', 'getStampModeDebugInfo 呼び出し');
    if (window.stampModeInstance) {
        return window.stampModeInstance.getDebugInfo();
    }
    window.debugLog('error', 'stampModeInstance が見つかりません');
    return JSON.stringify({error: 'stampModeInstance not found'});
};

// デバッグ情報をログに記録（初期化時）
window.debugLog('init', 'StampMode.js v11 読み込み完了', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
});