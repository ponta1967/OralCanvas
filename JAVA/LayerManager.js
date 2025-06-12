// LayerManager.js - OralCanvasのレイヤー構造を管理するクラス

class LayerManager {
    /**
     * LayerManagerコンストラクタ
     * 複数のキャンバスレイヤーを管理し、レイヤー間の連携を行う
     */
    constructor() {
        console.log('LayerManager: 初期化');

        // レイヤー要素の参照を取得
        this.layers = {
            background: document.getElementById('background-layer'),
            freedraw: document.getElementById('freedraw-layer'),
            stamp: document.getElementById('stamp-layer'),
            text: document.getElementById('text-layer'),
            overlay: document.getElementById('overlay-layer')
        };

        // レイヤーが存在しない場合はエラー
        if (!this.layers.background || !this.layers.freedraw ||
            !this.layers.stamp || !this.layers.text || !this.layers.overlay) {
            console.error('LayerManager: レイヤー要素の取得に失敗しました');
            return;
        }

        // 各レイヤーのコンテキストを取得
        this.contexts = {
            background: this.layers.background.getContext('2d'),
            freedraw: this.layers.freedraw.getContext('2d'),
            stamp: this.layers.stamp.getContext('2d'),
            text: this.layers.text.getContext('2d'),
            overlay: this.layers.overlay.getContext('2d')
        };

        // レイヤーの表示/非表示状態を管理
        this.visibility = {
            background: true,
            freedraw: true,
            stamp: true,
            text: true,
            overlay: true
        };

        // 初期サイズの設定
        this.initLayerSizes();

        // ウィンドウリサイズ時のイベントリスナー
        window.addEventListener('resize', this.handleResize.bind(this));

        console.log('LayerManager: 初期化完了');
    }

    /**
     * 全レイヤーの初期サイズを設定
     */
    initLayerSizes() {
        const drawArea = document.querySelector('.draw-area');
        if (!drawArea) {
            console.error('LayerManager: draw-area要素が見つかりません');
            return;
        }

        const width = drawArea.offsetWidth || 800;
        const height = drawArea.offsetHeight || 600;

        this.resizeAllLayers(width, height);
        console.log(`LayerManager: レイヤーサイズを初期化 (${width}x${height})`);
    }

    /**
     * ウィンドウリサイズ時の処理
     */
    handleResize() {
        const drawArea = document.querySelector('.draw-area');
        if (drawArea) {
            this.resizeAllLayers(drawArea.offsetWidth, drawArea.offsetHeight);
        }
    }

    /**
     * 全レイヤーのサイズを設定
     * @param {number} width - 設定する幅
     * @param {number} height - 設定する高さ
     */
    resizeAllLayers(width, height) {
        console.log(`LayerManager: 全レイヤーをリサイズ (${width}x${height})`);

        // 各レイヤーのサイズを設定
        Object.values(this.layers).forEach(layer => {
            if (layer) {
                layer.width = width;
                layer.height = height;
            }
        });

        // 背景を再描画（BackgroundManagerを使用）
        if (window.backgroundManager) {
            window.backgroundManager.resizeBackground();
        }

        // 各レイヤーのコンテンツを再描画
        this.redrawAllLayers();
    }

    /**
     * 特定のレイヤーをクリア
     * @param {string} layerName - クリアするレイヤー名
     */
    clearLayer(layerName) {
        if (!this.contexts[layerName]) {
            console.error(`LayerManager: レイヤー "${layerName}" が見つかりません`);
            return;
        }

        const ctx = this.contexts[layerName];
        const layer = this.layers[layerName];
        ctx.clearRect(0, 0, layer.width, layer.height);
        console.log(`LayerManager: レイヤー "${layerName}" をクリア`);
    }

    /**
     * 全レイヤーをクリア（背景レイヤーを除く）
     */
    clearAllLayers() {
        console.log('LayerManager: 全レイヤーをクリア');

        // 背景以外のレイヤーをクリア
        Object.entries(this.contexts).forEach(([name, ctx]) => {
            if (name !== 'background') {
                const layer = this.layers[name];
                ctx.clearRect(0, 0, layer.width, layer.height);
            }
        });
    }

    /**
     * 全レイヤーを再描画
     */
    redrawAllLayers() {
        console.log('LayerManager: 全レイヤーを再描画');

        // データモデルがあればそれを使用して再描画
        if (window.canvasDataModel) {
            this.redrawFromDataModel();
        } else {
            console.warn('LayerManager: canvasDataModelが見つかりません');
        }
    }

    /**
     * データモデルから全レイヤーを再描画
     */
    redrawFromDataModel() {
        if (!window.canvasDataModel) return;

        // 背景の再描画
        this.redrawBackgroundLayer();

        // 各レイヤーのクリアと再描画
        this.clearLayer('freedraw');
        this.clearLayer('stamp');
        this.clearLayer('text');

        // フリードローの再描画
        this.redrawFreeDrawLayer();

        // スタンプの再描画
        this.redrawStampLayer();

        // テキストの再描画
        this.redrawTextLayer();
    }

