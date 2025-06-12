// StampMode.js v8 - FileMaker WebViewer対応改良版
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
        }
        
        // グローバル変数に自身を保存（FileMakerからアクセスできるように）
        window.stampModeInstance = this;
        
        // FileMakerコールバック処理関数を登録
        window.handleFileMakerCallback = (action, param) => {
            console.log('FileMakerからのコールバック:', action, param);
            
            if (action === 'activateViewer' || action === '1') {
                this.setViewerActivated(true);
                return 'アクティベーション成功';
            }
            
            return 'アクション不明: ' + action;
        };
        
        console.log('StampMode v8初期化完了: FileMaker検出=', this.isFileMaker);
    }
    
    // FileMaker環境検出
    _detectFileMaker() {
        return (
            typeof window.FileMaker !== 'undefined' || 
            navigator.userAgent.indexOf('FileMaker') !== -1 ||
            document.documentElement.classList.contains('filemaker')
        );
    }
    
    // イベントリスナー設定
    _setupEventListeners() {
        if (!this.canvas) return;

        try {
            // タッチイベント
            this.canvas.addEventListener('touchstart', this._onPointerDown, { passive: false });
            this.canvas.addEventListener('touchmove', this._onPointerMove, { passive: false });
            this.canvas.addEventListener('touchend', this._onPointerUp, { passive: false });
            
            // マウスイベント
            this.canvas.addEventListener('mousedown', this._onPointerDown);
            this.canvas.addEventListener('mousemove', this._onPointerMove);
            this.canvas.addEventListener('mouseup', this._onPointerUp);
            this.canvas.addEventListener('mouseout', this.deactivate);
        } catch (err) {
            console.error('イベントリスナー設定エラー:', err.message);
        }
    }
    
    // FileMaker WebViewer アクティベーション検出
    _setupFileMakerActivation() {
        if (!this.canvas) return;

        try {
            // WebViewerアクティベーション検出用のタッチイベント
            const activationHandler = () => {
                if (!this.viewerActivated) {
                    console.log('FileMaker WebViewer アクティベーション検出');
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
                }
            };
            
            // 複数のイベントでアクティベーションを検出
            this.canvas.addEventListener('touchstart', activationHandler, { passive: true });
            this.canvas.addEventListener('mousedown', activationHandler, { passive: true });
            
            // ウィンドウのフォーカス時もチェック
            window.addEventListener('focus', activationHandler, { passive: true });
        } catch (err) {
            console.error('FileMakerアクティベーション設定エラー:', err.message);
        }
    }
    
    // 外部からのアクティベーション設定メソッド（FileMakerスクリプトから呼び出せる）
    setViewerActivated(activated = true) {
        this.viewerActivated = activated;
        console.log('WebViewer アクティベーション状態設定:', activated);
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
                // 代替画像またはデフォルト表示を設定するロジックをここに追加
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
        
        // FileMaker環境かつ未アクティベーションの場合はスキップ
        if (this.isFileMaker && !this.viewerActivated) {
            console.log('WebViewer未アクティベーション - ポインターダウン無視');
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
        
        // FileMaker環境かつ未アクティベーションの場合はスキップ
        if (this.isFileMaker && !this.viewerActivated) {
            console.log('WebViewer未アクティベーション - スタンプ配置スキップ');
            this.viewerActivated = true; // 次回からはアクティブ状態
            return;
        }
        
        // スクロール抑制（必要な場合のみ）
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }
        
        // スタンプ配置
        const clientX = event.clientX || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0);
        const clientY = event.clientY || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientY : 0);
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
        } catch (err) {
            console.error('イベント発火エラー:', err.message);
        }
    }
}