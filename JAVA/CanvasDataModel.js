// CanvasDataModel.js - OralCanvasのデータモデルを管理するクラス

class CanvasDataModel {
    /**
     * CanvasDataModelコンストラクタ
     * 描画要素の管理と永続化を担当
     */
    constructor() {
        console.log('CanvasDataModel: 初期化');

        // 描画要素の保存用オブジェクト
        this.elements = {
            freedraw: [], // フリードロー要素の配列
            stamp: [],    // スタンプ要素の配列
            text: []      // テキスト要素の配列
        };

        // 背景画像の設定
        this.background = {
            src: 'Tool/DefaultBack.svg', // デフォルト背景
            options: {
                maintainAspectRatio: true,
                fitMethod: 'contain'
            }
        };

        // バージョン情報（将来の互換性のため）
        this.version = '4.0';

        // セッションID（FileMaker連携用）
        this.sessionId = this.generateSessionId();

        console.log('CanvasDataModel: 初期化完了', { sessionId: this.sessionId });
    }

    /**
     * セッションIDを生成
     * @returns {string} 一意のセッションID
     */
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * 要素を追加
     * @param {string} type - 要素タイプ ('freedraw', 'stamp', 'text')
     * @param {Object} element - 追加する要素データ
     * @returns {string|null} 追加された要素のID、または失敗時はnull
     */
    addElement(type, element) {
        if (!this.elements[type]) {
            console.error(`CanvasDataModel: 不明な要素タイプ "${type}"`);
            return null;
        }

        // 一意のIDを生成
        element.id = Date.now() + Math.random().toString(36).substr(2, 9);
        // タイムスタンプを追加
        element.timestamp = Date.now();

        // 要素を追加
        this.elements[type].push(element);

        // ローカルストレージに保存（開発用）
        this.saveToLocalStorage();

        console.log(`CanvasDataModel: "${type}" 要素を追加`, { id: element.id });
        return element.id;
    }

    /**
     * 要素を更新
     * @param {string} type - 要素タイプ
     * @param {string} id - 更新する要素のID
     * @param {Object} updatedElement - 更新データ
     * @returns {boolean} 更新成功時はtrue
     */
    updateElement(type, id, updatedElement) {
        if (!this.elements[type]) {
            console.error(`CanvasDataModel: 不明な要素タイプ "${type}"`);
            return false;
        }

        const index = this.elements[type].findIndex(el => el.id === id);
        if (index === -1) {
            console.error(`CanvasDataModel: ID "${id}" の "${type}" 要素が見つかりません`);
            return false;
        }

        // 要素を更新（オブジェクトをマージ）
        this.elements[type][index] = {
            ...this.elements[type][index],
            ...updatedElement,
            // 更新時刻を更新
            updated: Date.now()
        };

        // ローカルストレージに保存
        this.saveToLocalStorage();

        console.log(`CanvasDataModel: ID "${id}" の "${type}" 要素を更新`);
        return true;
    }

    /**
     * 要素を削除
     * @param {string} type - 要素タイプ
     * @param {string} id - 削除する要素のID
     * @returns {boolean} 削除成功時はtrue
     */
    removeElement(type, id) {
        if (!this.elements[type]) {
            console.error(`CanvasDataModel: 不明な要素タイプ "${type}"`);
            return false;
        }

        const index = this.elements[type].findIndex(el => el.id === id);
        if (index === -1) {
            console.error(`CanvasDataModel: ID "${id}" の "${type}" 要素が見つかりません`);
            return false;
        }

        // 要素を削除
        this.elements[type].splice(index, 1);

        // ローカルストレージに保存
        this.saveToLocalStorage();

        console.log(`CanvasDataModel: ID "${id}" の "${type}" 要素を削除`);
        return true;
    }

    /**
     * 背景を設定
     * @param {string} src - 背景画像のソース
     * @param {Object} options - 背景オプション
     */
    setBackground(src, options = {}) {
        this.background = {
            src,
            options: { ...this.background.options, ...options }
        };

        // ローカルストレージに保存
        this.saveToLocalStorage();

        console.log('CanvasDataModel: 背景を設定', { src });
    }

    /**
     * 全データをクリア
     */
    clearAll() {
        console.log('CanvasDataModel: 全データをクリア');

        // 要素をクリア
        this.elements = {
            freedraw: [],
            stamp: [],
            text: []
        };

        // 背景をデフォルトに戻す
        this.background = {
            src: 'Tool/DefaultBack.svg',
            options: { maintainAspectRatio: true, fitMethod: 'contain' }
        };

        // ローカルストレージに保存
        this.saveToLocalStorage();
    }

