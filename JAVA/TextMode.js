// TextMode.js - レイヤー構造対応版（テキスト移動問題と二重入力問題修正）
class TextMode {
    /**
     * TextModeコンストラクタ
     * @param {LayerManager} layerManager - レイヤーマネージャのインスタンス
     */
    constructor(layerManager) {
        console.log('TextMode: 初期化');

        this.layerManager = layerManager;
        this.canvas = layerManager.layers.text;
        this.ctx = layerManager.contexts.text;
        this.overlayCanvas = layerManager.layers.overlay;
        this.overlayCtx = layerManager.contexts.overlay;

        this.isActive = false;
        this.textColor = 'rgb(0,0,0)'; // デフォルト色: 黒
        this.textSize = 'medium';       // デフォルトサイズ: 中
        this.textPosition = { x: 0, y: 0 };

        // 選択・移動関連の変数
        this.selectedTextIndex = -1;
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.lastDrawnPosition = null;

        // 二重入力防止フラグ
        this.isConfirming = false;

        // テキスト入力要素の作成
        this.createTextInput();

        // イベントリスナーの設定
        this.setupEventListeners();

        console.log('TextMode: 初期化完了');
    }

    /**
     * テキスト入力用のDOM要素を作成
     */
    createTextInput() {
        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.className = 'text-input';
        this.textInput.style.position = 'absolute';
        this.textInput.style.display = 'none';
        this.textInput.style.zIndex = '1001';
        this.textInput.style.background = 'transparent';
        this.textInput.style.border = 'none';
        this.textInput.style.outline = 'none';
        this.textInput.style.fontFamily = 'sans-serif';

        // キャンバスコンテナに追加
        const drawArea = document.querySelector('.draw-area');
        if (drawArea) {
            drawArea.appendChild(this.textInput);
        } else {
            console.error('TextMode: draw-area要素が見つかりません');
            document.body.appendChild(this.textInput);
        }

        // Enter キーで確定
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // フォームの送信を防止
                this.confirmText();
            }
        });

        // フォーカスが外れたら確定
        this.textInput.addEventListener('blur', () => {
            // 既に確定中でなければ確定を実行
            // これにより二重確定を防止
            if (!this.isConfirming) {
                this.confirmText();
            }
        });

        console.log('TextMode: テキスト入力要素を作成');
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // マウスダウン - テキスト入力または選択
        this.overlayCanvas.addEventListener('mousedown', (e) => {
            if (!this.isActive) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // データモデルからテキスト要素を検索
            const clickedTextIndex = this.findTextAtPosition(x, y);

            if (clickedTextIndex >= 0) {
                console.log('TextMode: テキストを選択', clickedTextIndex);

                this.selectedTextIndex = clickedTextIndex;
                this.isDragging = true;
                this.dragStartPos = { x, y };

                // 選択されたテキスト要素
                const element = window.canvasDataModel.elements.text[clickedTextIndex];

                // 現在位置を記録
                this.lastDrawnPosition = {
                    x: element.x,
                    y: element.y,
                    width: this.getTextWidth(element),
                    height: element.size
                };

                return;
            }

            // 何も選択されていない場合は新規テキスト入力
            this.selectedTextIndex = -1;
            this.showTextInputAt(x, y);
        });

        // マウス移動 - テキスト移動
        this.overlayCanvas.addEventListener('mousemove', (e) => {
            if (!this.isActive || !this.isDragging || this.selectedTextIndex < 0) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;

            // テキストレイヤーを一度クリア
            this.layerManager.clearLayer('text');

            // 選択されたテキストを移動
            const textElements = window.canvasDataModel.elements.text;
            const textElement = textElements[this.selectedTextIndex];

            // 新しい位置を計算
            textElement.x += dx;
            textElement.y += dy;

            // データモデルを更新
            window.canvasDataModel.updateElement('text', textElement.id, {
                x: textElement.x,
                y: textElement.y
            });

            // すべてのテキストを再描画
            this.redrawAllTexts();

            // 開始位置を更新
            this.dragStartPos = { x, y };
        });

        // マウスアップ - ドラッグ終了
        this.overlayCanvas.addEventListener('mouseup', () => {
            if (!this.isActive || !this.isDragging || this.selectedTextIndex < 0) return;

            this.isDragging = false;
            this.lastDrawnPosition = null;

            // 完全なデータの再描画を実行して整合性を保つ
            this.layerManager.clearLayer('text');
            this.redrawAllTexts();

            this.selectedTextIndex = -1;

            console.log('TextMode: テキスト移動完了');
        });

        // タッチイベント - テキスト入力または選択
        this.overlayCanvas.addEventListener('touchstart', (e) => {
            if (!this.isActive) return;
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // データモデルからテキスト要素を検索
            const touchedTextIndex = this.findTextAtPosition(x, y);

            if (touchedTextIndex >= 0) {
                console.log('TextMode: テキストを選択（タッチ）', touchedTextIndex);

                this.selectedTextIndex = touchedTextIndex;
                this.isDragging = true;
                this.dragStartPos = { x, y };

                // 選択されたテキスト要素
                const element = window.canvasDataModel.elements.text[touchedTextIndex];

                // 現在位置を記録
                this.lastDrawnPosition = {
                    x: element.x,
                    y: element.y,
                    width: this.getTextWidth(element),
                    height: element.size
                };

                return;
            }

            // 何も選択されていない場合は新規テキスト入力
            this.selectedTextIndex = -1;
            this.showTextInputAt(x, y);
        }, { passive: false });

        // タッチ移動 - テキスト移動
        this.overlayCanvas.addEventListener('touchmove', (e) => {
            if (!this.isActive || !this.isDragging || this.selectedTextIndex < 0) return;
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;

            // テキストレイヤーを一度クリア
            this.layerManager.clearLayer('text');

            // 選択されたテキストを移動
            const textElements = window.canvasDataModel.elements.text;
            const textElement = textElements[this.selectedTextIndex];

            // 新しい位置を計算
            textElement.x += dx;
            textElement.y += dy;

            // データモデルを更新
            window.canvasDataModel.updateElement('text', textElement.id, {
                x: textElement.x,
                y: textElement.y
            });

            // すべてのテキストを再描画
            this.redrawAllTexts();

            // 開始位置を更新
            this.dragStartPos = { x, y };
        }, { passive: false });

        // タッチ終了 - ドラッグ終了
        this.overlayCanvas.addEventListener('touchend', () => {
            if (!this.isActive || !this.isDragging || this.selectedTextIndex < 0) return;

            this.isDragging = false;
            this.lastDrawnPosition = null;

            // 完全なデータの再描画を実行して整合性を保つ
            this.layerManager.clearLayer('text');
            this.redrawAllTexts();

            this.selectedTextIndex = -1;

            console.log('TextMode: テキスト移動完了（タッチ）');
        });
    }

    /**
     * テキストの幅を取得
     * @param {Object} textElement - テキスト要素
     * @returns {number} テキストの幅（ピクセル）
     */
    getTextWidth(textElement) {
        this.ctx.font = `${textElement.size}px sans-serif`;
        const metrics = this.ctx.measureText(textElement.text);
        return metrics.width;
    }

    /**
     * 指定位置にテキスト入力欄を表示
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    showTextInputAt(x, y) {
        this.textPosition = { x, y };

        // テキスト入力欄の位置とスタイルを設定
        this.textInput.style.left = `${x}px`;
        this.textInput.style.top = `${y - this.getTextSizeInPx()/2}px`;
        this.textInput.style.color = this.textColor;
        this.textInput.style.fontSize = `${this.getTextSizeInPx()}px`;
        this.textInput.style.caretColor = this.textColor;
        this.textInput.style.display = 'block';
        this.textInput.value = '';

        // 確定フラグをリセット
        this.isConfirming = false;

        // フォーカスを当てる
        setTimeout(() => this.textInput.focus(), 10);

        console.log(`TextMode: テキスト入力欄を表示 (${x}, ${y})`);
    }

    /**
     * テキストサイズをピクセル値に変換
     * @returns {number} ピクセル単位のサイズ
     */
    getTextSizeInPx() {
        switch(this.textSize) {
            case 'small': return 14;
            case 'large': return 28;
            default: return 20; // medium
        }
    }

    /**
     * テキスト入力を確定し、キャンバスに描画
     */
    confirmText() {
        // 二重確定防止 - すでに確定処理中なら何もしない
        if (this.isConfirming) {
            console.log('TextMode: 既に確定処理中のため無視');
            return;
        }

        // 確定処理中フラグを設定
        this.isConfirming = true;

        const text = this.textInput.value.trim();
        if (text !== '') {
            // テキスト要素を作成
            const textElement = {
                type: 'text',
                text: text,
                x: this.textPosition.x,
                y: this.textPosition.y,
                color: this.textColor,
                size: this.getTextSizeInPx(),
                timestamp: Date.now()
            };

            // データモデルに追加
            if (window.canvasDataModel) {
                window.canvasDataModel.addElement('text', textElement);

                // テキストレイヤーに描画
                this.drawText(textElement);

                console.log('TextMode: テキストを確定', { text });
            } else {
                console.warn('TextMode: canvasDataModelが見つかりません');
            }
        }

        // 入力欄を非表示にする
        this.textInput.style.display = 'none';

        // 確定処理終了後、次の処理のためにフラグをリセット
        // 少し遅延させて、blur→keydownのシーケンスでの二重実行を防止
        setTimeout(() => {
            this.isConfirming = false;
        }, 100);
    }

    /**
     * テキスト要素を描画
     * @param {Object} textElement - テキスト要素
     */
    drawText(textElement) {
        const { text, x, y, color, size } = textElement;

        this.ctx.font = `${size}px sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);

        console.log(`TextMode: テキストを描画 "${text}" (${x}, ${y})`);
    }

    /**
     * すべてのテキストを再描画
     * 描画前に二重描画チェックを追加
     */
    redrawAllTexts() {
        if (!window.canvasDataModel) return;

        const textElements = window.canvasDataModel.elements.text || [];

        // 高速化のためのチェック - 要素がない場合は何もしない
        if (textElements.length === 0) return;

        textElements.forEach(element => {
            this.drawText(element);
        });
    }

    /**
     * 指定位置にあるテキスト要素のインデックスを取得
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @returns {number} テキスト要素のインデックス、または -1（見つからない場合）
     */
    findTextAtPosition(x, y) {
        if (!window.canvasDataModel) return -1;

        const textElements = window.canvasDataModel.elements.text || [];

        // 後から追加されたテキストが優先されるよう、逆順に検索
        for (let i = textElements.length - 1; i >= 0; i--) {
            const textElement = textElements[i];

            // テキストの大きさによってヒットエリアを調整
            this.ctx.font = `${textElement.size}px sans-serif`;
            const metrics = this.ctx.measureText(textElement.text);
            const width = metrics.width;
            const height = textElement.size;

            // テキストの周囲に余裕を持たせる
            const padding = 5;

            // テキストの位置はベースラインが基準点なので、高さを調整
            if (x >= textElement.x - padding &&
                x <= textElement.x + width + padding &&
                y >= textElement.y - height - padding &&
                y <= textElement.y + padding) {
                return i;
            }
        }

        return -1;
    }

    /**
     * 保存されたテキストデータから再描画
     * @param {Object} textElement - テキスト要素
     */
    redrawText(textElement) {
        if (!textElement || !textElement.text) {
            console.warn('TextMode: 無効なテキストデータ', textElement);
            return;
        }

        this.drawText(textElement);
    }

    /**
     * モードをアクティブにする
     */
    activate() {
        console.log('TextMode: アクティブ化');
        this.isActive = true;

        // グローバル参照を設定（他クラスからのアクセス用）
        window.textMode = this;
    }

    /**
     * モードを非アクティブにする
     */
    deactivate() {
        console.log('TextMode: 非アクティブ化');
        this.isActive = false;
        this.selectedTextIndex = -1;
        this.isDragging = false;
        this.textInput.style.display = 'none';
    }

    /**
     * テキスト色を設定
     * @param {string} color - CSS色文字列
     */
    setTextColor(color) {
        this.textColor = color;
        console.log(`TextMode: 色を設定 ${color}`);
    }

    /**
     * テキストサイズを設定
     * @param {string} size - サイズ名 ('small', 'medium', 'large')
     */
    setTextSize(size) {
        this.textSize = size;
        console.log(`TextMode: サイズを設定 ${size}`);
    }

    /**
     * モード切替時にテキストを確定
     */
    commitText() {
        // テキスト入力中だった場合は確定
        if (this.textInput.style.display !== 'none') {
            this.confirmText();
        }

        console.log('TextMode: テキストを確定');
    }

    /**
     * テキストレイヤーをクリア
     */
    clearLayer() {
        if (this.layerManager) {
            this.layerManager.clearLayer('text');

            // データモデルからもクリア
            if (window.canvasDataModel) {
                window.canvasDataModel.clearElementsByType('text');
            }

            console.log('TextMode: レイヤーをクリア');
        }
    }
}

// グローバルスコープでコンストラクタを公開
window.TextMode = TextMode;
