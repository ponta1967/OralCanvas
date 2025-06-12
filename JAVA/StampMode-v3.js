// StampMode.js v3
class StampMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorImage = null;
        this.isActive = false;
        this.currentStamp = '';
        this.currentStampType = '';
        
        // バインド
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouch = this.handleTouch.bind(this);
        this.placeStamp = this.placeStamp.bind(this);
        this.deactivate = this.deactivate.bind(this);
        
        // マウスイベント
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('click', this.placeStamp);
        
        // タッチイベント - シンプルな統合アプローチ
        this.canvas.addEventListener('touchstart', this.handleTouch);
        this.canvas.addEventListener('touchmove', this.handleTouch);
        this.canvas.addEventListener('touchend', this.placeStamp);
        
        // 非アクティブ化
        this.canvas.addEventListener('mouseout', this.deactivate);
        
        console.log('StampMode v3 初期化完了');
    }
    
    // カスタムスタンプのサポート
    activate(stampType, customPath) {
        console.log('スタンプモード有効化:', stampType, customPath || '');
        this.isActive = true;
        this.currentStampType = stampType;
        
        if (stampType === 'TADS') {
            this.currentStamp = 'Tool/ImpAnc.png';
        } else if (stampType === 'Hook') {
            this.currentStamp = 'Tool/Hook.png';
        } else if (stampType === 'custom' && customPath) {
            this.currentStamp = customPath;
        } else {
            console.log('未知のスタンプタイプ、デフォルト使用:', stampType);
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
        this.cursorImage.style.width = '30px';
        this.cursorImage.style.height = 'auto';
        this.cursorImage.style.zIndex = '9999'; // 最前面に表示
        this.cursorContainer.appendChild(this.cursorImage);
        
        this.canvas.style.cursor = 'none';
        
        // 初期位置を中央に
        const rect = this.canvas.getBoundingClientRect();
        this.updateCursorPosition(rect.left + rect.width/2, rect.top + rect.height/2);
        
        console.log('カーソル画像設定完了:', this.currentStamp);
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
    
    // マウス移動ハンドラ
    handleMouseMove(event) {
        if (!this.isActive || !this.cursorImage) return;
        this.updateCursorPosition(event.clientX, event.clientY);
    }
    
    // タッチハンドラ（シンプル化）
    handleTouch(event) {
        if (!this.isActive || !this.cursorImage) return;
        event.preventDefault(); // タッチイベントではデフォルト動作を防止
        
        if (event.touches && event.touches.length) {
            const touch = event.touches[0];
            this.updateCursorPosition(touch.clientX, touch.clientY);
        }
    }
    
    // カーソル位置更新（シンプル化）
    updateCursorPosition(clientX, clientY) {
        if (!this.cursorImage) return;
        
        this.cursorImage.style.left = `${clientX - 15}px`; // センタリング
        this.cursorImage.style.top = `${clientY - 15}px`;  // センタリング
    }
    
    // スタンプ配置（シンプル化）
    placeStamp(event) {
        if (!this.isActive) return;
        
        // タッチイベントではデフォルト動作を防止
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }
        
        let clientX, clientY;
        
        // イベントタイプに基づいて座標取得
        if (event.type === 'touchend') {
            // タッチ終了時は最後のタッチ位置を使用
            const touch = event.changedTouches[0];
            if (!touch) {
                console.warn('タッチデータなし');
                return;
            }
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            // クリックイベントの場合
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // キャンバス座標に変換
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        console.log('スタンプ配置:', x, y, '(イベント:', event.type, ')');
        
        // キャンバス範囲内チェック
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            console.warn('キャンバス範囲外:', x, y);
            return;
        }
        
        // 画像読み込みとスタンプ配置
        const img = new Image();
        img.onload = () => {
            const stampSize = 30; // 固定サイズ
            this.ctx.drawImage(img, x - stampSize/2, y - stampSize/2, stampSize, stampSize);
            console.log('スタンプ配置成功:', this.currentStamp);
            
            // スタンプ配置イベント
            const stampEvent = new CustomEvent('stampplaced', {
                detail: {
                    x, y,
                    type: this.currentStampType,
                    stamp: this.currentStamp
                }
            });
            this.canvas.dispatchEvent(stampEvent);
            
            // グローバルログ関数があれば使用
            if (typeof logStampPlacement === 'function') {
                logStampPlacement(x, y, this.currentStampType, this.currentStamp);
            }
        };
        
        img.onerror = () => {
            console.error('スタンプ画像読み込み失敗:', this.currentStamp);
        };
        
        img.src = this.currentStamp;
    }
}