    /**
     * 特定タイプの要素をすべてクリア
     * @param {string} type - クリアする要素タイプ
     * @returns {boolean} クリア成功時はtrue
     */
    clearElementsByType(type) {
        if (!this.elements[type]) {
            console.error(`CanvasDataModel: 不明な要素タイプ "${type}"`);
            return false;
        }

        this.elements[type] = [];

        // ローカルストレージに保存
        this.saveToLocalStorage();

        console.log(`CanvasDataModel: "${type}" 要素をすべてクリア`);
        return true;
    }

    /**
     * ローカルストレージにデータを保存（開発用）
     * @returns {boolean} 保存成功時はtrue
     */
    saveToLocalStorage() {
        try {
            const data = {
                elements: this.elements,
                background: this.background,
                version: this.version,
                sessionId: this.sessionId,
                timestamp: Date.now()
            };

            localStorage.setItem('oralCanvasData', JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('CanvasDataModel: ローカルストレージへの保存に失敗', e);
            return false;
        }
    }

    /**
     * ローカルストレージからデータを読み込み（開発用）
     * @returns {boolean} 読み込み成功時はtrue
     */
    loadFromLocalStorage() {
        try {
            const dataStr = localStorage.getItem('oralCanvasData');
            if (!dataStr) {
                console.warn('CanvasDataModel: ローカルストレージにデータがありません');
                return false;
            }

            const data = JSON.parse(dataStr);

            // バージョンチェック（将来の互換性のため）
            if (data.version && data.version !== this.version) {
                console.warn(`CanvasDataModel: データバージョンの不一致 (保存: ${data.version}, 現在: ${this.version})`);
            }

            // データを読み込み
            if (data.elements) this.elements = data.elements;
            if (data.background) this.background = data.background;
            if (data.sessionId) this.sessionId = data.sessionId;

            console.log('CanvasDataModel: ローカルストレージからデータを読み込み', {
                elements: {
                    freedraw: this.elements.freedraw.length,
                    stamp: this.elements.stamp.length,
                    text: this.elements.text.length
                }
            });

            return true;
        } catch (e) {
            console.error('CanvasDataModel: ローカルストレージからの読み込みに失敗', e);
            return false;
        }
    }

    /**
     * 指定されたタイプの要素を取得
     * @param {string} type - 要素タイプ ('freedraw', 'stamp', 'text')
     * @returns {Object} 指定されたタイプの要素のオブジェクト (IDをキーとする)
     */
    getElementsByType(type) {
        if (!this.elements[type]) {
            console.warn(`CanvasDataModel: 不明な要素タイプ "${type}"`);
            return {};
        }
        
        // 配列を ID をキーとするオブジェクトに変換
        const elementsObj = {};
        this.elements[type].forEach(element => {
            if (element && element.id) {
                elementsObj[element.id] = element;
            }
        });
        
        return elementsObj;
    }

    /**
     * FileMaker連携用のデータエクスポート
     * @returns {Object} FileMakerに送信するデータ
     */
    exportToFileMaker() {
        // FileMakerに送信するためのデータ形式に変換
        const exportData = {
            elements: this.elements,
            background: this.background,
            version: this.version,
            sessionId: this.sessionId,
            timestamp: Date.now()
        };

        // オブジェクトをJSONに変換
        const jsonData = JSON.stringify(exportData);

        console.log('CanvasDataModel: FileMaker用にデータをエクスポート', {
            dataSize: jsonData.length,
            elementCounts: {
                freedraw: this.elements.freedraw.length,
                stamp: this.elements.stamp.length,
                text: this.elements.text.length
            }
        });

        return jsonData;
    }

    /**
     * FileMakerからのデータインポート
     * @param {string|Object} data - FileMakerから受け取ったJSONデータ
     * @returns {boolean} インポート成功時はtrue
     */
    importFromFileMaker(data) {
        try {
            // 文字列の場合はJSONとしてパース
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

            // バージョンチェック（将来の互換性のため）
            if (parsedData.version && parsedData.version !== this.version) {
                console.warn(`CanvasDataModel: データバージョンの不一致 (インポート: ${parsedData.version}, 現在: ${this.version})`);
            }

            // データを読み込み
            if (parsedData.elements) this.elements = parsedData.elements;
            if (parsedData.background) this.background = parsedData.background;

            // ローカルストレージにも保存
            this.saveToLocalStorage();

            console.log('CanvasDataModel: FileMakerからデータをインポート', {
                elements: {
                    freedraw: this.elements.freedraw.length,
                    stamp: this.elements.stamp.length,
                    text: this.elements.text.length
                }
            });

            return true;
        } catch (e) {
            console.error('CanvasDataModel: FileMakerからのデータインポートに失敗', e);
            return false;
        }
    }

    /**
     * 全データを取得
     * @returns {Object} 現在のデータ状態
     */
    getAllData() {
        return {
            elements: { ...this.elements },
            background: { ...this.background },
            version: this.version,
            sessionId: this.sessionId
        };
    }
}

// グローバルスコープでCanvasDataModelを利用可能にする
window.CanvasDataModel = CanvasDataModel;