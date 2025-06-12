// ChangeBackImage.js - レイヤー構造対応版

/**
 * 背景変更を管理するクラス（後方互換性用）
 */
class BackgroundChanger {
    /**
     * BackgroundChangerコンストラクタ
     * @param {string} canvasId - 背景レイヤーのID
     */
    constructor(canvasId) {
        console.log('BackgroundChanger: 初期化');
        this.canvas = document.getElementById(canvasId);

        if (!this.canvas) {
            console.error(`BackgroundChanger: キャンバス "${canvasId}" が見つかりません`);
            // フォールバックとして背景レイヤーを使用
            this.canvas = document.getElementById('background-layer');
            if (!this.canvas) {
                console.error('BackgroundChanger: background-layerも見つかりません');
                return;
            }
        }

        this.ctx = this.canvas.getContext('2d');
        console.log('BackgroundChanger: 初期化完了');
    }

    /**
     * 背景を変更（後方互換性用メソッド）
     * @param {string} base64Image - Base64エンコードされた画像データ
     * @returns {Promise} 背景変更処理のPromise
     */
    changeBackground(base64Image) {
        console.log('BackgroundChanger: changeBackground呼び出し');

        // BackgroundManagerが利用可能な場合はそちらを使用
        if (window.backgroundManager) {
            console.log('BackgroundChanger: BackgroundManagerを使用して後方互換性を維持');
            return window.backgroundManager.setBackground(base64Image);
        } else {
            console.log('BackgroundChanger: レガシーモードで動作');
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    // キャンバスをクリア
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                    // 白背景で塗りつぶし
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                    // 画像を描画（アスペクト比を維持）
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    const canvasWidth = this.canvas.width;
                    const canvasHeight = this.canvas.height;

                    // contain方式でアスペクト比を維持
                    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
                    const drawWidth = imgWidth * scale;
                    const drawHeight = imgHeight * scale;
                    const drawX = (canvasWidth - drawWidth) / 2;
                    const drawY = (canvasHeight - drawHeight) / 2;

                    this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    console.log('BackgroundChanger: 背景を変更しました');

                    // データモデルに保存（利用可能な場合）
                    if (window.canvasDataModel) {
                        window.canvasDataModel.setBackground(base64Image);
                    }

                    resolve();
                };
                img.onerror = (error) => {
                    console.error('BackgroundChanger: 背景画像の読み込みに失敗しました:', error);
                    reject(error);
                };
                img.src = base64Image;
            });
        }
    }
}

// グローバルスコープでBackgroundChangerを利用可能にする
window.BackgroundChanger = BackgroundChanger;

/**
 * FileMakerから呼び出される関数（後方互換性用）- 名前変更
 * @param {string} base64Image - Base64エンコードされた画像データ
 * @returns {Promise} 背景設定処理のPromise
 */
window.SetBackgroundImageFromChanger = function(base64Image) {
    console.log('ChangeBackImage: SetBackgroundImageFromChanger呼び出し');

    // デバッグ用の情報表示
    const debugInfo = {
        hasBackgroundManager: !!window.backgroundManager,
        imageStartsWith: base64Image.substring(0, 30) + '...',
        hasBackgroundLayer: !!document.getElementById('background-layer')
    };
    console.log('ChangeBackImage: デバッグ情報:', debugInfo);

    // BackgroundManagerが利用可能ならそちらを使用
    if (window.backgroundManager) {
        console.log('ChangeBackImage: BackgroundManagerに転送');
        // 直接メソッドを呼び出し、再帰を避ける
        return window.backgroundManager.setBackground(base64Image);
    }
    // 後方互換性のためにBackgroundChangerも維持
    else {
        console.log('ChangeBackImage: BackgroundChangerにフォールバック');
        const backgroundChanger = new BackgroundChanger('background-layer');
        return backgroundChanger.changeBackground(base64Image);
    }
};

// 元のSetBackgroundImage関数は削除（Utils.jsに統合）