    /**
     * 背景レイヤーを再描画
     */
    redrawBackgroundLayer() {
        if (!window.backgroundManager || !window.canvasDataModel) return;

        const background = window.canvasDataModel.background;
        if (background && background.src) {
            window.backgroundManager.setBackground(background.src, background.options);
        } else {
            // デフォルト背景の読み込み
            window.backgroundManager.loadDefaultBackground();
        }
    }

    /**
     * フリードローレイヤーを再描画
     */
    redrawFreeDrawLayer() {
        if (!window.canvasDataModel) return;

        const freedrawElements = window.canvasDataModel.elements.freedraw || [];
        const ctx = this.contexts.freedraw;

        freedrawElements.forEach(element => {
            // FreeDrawModeのredrawPathメソッドがあれば使用
            if (window.freeDrawMode && typeof window.freeDrawMode.redrawPath === 'function') {
                window.freeDrawMode.redrawPath(element);
            } else {
                // 直接描画（フォールバック）
                this.drawPath(ctx, element);
            }
        });
    }

    /**
     * パスデータから直接描画（フォールバック用）
     * @param {CanvasRenderingContext2D} ctx - 描画コンテキスト
     * @param {Object} pathData - パスデータ
     */
    drawPath(ctx, pathData) {
        const { path, color, lineWidth } = pathData;

        if (!path || path.length < 2) return;

        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;

        path.forEach((point, index) => {
            if (point.type === 'moveTo' || index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });

        ctx.stroke();
        ctx.beginPath();
    }

    /**
     * スタンプレイヤーを再描画
     */
    redrawStampLayer() {
        if (!window.canvasDataModel) return;

        const stampElements = window.canvasDataModel.elements.stamp || [];
        const ctx = this.contexts.stamp;

        stampElements.forEach(element => {
            // StampModeのredrawStampメソッドがあれば使用
            if (window.stampMode && typeof window.stampMode.redrawStamp === 'function') {
                window.stampMode.redrawStamp(element);
            } else {
                // 直接描画（フォールバック）
                this.drawStamp(ctx, element);
            }
        });
    }

    /**
     * スタンプデータから直接描画（フォールバック用）
     * @param {CanvasRenderingContext2D} ctx - 描画コンテキスト
     * @param {Object} stampData - スタンプデータ
     */
    drawStamp(ctx, stampData) {
        const { src, x, y, width, height } = stampData;

        if (!src) return;

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, x - width/2, y - height/2, width, height);
        };
        img.src = src;
    }

    /**
     * テキストレイヤーを再描画
     */
    redrawTextLayer() {
        if (!window.canvasDataModel) return;

        const textElements = window.canvasDataModel.elements.text || [];
        const ctx = this.contexts.text;

        textElements.forEach(element => {
            // TextModeのredrawTextメソッドがあれば使用
            if (window.textMode && typeof window.textMode.redrawText === 'function') {
                window.textMode.redrawText(element);
            } else {
                // 直接描画（フォールバック）
                this.drawText(ctx, element);
            }
        });
    }

    /**
     * テキストデータから直接描画（フォールバック用）
     * @param {CanvasRenderingContext2D} ctx - 描画コンテキスト
     * @param {Object} textData - テキストデータ
     */
    drawText(ctx, textData) {
        const { text, x, y, color, size } = textData;

        if (!text) return;

        ctx.font = `${size}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    /**
     * レイヤーの合成（FileMaker連携用）
     * @returns {string} 合成画像のDataURL
     */
    mergeLayersToDataURL() {
        console.log('LayerManager: レイヤーを合成してDataURLを生成');

        // 合成用の一時キャンバス
        const mergeCanvas = document.createElement('canvas');
        mergeCanvas.width = this.layers.background.width;
        mergeCanvas.height = this.layers.background.height;
        const mergeCtx = mergeCanvas.getContext('2d');

        // 表示されているレイヤーのみを合成（overlayは除外）
        Object.entries(this.layers).forEach(([name, layer]) => {
            if (this.visibility[name] && name !== 'overlay') {
                mergeCtx.drawImage(layer, 0, 0);
            }
        });

        // PNG形式でDataURLを返す
        return mergeCanvas.toDataURL('image/png');
    }

    /**
     * レイヤーの表示/非表示を切り替え
     * @param {string} layerName - レイヤー名
     * @param {boolean} isVisible - 表示するかどうか
     */
    setLayerVisibility(layerName, isVisible) {
        if (this.visibility.hasOwnProperty(layerName)) {
            this.visibility[layerName] = isVisible;
            console.log(`LayerManager: レイヤー "${layerName}" の表示状態を ${isVisible ? '表示' : '非表示'} に設定`);
        } else {
            console.error(`LayerManager: レイヤー "${layerName}" が見つかりません`);
        }
    }

    /**
     * 全レイヤーの表示状態を取得
     * @returns {Object} レイヤー名をキーとした表示状態のオブジェクト
     */
    getLayerVisibility() {
        return { ...this.visibility };
    }
}

// グローバルスコープでLayerManagerを利用可能にする
window.LayerManager = LayerManager;
