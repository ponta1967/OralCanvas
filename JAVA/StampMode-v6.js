// StampMode.js v6 - 極限までシンプル化したFileMaker WebViewer対応版
class StampMode {
    constructor(canvas) {
        // 基本プロパティ
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorImage = null;
        this.isActive = false;
        this.currentStamp = '';
        this.currentStampType = '';
        this.isMobileOrTablet = this._isMobileOrTablet();
        
        // イベントハンドラバインド
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseClick = this._onMouseClick.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        this.deactivate = this.deactivate.bind(this);
        
        // 基本的なイベントリスナー
        this._setupEventListeners();
        
        console.log('StampMode v6初期化完了: モバイル/タブレット検出=', this.isMobileOrTablet);
    }
    
    // モバイル/タブレット検出
    _isMobileOrTablet() {
        const ua = navigator.userAgent.toLowerCase();
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
    
    // イベントリスナー設定
    _setupEventListeners() {
        // マウスイベント
        this.canvas.addEventListener('mousemove', this._onMouseMove);
        this.canvas.addEventListener('click', this._onMouseClick);
        this.canvas.addEventListener('mouseout', this.deactivate);
        
        // タッチデバイス向けの最小限のイベント
        this.canvas.addEventListener('touchend', this._onTouchEnd);
        
        // iOSのスクロール防止（タッチイベント用）
        this.canvas.addEventListener('touchstart', function(e) {
            // スクロール防止
            if (this.isActive) e.preventDefault();
        }.bind(this), { passive: false });
        
        this.canvas.addEventListener('touchmove', function(e) {
            // スクロール防止
            if (this.isActive) e.preventDefault();
        }.bind(this), { passive: false });
    }
    
    // スタンプモード有効化
    activate(stampType, customPath) {
        // すでに有効なら何もしない
        if (this.isActive) {
            this.deactivate(); // 一度無効化して再設定
        }
        
        console.log('スタンプモード有効化:', stampType, customPath || '');
        this.isActive = true;
        this.currentStampType = stampType;
        
        // スタンプタイプに基づいてパス設定
        if (stampType === 'custom' && customPath) {
            this.currentStamp = customPath;
        } else if (stampType === 'TADS') {
            this.currentStamp = 'Tool/ImpAnc.png';
        } else if (stampType === 'Hook') {
            this.currentStamp = 'Tool/Hook.png';
        } else {
            // デフォルト設定
            this.currentStamp = customPath || 'Tool/ImpAnc.png';
        }
        
        // カーソル画像の設定
        this._setupCursorImage();
        
        // カーソルを隠す
        this.canvas.style.cursor = 'none';
    }
    
    // カーソル画像設定
    _setupCursorImage() {
        // 既存のカーソル画像があれば削除
        if (this.cursorImage) {
            this.cursorContainer.removeChild(this.cursorImage);
        }
        
        // 新しいカーソル画像を作成
        this.cursorImage = new Image();
        this.cursorImage.src = this.currentStamp;
        this.cursorImage.classList.add('cursor-image');
        this.cursorImage.style.position = 'absolute';
        this.cursorImage.style.pointerEvents = 'none';
        this.cursorImage.style.width = '30px';
        this.cursorImage.style.height = 'auto';
        this.cursorImage.style.zIndex = '9999';
        this.cursorImage.style.transform = 'translate(-50%, -50%)'; // 中央揃え
        this.cursorImage.style.display = 'block';
        this.cursorContainer.appendChild(this.cursorImage);
        
        // 初期位置を中央に設定
        const rect = this.canvas.getBoundingClientRect();
        this._updateCursorPosition(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
    }
    
    // スタンプモード無効化
    deactivate() {
        if (!this.isActive) return;
        
        console.log('スタンプモード無効化');
        this.isActive = false;
        
        // カーソル画像を削除
        if (this.cursorImage) {
            this.cursorContainer.removeChild(this.cursorImage);
            this.cursorImage = null;
        }
        
        // カーソルを元に戻す
        this.canvas.style.cursor = 'default';
    }
    
    // マウス移動ハンドラー
    _onMouseMove(event) {
        if (!this.isActive || !this.cursorImage) return;
        this._updateCursorPosition(event.clientX, event.clientY);
    }
    
    // マウスクリックハンドラー
    _onMouseClick(event) {
        if (!this.isActive) return;
        event.preventDefault();
        this._placeStampAtClientPos(event.clientX, event.clientY);
    }
    
    // タッチ終了ハンドラー
    _onTouchEnd(event) {
        if (!this.isActive) return;
        
        // スクロール防止
        event.preventDefault();
        
        console.log('タッチ終了イベント');
        
        // 最後のタッチ位置を取得
        if (event.changedTouches && event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            this._placeStampAtClientPos(touch.clientX, touch.clientY);
        }
    }
    
    // カーソル位置更新
    _updateCursorPosition(clientX, clientY) {
        if (!this.cursorImage) return;
        
        // 単純な位置設定（translate使用で中央揃え）
        this.cursorImage.style.left = `${clientX}px`;
        this.cursorImage.style.top = `${clientY}px`;
    }
    
    // スタンプ配置処理
    _placeStampAtClientPos(clientX, clientY) {
        // アクティブでなければ何もしない
        if (!this.isActive) return;
        
        // キャンバス座標への変換
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
                
                console.log('スタンプ配置成功:', x, y, this.currentStamp);
                
                // スタンプ配置イベント発火
                this._fireStampPlacedEvent(x, y);
            } catch (err) {
                console.error('スタンプ描画エラー:', err);
            }
        };
        
        // 画像読み込みエラー処理
        img.onerror =