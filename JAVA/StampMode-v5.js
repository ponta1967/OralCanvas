// StampMode.js v5 - FileMaker WebViewer対応シンプル版
class StampMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorImage = null;
        this.isActive = false;
        this.currentStamp = '';
        this.currentStampType = '';
        
        // シンプルなイベントバインディング
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleClick = this._handleClick.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        this.deactivate = this.deactivate.bind(this);
        
        // マウスイベント
        canvas.addEventListener('mousemove', this._handleMouseMove);
        canvas.addEventListener('click', this._handleClick);
        canvas.addEventListener('mouseout', this.deactivate);
        
        // タッチイベント - 最小限のセット
        canvas.addEventListener('touchstart', this._handleTouchStart);
        canvas.addEventListener('touchmove', this._handleTouchMove);
        canvas.addEventListener('touchend', this._handleTouchEnd);
        
        console.log('StampMode v5 初期化完了');
    }
    
    // カスタムスタンプ対応
    activate(stampType, customPath) {
        console.log('スタンプモード有効化:', stampType, customPath || '');
        this.isActive = true;
        this.currentStampType = stampType;
        
        if (stampType === 'custom' && customPath) {
            this.currentStamp = customPath;
        } else if (stampType === 'TADS') {
            this.currentStamp = 'Tool/ImpAnc.png';
        } else if (stampType === 'Hook') {
            this.currentStamp = 'Tool/Hook.png';
        } else {
            this.currentStamp = customPath || 'Tool/ImpAnc.png';
        }
        
        // 既存のカーソル画像をクリーン
        if (this.cursorImage) {
            this.cursorContainer.removeChild(this.cursorImage);
        }
        
        // カーソル画像設定
        this.cursorImage = new Image();
        this.cursorImage.src = this.currentStamp;
        this.cursorImage.classList.add('cursor-image');
        this.cursorImage.style.position = 'absolute';
        this.cursorImage.style.pointerEvents = 'none';
        this.cursorImage.style.width = '30px';
        this.cursorImage.style.height = 'auto';
        this.cursorImage.style.zIndex = '9999';
        this.cursorImage.style.left = '0px';
        this.cursorImage.style.top = '0px';
        this.cursorContainer.appendChild(this.cursorImage);
        
        // カーソル非表示
        this.canvas.style.cursor = 'none';
        
        // 初期カーソル位置設定
        const rect = this.canvas.getBoundingClientRect();
        this._updateCursorPosition(rect.left + rect.width/2, rect.top + rect.height/2);
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        console.log('スタンプモード無効化');
        this.isActive = false;
        
        if (this.cursorImage) {
            this.cursorContainer.removeChild(this.cursorImage);
            this.cursorImage = null;
        }
        
        this.canvas.style.cursor = 'default';
    }
    
    // プライベートメソッド - マウス/タッチイベントハンドラ
    _handleMouseMove(event) {
        if (!this.isActive || !this.cursorImage) return;
        this._updateCursorPosition(event.clientX, event.clientY);
    }
    
    _handleClick(event) {
        if (!this.isActive) return;
        
        // クリック座標でスタンプ配置
        this._placeStamp(event.clientX, event.clientY);
    }
    
    _handleTouchStart(event) {
        if (!this.isActive || !this.cursorImage) return;
        
        // FileMaker WebViewerのバグ回避のためpreventDefault
        event.preventDefault();
        
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            this._updateCursorPosition(touch.clientX, touch.clientY);
        }
    }
    
    _handleTouchMove(event) {
        if (!this.isActive || !this.cursorImage) return;
        event.preventDefault();
        
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            this._updateCursorPosition(touch.clientX, touch.clientY);
        }
    }
    
    _handleTouchEnd(event) {
        if (!this.isActive) return;
        event.preventDefault(); // 必須: タッチイベントのデフォルト動作を防止
        
        console.log('タッチ終了:', event);
        
        // タッチ終了位置でスタンプ配置
        if (event.changedTouches && event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            
            // ログ出力
            console.log('タッチ座標:', touch.clientX, touch.clientY);
            
            // スタンプ配置
            this._placeStamp(touch.clientX, touch.clientY);
        }
    }
    
    // カーソル位置更新
    _updateCursorPosition(clientX, clientY) {
        if (!this.cursorImage) return;
        
        // カーソル中央を指すように調整
        this.cursorImage.style.left = `${clientX - 15}px`;
        this.cursorImage.style.top = `${clientY - 15}px`;
    }
    
    // スタンプ配置 - 直接Canvas APIを使用
    _placeStamp(clientX, clientY) {
        if (!this.isActive) return;
        
        // キャンバス座標に変換
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        console.log('スタンプ配置開始:', x, y, this.currentStamp);
        
        // キャンバス範囲チェック
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            console.warn('キャンバス範囲外でスタンプ配置中止');
            return;
        }
        
        // 画像読み込み
        const stampImg = new Image();
        
        // 画像読み込み完了時の処理
        stampImg.onload = () => {
            // スタンプサイズ
            const stampSize = 30;
            
            // コンテキスト保存
            this.ctx.save();
            
            // スタンプ描画
            this.ctx.drawImage(
                stampImg,
                x - stampSize/2,
                y - stampSize/2,
                stampSize,
                stampSize
            );
            
            // コンテキスト復元
            this.ctx.restore();
            
            console.log('スタンプ配置成功:', x, y);
            
            // スタンプ配置イベント発行
            const stampEvent = new CustomEvent('stampplaced', {
                detail: {
                    x: x,
                    y: y,
                    type: this.currentStampType,
                    path: this.currentStamp
                }
            });
            
            // イベント発火
            this.canvas.dispatchEvent(stampEvent);
            
            // FileMaker WebViewerの場合のフォールバック通知
            if (window.FileMaker || document.documentElement.classList.contains('filemaker')) {
                console.log('FileMaker環境検出: スタンプ配置通知');
                
                // FileMaker用のグローバル関数があれば呼び出し
                if (typeof window.notifyFileMakerStampPlaced === 'function') {
                    window.notifyFileMakerStampPlaced(x, y, this.currentStampType);
                }
                
                // FileMakerスクリプト呼び出し (FileMaker APIがある場合)
                if (window.FileMaker && window.FileMaker.PerformScript) {
                    try {
                        window.Fi