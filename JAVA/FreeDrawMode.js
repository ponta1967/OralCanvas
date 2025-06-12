// FreeDrawMode.js - レイヤー構造対応版
class FreeDrawMode {
    /**
     * FreeDrawModeコンストラクタ
     * @param {LayerManager} layerManager - レイヤーマネージャのインスタンス
     */
    constructor(layerManager) {
        console.log('FreeDrawMode: 初期化');

        this.layerManager = layerManager;
        this.canvas = layerManager.layers.freedraw;
        this.ctx = layerManager.contexts.freedraw;
        this.overlayCanvas = layerManager.layers.overlay;
        this.overlayCtx = layerManager.contexts.overlay;

        this.isDrawing = false;
        this.isActive = false;
        this.color = 'rgb(0,0,0)'; // デフォルト色: 黒
        this.lineWidth = 2;        // デフォルト線幅: 2px

        // 現在のパスデータを保存
        this.currentPath = [];

        // イベントハンドラをバインド
        this.startDrawing = this.startDrawing.bind(this);
        this.draw = this.draw.bind(this);
        this.stopDrawing = this.stopDrawing.bind(this);

        // イベントリスナーは全体のキャンバスではなく、overlayレイヤーに設定
        this.overlayCanvas.addEventListener('mousedown', this.startDrawing);
        this.overlayCanvas.addEventListener('mousemove', this.draw);
        this.overlayCanvas.addEventListener('mouseup', this.stopDrawing);
        this.overlayCanvas.addEventListener('mouseout', this.stopDrawing);

        // タッチイベント
        this.overlayCanvas.addEventListener('touchstart', this.startDrawing, { passive: false });
        this.overlayCanvas.addEventListener('touchmove', this.draw, { passive: false });
        this.overlayCanvas.addEventListener('touchend', this.stopDrawing);

        console.log('FreeDrawMode: 初期化完了');
    }

    /**
     * フリードローモードをアクティブにする
     */
    activate() {
        console.log('FreeDrawMode: アクティブ化');
        this.isActive = true;

        // グローバル参照を設定（他クラスからのアクセス用）
        window.freeDrawMode = this;
    }

    /**
     * フリードローモードを非アクティブにする
     */
    deactivate() {
        console.log('FreeDrawMode: 非アクティブ化');
        this.isActive = false;
        this.currentPath = [];

        // 描画中に非アクティブになった場合は描画を終了
        if (this.isDrawing) {
            this.stopDrawing();
        }
    }

    /**
     * 描画色を設定
     * @param {string} color - CSS色文字列（例: 'rgb(0,0,0)'）
     */
    setColor(color) {
        this.color = color;
        console.log(`FreeDrawMode: 色を設定 ${color}`);
    }

    /**
     * 線幅を設定
     * @param {number} width - 線幅（ピクセル）
     */
    setLineWidth(width) {
        this.lineWidth = width;
        console.log(`FreeDrawMode: 線幅を設定 ${width}px`);
    }

    /**
     * 描画開始処理
     * @param {Event} e - マウスまたはタッチイベント
     */
    startDrawing(e) {
        if (!this.isActive) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        this.isDrawing = true;

        // 新しいパスの開始点を記録
        this.currentPath = [{
            x, y,
            type: 'moveTo'
        }];

        // フリードローレイヤーに描画開始
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = this.color;

        console.log(`FreeDrawMode: 描画開始 (${x}, ${y})`);
    }

    /**
     * 描画処理
     * @param {Event} e - マウスまたはタッチイベント
     */
    draw(e) {
        if (!this.isActive || !this.isDrawing) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        // パスに点を追加
        this.currentPath.push({
            x, y,
            type: 'lineTo'
        });

        // フリードローレイヤーに線を描画
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        // 連続的に描画するため、beginPathはここでは呼ばない
    }

    /**
     * 描画終了処理
     */
    stopDrawing() {
        if (!this.isActive || !this.isDrawing) return;

        this.isDrawing = false;
        this.ctx.beginPath(); // 現在のパスを終了

        // パスが有効（2点以上ある）なら保存
        if (this.currentPath.length > 1) {
            const pathData = {
                path: this.currentPath,
                color: this.color,
                lineWidth: this.lineWidth,
                timestamp: Date.now()
            };

            // データモデルに追加
            if (window.canvasDataModel) {
                window.canvasDataModel.addElement('freedraw', pathData);
                console.log('FreeDrawMode: パスデータをデータモデルに保存');
            } else {
                console.warn('FreeDrawMode: canvasDataModelが見つかりません');
            }
        }

        // 現在のパスをクリア
        this.currentPath = [];
    }

    /**
     * 保存されたパスデータから再描画
     * @param {Object} pathData - パスデータ
     */
    redrawPath(pathData) {
        if (!pathData || !pathData.path || pathData.path.length < 2) {
            console.warn('FreeDrawMode: 無効なパスデータ', pathData);
            return;
        }

        const { path, color, lineWidth } = pathData;

        // コンテキストの設定
        this.ctx.beginPath();
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = color;

        // パスを描画
        path.forEach((point, index) => {
            if (point.type === 'moveTo' || index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });

        this.ctx.stroke();
        this.ctx.beginPath();
    }

    /**
     * フリードローレイヤーをクリア
     */
    clearLayer() {
        if (this.layerManager) {
            this.layerManager.clearLayer('freedraw');

            // データモデルからもクリア
            if (window.canvasDataModel) {
                window.canvasDataModel.clearElementsByType('freedraw');
            }

            console.log('FreeDrawMode: レイヤーをクリア');
        }
    }
}

// グローバルスコープでコンストラクタを公開
window.FreeDrawMode = FreeDrawMode;
