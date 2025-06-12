// FileMaker WebViewer カーソル＆クリック修正 シンプル版
(function() {
  console.log('FileMaker WebViewer カーソル＆クリック修正 シンプル版を適用');
  
  // 1. 環境検出
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isFileMaker = window.FileMaker !== undefined || 
                      navigator.userAgent.indexOf('FileMaker') !== -1 ||
                      (isSafari && (navigator.platform === 'MacIntel' || /iPad|iPhone|iPod/.test(navigator.userAgent)));
  
  console.log(`FileMaker検出: ${isFileMaker}, Safari検出: ${isSafari}`);
  
  if (!isFileMaker && !isSafari) {
    console.log('FileMakerまたはSafariではないため、修正は適用されません');
    return;
  }
  
  // 2. 長押し防止スタイルを追加
  function addPreventLongPressStyle() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .icon-button, .tool-button, .tab-button, .stamp-buttons, .icon-wrapper, .icon-img {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        touch-action: manipulation;
      }
      
      /* iOSの長押しメニュー対策 */
      body, .draw-area, .tool-area, canvas, .tab-pane, .icon-button * {
        -webkit-touch-callout: none;
      }
    `;
    document.head.appendChild(styleElement);
    console.log('長押し防止スタイルを追加しました');
  }
  
  // 3. カスタムカーソル管理
  // 3.1 カスタムカーソル用のコンテナを作成
  function createCustomCursorContainer() {
    let cursorContainer = document.getElementById('fm-cursor-container');
    if (cursorContainer) return cursorContainer;
    
    cursorContainer = document.createElement('div');
    cursorContainer.id = 'fm-cursor-container';
    cursorContainer.style.position = 'fixed';
    cursorContainer.style.top = '0';
    cursorContainer.style.left = '0';
    cursorContainer.style.width = '100%';
    cursorContainer.style.height = '100%';
    cursorContainer.style.pointerEvents = 'none'; // 重要: ポインターイベントを通過させる
    cursorContainer.style.zIndex = '10000';
    document.body.appendChild(cursorContainer);
    
    return cursorContainer;
  }
  
  // 3.2 カーソル更新関数
  function updateCustomCursor(e) {
    const cursorImage = document.getElementById('fm-cursor-image');
    if (!cursorImage) return;
    
    cursorImage.style.left = e.clientX + 'px';
    cursorImage.style.top = e.clientY + 'px';
  }
  
  // 3.3 カスタムカーソルのセットアップ
  function setupCustomCursor() {
    // draw-area要素を取得
    const drawArea = document.querySelector('.draw-area');
    if (!drawArea) {
      console.error('draw-area要素が見つかりません');
      return;
    }
    
    // マウス移動イベントリスナーを設定
    drawArea.addEventListener('mousemove', updateCustomCursor);
    drawArea.addEventListener('mouseleave', hideCustomCursor);
    drawArea.addEventListener('mouseenter', showCustomCursor);
    
    // カーソル非表示関数
    function hideCustomCursor() {
      const cursorImage = document.getElementById('fm-cursor-image');
      if (cursorImage) {
        cursorImage.style.display = 'none';
      }
    }
    
    // カーソル表示関数
    function showCustomCursor(e) {
      const cursorImage = document.getElementById('fm-cursor-image');
      if (cursorImage) {
        cursorImage.style.display = 'block';
        updateCustomCursor(e);
      }
    }
    
    // カスタムカーソルをセットアップする関数を公開
    window.setCustomCursor = function(imageSrc) {
      const cursorContainer = createCustomCursorContainer();
      
      // 既存のカーソル画像を削除
      const oldCursor = document.getElementById('fm-cursor-image');
      if (oldCursor) {
        cursorContainer.removeChild(oldCursor);
      }
      
      // カーソル画像が指定されていなければ終了
      if (!imageSrc) {
        return;
      }
      
      // 新しいカーソル画像を作成
      const cursorImage = document.createElement('img');
      cursorImage.id = 'fm-cursor-image';
      cursorImage.src = imageSrc;
      cursorImage.style.position = 'fixed';
      cursorImage.style.width = '30px';
      cursorImage.style.height = 'auto';
      cursorImage.style.transform = 'translate(-50%, -50%)';
      cursorImage.style.pointerEvents = 'none';
      cursorImage.style.zIndex = '10001';
      cursorImage.style.webkitUserSelect = 'none';
      cursorImage.style.userSelect = 'none';
      cursorImage.style.webkitTouchCallout = 'none';
      
      // コンテナに追加
      cursorContainer.appendChild(cursorImage);
      
      // 初期位置を設定
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      updateCustomCursor(mouseEvent);
    };
    
    // カスタムカーソルを削除する関数を公開
    window.removeCustomCursor = function() {
      const cursorImage = document.getElementById('fm-cursor-image');
      if (cursorImage && cursorImage.parentNode) {
        cursorImage.parentNode.removeChild(cursorImage);
      }
    };
  }
  
  // 4. 座標変換の修正
  function calculateCanvasCoordinates(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    
    // スケールファクターを計算
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // クライアント座標を取得
    let clientX, clientY;
    if (e.changedTouches && e.changedTouches.length) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // キャンバス座標に変換
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    
    return { x, y };
  }
  
  // 5. StampModeの修正（シンプルバージョン）
  function fixStampMode() {
    if (!window.StampMode) {
      setTimeout(fixStampMode, 500);
      return;
    }
    
    // StampModeのactivateメソッドを修正
    const originalActivate = StampMode.prototype.activate;
    StampMode.prototype.activate = function(stampType) {
      // 元のメソッドを呼び出し
      originalActivate.call(this, stampType);
      
      // カスタムカーソルを設定
      window.setCustomCursor(this.currentStamp);
    };
    
    // StampModeのactivateWithCustomIconメソッドを修正
    const originalActivateWithIcon = StampMode.prototype.activateWithCustomIcon;
    StampMode.prototype.activateWithCustomIcon = function(iconPath, iconId) {
      // 元のメソッドを呼び出し
      originalActivateWithIcon.call(this, iconPath, iconId);
      
      // カスタムカーソルを設定
      window.setCustomCursor(this.currentStamp);
    };
    
    // StampModeのdeactivateメソッドを修正
    const originalDeactivate = StampMode.prototype.deactivate;
    StampMode.prototype.deactivate = function() {
      // 元のメソッドを呼び出し
      originalDeactivate.call(this);
      
      // カスタムカーソルを削除
      window.removeCustomCursor();
    };
  }
  
  // 6. タッチイベント改善
  function improveStampTouch() {
    const stampLayer = document.getElementById('stamp-layer');
    if (!stampLayer) {
      setTimeout(improveStampTouch, 500);
      return;
    }
    
    // タッチ終了イベントハンドラ
    function handleStampTouch(e) {
      if (!window.stampMode || !window.stampMode.isActive) {
        return;
      }
      
      // デフォルト動作を防止
      e.preventDefault();
      
      // 座標を計算
      const coords = calculateCanvasCoordinates(e, stampLayer);
      
      // スタンプを配置
      if (window.stampMode._placeStampAtPosition) {
        window.stampMode._placeStampAtPosition(coords.x, coords.y);
      }
    }
    
    // draw-areaにもイベントを追加
    const drawArea = document.querySelector('.draw-area');
    if (drawArea) {
      drawArea.addEventListener('touchend', handleStampTouch, { passive: false });
    }
    
    // スタンプレイヤーにイベントを追加
    stampLayer.addEventListener('touchend', handleStampTouch, { passive: false });
  }
  
  // 7. 長押し対策強化
  function preventLongPress() {
    // すべてのアイコンボタン
    const icons = document.querySelectorAll('.icon-button, .icon-img, .icon-wrapper');
    icons.forEach(icon => {
      icon.style.webkitTouchCallout = 'none';
      icon.style.webkitUserSelect = 'none';
      icon.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
      icon.addEventListener('contextmenu', e => e.preventDefault());
    });
    
    // 全体の長押し対策
    document.addEventListener('touchstart', function(e) {
      // 入力要素以外は長押し無効化
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  // 8. 初期化
  function init() {
    console.log('FileMaker WebViewer カーソル＆クリック修正 シンプル版を初期化');
    
    // 長押し防止スタイルを追加
    addPreventLongPressStyle();
    
    // カスタムカーソル機能を初期化
    setupCustomCursor();
    
    // StampModeを修正
    fixStampMode();
    
    // タッチイベントを改善
    improveStampTouch();
    
    // 長押し対策を強化
    preventLongPress();
    
    console.log('初期化完了');
  }
  
  // 初期化実行
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();