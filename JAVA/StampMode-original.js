/**
 * スタンプモード管理クラス
 * アイコンスタンプの配置や操作を管理します
 */
class StampMode {
    constructor() {
        this.isActive = false;
        this.currentStamp = null;
        this.currentStampType = null;
        this.canvasLayer = document.getElementById('stamp-layer');
        this.context = this.canvasLayer ? this.canvasLayer.getContext('2d') : null;
        this.cursorContainer = document.getElementById('stamp-cursor-container');
        this.cursorImage = null;
        this.canvasDataModel = window.canvasDataModel || null;
        this.disableDeactivation = false;
        this.lastPlacedStampTime = 0;
        this.placedStamps = [];
        this.selectedStamp = null;
        
        this._initCursorContainer();
        this._setupEventHandlers();
        
        console.log('StampMode: 初期化完了');
        
        // グローバル変数に自身を保存（デバッグおよび他のクラスからのアクセス用）
        window.stampMode = this;
    }

    /**
     * カーソルコンテナを初期化
     */
    _initCursorContainer() {
        if (!this.cursorContainer) {
            console.log('StampMode: カーソルコンテナを初期化');
            this.cursorContainer = document.createElement('div');
            this.cursorContainer.id = 'stamp-cursor-container';
            this.cursorContainer.style.position = 'absolute';
            this.cursorContainer.style.pointerEvents = 'none';
            this.cursorContainer.style.zIndex = '1000';
            this.cursorContainer.style.display = 'none';
            document.body.appendChild(this.cursorContainer);
        } else {
            console.log('StampMode: 既存のカーソルコンテナを使用');
        }
    }

