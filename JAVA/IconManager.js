// IconManager.js - レイヤー構造対応版
class IconManager {
    /**
     * IconManagerコンストラクタ
     */
    constructor() {
        console.log('IconManager: 初期化');

        // アイコンデータを格納する配列
        this.icons = [];

        // アイコンの読み込み状態
        this.loaded = false;

        console.log('IconManager: 初期化完了');
    }

    /**
     * アイコンJSONファイルを読み込む
     * @returns {Promise<boolean>} 読み込み成功時はtrue
     */
    async loadIcons() {
        try {
            console.log('IconManager: icons.jsonを取得:', 'Tool/icons/icons.json');
            const response = await fetch('Tool/icons/icons.json');

            if (!response.ok) {
                throw new Error(`IconManager: アイコン読み込み失敗: ${response.status}`);
            }

            this.icons = await response.json();
            this.loaded = true;
            console.log(`IconManager: ${this.icons.length}個のアイコンをJSONファイルから読み込み`);

            // カテゴリごとのアイコン数を確認
            const categories = {};
            this.icons.forEach(icon => {
                if (!categories[icon.category]) {
                    categories[icon.category] = 0;
                }
                categories[icon.category]++;
            });
            console.log('IconManager: カテゴリ別アイコン数:', categories);

            return true;
        } catch (error) {
            console.error('IconManager: JSONファイルからのアイコン読み込みエラー:', error);

            // フォールバック: 静的に定義されたアイコン情報を使用
            console.log('IconManager: 静的フォールバックデータを使用');
            this.icons = [
                {
                    "id": "diagnosis_healthtooth",
                    "category": "diagnosis",
                    "name_ja": "健全歯",
                    "name_en": "HealthTooth",
                    "file": "diagnosis/healthtooth.svg",
                    "style": "standard",
                    "bg_color": "#FFFFFF"
                },
                {
                    "id": "diagnosis_caries",
                    "category": "diagnosis",
                    "name_ja": "虫歯",
                    "name_en": "Caries",
                    "file": "diagnosis/caries.svg",
                    "style": "standard",
                    "bg_color": "#FFFFFF"
                },
                {
                    "id": "diagnosis_missingtooth",
                    "category": "diagnosis",
                    "name_ja": "欠損歯",
                    "name_en": "MissingTooth",
                    "file": "diagnosis/missingtooth.svg",
                    "style": "standard",
                    "bg_color": "#FFFFFF"
                },
                {
                    "id": "treatment_plan_cariest",
                    "category": "treatment_plan",
                    "name_ja": "C処置",
                    "name_en": "CariesTr",
                    "file": "treatment_plan/cariest.svg",
                    "style": "standard",
                    "bg_color": "#FFFFFF"
                },
                {
                    "id": "treatment_plan_plan_toothext",
                    "category": "treatment_plan",
                    "name_ja": "抜歯",
                    "name_en": "ToothExtPlanned",
                    "file": "treatment_plan/plan_toothext.svg",
                    "style": "standard",
                    "bg_color": "#FFB370"
                },
                {
                    "id": "restoration_cr",
                    "category": "restoration",
                    "name_ja": "CR",
                    "name_en": "Composite Resin",
                    "file": "restoration/cr.svg",
                    "style": "esthetic",
                    "bg_color": "#FFFFFF"
                },
                {
                    "id": "restoration_in",
                    "category": "restoration",
                    "name_ja": "In",
                    "name_en": "Inlay",
                    "file": "restoration/in.svg",
                    "style": "esthetic",
                    "bg_color": "#FFFFFF"
                },
                {
                    "id": "restoration_gcr",
                    "category": "restoration",
                    "name_ja": "GCr.",
                    "name_en": "Gold Crown",
                    "file": "restoration/gcr.svg",
                    "style": "gold",
                    "bg_color": "#DAA520"
                }
            ];
            this.loaded = true;
            console.log(`IconManager: ${this.icons.length}個の静的フォールバックアイコンを読み込み`);
            return true;
        }
    }

    /**
     * カテゴリ別にアイコンを取得
     * @param {string} category - アイコンカテゴリ
     * @returns {Array} カテゴリに属するアイコンの配列
     */
    getIconsByCategory(category) {
        if (!this.loaded) {
            console.error('IconManager: アイコンがまだ読み込まれていません');
            return [];
        }

        const icons = this.icons.filter(icon => icon.category === category);
        console.log(`IconManager: カテゴリ ${category} から ${icons.length}個のアイコンを取得`);
        return icons;
    }

