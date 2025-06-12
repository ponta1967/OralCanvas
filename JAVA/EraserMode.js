// EraserMode.js - レイヤー構造対応版（スタンプ消去機能強化）
class EraserMode {
    /**
     * EraserModeコンストラクタ
     * @param {LayerManager} layerManager - レイヤーマネージャのインスタンス
     */
    constructor(layerManager) {
        console.log('EraserMode: 初期化');

        this.layerManager = layerManager;
        this.overlayCanvas = layerManager.layers.overlay;
        this.overlayCtx = layerManager.contexts.overlay;

        // 消去対象のレイヤーコンテキスト（初期値：フリードロー）
        this.targetLayer = 'freedraw';

        this.isActive = false;
        this.isErasing = false;
        this.eraserSize = 30;
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorCircle = null;

        // 消去モード
        // - 'active': 現在選択中のレイヤーのみ消去
        // - 'all': すべてのレイヤーを消去
        this.eraseMode = 'active';

        // イベントハンドラをバインド
        this.startErasing = this.startErasing.bind(this);
        this.erase = this.erase.bind(this);
        this.stopErasing = this.stopErasing.bind(this);
        this.updateCursorPosition = this.updateCursorPosition.bind(this);

        // イベントリスナーはオーバーレイレイヤーに設定
        this.attachEventListeners();

        console.log('EraserMode: 初期化完了');
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    attachEventListeners() {
        try {
            if (!this.overlayCanvas) {
                console.error('EraserMode: overlayCanvasが見つかりません');
                return;
            }

            this.overlayCanvas.addEventListener('mousedown', this.startErasing);
            this.overlayCanvas.addEventListener('mousemove', this.updateCursorPosition);
            this.overlayCanvas.addEventListener('mouseup', this.stopErasing);
            this.overlayCanvas.addEventListener('mouseout', this.stopErasing);

            this.overlayCanvas.addEventListener('touchstart', this.startErasing, { passive: false });
            this.overlayCanvas.addEventListener('touchmove', this.updateCursorPosition, { passive: false });
            this.overlayCanvas.addEventListener('touchend', this.stopErasing);
            
            console.log('EraserMode: イベントリスナーを設定完了');
        } catch (error) {
            console.error('EraserMode: イベントリスナー設定エラー:', error);
        }
    }

    /**
     * 消しゴムモードをアクティブにする
     * @param {string} targetLayer - 消去対象のレイヤー名（省略時は現在のまま）
     * @param {string} mode - 消去モード ('active' または 'all')
     */
    activate(targetLayer = null, mode = 'active') {
        console.log(`EraserMode: アクティブ化 (対象: ${targetLayer || this.targetLayer}, モード: ${mode})`);

        this.isActive = true;

        // 消去対象のレイヤーを設定（指定があれば）
        if (targetLayer && this.layerManager.layers[targetLayer]) {
            this.targetLayer = targetLayer;
        }

        // 消去モードを設定
        this.eraseMode = mode;

        // カーソルを消しゴム表示に変更
        this.overlayCanvas.style.cursor = 'none';
        this.createEraserCursor();

        // グローバル参照を設定（他クラスからのアクセス用）
        window.eraserMode = this;
    }

    /**
     * 消しゴムモードを非アクティブにする
     */
    deactivate() {
        console.log('EraserMode: 非アクティブ化');

        this.isActive = false;
        this.overlayCanvas.style.cursor = 'default';
        this.removeEraserCursor();

        // 消去中だった場合は終了
        if (this.isErasing) {
            this.stopErasing();
        }
    }

    /**
     * 消しゴムカーソルを作成
     */
    createEraserCursor() {
        try {
            // cursorContainerの存在確認
            if (!this.cursorContainer) {
                console.error('EraserMode: cursorContainerが見つかりません');
                this.cursorContainer = document.createElement('div');
                this.cursorContainer.id = 'cursorContainer';
                this.cursorContainer.style.position = 'absolute';
                this.cursorContainer.style.top = '0';
                this.cursorContainer.style.left = '0';
                this.cursorContainer.style.width = '100%';
                this.cursorContainer.style.height = '100%';
                this.cursorContainer.style.pointerEvents = 'none';
                this.cursorContainer.style.zIndex = '1000';
                
                // draw-areaに追加
                const drawArea = document.querySelector('.draw-area');
                if (drawArea) {
                    drawArea.appendChild(this.cursorContainer);
                    console.log('EraserMode: cursorContainerを作成して追加しました');
                } else {
                    console.error('EraserMode: draw-area要素が見つかりません');
                    return;
                }
            }
            
            // 既存のカーソルがあれば削除
            if (this.cursorCircle) {
                this.cursorContainer.removeChild(this.cursorCircle);
            }

            // カーソル要素を作成
            this.cursorCircle = document.createElement('div');
            this.cursorCircle.style.position = 'absolute';
            this.cursorCircle.style.width = `${this.eraserSize}px`;
            this.cursorCircle.style.height = `${this.eraserSize}px`;
            this.cursorCircle.style.borderRadius = '50%';
            this.cursorCircle.style.border = '2px solid black';
            this.cursorCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            this.cursorCircle.style.pointerEvents = 'none';
            this.cursorCircle.style.zIndex = '1001';
            this.cursorCircle.style.transform = 'translate(-50%, -50%)';

            // 消去モードによってカーソル色を変更
            if (this.eraseMode === 'all') {
                this.cursorCircle.style.border = '2px solid red';
                this.cursorCircle.style.backgroundColor = 'rgba(255, 200, 200, 0.5)';
            }

            // カーソルコンテナに追加
            this.cursorContainer.appendChild(this.cursorCircle);

            console.log('EraserMode: 消しゴムカーソルを作成');
        } catch (error) {
            console.error('EraserMode: createEraserCursor エラー:', error);
        }
    }

    /**
     * 消しゴムカーソルを削除
     */
    removeEraserCursor() {
        try {
            if (this.cursorCircle && this.cursorContainer) {
                this.cursorContainer.removeChild(this.cursorCircle);
                this.cursorCircle = null;
            }
        } catch (error) {
            console.error('EraserMode: removeEraserCursor エラー:', error);
            this.cursorCircle = null;
        }
    }

    /**
     * カーソル位置を更新
     * @param {Event} e - マウスまたはタッチイベント
     */
    updateCursorPosition(e) {
        try {
            if (!this.isActive || !this.cursorCircle) return;
            e.preventDefault();

            const rect = this.overlayCanvas.getBoundingClientRect();
            let x, y;

            // タッチまたはマウス位置を取得
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }

            // カーソル位置を更新（中心揃え）
            this.cursorCircle.style.left = `${x}px`;
            this.cursorCircle.style.top = `${y}px`;

            // 消去中なら消去処理を実行
            if (this.isErasing) {
                this.erase(x, y);
            }
        } catch (error) {
            console.error('EraserMode: updateCursorPosition エラー:', error);
        }
    }

