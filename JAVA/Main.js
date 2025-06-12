// Main.js - レイヤー構造対応完全版（スタンプ選択・移動対応）
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Main: DOM Content Loaded');

    // DOM要素の存在確認のためのデバッグログ
    console.log('Main: 要素チェック - freeDrawBtn:', !!document.getElementById('freeDrawBtn'));
    console.log('Main: 要素チェック - レイヤー:', {
        background: !!document.getElementById('background-layer'),
        freedraw: !!document.getElementById('freedraw-layer'),
        stamp: !!document.getElementById('stamp-layer'),
        text: !!document.getElementById('text-layer'),
        overlay: !!document.getElementById('overlay-layer')
    });

    // ------------------------------------------------------------
    // レイヤー構造の初期化
    // ------------------------------------------------------------

    // レイヤーマネージャの初期化
    const layerManager = new LayerManager();
    // グローバルアクセス用に設定
    window.layerManager = layerManager;

    // データモデルの初期化
    const canvasDataModel = new CanvasDataModel();
    // グローバルアクセス用に設定
    window.canvasDataModel = canvasDataModel;

    // ローカルストレージからデータを読み込み（開発用）
    const dataLoaded = canvasDataModel.loadFromLocalStorage();
    if (dataLoaded) {
        console.log('Main: ローカルストレージからデータを読み込みました');
    } else {
        console.log('Main: ローカルストレージにデータがないか、読み込みに失敗しました');
    }

    // ------------------------------------------------------------
    // BackgroundManagerの初期化
    // ------------------------------------------------------------
    let licenseType = 'free'; // デフォルトは無料版

    // FileMakerがある場合はライセンスを取得
    if (window.FileMaker) {
        try {
            // TODO: FileMakerスクリプトを呼び出してライセンスを取得
            // licenseType = await ...
        } catch (e) {
            console.error('Main: ライセンス情報の取得に失敗しました:', e);
        }
    }

    // 背景レイヤーを取得
    const backgroundLayer = document.getElementById('background-layer');

    // BackgroundManagerの初期化
    const backgroundManager = new BackgroundManager(backgroundLayer, licenseType);
    // グローバルアクセス用に設定
    window.backgroundManager = backgroundManager;

    // データモデルから背景を読み込み - 非同期のロード処理をより確実に
    if (dataLoaded && canvasDataModel.background && canvasDataModel.background.src) {
        console.log('Main: データモデルから背景を読み込み開始');
        backgroundManager.setBackground(
            canvasDataModel.background.src,
            canvasDataModel.background.options
        ).then(() => {
            console.log('Main: 背景の読み込みに成功しました');
        }).catch(error => {
            console.error('Main: 背景の読み込みに失敗しました:', error);
            // 失敗した場合はデフォルト背景を明示的に読み込み
            backgroundManager.loadDefaultBackground().then(() => {
                console.log('Main: デフォルト背景の読み込みに成功しました');
            });
        });
    } else {
        // デフォルト背景を読み込み - 明示的に非同期処理を待つ
        console.log('Main: デフォルト背景を読み込み開始');
        backgroundManager.loadDefaultBackground().then(() => {
            console.log('Main: デフォルト背景の読み込みに成功しました');
        });
    }

    // ------------------------------------------------------------
    // カーソルコンテナの初期化
    // ------------------------------------------------------------

    // カーソルコンテナの作成（スタンプ・消しゴムなどのカーソル表示用）
    const initCursorContainer = () => {
        let cursorContainer = document.getElementById('cursorContainer');
        if (!cursorContainer) {
            console.log('Main: cursorContainerを作成');
            cursorContainer = document.createElement('div');
            cursorContainer.id = 'cursorContainer';
            cursorContainer.style.position = 'absolute';
            cursorContainer.style.top = '0';
            cursorContainer.style.left = '0';
            cursorContainer.style.width = '100%';
            cursorContainer.style.height = '100%';
            cursorContainer.style.pointerEvents = 'none';
            cursorContainer.style.zIndex = '1000';
            
            // draw-areaに追加
            const drawArea = document.querySelector('.draw-area');
            if (drawArea) {
                drawArea.appendChild(cursorContainer);
                console.log('Main: cursorContainerを追加しました');
            } else {
                console.error('Main: draw-area要素が見つかりません');
            }
        }
        
        return cursorContainer;
    };

    // カーソルコンテナを初期化
    const cursorContainer = initCursorContainer();

    // ------------------------------------------------------------
    // 各モードクラスの初期化
    // ------------------------------------------------------------

    // 各モードをレイヤーマネージャを使用して初期化
    const stampMode = new StampMode(layerManager);
    const freeDrawMode = new FreeDrawMode(layerManager);
    const eraserMode = new EraserMode(layerManager);
    const textMode = new TextMode(layerManager);

    // ElasticDrawModeとPowerChainModeは後で対応予定
    // 現状はダミーオブジェクトを作成して互換性を保持
    const elasticDrawMode = {
        activate: () => console.log('ElasticDrawMode: 未対応のモードがアクティブ化されました'),
        deactivate: () => {}
    };
    const powerChainMode = {
        activate: () => console.log('PowerChainMode: 未対応のモードがアクティブ化されました'),
        deactivate: () => {}
    };

    // グローバルアクセス用に設定
    window.stampMode = stampMode;
    window.freeDrawMode = freeDrawMode;
    window.eraserMode = eraserMode;
    window.textMode = textMode;

    // ------------------------------------------------------------
    // IconManagerの初期化
    // ------------------------------------------------------------

    console.log('Main: IconManagerを初期化');
    const iconManager = new IconManager();
    console.log('Main: アイコンを読み込み');
    const loadSuccess = await iconManager.loadIcons();
    console.log('Main: アイコン読み込み結果:', loadSuccess);

    if (loadSuccess) {
        console.log('Main: タブアイコンを設定');
        const diagCount = iconManager.createIconButtons('diagnosis', '.diagnosis-icons');
        const plnCount = iconManager.createIconButtons('treatment_plan', '.treatment-plan-icons');
        const restCount = iconManager.createIconButtons('restoration', '.restoration-icons');

        console.log(`Main: アイコンボタンを作成 - DIAG: ${diagCount}, PLN: ${plnCount}, REST: ${restCount}`);
    } else {
        console.error('Main: JSONからアイコンの読み込みに失敗しました。静的HTMLボタンを使用します');
    }

    // ------------------------------------------------------------
    // UI要素の参照取得
    // ------------------------------------------------------------

    const drawArea = document.querySelector('.draw-area');
    const reloadBtn = document.querySelector('.reload-button');
    const freeDrawBtn = document.getElementById('freeDrawBtn');
    const colorButtons = document.querySelectorAll('.color-button');
    const lineWidthButtons = document.querySelectorAll('.line-width-button');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const eraserBtn = document.getElementById('eraserBtn');

    // ------------------------------------------------------------
    // テキストボタンの作成
    // ------------------------------------------------------------

    function createTextButton() {
        const dlwTab = document.getElementById('DLW');
        if (!dlwTab) {
            console.error('Main: DLWタブが見つかりません');
            return;
        }

        // TEXTボタンを作成
        const textBtn = document.createElement('button');
        textBtn.id = 'textBtn';
        textBtn.className = 'tool-button';
        textBtn.innerHTML = 'TEXT';
        textBtn.style.display = 'flex';
        textBtn.style.justifyContent = 'center';
        textBtn.style.alignItems = 'center';
        textBtn.style.fontWeight = 'bold';
        textBtn.style.fontSize = '16px';

        // テキストオプションコンテナを作成
        const textOptionsContainer = document.createElement('div');
        textOptionsContainer.id = 'text-options-container';
        textOptionsContainer.className = 'text-options-container';
        textOptionsContainer.style.display = 'none';

        // 文字色オプションを作成
        const colorOptionsLabel = document.createElement('div');
        colorOptionsLabel.className = 'text-options-label';
        colorOptionsLabel.textContent = '文字色:';
        textOptionsContainer.appendChild(colorOptionsLabel);

        const textColorOptions = document.createElement('div');
        textColorOptions.className = 'text-color-options';

        // 黒、赤、青の色オプションを追加
        const colors = [
            { name: 'black', color: 'rgb(0,0,0)', label: '黒' },
            { name: 'red', color: 'rgb(235,31,14)', label: '赤' },
            { name: 'blue', color: 'rgb(0,140,255)', label: '青' }
        ];

        colors.forEach(color => {
            const colorBtn = document.createElement('button');
            colorBtn.className = `text-color-btn ${color.name}${color.name === 'black' ? ' active' : ''}`;
            colorBtn.setAttribute('data-color', color.color);
            colorBtn.style.backgroundColor = color.color;
            colorBtn.setAttribute('title', color.label);

            // 色ボタンのクリックイベント
            addClickEvent(colorBtn, (event) => {
                event.preventDefault();
                // アクティブなボタンのスタイルを更新
                document.querySelectorAll('.text-color-btn').forEach(btn => btn.classList.remove('active'));
                colorBtn.classList.add('active');

                // テキストモードの色を設定
                textMode.setTextColor(color.color);
            });

            textColorOptions.appendChild(colorBtn);
        });

        textOptionsContainer.appendChild(textColorOptions);

        // 文字サイズオプションを作成
        const sizeOptionsLabel = document.createElement('div');
        sizeOptionsLabel.className = 'text-options-label';
        sizeOptionsLabel.textContent = '文字サイズ:';
        textOptionsContainer.appendChild(sizeOptionsLabel);

        const textSizeOptions = document.createElement('div');
        textSizeOptions.className = 'text-size-options';

        // 小、中、大のサイズオプションを追加
        const sizes = [
            { name: 'small', label: '小' },
            { name: 'medium', label: '中' },
            { name: 'large', label: '大' }
        ];

        sizes.forEach(size => {
            const sizeBtn = document.createElement('button');
            sizeBtn.className = `text-size-btn ${size.name}${size.name === 'medium' ? ' active' : ''}`;
            sizeBtn.setAttribute('data-size', size.name);
            sizeBtn.textContent = size.label;

            // サイズボタンのクリックイベント
            addClickEvent(sizeBtn, (event) => {
                event.preventDefault();
                // アクティブなボタンのスタイルを更新
                document.querySelectorAll('.text-size-btn').forEach(btn => btn.classList.remove('active'));
                sizeBtn.classList.add('active');

                // テキストモードのサイズを設定
                textMode.setTextSize(size.name);
            });

            textSizeOptions.appendChild(sizeBtn);
        });

        textOptionsContainer.appendChild(textSizeOptions);

        // TEXTボタンのクリックイベント
        addClickEvent(textBtn, (event) => {
            console.log('Main: テキストボタンがクリックされました');
            event.preventDefault();

            // 全モードを非アクティブ化
            deactivateAllModes();

            // テキストモードをアクティブ化
            textMode.activate();

            // テキストオプションを表示
            textOptionsContainer.style.display = 'block';

            // テキストボタンをアクティブスタイルに
            textBtn.classList.add('active-tool');
        });

        // DLWタブに追加
        dlwTab.appendChild(textBtn);
        dlwTab.appendChild(textOptionsContainer);

        console.log('Main: テキストボタンを作成しました');
    }

    // テキストボタン作成を呼び出し
    createTextButton();

    // ------------------------------------------------------------
    // 消しゴムオプションの作成
    // ------------------------------------------------------------

    function createEraserOptions() {
        const dlwTab = document.getElementById('DLW');
        if (!dlwTab || !eraserBtn) {
            console.error('Main: DLWタブまたは消しゴムボタンが見つかりません');
            return;
        }

        // 消しゴムオプションコンテナを作成
        const eraserOptionsContainer = document.createElement('div');
        eraserOptionsContainer.id = 'eraser-options-container';
        eraserOptionsContainer.className = 'eraser-options-container';
        eraserOptionsContainer.style.display = 'none';
        eraserOptionsContainer.style.marginTop = '10px';
        eraserOptionsContainer.style.padding = '5px';
        eraserOptionsContainer.style.backgroundColor = '#f0f0f0';
        eraserOptionsContainer.style.borderRadius = '5px';

        // サイズオプションラベルを作成
        const sizeOptionsLabel = document.createElement('div');
        sizeOptionsLabel.className = 'eraser-options-label';
        sizeOptionsLabel.textContent = '消しゴムサイズ:';
        sizeOptionsLabel.style.marginBottom = '5px';
        eraserOptionsContainer.appendChild(sizeOptionsLabel);

        // サイズオプションを作成
        const sizeOptions = document.createElement('div');
        sizeOptions.className = 'eraser-size-options';
        sizeOptions.style.display = 'flex';
        sizeOptions.style.justifyContent = 'space-between';

        // 小、中、大のサイズオプションを追加
        const sizes = [
            { name: 'small', size: 20, label: '小' },
            { name: 'medium', size: 30, label: '中' },
            { name: 'large', size: 50, label: '大' }
        ];

        sizes.forEach(sizeOpt => {
            const sizeBtn = document.createElement('button');
            sizeBtn.className = `eraser-size-btn ${sizeOpt.name}${sizeOpt.name === 'medium' ? ' active' : ''}`;
            sizeBtn.setAttribute('data-size', sizeOpt.size);
            sizeBtn.textContent = sizeOpt.label;
            sizeBtn.style.flex = '1';
            sizeBtn.style.margin = '0 2px';
            sizeBtn.style.padding = '5px';
            sizeBtn.style.backgroundColor = sizeOpt.name === 'medium' ? '#007bff' : '#e0e0e0';
            sizeBtn.style.color = sizeOpt.name === 'medium' ? 'white' : 'black';
            sizeBtn.style.border = 'none';
            sizeBtn.style.borderRadius = '3px';
            sizeBtn.style.cursor = 'pointer';

            // サイズボタンのクリックイベント
            addClickEvent(sizeBtn, (event) => {
                event.preventDefault();
                // アクティブなボタンのスタイルを更新
                document.querySelectorAll('.eraser-size-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.backgroundColor = '#e0e0e0';
                    btn.style.color = 'black';
                });
                sizeBtn.classList.add('active');
                sizeBtn.style.backgroundColor = '#007bff';
                sizeBtn.style.color = 'white';

                // 消しゴムモードのサイズを設定
                eraserMode.setEraserSize(parseInt(sizeBtn.getAttribute('data-size')));
            });

            sizeOptions.appendChild(sizeBtn);
        });

        eraserOptionsContainer.appendChild(sizeOptions);

        // モードオプションラベルを作成
        const modeOptionsLabel = document.createElement('div');
        modeOptionsLabel.className = 'eraser-options-label';
        modeOptionsLabel.textContent = '消去モード:';
        modeOptionsLabel.style.marginTop = '10px';
        modeOptionsLabel.style.marginBottom = '5px';
        eraserOptionsContainer.appendChild(modeOptionsLabel);

        // モードオプションを作成
        const modeOptions = document.createElement('div');
        modeOptions.className = 'eraser-mode-options';
        modeOptions.style.display = 'flex';

        // アクティブレイヤーのみ、すべてのレイヤーのオプションを追加
        const modes = [
            { name: 'active', label: 'アクティブレイヤーのみ' },
            { name: 'all', label: 'すべてのレイヤー' }
        ];

        modes.forEach(modeOpt => {
            const modeBtn = document.createElement('button');
            modeBtn.className = `eraser-mode-btn ${modeOpt.name}${modeOpt.name === 'active' ? ' active' : ''}`;
            modeBtn.setAttribute('data-mode', modeOpt.name);
            modeBtn.textContent = modeOpt.label;
            modeBtn.style.flex = '1';
            modeBtn.style.margin = '0 2px';
            modeBtn.style.padding = '5px';
            modeBtn.style.backgroundColor = modeOpt.name === 'active' ? '#007bff' : '#e0e0e0';
            modeBtn.style.color = modeOpt.name === 'active' ? 'white' : 'black';
            modeBtn.style.border = 'none';
            modeBtn.style.borderRadius = '3px';
            modeBtn.style.cursor = 'pointer';

            // モードボタンのクリックイベント
            addClickEvent(modeBtn, (event) => {
                event.preventDefault();
                // アクティブなボタンのスタイルを更新
                document.querySelectorAll('.eraser-mode-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.backgroundColor = '#e0e0e0';
                    btn.style.color = 'black';
                });
                modeBtn.classList.add('active');
                modeBtn.style.backgroundColor = '#007bff';
                modeBtn.style.color = 'white';

                // 消しゴムモードのモードを設定
                eraserMode.setEraseMode(modeBtn.getAttribute('data-mode'));
            });

            modeOptions.appendChild(modeBtn);
        });

        eraserOptionsContainer.appendChild(modeOptions);

        // 消しゴムボタンのクリックイベントを拡張
        const originalEraserClickHandler = eraserBtn.onclick;
        eraserBtn.onclick = null; // 元のイベントをクリア
        
        addClickEvent(eraserBtn, (event) => {
            console.log('Main: 消しゴムボタンがクリックされました');
            event.preventDefault();

            // 全モードを非アクティブ化
            deactivateAllModes();

            // 消しゴムモードをアクティブ化
            eraserMode.activate();

            // 消しゴムオプションを表示
            eraserOptionsContainer.style.display = 'block';

            // 消しゴムボタンをアクティブスタイルに
            eraserBtn.classList.add('active-tool');
        });

        // DLWタブに追加
        dlwTab.appendChild(eraserOptionsContainer);

        console.log('Main: 消しゴムオプションを作成しました');
    }

    // 消しゴムオプション作成を呼び出し
    createEraserOptions();

    // ------------------------------------------------------------
    // イベントリスナーの設定
    // ------------------------------------------------------------

    // アイコンボタンにイベントリスナーを設定
    function setupIconButtons() {
        const iconButtons = document.querySelectorAll('.icon-button');
        console.log(`Main: ${iconButtons.length}個のアイコンボタンにイベントリスナーを設定`);

        iconButtons.forEach(button => {
            addClickEvent(button, (event) => {
                const iconId = button.getAttribute('data-icon-id');
                const iconFile = button.getAttribute('data-icon-file');
                console.log(`Main: アイコンボタンがクリック: ${iconId}, ファイル: ${iconFile}`);
                event.preventDefault();

                // 全モードを非アクティブ化
                deactivateAllModes();

                // スタンプモードをアクティブにする
                stampMode.activateWithCustomIcon(`Tool/icons/${iconFile}`, iconId);

                // アイコンボタンをアクティブスタイルに
                button.classList.add('active-tool');
            });
        });
    }

    // アイコンボタンの初期設定
    setupIconButtons();

    // イベント伝播防止
    function preventDefaultForCanvas(event) {
        if (event.target === layerManager.layers.overlay) {
            event.preventDefault();
        }
    }

    // オーバーレイレイヤーのイベント伝播を防止
    drawArea.addEventListener('touchstart', preventDefaultForCanvas, { passive: false });
    drawArea.addEventListener('touchmove', preventDefaultForCanvas, { passive: false });
    drawArea.addEventListener('touchend', preventDefaultForCanvas, { passive: false });

    // クリックイベントとタッチイベントを統一的に処理
    function addClickEvent(element, handler) {
        if (!element) {
            console.error('Main: 要素がnullまたはundefinedです');
            return;
        }

        element.addEventListener('click', handler);
        element.addEventListener('touchend', (event) => {
            event.preventDefault();
            event.stopPropagation();
            handler(event);
        }, { passive: false });
    }

    // リロードボタンのイベント
    addClickEvent(reloadBtn, (event) => {
        console.log('Main: リロードボタンがクリックされました');
        event.preventDefault();

        // 全モードを非アクティブ化
        deactivateAllModes();

        // すべてのレイヤーをクリア
        layerManager.clearAllLayers();

        // データモデルをクリア
        canvasDataModel.clearAll();

        // 背景を再読み込み
        backgroundManager.loadDefaultBackground();

        console.log('Main: キャンバスをリロードしました');
    });

    // フリードローボタンのイベント
    if (freeDrawBtn) {
        addClickEvent(freeDrawBtn, (event) => {
            console.log('Main: フリードローボタンがクリックされました');
            event.preventDefault();

            // 全モードを非アクティブ化
            deactivateAllModes();

            // フリードローモードをアクティブ化
            freeDrawMode.activate();

            // フリードローボタンをアクティブスタイルに
            freeDrawBtn.classList.add('active-tool');
        });
    } else {
        console.error('Main: freeDrawBtnがDOMに見つかりません');
    }

    // 色ボタンのイベント
    colorButtons.forEach(button => {
        addClickEvent(button, (event) => {
            const color = button.getAttribute('data-color');
            console.log(`Main: 色 ${color} が選択されました`);
            event.preventDefault();

            // フリードローモードがアクティブなら色を設定
            if (freeDrawMode.isActive) {
                switch(color) {
                    case 'black':
                        freeDrawMode.setColor('rgb(0,0,0)');
                        break;
                    case 'red':
                        freeDrawMode.setColor('rgb(235,31,14)');
                        break;
                    case 'blue':
                        freeDrawMode.setColor('rgb(0,140,255)');
                        break;
                }
            }
        });
    });

    // 線幅ボタンのイベント
    lineWidthButtons.forEach(button => {
        addClickEvent(button, (event) => {
            const width = parseInt(button.getAttribute('data-width'));
            console.log(`Main: 線幅 ${width} が選択されました`);
            event.preventDefault();

            // フリードローモードがアクティブなら線幅を設定
            if (freeDrawMode.isActive) {
                freeDrawMode.setLineWidth(width);
            }
        });
    });

    // タブボタンのイベント
    tabButtons.forEach(button => {
        addClickEvent(button, (event) => {
            event.preventDefault();
            event.stopPropagation();

            const tabId = button.getAttribute('data-tab');
            console.log(`Main: タブボタンがクリック: ${tabId}`);

            // タブ切り替え
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // タブ切り替え時にすべてのモードを非アクティブ化
            deactivateAllModes();

            // タブ切り替え後に再度アイコンボタンのイベントリスナーを設定
            setupIconButtons();
        });
    });

    // ------------------------------------------------------------
    // ユーティリティ関数
    // ------------------------------------------------------------

    // すべてのモードを非アクティブ化
    function deactivateAllModes() {
        console.log('Main: すべてのモードを非アクティブ化');

        // テキストモードを非アクティブ化する前に、テキストを確定
        if (textMode && textMode.isActive) {
            textMode.commitText();
        }

        // 各モードを非アクティブ化
        stampMode.deactivate();
        elasticDrawMode.deactivate();
        powerChainMode.deactivate();
        freeDrawMode.deactivate();
        eraserMode.deactivate();
        textMode.deactivate();

        // テキストオプションを非表示
        const textOptionsContainer = document.getElementById('text-options-container');
        if (textOptionsContainer) {
            textOptionsContainer.style.display = 'none';
        }

        // 消しゴムオプションを非表示
        const eraserOptionsContainer = document.getElementById('eraser-options-container');
        if (eraserOptionsContainer) {
            eraserOptionsContainer.style.display = 'none';
        }

        // すべてのツールボタンからアクティブスタイルを削除
        document.querySelectorAll('.tool-button, .icon-button').forEach(btn => {
            btn.classList.remove('active-tool');
        });
    }

    // レイヤーのリサイズ
    function resizeLayers() {
        console.log('Main: レイヤーをリサイズ');

        const drawArea = document.querySelector('.draw-area');
        if (drawArea && layerManager) {
            layerManager.resizeAllLayers(drawArea.offsetWidth, drawArea.offsetHeight);
        }
    }

    // 初期リサイズ
    resizeLayers();

    // ウィンドウリサイズ時のイベント
    window.addEventListener('resize', resizeLayers);

    // ------------------------------------------------------------
    // キーボードショートカット
    // ------------------------------------------------------------

    // キーボードショートカットを設定
    document.addEventListener('keydown', (event) => {
        // ESCキーでモードをキャンセル
        if (event.key === 'Escape') {
            deactivateAllModes();
        }
        
        // 削除キーで選択中のスタンプを削除
        if ((event.key === 'Delete' || event.key === 'Backspace') && 
            window.stampMode && window.stampMode.selectedStamp) {
            const stampId = window.stampMode.selectedStamp.id;
            window.canvasDataModel.removeElement('stamp', stampId);
            window.stampMode.clearSelection();
            
            // スタンプレイヤーを再描画
            window.stampMode.redrawAllStamps();
            
            // データモデルの変更を保存
            window.canvasDataModel.saveToLocalStorage();
        }
    });

    // ------------------------------------------------------------
    // 初期化の完了と正しいタブの設定
    // ------------------------------------------------------------

    // レイヤーの再描画
    if (dataLoaded) {
        layerManager.redrawAllLayers();
    }

    // ウィンドウ読み込み完了時の処理
    window.addEventListener('load', () => {
        console.log('Main: ウィンドウの読み込みが完了');

        // 追加: Webビューワー対策 - 背景が読み込まれているか確認し、読み込まれていなければ再読み込み
        setTimeout(() => {
            console.log('Main: Webビューワー対策 - 背景の強制再描画を実行');
            if (window.backgroundManager && window.backgroundManager.backgroundImage) {
                // 背景を再描画
                window.backgroundManager.resetCanvas();
                window.backgroundManager.drawBackground('contain', true);
                console.log('Main: 背景の強制再描画が完了');
            } else if (window.backgroundManager) {
                // 背景画像がまだ読み込まれていない場合は再度読み込み
                console.log('Main: 背景画像が未読み込み - デフォルト背景を再読み込み');
                window.backgroundManager.loadDefaultBackground().then(() => {
                    console.log('Main: 遅延読み込みによる背景設定完了');
                });
            }
        }, 500); // 500ミリ秒の遅延

        const dlwTab = document.querySelector('[data-tab="DLW"]');
        const dlwContent = document.getElementById('DLW');

        console.log('Main: DLWタブの存在確認:', {
            tab: !!dlwTab,
            content: !!dlwContent
        });

        // タブの初期化
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        if (dlwTab && dlwContent) {
            dlwTab.classList.add('active');
            dlwContent.classList.add('active');
            console.log('Main: DLWタブを初期化してアクティブ化');
        } else {
            console.error('Main: DLWタブまたはコンテンツが見つかりません');
        }

        // 再度確認
        console.log('Main: 初期化後のfreeDrawBtn:', !!document.getElementById('freeDrawBtn'));

        // アイコンボタンのイベントリスナーを設定
        setupIconButtons();
    });

    // iPadでのスクロール防止
    document.body.addEventListener('touchmove', function(e) {
        if (e.target.tagName !== 'CANVAS') {
            e.preventDefault();
        }
    }, { passive: false });

    // ------------------------------------------------------------
    // FileMaker連携用のグローバル関数
    // ------------------------------------------------------------

    // GetDrawImageFunctionをグローバルスコープで利用可能にする
    // (Utils.jsですでに定義済み)

    // テキスト機能に関するグローバル関数
    window.getTextModeInstance = function() {
        return textMode;
    };

    // スタンプ選択機能に関するグローバル関数
    window.getSelectedStamp = function() {
        if (window.stampMode && window.stampMode.selectedStamp) {
            return window.stampMode.selectedStamp;
        }
        return null;
    };

    // スタンプ削除機能に関するグローバル関数
    window.deleteSelectedStamp = function() {
        if (window.stampMode && window.stampMode.selectedStamp) {
            const stampId = window.stampMode.selectedStamp.id;
            window.canvasDataModel.removeElement('stamp', stampId);
            window.stampMode.clearSelection();
            window.stampMode.redrawAllStamps();
            window.canvasDataModel.saveToLocalStorage();
            return true;
        }
        return false;
    };

    console.log('Main: 初期化完了');
});