    /**
     * イベントハンドラを設定
     */
    _setupEventHandlers() {
        console.log('StampMode: イベントハンドラを設定');
        
        // drawAreaの参照を取得（IDではなくクラスで検索）
        const drawArea = document.querySelector('.draw-area');
        if (!drawArea) {
            console.error('StampMode: .draw-area要素が見つかりません');
            return;
        }
        
        // マウス移動イベントでカーソルを更新
        drawArea.addEventListener('mousemove', this._updateCursorPosition.bind(this));
        
        // マウスがエリアから出た時にカーソルを非表示
        drawArea.addEventListener('mouseleave', () => {
            if (this.cursorContainer) {
                this.cursorContainer.style.display = 'none';
            }
        });
        
        // マウスがエリアに入った時にカーソルを表示
        drawArea.addEventListener('mouseenter', () => {
            if (this.isActive && this.cursorContainer) {
                this.cursorContainer.style.display = 'block';
            }
        });
        
        // スタンプ配置のためのクリックイベント
        drawArea.addEventListener('click', this._placeStampHandler.bind(this));
        
        // タッチデバイス対応: タッチイベントを追加
        drawArea.addEventListener('touchstart', (e) => {
            // デフォルトの動作（スクロールなど）を防止
            e.preventDefault();
            
            if (!this.isActive || !this.currentStamp) return;
            
            // 連続タッチ防止（50ms以内の連続タッチは無視）
            const now = Date.now();
            if (now - this.lastPlacedStampTime < 50) return;
            this.lastPlacedStampTime = now;
            
            // 最初のタッチポイントの座標を取得
            const touch = e.touches[0];
            const rect = drawArea.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // イベント情報をログ出力
            console.log('[event] イベント: スタンプ配置', {
                x: x,
                y: y,
                windowSize: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                extra: {
                    x: x,
                    y: y,
                    stampType: this.currentStampType,
                    stampSrc: this.currentStamp,
                    canvasSize: {
                        width: this.canvasLayer ? this.canvasLayer.width : null,
                        height: this.canvasLayer ? this.canvasLayer.height : null
                    }
                }
            });
            
            // スタンプを配置
            this._placeStampAtPosition(x, y);
        }, { passive: false });
        
        // オーバーレイレイヤーのクリックイベント（重要な修正）
        const overlayLayer = document.getElementById('overlay-layer');
        if (overlayLayer) {
            overlayLayer.addEventListener('click', this._placeStampHandler.bind(this));
            
            // オーバーレイレイヤーにもタッチイベントを追加
            overlayLayer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                
                if (!this.isActive || !this.currentStamp) return;
                
                // 連続タッチ防止
                const now = Date.now();
                if (now - this.lastPlacedStampTime < 50) return;
                this.lastPlacedStampTime = now;
                
                const touch = e.touches[0];
                const rect = overlayLayer.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // イベント情報をログ出力
                console.log('[event] イベント: スタンプ配置', {
                    x: x,
                    y: y,
                    windowSize: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    extra: {
                        x: x,
                        y: y,
                        stampType: this.currentStampType,
                        stampSrc: this.currentStamp,
                        canvasSize: {
                            width: this.canvasLayer ? this.canvasLayer.width : null,
                            height: this.canvasLayer ? this.canvasLayer.height : null
                        }
                    }
                });
                
                this._placeStampAtPosition(x, y);
            }, { passive: false });
        }
        
        console.log('StampMode: すべてのイベントハンドラを設定完了');
    }

    /**
     * カーソル位置を更新
     */
    _updateCursorPosition(e) {
        if (!this.isActive || !this.cursorContainer || !this.cursorImage) return;
        
        // 環境に応じた座標変換を適用
        const coords = this._transformCoordinates(e.clientX, e.clientY);
        
        // カーソル画像のサイズを考慮して中央に配置
        const imageWidth = this.cursorImage.width || 30;
        const imageHeight = this.cursorImage.height || 30;
        
        this.cursorContainer.style.left = (e.clientX - imageWidth / 2) + 'px';
        this.cursorContainer.style.top = (e.clientY - imageHeight / 2) + 'px';
        this.cursorContainer.style.display = 'block';
    }

    /**
     * 座標変換を行う（環境差異を吸収）
     */
    _transformCoordinates(clientX, clientY) {
        const drawArea = document.querySelector('.draw-area');
        if (!drawArea) return { x: clientX, y: clientY };
        
        // 環境検出（FileMaker Webビューア対応）
        const isFileMaker = window.FileMaker !== undefined;
        const isFMWEBV = navigator.userAgent.indexOf('FMWEBV') !== -1;
        const needsCoordinateCorrection = isFileMaker || isFMWEBV;
        
        const rect = drawArea.getBoundingClientRect();
        
        // 環境に応じた座標変換
        let x = clientX;
        let y = clientY;
        
        if (needsCoordinateCorrection) {
            // FileMaker環境では座標の補正が必要
            x = clientX - window.scrollX;
            y = clientY - window.scrollY;
        }
        
        // drawAreaのオフセットを適用
        x = x - rect.left;
        y = y - rect.top;
        
        return { x, y };
    }

    /**
     * スタンプを配置するイベントハンドラ
     */
    _placeStampHandler(e) {
        if (!this.isActive || !this.currentStamp) return;
        
        // 連続クリック防止（50ms以内の連続クリックは無視）
        const now = Date.now();
        if (now - this.lastPlacedStampTime < 50) return;
        this.lastPlacedStampTime = now;
        
        // 座標変換
        const drawArea = document.querySelector('.draw-area');
        const rect = drawArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // イベント情報をログ出力
        console.log('[event] イベント: スタンプ配置', {
            x: x,
            y: y,
            windowSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            extra: {
                clientX: e.clientX,
                clientY: e.clientY,
                rectLeft: rect.left,
                rectTop: rect.top
            }
        });
        
        // スタンプを配置
        this._placeStampAtPosition(x, y);
    }

    /**
     * 指定位置にスタンプを配置
     */
    _placeStampAtPosition(x, y) {
        console.log('StampMode: _placeStampAtPosition(' + x + ', ' + y + ') 呼び出し');
        if (!this.isActive || !this.currentStamp || !this.context) return;
        
        console.log('StampMode: スタンプを描画: (' + x + ', ' + y + '), src=' + this.currentStamp);
        
        // データモデルに新しいスタンプを追加
        const stampId = Date.now() + Math.random().toString(36).substring(2, 8);
        
        if (this.canvasDataModel) {
            const stampData = {
                id: stampId,
                type: 'stamp',
                x: x,
                y: y,
                src: this.currentStamp,
                stampType: this.currentStampType,
                width: 30,  // 初期サイズ
                height: 30, // 初期サイズ
                timestamp: Date.now()
            };
            
            // データモデルに要素を追加
            this.canvasDataModel.addElement('stamp', stampData);
            console.log('StampMode: スタンプをデータモデルに追加: ID=' + stampId);
        }
        
        // スタンプ画像を読み込んで描画
        const img = new Image();
        img.onload = () => {
            console.log('StampMode: 画像読み込み成功: ' + img.src + ', サイズ=' + img.width + 'x' + img.height);
            
            // アスペクト比を維持しながらサイズを計算
            const maxSize = 30;  // 最大サイズ
            let width = maxSize;
            let height = maxSize;
            
            if (img.width > img.height) {
                // 横長の画像
                height = maxSize * (img.height / img.width);
            } else if (img.height > img.width) {
                // 縦長の画像
                width = maxSize * (img.width / img.height);
            }
            
            // 画像の中心が指定座標になるように配置
            const drawX = x - (width / 2);
            const drawY = y - (height / 2);
            
            // スタンプ描画
            this.context.drawImage(img, drawX, drawY, width, height);
            console.log('StampMode: スタンプを描画完了: (' + drawX + ', ' + drawY + ', ' + width + ', ' + height + ')');
            
            // データモデルの更新（サイズ情報）
            if (this.canvasDataModel) {
                const updatedElements = this.canvasDataModel.getElementsByType('stamp');
                if (updatedElements && updatedElements[stampId]) {
                    updatedElements[stampId].width = width;
                    updatedElements[stampId].height = height;
                    // ローカルストレージの更新
                    this.canvasDataModel.saveToLocalStorage();
                }
            }
        };
        
        img.onerror = () => {
            console.error('StampMode: 画像の読み込みに失敗: ' + this.currentStamp);
        };
        
        // タイムスタンプを付けてキャッシュ回避
        img.src = this.currentStamp + '?t=' + Date.now();
    }

    /**
     * カスタムアイコンでスタンプモードを有効化
     */
    activateWithCustomIcon(iconPath, iconId) {
        console.log('StampMode: activateWithCustomIcon(' + iconPath + ', ' + iconId + ') 呼び出し');
        this.activate('custom');
        
        // カスタムアイコンをカーソルとして設定
        this._createCursorImage(iconPath);
        
        // スタンプの種類とパスを設定
        this.currentStamp = iconPath;
        this.currentStampType = 'custom';
        
        console.log('StampMode: カスタムアイコン有効化完了 (' + iconPath + ')');
        
        // ログ出力（デバッグ用）
        console.log('[stamp] カスタムスタンプ有効化: ' + iconPath + ', ID: ' + iconId, {
            iconPath: iconPath,
            iconId: iconId,
            isActive: this.isActive,
            currentStamp: this.currentStamp,
            currentStampType: this.currentStampType
        });
    }

    /**
     * スタンプモードを有効化
     */
    activate(stampType) {
        console.log('StampMode: activate(' + stampType + ') 呼び出し');
        
        // 既に同じモードがアクティブなら何もしない
        if (this.isActive && this.currentStampType === stampType) {
            console.log('StampMode: 二重アクティベーション防止');
            return;
        }
        
        // デフォルトのカーソル画像を設定
        this._createCursorImage('Tool/Reload.png');
        
        // モードを有効化
        this.isActive = true;
        this.currentStampType = stampType;
        
        console.log('StampMode: アクティブ化完了 (' + stampType + ')');
        
        // ログ出力（デバッグ用）
        console.log('[stamp] スタンプモード有効化: ' + stampType, {
            stampType: stampType,
            isActive: this.isActive,
            currentStamp: this.currentStamp
        });
    }

    /**
     * スタンプモードを無効化
     */
    deactivate() {
        console.log('StampMode: deactivate() 呼び出し');
        
        // 無効化ブロックが有効ならスキップ
        if (this.disableDeactivation) {
            console.log('StampMode: 無効化はブロックされています');
            return;
        }
        
        // カーソルを削除
        if (this.cursorImage && this.cursorContainer) {
            console.log('StampMode: カーソル画像を削除');
            this.cursorContainer.removeChild(this.cursorImage);
            this.cursorImage = null;
        }
        
        // モードを無効化
        this.isActive = false;
        this.currentStampType = null;
        
        // カーソルコンテナを非表示
        if (this.cursorContainer) {
            this.cursorContainer.style.display = 'none';
        }
        
        console.log('StampMode: 非アクティブ化完了');
    }

    /**
     * カーソル画像を作成
     */
    _createCursorImage(src) {
        console.log('StampMode: カーソル画像を作成 (' + src + ')');
        
        // 既存のカーソル画像を削除
        if (this.cursorImage && this.cursorContainer) {
            console.log('StampMode: 既存のカーソル画像を削除');
            this.cursorContainer.removeChild(this.cursorImage);
            this.cursorImage = null;
        }
        
        // 新しいカーソル画像を作成
        this.cursorImage = document.createElement('img');
        this.cursorImage.style.pointerEvents = 'none';
        this.cursorImage.style.position = 'absolute';
        this.cursorImage.style.width = '30px';  // デフォルトサイズ
        this.cursorImage.style.height = 'auto';
        
        // コンテナに追加
        console.log('StampMode: カーソル画像をコンテナに追加');
        this.cursorContainer.appendChild(this.cursorImage);
        
        // 画像ロード完了時の処理
        this.cursorImage.onload = () => {
            console.log('StampMode: カーソル画像の読み込み成功');
        };
        
        // 画像のソースを設定
        console.log('StampMode: カーソル画像のsrcを設定: ' + src);
        this.cursorImage.src = src;
    }

    /**
     * キャンバスをクリア
     */
    clearCanvas() {
        if (this.context && this.canvasLayer) {
            this.context.clearRect(0, 0, this.canvasLayer.width, this.canvasLayer.height);
            console.log('StampMode: キャンバスをクリア');
            
            // データモデルからスタンプを削除
            if (this.canvasDataModel) {
                this.canvasDataModel.clearElementsByType('stamp');
            }
        }
    }

    /**
     * データモデルからキャンバスを再描画
     */
    redrawFromModel() {
        if (!this.canvasDataModel || !this.context || !this.canvasLayer) return;
        
        // キャンバスをクリア
        this.context.clearRect(0, 0, this.canvasLayer.width, this.canvasLayer.height);
        
        // データモデルからスタンプを取得して描画
        const stamps = this.canvasDataModel.getElementsByType('stamp');
        if (!stamps || Object.keys(stamps).length === 0) return;
        
        // 各スタンプを描画
        Object.values(stamps).forEach(stamp => {
            const img = new Image();
            img.onload = () => {
                // スタンプのサイズが指定されている場合はそれを使用
                const width = stamp.width || 30;
                const height = stamp.height || 30;
                
                // 位置を計算（中心座標から左上座標に変換）
                const x = stamp.x - (width / 2);
                const y = stamp.y - (height / 2);
                
                // スタンプを描画
                this.context.drawImage(img, x, y, width, height);
            };
            img.src = stamp.src;
        });
        
        console.log('StampMode: データモデルからキャンバスを再描画');
    }

    /**
     * 無効化ブロックの設定
     */
    setDisableDeactivation(disable) {
        this.disableDeactivation = disable;
    }
}

// グローバル変数としてエクスポート
window.StampMode = StampMode;