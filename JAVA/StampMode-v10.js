// StampMode.js v10 - FileMaker WebViewer対応強化版
class StampMode {
    constructor(canvas) {
        // canvas要素の防御的チェック
        this.canvas = canvas || null;
        if (!this.canvas) {
            console.error('StampMode初期化失敗: canvas要素がnullまたはundefinedです');
            return; // 初期化中断
        }

        try {
            this.ctx = this.canvas.getContext ? this.canvas.getContext('2d') : null;
            if (!this.ctx) {
                console.error('StampMode初期化失敗: canvas.getContextが取得できません');
            }
        } catch (err) {
            console.error('StampMode初期化エラー(getContext):', err.message);
            this.ctx = null;
        }

        // cursorContainer要素の防御的取得
        try {
            this.cursorContainer = document.getElementById('cursorContainer');
            if (!this.cursorContainer) {
                console.warn('cursorContainerが見つかりません。動的に作成します。');
                this.cursorContainer = document.createElement('div');
                this.cursorContainer.id = 'cursorContainer';
                this.cursorContainer.style.position = 'absolute';
                this.cursorContainer.style.pointerEvents = 'none';
                this.cursorContainer.style.zIndex = '9999';
                document.body.appendChild(this.cursorContainer);
            }
        } catch (err) {
            console.error('cursorContainer初期化エラー:', err.message);
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
            this._setupFileMakerActivation();
            
            // FileMakerでは強制的に初期アクティベーションを試みる
            this._attemptEarlyActivation();
        }
        
        // グローバル変数に自身を保存（FileMakerからアクセスできるように）
        window.stampModeInstance = this;
        
        // FileMakerコールバック処理関数を登録
        window.handleFileMakerCallback = (action, param) => {
            console.log('FileMakerからのコールバック:', action, param);
            
            if (action === 'activateViewer' || action === '1') {
                this.setViewerActivated(true);
                
                // 保留中のスタンプアクションがあれば実行
                if (this.pendingStampAction) {
                    console.log('保留中のスタンプアクションを実行します');
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
        
        console.log('StampMode v10初期化完了: FileMaker検出=', this.isFileMaker);
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
            console.log('FileMaker環境を検出しました', {
                hasFileMakerObj,
                hasFileMakerInUA,
                hasFileMakerClass,
                hasFMGoInUA,
                isFMWebView
            });
        }
        
        return isFileMaker;
    }
    
    // 初期アクティベーションを試みる
    _attemptEarlyActivation() {
        console.log('初期アクティベーションを試みます');
        
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
                console.log('初期アクティベーションイベントを発行しました');
                
                // アクティベーションフラグを設定
                this.viewerActivated = true;
            } catch (e) {
                console.warn('初期アクティベーション試行エラー:', e);
                
                // TouchEventがサポートされていない場合は別の方法を試す
                try {
                    const mouseEvent = new MouseEvent('mousedown', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    this.canvas.dispatchEvent(mouseEvent);
                    console.log('初期アクティベーション(マウス)イベントを発行しました');
                    
                    // アクティベーションフラグを設定
                    this.viewerActivated = true;
                } catch (err) {
                    console.warn('代替アクティベーション方法も失敗:', err);
                }
            }
            
            // FileMakerに通知するコールバック
            if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
                try {
                    window.FileMaker.PerformScript('WebViewerActivated', 'StampMode');
                    console.log('FileMakerスクリプトを呼び出してアクティベーションを通知しました');
                } catch (e) {
                    console.warn('FileMakerスクリプト呼び出しエラー:', e);
                }
            }
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
            
            console.log('イベントリスナーを設定しました（キャプチャフェーズ含む）');
        } catch (err) {
            console.error('イベントリスナー設定エラー:', err.message);
        }
    }
    
