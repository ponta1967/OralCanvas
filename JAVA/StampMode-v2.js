// StampMode.js
class StampMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorImage = null;
        this.isActive = false;
        this.currentStamp = '';
        this.currentStampType = '';
        this.lastTouchTime = 0;
        this.touchTimeThreshold = 300; // ms - 短いタップと長押しを区別するための時間

        this.updateCursorPosition = this.updateCursorPosition.bind(this);
        this.placeStamp = this.placeStamp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.deactivate = this.deactivate.bind(this);

        // マウスイベント
        this.canvas.addEventListener('mousemove', this.updateCursorPosition);
        this.canvas.addEventListener('click', this.placeStamp);
        this.canvas.addEventListener('mouseout', this.deactivate);

        // タッチイベント - 別々のハンドラーを使用
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.updateCursorPosition, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        
        console.log('StampMode initialized with canvas:', this.canvas);
    }

    activate(stampType) {
        console.log('Activating stamp mode:', stampType);
        this.isActive = true;
        this.currentStampType = stampType;
        
        // カスタムスタンプタイプの処理
        if (stampType === 'TADS') {
            this.currentStamp = 'Tool/ImpAnc.png';
        } else if (stampType === 'Hook') {
            this.currentStamp = 'Tool/Hook.png';
        } else if (stampType === 'custom' && arguments[1]) {
            // カスタムスタンプが指定された場合
            this.currentStamp = arguments[1];
        } else {
            // デフォルト値
            this.currentStamp = 'Tool/ImpAnc.png';
        }

        if (this.cursorImage) {
            this.cursorContainer.removeChild(this.cursorImage);
        }

        this.cursorImage = new Image();
        this.cursorImage.src = this.currentStamp;
        this.cursorImage.classList.add('cursor-image');
        this.cursorImage.style.position = 'absolute';
        this.cursorImage.style.pointerEvents = 'none';
        this.cursorImage.style.width = stampType === 'TADS' ? '30px' : '20px';
        this.cursorImage.style.height = 'auto';
        this.cursorContainer.appendChild(this.cursorImage);
        console.log('Cursor image added:', this.cursorImage);

        this.canvas.style.cursor = 'none';

        // 中央に初期配置
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 初期位置設定
        this.updateCursorPosition({ 
            type: 'init', 
            clientX: centerX, 
            clientY: centerY 
        });
    }

    deactivate() {
        if (this.isActive) {
            console.log('Deactivating stamp mode');
            this.isActive = false;
            if (this.cursorImage) {
                this.cursorContainer.removeChild(this.cursorImage);
                this.cursorImage = null;
            }
            this.canvas.style.cursor = 'default';
        }
    }

    // タッチスタートハンドラー
    handleTouchStart(event) {
        if (!this.isActive) return;
        event.preventDefault();
        
        this.lastTouchTime = Date.now();
        console.log('Touch start detected');
        
        // カーソル位置更新
        this.updateCursorPosition(event);
    }

    // タッチエンドハンドラー
    handleTouchEnd(event) {
        if (!this.isActive) return;
        event.preventDefault();
        
        const touchDuration = Date.now() - this.lastTouchTime;
        console.log('Touch end detected, duration:', touchDuration);
        
        // タップと判定（長押しでない場合のみスタンプを配置）
        if (touchDuration < this.touchTimeThreshold) {
            this.placeStamp(event);
        }
    }

    updateCursorPosition(event) {
        if (!this.isActive || !this.cursorImage) return;
        
        // タッチイベントの場合のみpreventDefault
        if (event.type && event.type.startsWith('touch')) {
            event.preventDefault();
        }

        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (event.type && event.type.startsWith('touch')) {
            // タッチイベント処理
            const touch = event.touches && event.touches.length ? event.touches[0] : 
                         (event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null);
            
            if (!touch) {
                console.warn('Touch event without valid touch data');
                return;
            }
            
            clientX = touch.clientX;
            clientY = touch.clientY;
            console.log('Touch position:', clientX, clientY);
        } else {
            // マウスイベントまたは初期化
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // キャンバス座標に変換
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // 描画領域内にあることを確認
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            this.cursorImage.style.left = `${clientX}px`;
            this.cursorImage.style.top = `${clientY}px`;
            this.cursorImage.style.display = 'block';
        } else {
            // 領域外の場合は非表示
            this.cursorImage.style.display = 'none';
        }
    }

    placeStamp(event) {
        if (!this.isActive) return;
        
        // タッチイベントの場合のみpreventDefault
        if (event.type && event.type.startsWith('touch')) {
            event.preventDefault();
        }

        console.log('Placing stamp', event.type);
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (event.type && event.type.startsWith('touch')) {
            // touchendイベントではchangedTouchesを使用
            const touch = event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null;
            
            if (!touch) {
                console.warn('Touch event without valid touch data');
                return;
            }
            
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            // マウスイベント
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // キャンバス座標に変換
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        console.log('Calculated stamp position:', x, y);

        // 描画領域内にあることを確認
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            console.warn('Stamp position outside canvas, aborting');
            return;
        }

        const img = new Image();
        img.onload = () => {
            const stampSize = this.currentStampType === 'TADS' ? 30 : 20;
            this.ctx.drawImage(img, x - stampSize/2, y - stampSize/2, stampSize, stampSize);
            console.log('Stamp placed successfully at:', x, y);
            
            // スタンプ配置イベントを発生させる（オプション）
            const stampEvent = new CustomEvent('stampplaced', { 
                detail: { 
                    x, 
                    y, 
                    type: this.currentStampType, 
                    stamp: this.currentStamp 
                } 
            });
            this.canvas.dispatchEvent(stampEvent);
        };
        
        img.onerror = (err) => {
            console.error('Failed to load stamp image:', this.currentStamp, err);
        };
        
        img.src = this.currentStamp;
    }
}