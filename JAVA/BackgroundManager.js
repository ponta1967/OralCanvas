// BackgroundManager.js - OralCanvas背景画像管理クラス（レイヤー対応版）

class BackgroundManager {
    /**
     * BackgroundManagerコンストラクタ
     * @param {HTMLCanvasElement} canvas - 背景レイヤーのキャンバス要素
     * @param {string} licenseType - ライセンスタイプ ('free' または 'premium')
     */
    constructor(canvas, licenseType = 'free') {
        console.log('BackgroundManager: 初期化');

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.licenseType = licenseType;

        // キャンバスのサイズを明示的に設定
        this.initCanvasSize();

        // キャンバスの元のサイズを保存
        this.originalWidth = canvas.width;
        this.originalHeight = canvas.height;
        console.log(`BackgroundManager: オリジナルキャンバスサイズ: ${this.originalWidth}x${this.originalHeight}`);

        // 背景画像の設定
        this.currentBackground = 'Tool/DefaultBack.svg'; // デフォルト背景
        this.backgroundImage = null;
        this.aspectRatio = 4/3; // 歯科口腔内写真の標準比率

        // プリセット背景のリスト
        this.presetBackgrounds = {
            free: [
                { id: 'default', name: 'デフォルト', path: 'Tool/DefaultBack.svg' },
                { id: 'white', name: '白紙', path: 'Tool/WhiteBack.svg' }
            ],
            premium: [
                // 有料版のみアクセス可能なプリセット
                { id: 'adult_teeth', name: '成人歯列図', path: 'Tool/Backgrounds/adult_teeth.svg' },
                { id: 'child_teeth', name: '小児歯列図', path: 'Tool/Backgrounds/child_teeth.svg' },
                { id: 'perio_chart', name: '歯周チャート', path: 'Tool/Backgrounds/perio_chart.svg' }
                // 他の背景をここに追加
            ]
        };

        // 初期化時に一度キャンバスをリセット
        this.resetCanvas();

        console.log('BackgroundManager: 初期化完了');
    }

    /**
     * キャンバスサイズを初期化
     */
    initCanvasSize() {
        // CSS上の設定値を使用するか、固定値を使用
        const drawArea = document.querySelector('.draw-area');
        if (drawArea) {
            if (this.canvas.width < 400 || this.canvas.height < 300) {  // デフォルトサイズ近辺の場合
                // CSSでの設定値を取得
                const computedStyle = window.getComputedStyle(drawArea);
                const width = parseInt(computedStyle.width, 10) || 800;
                const height = parseInt(computedStyle.height, 10) || 600;

                // キャンバスサイズを設定
                this.canvas.width = width;
                this.canvas.height = height;
                console.log(`BackgroundManager: キャンバスサイズをCSS値に基づき設定: ${width}x${height}`);
            }
        } else {
            // フォールバックとして固定値を設定
            if (this.canvas.width === 300 && this.canvas.height === 150) {
                this.canvas.width = 800;
                this.canvas.height = 600;
                console.log('BackgroundManager: キャンバスサイズを固定値800x600に設定');
            }
        }
    }

    /**
     * デフォルト背景を読み込む
     * @returns {Promise} 背景読み込み処理のPromise
     */
    loadDefaultBackground() {
        console.log('BackgroundManager: デフォルト背景を読み込みます');
        return this.setBackground(this.currentBackground)
            .catch(error => {
                console.error('BackgroundManager: デフォルト背景の読み込みに失敗しました:', error);
                // エラー時は白紙背景を表示
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            });
    }

    /**
     * キャンバスを元のサイズにリセット
     * @returns {BackgroundManager} チェーン用にthisを返す
     */
    resetCanvas() {
        console.log(`BackgroundManager: キャンバスをリセット: ${this.originalWidth}x${this.originalHeight}`);

        // コンテキストのリセット（全ての変換をクリア）
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // キャンバスのサイズを元に戻す
        if (this.originalWidth && this.originalHeight) {
            this.canvas.width = this.originalWidth;
            this.canvas.height = this.originalHeight;
        }

        console.log(`BackgroundManager: キャンバスリセット後のサイズ: ${this.canvas.width}x${this.canvas.height}`);
        return this;
    }

    /**
     * 背景画像を設定
     * @param {string} imageSource - 画像ソース（URL、Base64データなど）
     * @param {Object} options - 背景オプション
     * @returns {Promise} 背景設定処理のPromise
     */
    setBackground(imageSource, options = {}) {
        const defaultOptions = {
            maintainAspectRatio: true,
            fitMethod: 'contain'
        };

        const settings = { ...defaultOptions, ...options };

        // ライセンスチェック
        if (this.licenseType === 'free') {
            const isDataUrl = imageSource.startsWith('data:');
            const freePaths = this.presetBackgrounds.free.map(bg => bg.path);

            if (!isDataUrl && !freePaths.includes(imageSource)) {
                console.warn('BackgroundManager: カスタム背景画像は有料版でのみ利用可能です');
                return Promise.reject('Premium feature');
            }
        }

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                console.log(`BackgroundManager: 背景画像の読み込み成功: ${img.width}x${img.height}`);

                // 必ずキャンバスをリセット
                this.resetCanvas();

                // 画像をメンバ変数に保存
                this.backgroundImage = img;
                this.currentBackground = imageSource;

                // キャンバスをクリア
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                // 背景描画
                this.drawBackground(settings.fitMethod, settings.maintainAspectRatio);

                // データモデルがあれば背景情報を更新
                if (window.canvasDataModel && imageSource !== 'Tool/DefaultBack.svg') {
                    window.canvasDataModel.setBackground(imageSource, settings);
                }

                console.log(`BackgroundManager: 背景画像を設定完了: ${imageSource}`);
                
                // WebビューワーでのレンダリングをOSが認識するために、小さな遅延を入れて再描画
                setTimeout(() => {
                    // キャンバスに微小な変更を加えて再描画をトリガー
                    this.ctx.save();
                    this.ctx.restore();
                    console.log('BackgroundManager: レンダリング認識のための微小変更を適用');
                }, 50);
                
                resolve();
            };