    // FileMaker WebViewer アクティベーション検出
    _setupFileMakerActivation() {
        if (!this.canvas) return;

        try {
            // WebViewerアクティベーション検出用のタッチイベント
            const activationHandler = (event) => {
                if (!this.viewerActivated) {
                    console.log('FileMaker WebViewer アクティベーション検出:', event.type);
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
                    
                    // FileMakerにアクティベーション状態を通知（可能な場合）
                    if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
                        try {
                            window.FileMaker.PerformScript('WebViewerActivated', 'true');
                            console.log('FileMakerスクリプトを呼び出してアクティベーションを通知しました');
                        } catch (e) {
                            console.warn('FileMakerスクリプト呼び出しエラー:', e);
                        }
                    }
                }
            };
            
            // 複数のイベントでアクティベーションを検出 - キャプチャフェーズで捕捉
            this.canvas.addEventListener('touchstart', activationHandler, { passive: true, capture: true });
            this.canvas.addEventListener('mousedown', activationHandler, { passive: true, capture: true });
            window.addEventListener('focus', activationHandler, { passive: true });
            document.addEventListener('visibilitychange', activationHandler, { passive: true });
            
            // iOS特有のイベント
            window.addEventListener('deviceorientation', activationHandler, { passive: true });
            
            console.log('FileMakerアクティベーション検出を設定しました');
        } catch (err) {
            console.error('FileMakerアクティベーション設定エラー:', err.message);
        }
    }
    
    // 外部からのアクティベーション設定メソッド（FileMakerスクリプトから呼び出せる）
    setViewerActivated(activated = true) {
        this.viewerActivated = activated;
        console.log('WebViewer アクティベーション状態設定:', activated);
        
        // 保留中のスタンプアクションがあれば実行
        if (activated && this.pendingStampAction) {
            console.log('保留中のスタンプアクションを実行します');
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
            console.log(`WebViewerアクティベーション試行 (${this.activationAttempts}回目)`);
            
            // FileMakerスクリプト呼び出し
            if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
                try {
                    window.FileMaker.PerformScript('GoToScrapImage', 'activate');
                    console.log('FileMakerスクリプトを呼び出してアクティベーションをリクエスト');
                    return true;
                } catch (e) {
                    console.warn('FileMakerスクリプト呼び出しエラー:', e);
                }
            }
            
            // イベント発火によるアクティベーション
            try {
                const event = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                this.canvas.dispatchEvent(event);
                console.log('マウスイベントによるアクティベーション試行');
                return true;
            } catch (err) {
                console.warn('イベントによるアクティベーション失敗:', err);
            }
        }
        return false;
    }
    
    activate(stampType, customPath) {
        if (!this.canvas || !this.ctx) {
            console.error('スタンプモード有効化失敗: canvas/ctx が初期化されていません');
            return;
        }

        console.log('スタンプモード有効化:', stampType, customPath || '');
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
            this.activateWebViewer();
        }
    }
    
    // カーソル画像設定
    _setupCursorImage() {
        if (!this.cursorContainer) {
            console.error('カーソル画像設定失敗: cursorContainerがnullです');
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
                console.error('カーソル画像の読み込みに失敗しました:', this.currentStamp);
                // 代替画像またはデフォルト表示を設定
                this.cursorImage.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="rgba(255,0,0,0.5)"/></svg>';
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
            console.error('カーソル画像設定エラー:', err.message);
            this.cursorImage = null;
        }
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        console.log('スタンプモード無効化');
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
            console.error('スタンプモード無効化エラー:', err.message);
        }
    }
    
    // ポインターダウンハンドラー
    _onPointerDown(event) {
        if (!this.isActive || !this.canvas) return;
        
        // FileMaker環境かつ未アクティベーションの場合はアクティベーションを試みる
        if (this.isFileMaker && !this.viewerActivated) {
            console.log('WebViewer未アクティベーション - アクティベーションを試みます');
            this.viewerActivated = true; // 強制的にアクティブ化
            
            // スクロール抑制（必要な場合のみ）
            if (event.type.startsWith('touch')) {
                event.preventDefault();
            }
            
            // FileMakerスクリプト呼び出し
            if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
                try {
                    window.FileMaker.PerformScript('GoToScrapImage', 'activate');
                    console.log('FileMakerスクリプトを呼び出してアクティベーションをリクエスト');
                } catch (e) {
                    console.warn('FileMakerスクリプト呼び出しエラー:', e);
                }
            }
            
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
        console.log('ポインターダウン:', event.type, { clientX, clientY, viewerActivated: this.viewerActivated });
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
        
        // FileMaker環境かつ未アクティベーションの場合
        if (this.isFileMaker && !this.viewerActivated) {
            console.log('WebViewer未アクティベーション - スタンプ配置の保留');
            
            const clientX = event.clientX || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0);
            const clientY = event.clientY || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientY : 0);
            
            // スタンプ配置をキューに入れる
            this.pendingStampAction = { x: clientX, y: clientY };
            
            // アクティベーションを試みる
            this.viewerActivated = true; // 次回からはアクティブ状態
            
            // FileMakerにアクティベーションをリクエスト
            if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
                try {
                    window.FileMaker.PerformScript('GoToScrapImage', 'activate_and_stamp');
                    console.log('FileMakerスクリプトを呼び出してアクティベーションと遅延スタンプをリクエスト');
                } catch (e) {
                    console.warn('FileMakerスクリプト呼び出しエラー:', e);
                    
                    // エラーが発生した場合でも、次回のタップで確実に動作するようにする
                    setTimeout(() => {
                        if (this.pendingStampAction) {
                            this._placeStampAtClientPos(clientX, clientY);
                            this.pendingStampAction = null;
                        }
                    }, 500);
                }
            }
            
            return;
        }
        
        // スクロール抑制（必要な場合のみ）
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }
        
        // スタンプ配置
        const clientX = event.clientX || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0);
        const clientY = event.clientY || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientY : 0);
        
        // デバッグログ
        console.log('ポインターアップ:', event.type, { clientX, clientY, viewerActivated: this.viewerActivated });
        
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
            console.error('カーソル位置更新エラー:', err.message);
        }
    }
    
    // スタンプ配置処理
    _placeStampAtClientPos(clientX, clientY) {
        if (!this.isActive || !this.canvas || !this.ctx) return;
        
        // キャンバス座標に変換
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        console.log('スタンプ配置試行:', x, y, this.currentStamp);
        
        // キャンバス範囲チェック
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            console.warn('キャンバス範囲外でスタンプ配置中止');
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
                
                console.log('スタンプ配置成功:', x, y);
                
                // スタンプ配置イベント発火
                this._fireStampPlacedEvent(x, y);
            } catch (err) {
                console.error('スタンプ描画エラー:', err);
            }
        };
        
        // 画像読み込みエラー処理
        img.onerror = (err) => {
            console.error('スタンプ画像読み込み失敗:', this.currentStamp, err);
            
            // エラー発生時は代替の描画方法を試みる
            try {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255,0,0,0.5)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                
                console.log('代替スタンプ（円）を配置しました');
                
                // スタンプ配置イベント発火
                this._fireStampPlacedEvent(x, y);
            } catch (drawErr) {
                console.error('代替スタンプ描画エラー:', drawErr);
            }
        };
        
        img.src = this.currentStamp;
    }
    
    // スタンプ配置イベント発火
    _fireStampPlacedEvent(x, y) {
        if (!this.canvas) return;

        try {
            const event = new CustomEvent('stampplaced', {
                bubbles: true,
                detail: {
                    x: x,
                    y: y,
                    type: this.currentStampType,
                    stamp: this.currentStamp
                }
            });
            
            this.canvas.dispatchEvent(event);
            
            // ストレージ更新 (try-catchで囲む)
            try {
                const storageData = localStorage.getItem('canvasData') || '{}';
                const data = JSON.parse(storageData);
                data.stampCount = (data.stampCount || 0) + 1;
                localStorage.setItem('canvasData', JSON.stringify(data));
                console.log('ストレージ更新:', data);
            } catch (e) {
                console.warn('ストレージ更新エラー:', e);
                // FileMaker WebViewerではlocalStorageが使えない場合がある
            }
            
            // FileMakerに通知（可能な場合）
            if (this.isFileMaker && typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
                try {
                    const stampData = JSON.stringify({
                        x: x,
                        y: y,
                        type: this.currentStampType,
                        stamp: this.currentStamp
                    });
                    window.FileMaker.PerformScript('StampPlaced', stampData);
                    console.log('FileMakerスクリプトを呼び出してスタンプ配置を通知');
                } catch (e) {
                    console.warn('FileMakerスクリプト呼び出しエラー:', e);
                }
            }
        } catch (err) {
            console.error('イベント発火エラー:', err.message);
        }
    }
    
    // 遅延スタンプ実行（FileMakerスクリプトから呼び出し可能）
    executeDelayedStamp() {
        if (this.pendingStampAction) {
            console.log('遅延スタンプアクションを実行します');
            const { x, y } = this.pendingStampAction;
            this._placeStampAtClientPos(x, y);
            this.pendingStampAction = null;
            return true;
        }
        return false;
    }
}

// FileMaker WebViewerで利用するためのグローバル関数
window.activateStampMode = function(stampType, customPath) {
    if (window.stampModeInstance) {
        window.stampModeInstance.activate(stampType, customPath);
        return true;
    }
    return false;
};

window.deactivateStampMode = function() {
    if (window.stampModeInstance) {
        window.stampModeInstance.deactivate();
        return true;
    }
    return false;
};

window.activateWebViewer = function() {
    if (window.stampModeInstance) {
        return window.stampModeInstance.activateWebViewer();
    }
    return false;
};

window.executeDelayedStamp = function() {
    if (window.stampModeInstance) {
        return window.stampModeInstance.executeDelayedStamp();
    }
    return false;
};