    /**
     * 消去開始処理
     * @param {Event} e - マウスまたはタッチイベント
     */
    startErasing(e) {
        try {
            if (!this.isActive) return;
            e.preventDefault();

            this.isErasing = true;

            const rect = this.overlayCanvas.getBoundingClientRect();
            let x, y;

            // タッチまたはマウス位置を取得
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }

            // 消去処理を実行
            this.erase(x, y);

            console.log(`EraserMode: 消去開始 (${x}, ${y})`);
        } catch (error) {
            console.error('EraserMode: startErasing エラー:', error);
        }
    }

    /**
     * 消去処理
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    erase(x, y) {
        try {
            // 消去モードに応じて処理を分岐
            if (this.eraseMode === 'all') {
                this.eraseAllLayers(x, y);
            } else {
                this.eraseActiveLayer(x, y);
            }

            // スタンプモードの選択状態をクリア（消去位置にスタンプがあれば）
            this.clearStampSelectionIfNeeded(x, y);
        } catch (error) {
            console.error('EraserMode: erase エラー:', error);
        }
    }

    /**
     * アクティブなレイヤーのみ消去
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    eraseActiveLayer(x, y) {
        try {
            // 対象レイヤーのコンテキストを取得
            const ctx = this.layerManager.contexts[this.targetLayer];

            if (!ctx) {
                console.error(`EraserMode: レイヤー "${this.targetLayer}" が見つかりません`);
                return;
            }

            // destination-out 合成モードで円形に消去
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, this.eraserSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';

            // 消去位置にあるデータモデルの要素を探して削除
            this.removeElementsAtPosition(this.targetLayer, x, y);
        } catch (error) {
            console.error('EraserMode: eraseActiveLayer エラー:', error);
        }
    }

    /**
     * すべてのレイヤーを消去
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    eraseAllLayers(x, y) {
        try {
            // 背景以外のすべてのレイヤーを消去
            const targetLayers = ['freedraw', 'stamp', 'text'];

            targetLayers.forEach(layerName => {
                const ctx = this.layerManager.contexts[layerName];

                if (ctx) {
                    // destination-out 合成モードで円形に消去
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath();
                    ctx.arc(x, y, this.eraserSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';

                    // 消去位置にあるデータモデルの要素を探して削除
                    this.removeElementsAtPosition(layerName, x, y);
                }
            });
        } catch (error) {
            console.error('EraserMode: eraseAllLayers エラー:', error);
        }
    }

    /**
     * 指定位置にある要素をデータモデルから削除
     * @param {string} layerType - レイヤータイプ ('freedraw', 'stamp', 'text')
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    removeElementsAtPosition(layerType, x, y) {
        try {
            if (!window.canvasDataModel) return;

            const elements = window.canvasDataModel.elements[layerType] || [];
            const radius = this.eraserSize / 2;

            // 削除する要素のIDを収集
            const elementsToRemove = [];

            if (layerType === 'freedraw') {
                // フリードローの場合はパス内の点が円内にあるかチェック
                elements.forEach(element => {
                    if (element.path) {
                        // パス内のいずれかの点が消しゴム範囲内にあるかチェック
                        const inRange = element.path.some(point => {
                            const dx = point.x - x;
                            const dy = point.y - y;
                            return (dx * dx + dy * dy) <= (radius * radius);
                        });

                        if (inRange) {
                            elementsToRemove.push(element.id);
                        }
                    }
                });
            } else if (layerType === 'stamp') {
                // スタンプの場合は中心点が円内にあるか、または円が範囲と重なるかチェック
                elements.forEach(element => {
                    // スタンプの範囲を計算
                    const halfWidth = element.width / 2;
                    const halfHeight = (element.height || element.width) / 2;
                    
                    // スタンプの矩形
                    const stampLeft = element.x - halfWidth;
                    const stampTop = element.y - halfHeight;
                    const stampRight = element.x + halfWidth;
                    const stampBottom = element.y + halfHeight;
                    
                    // 消しゴムの円と矩形の衝突判定
                    // 円の中心から矩形への最短距離を計算
                    const closestX = Math.max(stampLeft, Math.min(x, stampRight));
                    const closestY = Math.max(stampTop, Math.min(y, stampBottom));
                    
                    const dx = closestX - x;
                    const dy = closestY - y;
                    
                    if ((dx * dx + dy * dy) <= (radius * radius)) {
                        elementsToRemove.push(element.id);
                    }
                });
            } else if (layerType === 'text') {
                // テキストの場合はテキスト範囲と円が重なるかチェック
                elements.forEach(element => {
                    // テキストの大きさを取得
                    const ctx = this.layerManager.contexts.text;
                    ctx.font = `${element.size}px sans-serif`;
                    const metrics = ctx.measureText(element.text);
                    const textWidth = metrics.width;
                    const textHeight = element.size;

                    // テキストの位置（ベースライン基準）から矩形を計算
                    const textLeft = element.x;
                    const textTop = element.y - textHeight;
                    const textRight = element.x + textWidth;
                    const textBottom = element.y;

                    // 円と矩形の衝突判定（単純化）
                    // 円の中心から矩形への最短距離を計算
                    const closestX = Math.max(textLeft, Math.min(x, textRight));
                    const closestY = Math.max(textTop, Math.min(y, textBottom));

                    const dx = closestX - x;
                    const dy = closestY - y;

                    if ((dx * dx + dy * dy) <= (radius * radius)) {
                        elementsToRemove.push(element.id);
                    }
                });
            }

            // 収集したIDの要素を削除
            elementsToRemove.forEach(id => {
                window.canvasDataModel.removeElement(layerType, id);
            });

            if (elementsToRemove.length > 0) {
                console.log(`EraserMode: ${layerType} から ${elementsToRemove.length} 個の要素を削除`);
            }
        } catch (error) {
            console.error('EraserMode: removeElementsAtPosition エラー:', error);
        }
    }

    /**
     * スタンプモードの選択状態をクリア（必要な場合）
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    clearStampSelectionIfNeeded(x, y) {
        try {
            // スタンプモードが存在し、かつ選択状態があるか確認
            if (!window.stampMode || !window.stampMode.selectedStamp) return;
            
            const stamp = window.stampMode.selectedStamp;
            const radius = this.eraserSize / 2;
            
            // スタンプの範囲を計算
            const halfWidth = stamp.width / 2;
            const halfHeight = (stamp.height || stamp.width) / 2;
            
            // スタンプの矩形
            const stampLeft = stamp.x - halfWidth;
            const stampTop = stamp.y - halfHeight;
            const stampRight = stamp.x + halfWidth;
            const stampBottom = stamp.y + halfHeight;
            
            // 消しゴムの円と矩形の衝突判定
            const closestX = Math.max(stampLeft, Math.min(x, stampRight));
            const closestY = Math.max(stampTop, Math.min(y, stampBottom));
            
            const dx = closestX - x;
            const dy = closestY - y;
            
            // 選択中のスタンプが消去範囲内にある場合、選択状態をクリア
            if ((dx * dx + dy * dy) <= (radius * radius)) {
                window.stampMode.clearSelection();
            }
        } catch (error) {
            console.error('EraserMode: clearStampSelectionIfNeeded エラー:', error);
        }
    }

    /**
     * 消去終了処理
     */
    stopErasing() {
        try {
            this.isErasing = false;

            // データモデルの変更を保存
            if (window.canvasDataModel) {
                window.canvasDataModel.saveToLocalStorage();
            }
        } catch (error) {
            console.error('EraserMode: stopErasing エラー:', error);
        }
    }

    /**
     * 消去対象のレイヤーを設定
     * @param {string} layerName - レイヤー名
     */
    setTargetLayer(layerName) {
        try {
            if (this.layerManager.layers[layerName]) {
                this.targetLayer = layerName;
                console.log(`EraserMode: 対象レイヤーを "${layerName}" に設定`);
            } else {
                console.error(`EraserMode: レイヤー "${layerName}" が見つかりません`);
            }
        } catch (error) {
            console.error('EraserMode: setTargetLayer エラー:', error);
        }
    }

    /**
     * 消去モードを設定
     * @param {string} mode - 消去モード ('active' または 'all')
     */
    setEraseMode(mode) {
        try {
            if (mode === 'active' || mode === 'all') {
                this.eraseMode = mode;

                // カーソル表示を更新
                if (this.isActive) {
                    this.createEraserCursor();
                }

                console.log(`EraserMode: 消去モードを "${mode}" に設定`);
            } else {
                console.error(`EraserMode: 不明な消去モード "${mode}"`);
            }
        } catch (error) {
            console.error('EraserMode: setEraseMode エラー:', error);
        }
    }

    /**
     * 消しゴムサイズを設定
     * @param {number} size - 消しゴムサイズ（ピクセル）
     */
    setEraserSize(size) {
        try {
            this.eraserSize = size;

            // カーソル表示を更新
            if (this.isActive && this.cursorCircle) {
                this.cursorCircle.style.width = `${size}px`;
                this.cursorCircle.style.height = `${size}px`;
            }

            console.log(`EraserMode: 消しゴムサイズを ${size}px に設定`);
        } catch (error) {
            console.error('EraserMode: setEraserSize エラー:', error);
        }
    }
}

// グローバルスコープでコンストラクタを公開
window.EraserMode = EraserMode;