    /**
     * アイコンボタンを作成してコンテナに追加
     * @param {string} category - アイコンカテゴリ
     * @param {string} containerSelector - コンテナのCSSセレクタ
     * @returns {number} 作成したボタンの数
     */
    createIconButtons(category, containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error(`IconManager: コンテナが見つかりません: ${containerSelector}`);
            return 0;
        }

        const icons = this.getIconsByCategory(category);
        if (icons.length === 0) {
            console.warn(`IconManager: カテゴリ ${category} にアイコンがありません`);
            // コンテナに「アイコンがありません」と表示
            container.innerHTML = '<div class="no-icons-message">このカテゴリのアイコンはありません</div>';
            return 0;
        }

        console.log(`IconManager: ${category} カテゴリの ${icons.length}個のボタンを作成`);

        // 既存のボタンがある場合は、それを保持する（HTML静的ボタンと競合しないように）
        const existingButtons = container.querySelectorAll('.icon-button');
        if (existingButtons.length > 0) {
            console.log(`IconManager: コンテナには既に ${existingButtons.length}個のボタンがあります`);
            return existingButtons.length;
        }

        // コンテナをクリア
        container.innerHTML = '';

        // ボタン要素を作成
        icons.forEach(icon => {
            const iconPath = `Tool/icons/${icon.file}`;
            console.log(`IconManager: アイコンボタンを作成: ${icon.name_ja}, パス: ${iconPath}`);

            const button = document.createElement('button');
            button.className = 'icon-button';
            button.setAttribute('data-icon-id', icon.id);
            button.setAttribute('data-icon-file', icon.file);
            button.setAttribute('title', icon.name_ja + ' / ' + icon.name_en);

            // アイコンラッパーを作成（スタイリング用）
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'icon-wrapper';
            iconWrapper.style.backgroundColor = icon.bg_color || '#FFFFFF';

            // 画像要素を作成
            const img = document.createElement('img');
            img.src = iconPath;
            img.alt = icon.name_en;
            img.className = 'icon-img';

            // エラー処理 - SVGが読み込めない場合のフォールバック
            img.onerror = () => {
                console.warn(`IconManager: アイコン画像の読み込み失敗: ${iconPath}, フォールバックを使用`);
                // カテゴリに応じたフォールバックアイコン
                if (category === 'diagnosis') {
                    img.src = 'Tool/C-Black.png';
                } else if (category === 'treatment_plan') {
                    img.src = 'Tool/C-Red.png';
                } else {
                    img.src = 'Tool/C-Blue.png';
                }
                iconWrapper.style.backgroundColor = '#FFEEEE'; // エラー表示用背景色
            };

            // ラベルを追加
            const label = document.createElement('div');
            label.className = 'icon-label';
            label.textContent = icon.name_ja;

            // ボタンを組み立て
            iconWrapper.appendChild(img);
            button.appendChild(iconWrapper);
            button.appendChild(label);
            container.appendChild(button);
        });

        return icons.length;
    }

    /**
     * すべてのタブのアイコンを設定
     * @returns {Object} 各カテゴリのアイコン数
     */
    setupTabIcons() {
        if (!this.loaded) {
            console.error('IconManager: アイコンがまだ読み込まれていません');
            return { diagCount: 0, plnCount: 0, restCount: 0 };
        }

        console.log('IconManager: すべてのタブアイコンを設定');

        const diagCount = this.createIconButtons('diagnosis', '.diagnosis-icons');
        const plnCount = this.createIconButtons('treatment_plan', '.treatment-plan-icons');
        const restCount = this.createIconButtons('restoration', '.restoration-icons');

        console.log(`IconManager: アイコンボタン作成完了 - DIAG: ${diagCount}, PLN: ${plnCount}, REST: ${restCount}`);

        // レイヤー構造対応：アイコンボタンのクリックイベントを設定
        this.setupIconButtonEvents();

        return { diagCount, plnCount, restCount };
    }

    /**
     * アイコンボタンのクリックイベントを設定
     * (レイヤー構造対応追加)
     */
    setupIconButtonEvents() {
        // イベント設定はMain.jsに移行済みのため、ここでは実装しない
        console.log('IconManager: アイコンボタンイベントはMain.jsで設定されます');
    }
}

// グローバルスコープでIconManagerを利用可能にする
window.IconManager = IconManager;