            img.onerror = (error) => {
                console.error('BackgroundManager: 背景画像の読み込みに失敗しました:', error);
                reject(error);
            };

            console.log(`BackgroundManager: 背景画像の読み込みを開始: ${imageSource}`);
            img.src = imageSource;
        });
    }

    /**
     * 背景を描画
     * @param {string} fitMethod - フィット方法 ('contain', 'cover', 'stretch')
     * @param {boolean} maintainAspectRatio - アスペクト比を維持するか
     */
    drawBackground(fitMethod, maintainAspectRatio) {
        if (!this.backgroundImage) {
            console.warn('BackgroundManager: 背景画像がないため描画をスキップします');
            return;
        }

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imgWidth = this.backgroundImage.width;
        const imgHeight = this.backgroundImage.height;

        console.log(`BackgroundManager: 描画準備: キャンバス=${canvasWidth}x${canvasHeight}, 画像=${imgWidth}x${imgHeight}`);

        let drawWidth, drawHeight, drawX, drawY;

        if (!maintainAspectRatio || fitMethod === 'stretch') {
            // アスペクト比を無視して引き伸ばし
            drawWidth = canvasWidth;
            drawHeight = canvasHeight;
            drawX = 0;
            drawY = 0;
        } else if (fitMethod === 'contain') {
            // アスペクト比を維持しながら全体を表示
            const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
            drawWidth = imgWidth * scale;
            drawHeight = imgHeight * scale;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = (canvasHeight - drawHeight) / 2;
        } else if (fitMethod === 'cover') {
            // アスペクト比を維持しながらキャンバスを覆う
            const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
            drawWidth = imgWidth * scale;
            drawHeight = imgHeight * scale;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = (canvasHeight - drawHeight) / 2;
        }

        // 背景色をまず白で塗りつぶし
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 背景の描画
        console.log(`BackgroundManager: 背景描画: x=${drawX}, y=${drawY}, width=${drawWidth}, height=${drawHeight}`);
        this.ctx.drawImage(
            this.backgroundImage,
            drawX, drawY, drawWidth, drawHeight
        );
    }

    /**
     * キャンバスリサイズ時に背景を再描画
     */
    resizeBackground() {
        if (this.backgroundImage) {
            console.log('BackgroundManager: キャンバスリサイズに伴い背景を再描画します');
            this.resetCanvas();
            this.drawBackground('contain', true);
        }
    }

    /**
     * 利用可能な背景リストを取得
     * @returns {Array} 背景オブジェクトの配列
     */
    getAvailableBackgrounds() {
        if (this.licenseType === 'premium') {
            return [...this.presetBackgrounds.free, ...this.presetBackgrounds.premium];
        } else {
            return [...this.presetBackgrounds.free];
        }
    }

    /**
     * カスタム背景画像をアップロード
     * @param {File} file - アップロードされたファイルオブジェクト
     * @returns {Promise} アップロード処理のPromise
     */
    uploadCustomBackground(file) {
        if (this.licenseType !== 'premium') {
            console.warn('BackgroundManager: カスタム背景画像は有料版でのみ利用可能です');
            return Promise.reject('Premium feature');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const dataUrl = e.target.result;
                this.setBackground(dataUrl)
                    .then(resolve)
                    .catch(reject);
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 現在の背景ソースを取得
     * @returns {string} 現在の背景ソース
     */
    getCurrentBackground() {
        return this.currentBackground;
    }

    /**
     * ライセンスタイプを設定
     * @param {string} licenseType - ライセンスタイプ ('free' または 'premium')
     */
    setLicenseType(licenseType) {
        this.licenseType = licenseType;
        console.log(`BackgroundManager: ライセンスタイプを ${licenseType} に設定`);
    }
}

// グローバルスコープでBackgroundManagerを利用可能にする
window.BackgroundManager = BackgroundManager;

// FileMakerから呼び出される関数 - 後方互換性のため - 名前変更
window.SetBackgroundImageFromBGManager = function(base64Image, options = {}) {
    console.log('BackgroundManager: SetBackgroundImageFromBGManager呼び出し');

    if (!window.backgroundManager) {
        console.log('BackgroundManager: インスタンスを新規作成');
        const canvas = document.getElementById('background-layer');
        if (!canvas) {
            console.error('BackgroundManager: background-layer要素が見つかりません');
            return Promise.reject('background-layer not found');
        }
        window.backgroundManager = new BackgroundManager(canvas);
    }

    // オプションが文字列として渡された場合はJSONとしてパース
    if (typeof options === 'string') {
        try {
            options = JSON.parse(options);
        } catch (e) {
            console.error('BackgroundManager: 背景オプションのパースに失敗:', e);
            options = {};
        }
    }

    // 直接メソッドを呼び出し、再帰を避ける
    return window.backgroundManager.setBackground(base64Image, options);
};