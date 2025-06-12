// StampMode.js v4 - FileMaker WebViewer対応版
class StampMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorImage = null;
        this.isActive = false;
        this.currentStamp = '';
        this.currentStampType = '';
        
        // FileMaker環境検出
        this.isFileMaker = window.FileMaker || navigator.userAgent.indexOf('FileMaker') !== -1 || false;
        this.isiPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || 
                     document.documentElement.classList.contains('ipad');
        
        console.log('環境検出:', { FileMaker: this.isFileMaker, iPad: this.isiPad });
        
        // バインド
        this.handleClick = this.handleClick.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.deactivate = this.deactivate.bind(this);
        
        // 単純化: すべてのイベントでpreventDefaultしない
        this.canvas.addEventListener('mousemove', this.handleMove);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mouseout', this.deactivate);
        
        // iPadとFileMaker環境のための特別処理
        if (this.isiPad || this.isFileMaker) {
            // 単純なタッチイベントのみ使用
            this.canvas.addEventListener('touchstart', (e) => {
                // タッチ開始時は位置更新のみ
                if (!this.isActive) return;
                const touch = e.touches[0];
                if (touch) {
                    this.updateCursorPosition(touch.clientX, touch.clientY);
                }
            }, false);
            
            this.canvas.addEventListener('touchend', (e) => {
                // タッチ終了時のみスタンプ配置
                if (!this.isActive) return;
                e.preventDefault(); // FileMakerでの誤動作防止のためここではpreventDefault
                const touch = e.changedTouches[0];
                if (touch) {
                    this.placeStampAt(touch.clientX, touch.clientY);
                }
            }, false);
        }
        
        console.log('StampMode v4 初期化完了');
    }
    
    activate(stampType, customPath) {
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
            console.log('未知のスタンプタイプ:', stampType);
            this.currentStamp = customPath || 'Tool/ImpAnc.png';
        }
        
        // カーソル画像更新
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
        this.cursorImage.style.zIndex = '9999';
        this.cursorImage.style.transform = 'translate(-50%, -50%)'; // 中央揃え
        this.cursorContainer.appendChild(this.cursorImage);
        
        this.canvas.style.cursor = 'none';
        
        // 中央位置にカーソル表示
        const rect = this.canvas.getBoundingClientRect();
        this.updateCursorPosition(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
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
    
    handleMove(event) {
        if (!this.isActive || !this.cursorImage) return;
        this.updateCursorPosition(event.clientX, event.clientY);
    }
    
    handleClick(event) {
        if (!this.isActive) return;
        this.placeStampAt(event.clientX, event.clientY);
    }
    
    updateCursorPosition(clientX, clientY) {
        if (!this.cursorImage) return;
        this.cursorImage.style.left = `${clientX}px`;
        this.cursorImage.style.top = `${clientY}px`;
    }
    
    placeStampAt(clientX, clientY) {
        if (!this.isActive) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        console.log('スタンプ配置試行:', x, y);
        
        // キャンバス内かチェック
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            console.warn('キャンバス範囲外');
            return;
        }
        
        // 画像ロードしてスタンプ配置
        const img = new Image();
        
        img.onload = () => {
            const stampSize = 30;
            
            // スタンプを描画
            this.ctx.save();
            this.ctx.drawImage(
                img, 
                x - stampSize/2, 
                y - stampSize/2, 
                stampSize, 
                stampSize
            );
            this.ctx.restore();
            
            console.log('スタンプ配置成功:', x, y, this.currentStamp);
            
            // スタンプ配置イベント発火
            const event = new CustomEvent('stampplaced', {
                detail: {
                    x, y,
                    type: this.currentStampType,
                    path: this.currentStamp
                }
            });
            this.canvas.dispatchEvent(event);
        };
        
        img.onerror = (err) => {
            console.error('スタンプ画像読み込み失敗:', this.currentStamp, err);
        };
        
        // 画像パスが正しいか確認
        console.log('画像読み込み開始:', this.currentStamp);
        img.src = this.currentStamp;
    }
}