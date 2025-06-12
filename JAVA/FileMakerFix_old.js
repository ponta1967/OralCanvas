// FileMaker WebViewer カーソル＆クリック修正 V7
(function() {
  console.log('FileMaker WebViewer カーソル＆クリック修正 V7を適用');
  
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
  
  // 長押し防止スタイルを追加
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
  
  // 2. カスタムカーソル管理
  // 2.1 カスタムカーソル用のコンテナを作成
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
    
    console.log('カスタムカーソルコンテナを作成しました');
    return cursorContainer;
  }
  
  // 2.2 カーソル更新関数
  function updateCustomCursor(e) {
    const cursorImage = document.getElementById('fm-cursor-image');
    if (!cursorImage) return;
    
    cursorImage.style.left = e.clientX + 'px';
    cursorImage.style.top = e.clientY + 'px';
  }
  
  // 2.3 カスタムカーソルのセットアップ
  function setupCustomCursor() {
    // draw-area要素を取得
    const drawArea = document.querySelector('.draw-area');
    if (!drawArea) {
      console.error('draw-area要素が見つかりません');
      return;
    }
    
    // マウス移動イベントリスナーを設定（document全体ではなくdraw-areaに限定）
    drawArea.addEventListener('mousemove', updateCustomCursor);
    
    // マウスがdraw-areaから出た時のイベントを追加
    drawArea.addEventListener('mouseleave', hideCustomCursor);
    
    // マウスがdraw-areaに入った時のイベントを追加
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
        // 位置も更新
        updateCustomCursor(e);
      }
    }
    
    // カスタムカーソルをセットアップする関数を公開
    window.setCustomCursor = function(imageSrc) {
      // カーソルコンテナを取得または作成
      const cursorContainer = createCustomCursorContainer();
      
      // 既存のカーソル画像を削除
      const oldCursor = document.getElementById('fm-cursor-image');
      if (oldCursor) {
        cursorContainer.removeChild(oldCursor);
      }
      
      // カーソル画像が指定されていなければ終了（デフォルトカーソルに戻す）
      if (!imageSrc) {
        console.log('カスタムカーソルを解除しました');
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
      cursorImage.style.pointerEvents = 'none'; // 重要: ポインターイベントを通過させる
      cursorImage.style.zIndex = '10001';
      cursorImage.style.webkitUserSelect = 'none';
      cursorImage.style.userSelect = 'none';
      cursorImage.style.webkitTouchCallout = 'none';
      
      // マウスがdraw-area外にある場合は最初は非表示に
      if (!isMouseOverDrawArea()) {
        cursorImage.style.display = 'none';
      }
      
      // コンテナに追加
      cursorContainer.appendChild(cursorImage);
      
      console.log(`カスタムカーソルを設定しました: ${imageSrc}`);
      
      // 初期位置を設定
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      updateCustomCursor(mouseEvent);
    };
    
    // マウスがdraw-area上にあるかどうかを判定する関数
    function isMouseOverDrawArea() {
      const drawArea = document.querySelector('.draw-area');
      if (!drawArea) return false;
      
      // 現在のマウス位置情報がない場合はfalseを返す
      if (!window.event) return false;
      
      const rect = drawArea.getBoundingClientRect();
      const mouseX = window.event.clientX;
      const mouseY = window.event.clientY;
      
      return (
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom
      );
    }
    
    // カスタムカーソルを削除する関数を公開
    window.removeCustomCursor = function() {
      const cursorImage = document.getElementById('fm-cursor-image');
      if (cursorImage && cursorImage.parentNode) {
        cursorImage.parentNode.removeChild(cursorImage);
      }
      console.log('カスタムカーソルを削除しました');
    };
    
    console.log('カスタムカーソル機能を初期化しました');
  }
  
  // 3. 座標変換のデバッグと修正
  // 3.1 キャンバス座標を正確に計算する関数
  function calculateCanvasCoordinates(e, canvas) {
    // キャンバスの境界矩形を取得
    const rect = canvas.getBoundingClientRect();
    console.log(`キャンバス境界: 左=${rect.left}, 上=${rect.top}, 幅=${rect.width}, 高さ=${rect.height}`);
    
    // スケールファクターを計算（キャンバスの実際のサイズとCSS表示サイズの比率）
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    console.log(`スケールファクター: X=${scaleX}, Y=${scaleY}`);
    
    // クライアント座標を取得
    let clientX, clientY;
    if (e.changedTouches && e.changedTouches.length) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    console.log(`クライアント座標: X=${clientX}, Y=${clientY}`);
    
    // キャンバス座標に変換
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    
    console.log(`計算されたキャンバス座標: X=${x}, Y=${y}`);
    
    // FileMakerの場合、追加のオフセット補正（必要に応じて調整）
    if (isFileMaker) {
      // オフセット補正値（必要に応じて調整）
      const offsetX = 0;
      const offsetY = 0;
      
      x += offsetX;
      y += offsetY;
      console.log(`FileMaker補正後座標: X=${x}, Y=${y}`);
    }
    
    return { x, y };
  }
  
  // 3.2 画像パス解決関数
  function resolveImagePath(src) {
    // すでに絶対URLの場合はそのまま返す
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    
    // ベースURLを取得
    const baseUrl = window.location.href.split('/').slice(0, -1).join('/') + '/';
    
    // 相対パスを解決
    let resolvedPath;
    if (src.startsWith('/')) {
      // ルートからのパス
      const rootUrl = window.location.origin;
      resolvedPath = rootUrl + src;
    } else {
      // 現在のURLからの相対パス
      resolvedPath = baseUrl + src;
    }
    
    console.log(`パス解決: ${src} → ${resolvedPath}`);
    return resolvedPath;
  }
  
  // 4. 直接描画関数（座標変換問題に対応）
  function directDrawStamp(src, x, y, width, stampId) {
    console.log(`FileMaker用直接描画: ${src} (${x}, ${y})`);
    
    // スタンプレイヤーの取得
    const canvas = document.getElementById('stamp-layer');
    if (!canvas) {
      console.error('スタンプレイヤーが見つかりません');
      return false;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('コンテキストが取得できません');
      return false;
    }
    
    // 画像パスを解決
    const resolvedSrc = resolveImagePath(src);
    
    // キャッシュ回避のためのタイムスタンプ
    const timestamp = Date.now();
    
    // 画像のロードと描画
    const img = new Image();
    
    // イベントハンドラを設定
    img.onload = function() {
      console.log(`画像ロード成功: ${resolvedSrc} (${img.width}x${img.height})`);
      
      // 画像の縦横比を計算
      const aspectRatio = img.height / img.width;
      const height = width * aspectRatio;
      
      try {
        // 描画前の状態を保存
        ctx.save();
        
        // デバッグのための位置表示
        console.log(`描画位置: X=${x-width/2}, Y=${y-height/2}, 幅=${width}, 高さ=${height}`);
        
        // 描画
        ctx.drawImage(img, x - width/2, y - height/2, width, height);
        console.log(`スタンプ描画成功: ${stampId} at (${x}, ${y})`);
        
        // 状態を復元
        ctx.restore();
        
        // データモデルにスタンプを追加
        if (window.canvasDataModel) {
          const stampData = {
            id: stampId || ('fm_' + timestamp),
            src: src, // オリジナルのパスを保存
            x: x,
            y: y,
            width: width,
            height: height,
            type: 'filemaker_fix',
            timestamp: timestamp,
            loaded: true
          };
          
          window.canvasDataModel.addElement('stamp', stampData);
          window.canvasDataModel.saveToLocalStorage();
          console.log(`スタンプをデータモデルに保存: ${stampId}`);
          return true;
        }
      } catch (e) {
        console.error('スタンプ描画エラー:', e);
      }
    };
    
    img.onerror = function() {
      console.error(`画像ロード失敗: ${resolvedSrc}`);
      
      // 別の解決方法を試す（代替パスを試行）
      if (src.includes('Tool/icons/')) {
        // 絶対パスで試す（FileMakerの場合、相対パスが正しく解決されない可能性がある）
        const altPath = window.location.origin + '/' + src;
        console.log(`代替パスを試行: ${altPath}`);
        
        const altImg = new Image();
        altImg.onload = function() {
          console.log(`代替パスで成功: ${altPath}`);
          
          // 画像の縦横比を計算
          const aspectRatio = altImg.height / altImg.width;
          const height = width * aspectRatio;
          
          ctx.drawImage(altImg, x - width/2, y - height/2, width, height);
          
          // データモデルにスタンプを追加
          if (window.canvasDataModel) {
            const stampData = {
              id: stampId || ('fm_alt_' + timestamp),
              src: src,
              x: x,
              y: y,
              width: width,
              height: height,
              type: 'filemaker_fix',
              timestamp: timestamp,
              loaded: true,
              altPathUsed: true
            };
            
            window.canvasDataModel.addElement('stamp', stampData);
            window.canvasDataModel.saveToLocalStorage();
          }
        };
        
        altImg.onerror = function() {
          console.error(`代替パスも失敗: ${altPath}`);
          
          // エラー時は赤い四角を表示
          ctx.fillStyle = 'rgba(255,0,0,0.5)';
          ctx.fillRect(x - width/2, y - width/2, width, width);
        };
        
        altImg.src = altPath + '?fm=' + timestamp;
      } else {
        // エラー時は赤い四角を表示
        ctx.fillStyle = 'rgba(255,0,0,0.5)';
        ctx.fillRect(x - width/2, y - width/2, width, width);
      }
    };
    
    // FileMaker WebViewerではキャッシュが問題になるため強制的にバイパス
    img.src = resolvedSrc + '?fm=' + timestamp;
    
    return true;
  }
  
  // iPad専用の直接描画関数
  function directDrawIpadStamp(src, x, y, width, stampId) {
    console.log(`iPad用直接描画: ${src} (${x}, ${y})`);
    
    // スタンプレイヤーの取得
    const canvas = document.getElementById('stamp-layer');
    if (!canvas) {
      console.error('スタンプレイヤーが見つかりません');
      return false;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('コンテキストが取得できません');
      return false;
    }
    
    // 画像パスを解決
    const resolvedSrc = resolveImagePath(src);
    
    // キャッシュ回避のためのタイムスタンプ
    const timestamp = Date.now();
    
    // 画像のロードと描画
    const img = new Image();
    
    // イベントハンドラを設定
    img.onload = function() {
      console.log(`iPad画像ロード成功: ${resolvedSrc} (${img.width}x${img.height})`);
      
      // 画像の縦横比を計算
      const aspectRatio = img.height / img.width;
      const height = width * aspectRatio;
      
      try {
        // 描画前の状態を保存
        ctx.save();
        
        // 描画
        ctx.drawImage(img, x - width/2, y - height/2, width, height);
        console.log(`iPadスタンプ描画成功: ${stampId} at (${x}, ${y})`);
        
        // 状態を復元
        ctx.restore();
      } catch (e) {
        console.error('iPadスタンプ描画エラー:', e);
      }
    };
    
    img.onerror = function() {
      console.error(`iPad画像ロード失敗: ${resolvedSrc}`);
      
      // エラー時は赤い四角を表示
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(x - width/2, y - width/2, width, width);
    };
    
    // FileMaker WebViewerではキャッシュが問題になるため強制的にバイパス
    img.src = resolvedSrc + '?fm=' + timestamp;
    
    return true;
  }
  
  // 5. タブ切り替え時のスタンプ保持を設定する関数
  function setupTabSwitchPersistence() {
    // タブボタンのクリックイベントに追加の処理を加える
    const tabButtons = document.querySelectorAll('.tab-button');
    if (!tabButtons.length) {
      console.log('タブボタンが見つかりません。1秒後に再試行します。');
      setTimeout(setupTabSwitchPersistence, 1000);
      return;
    }
    
    // 元のタブクリックイベントを保持しながら追加処理を行う
    tabButtons.forEach(button => {
      // 元のクリックイベントをクローンする代わりに、新しいイベントを追加
      button.addEventListener('click', function(e) {
        // タブ切り替え前にデータを保存
        if (window.canvasDataModel) {
          window.canvasDataModel.saveToLocalStorage();
        }
        
        // タブ切り替え後にスタンプを再描画（遅延実行）
        setTimeout(() => {
          if (window.stampMode && window.stampMode.redrawAllStamps) {
            console.log('タブ切り替え後のスタンプ再描画');
            window.stampMode.redrawAllStamps();
          }
          
          // iPad用スタンプも描画
          if (window.drawIpadStamps) {
            window.drawIpadStamps();
          }
        }, 300);
      }, false);
      
      // タッチイベントも同様に処理
      button.addEventListener('touchend', function(e) {
        // タブ切り替え前にデータを保存
        if (window.canvasDataModel) {
          window.canvasDataModel.saveToLocalStorage();
        }
        
        // タブ切り替え後にスタンプを再描画（遅延実行）
        setTimeout(() => {
          if (window.stampMode && window.stampMode.redrawAllStamps) {
            console.log('タブ切り替え後のスタンプ再描画');
            window.stampMode.redrawAllStamps();
          }
          
          // iPad用スタンプも描画
          if (window.drawIpadStamps) {
            window.drawIpadStamps();
          }
        }, 300);
      }, { passive: true }); // パッシブイベントにして元のイベントを邪魔しない
    });
    
    console.log('タブ切り替え時のスタンプ保持処理を追加しました');
  }
  
  // 6. CanvasDataModel拡張 - iPad用
  function extendCanvasDataModel() {
    if (!window.canvasDataModel) {
      console.log('CanvasDataModelが見つかりません。1秒後に再試行します。');
      setTimeout(extendCanvasDataModel, 1000);
      return;
    }
    
    console.log('CanvasDataModelを拡張します - iPad用特別対応');
    
    // スタンプ保存のためのストレージキー
    const STAMP_STORAGE_KEY = 'fm_ipad_stamps';
    
    // iPad用スタンプ配列
    if (!window.fmIpadStamps) {
      window.fmIpadStamps = [];
      
      // ローカルストレージから読み込み
      try {
        const savedStamps = localStorage.getItem(STAMP_STORAGE_KEY);
        if (savedStamps) {
          window.fmIpadStamps = JSON.parse(savedStamps);
          console.log(`${window.fmIpadStamps.length}個のiPad用スタンプを読み込みました`);
        }
      } catch (e) {
        console.error('iPadスタンプの読み込みエラー:', e);
      }
    }
    
    // addElement メソッドをバックアップ
    if (!window.canvasDataModel._fm_original_addElement) {
      window.canvasDataModel._fm_original_addElement = window.canvasDataModel.addElement;
      
      // addElement メソッドを完全に上書き
      window.canvasDataModel.addElement = function(type, data) {
        console.log(`iPad拡張addElement: ${type}, ID: ${data.id}`);
        
        // スタンプタイプの場合の特別処理
        if (type === 'stamp') {
          // 新しいIDを生成
          const uniqueId = 'fm_ipad_' + Date.now().toString() + Math.floor(Math.random() * 10000);
          data.id = uniqueId;
          
          // 配列が存在しない場合は作成
          if (!this.elements[type]) {
            this.elements[type] = [];
          }
          
          // 通常のデータモデルに追加
          this.elements[type].push(data);
          
          // iPad用スタンプ配列にも追加
          window.fmIpadStamps.push({...data});
          
          // iPad用スタンプをローカルストレージに保存
          try {
            localStorage.setItem(STAMP_STORAGE_KEY, JSON.stringify(window.fmIpadStamps));
          } catch (e) {
            console.error('iPadスタンプの保存エラー:', e);
          }
          
          console.log(`iPadスタンプを追加: ${uniqueId}, 合計: ${window.fmIpadStamps.length}個`);
          return data;
        } else {
          // その他のタイプは元のメソッドを使用
          return this._fm_original_addElement(type, data);
        }
      };
    }
    
    // clearElementsByType メソッドをバックアップ
    if (!window.canvasDataModel._fm_original_clearElementsByType) {
      window.canvasDataModel._fm_original_clearElementsByType = window.canvasDataModel.clearElementsByType;
      
      // clearElementsByType メソッドを拡張
      window.canvasDataModel.clearElementsByType = function(type) {
        console.log(`iPad拡張clearElementsByType: ${type}`);
        
        // スタンプタイプの場合の特別処理
        if (type === 'stamp') {
          // iPad用スタンプ配列もクリア
          window.fmIpadStamps = [];
          
          // iPad用スタンプをローカルストレージから削除
          try {
            localStorage.removeItem(STAMP_STORAGE_KEY);
          } catch (e) {
            console.error('iPadスタンプの削除エラー:', e);
          }
        }
        
        // 元のメソッドを呼び出し
        return this._fm_original_clearElementsByType(type);
      };
    }
    
    // removeElement メソッドをバックアップ
    if (!window.canvasDataModel._fm_original_removeElement) {
      window.canvasDataModel._fm_original_removeElement = window.canvasDataModel.removeElement;
      
      // removeElement メソッドを拡張
      window.canvasDataModel.removeElement = function(type, id) {
        console.log(`iPad拡張removeElement: ${type}, ${id}`);
        
        // スタンプタイプの場合の特別処理
        if (type === 'stamp' && window.fmIpadStamps) {
          // iPad用スタンプ配列から削除
          window.fmIpadStamps = window.fmIpadStamps.filter(stamp => stamp.id !== id);
          
          // iPad用スタンプをローカルストレージに保存
          try {
            localStorage.setItem(STAMP_STORAGE_KEY, JSON.stringify(window.fmIpadStamps));
          } catch (e) {
            console.error('iPadスタンプの保存エラー:', e);
          }
        }
        
        // 元のメソッドを呼び出し
        return this._fm_original_removeElement(type, id);
      };
    }
    
    // iPad専用の描画メソッドを追加
    window.drawIpadStamps = function() {
      console.log('iPad用スタンプを描画します');
      
      if (!window.fmIpadStamps || window.fmIpadStamps.length === 0) {
        console.log('描画するiPadスタンプがありません');
        return;
      }
      
      // スタンプレイヤーを取得
      const canvas = document.getElementById('stamp-layer');
      if (!canvas) {
        console.error('スタンプレイヤーが見つかりません');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('コンテキストが取得できません');
        return;
      }
      
      // すべてのiPadスタンプを描画
      window.fmIpadStamps.forEach(stamp => {
        if (stamp && stamp.src) {
          // 直接描画関数を呼び出し（ID変更なし）
          directDrawIpadStamp(stamp.src, stamp.x, stamp.y, stamp.width, stamp.id);
        }
      });
      
      console.log(`${window.fmIpadStamps.length}個のiPadスタンプを描画しました`);
    };
    
    console.log('CanvasDataModelをiPad用に拡張しました');
  }
  
  // 7. StampModeのメソッド置き換え（カーソル対応強化）
  function replaceStampMethods() {
    if (!window.StampMode) {
      console.log('StampModeがまだ初期化されていません。1秒後に再試行します。');
      setTimeout(replaceStampMethods, 1000);
      return;
    }
    
    console.log('FileMaker用にStampModeのメソッドを上書きします');
    
    // オリジナルのactivateメソッドを保存
    if (!StampMode.prototype._fm_original_activate) {
      StampMode.prototype._fm_original_activate = StampMode.prototype.activate;
    }
    
    // activateメソッドを上書き（カーソル対応）
    StampMode.prototype.activate = function(stampType) {
      console.log(`FileMaker用置き換えactivate呼び出し (${stampType})`);
      
      this.isActive = true;
      this.currentStampType = stampType || 'default';
      
      // スタンプを設定
      this.currentStamp = 'Tool/Reload.png';
      if (stampType === 'TADS') {
        this.currentStamp = 'Tool/ImpAnc.png';
      } else if (stampType === 'HOOK') {
        this.currentStamp = 'Tool/Hook.png';
      }
      
      this.customIconId = null;
      
      // FileMaker用カスタムカーソルを設定
      if (window.setCustomCursor) {
        window.setCustomCursor(this.currentStamp);
      }
      
      // グローバル参照を設定
      window.stampMode = this;
      
      console.log(`FileMakerカスタムカーソルを設定: ${this.currentStamp}`);
    };
    
    // オリジナルのactivateWithCustomIconメソッドを保存
    if (!StampMode.prototype._fm_original_activateWithCustomIcon) {
      StampMode.prototype._fm_original_activateWithCustomIcon = StampMode.prototype.activateWithCustomIcon;
    }
    
    // activateWithCustomIconメソッドを上書き（カーソル対応）
    StampMode.prototype.activateWithCustomIcon = function(iconPath, iconId) {
      console.log(`FileMaker用置き換えactivateWithCustomIcon呼び出し (${iconPath}, ${iconId})`);
      
      this.isActive = true;
      this.currentStampType = 'custom';
      
      // アイコンパスを設定
      this.currentStamp = iconPath;
      if (iconPath.indexOf('/') === -1) {
        this.currentStamp = `Tool/${iconPath}`;
      }
      
      this.customIconId = iconId || 'unknown';
      
      // FileMaker用カスタムカーソルを設定
      if (window.setCustomCursor) {
        window.setCustomCursor(this.currentStamp);
      }
      
      // グローバル参照を設定
      window.stampMode = this;
      
      console.log(`FileMakerカスタムカーソルを設定: ${this.currentStamp}`);
    };
    
    // オリジナルのdeactivateメソッドを保存
    if (!StampMode.prototype._fm_original_deactivate) {
      StampMode.prototype._fm_original_deactivate = StampMode.prototype.deactivate;
    }
    
    // deactivateメソッドを上書き（カーソル対応）
    StampMode.prototype.deactivate = function() {
      console.log('FileMaker用置き換えdeactivate呼び出し');
      
      this.isActive = false;
      
      // FileMaker用カスタムカーソルを解除
      if (window.removeCustomCursor) {
        window.removeCustomCursor();
      }
      
      console.log('FileMakerカスタムカーソルを解除');
    };
    
    // オリジナルの_placeStampAtPositionメソッドを保存
    if (!StampMode.prototype._fm_original_placeStampAtPosition) {
      StampMode.prototype._fm_original_placeStampAtPosition = StampMode.prototype._placeStampAtPosition;
    }
    
    // 置き換えメソッド
    StampMode.prototype._placeStampAtPosition = function(x, y) {
      console.log(`iPad用_placeStampAtPosition (${x}, ${y})`);
      
      // 座標が不正な場合は処理しない
      if (isNaN(x) || isNaN(y) || x < 0 || y < 0) {
        console.warn(`不正な座標 (${x}, ${y})`);
        return;
      }
      
      // スタンプデータを作成
      const stampId = 'fm_ipad_' + Date.now().toString() + Math.floor(Math.random() * 10000);
      
      // iPad用のスタンプデータ
      const stampData = {
        id: stampId,
        src: this.currentStamp,
        x: x,
        y: y,
        width: this.stampWidth,
        height: this.stampWidth,
        type: 'filemaker_fix',
        timestamp: Date.now(),
        loaded: true
      };
      
      // 直接描画関数を呼び出し
      directDrawStamp(this.currentStamp, x, y, this.stampWidth, stampId);
      
      // CanvasDataModelに追加
      if (window.canvasDataModel) {
        window.canvasDataModel.addElement('stamp', stampData);
      }
      
      // iPad用スタンプ配列に直接追加（バックアップ）
      if (window.fmIpadStamps) {
        window.fmIpadStamps.push({...stampData});
        
        // ローカルストレージに保存
        try {
          localStorage.setItem('fm_ipad_stamps', JSON.stringify(window.fmIpadStamps));
        } catch (e) {
          console.error('iPadスタンプの保存エラー:', e);
        }
      }
    };
    
    // redrawStampメソッドも上書き
    if (!StampMode.prototype._fm_original_redrawStamp) {
      StampMode.prototype._fm_original_redrawStamp = StampMode.prototype.redrawStamp;
    }
    
    StampMode.prototype.redrawStamp = function(stampData) {
      console.log(`FileMaker用redrawStamp (${stampData.id})`);
      if (!stampData || !stampData.src) {
        console.warn('無効なスタンプデータ');
        return;
      }
      
      // 直接描画関数を呼び出し
      directDrawStamp(stampData.src, stampData.x, stampData.y, stampData.width, stampData.id);
    };
    
    // redrawAllStampsメソッドも上書き
    if (!StampMode.prototype._fm_original_redrawAllStamps) {
      StampMode.prototype._fm_original_redrawAllStamps = StampMode.prototype.redrawAllStamps;
    }
    
    StampMode.prototype.redrawAllStamps = function() {
      console.log('iPad用redrawAllStamps');
      
      // スタンプレイヤーをクリア
      this.layerManager.clearLayer('stamp');
      
      // 通常のスタンプ描画
      if (window.canvasDataModel) {
        const stamps = window.canvasDataModel.elements.stamp || [];
        console.log(`${stamps.length}個の通常スタンプを再描画します`);
        
        stamps.forEach(stamp => {
          if (stamp && stamp.src) {
            directDrawStamp(stamp.src, stamp.x, stamp.y, stamp.width, stamp.id);
          }
        });
      }
      
      // iPad用スタンプの描画
      if (window.drawIpadStamps) {
        window.drawIpadStamps();
      }
    };
    
    console.log('StampModeのメソッド上書きが完了しました');
  }
  
  // 8. グローバルのタッチ/クリックイベントハンドラを設定（座標変換を強化）
  function setupGlobalStampHandler() {
    // スタンプレイヤーを取得
    const stampLayer = document.getElementById('stamp-layer');
    if (!stampLayer) {
      console.log('スタンプレイヤーがまだ初期化されていません。1秒後に再試行します。');
      setTimeout(setupGlobalStampHandler, 1000);
      return;
    }
    
    console.log('FileMaker用グローバルスタンプハンドラを設定します');
    
    // グローバルハンドラ関数
    window._fm_handleStampClick = function(e) {
      if (!window.stampMode || !window.stampMode.isActive) {
        return;
      }
      
      console.log(`FileMaker用スタンプイベント: ${e.type}`);
      
      // イベントのデフォルト動作を防止
      e.preventDefault();
      e.stopPropagation();
      
      // 強化された座標変換を使用
      const coords = calculateCanvasCoordinates(e, stampLayer);
      
      // 座標チェック
      if (isNaN(coords.x) || isNaN(coords.y) || 
          coords.x < 0 || coords.y < 0 || 
          coords.x > stampLayer.width || coords.y > stampLayer.height) {
        console.warn(`範囲外の座標: (${coords.x}, ${coords.y})`);
        return;
      }
      
      // スタンプモードのメソッドを呼び出し
      if (window.stampMode && window.stampMode._placeStampAtPosition) {
        window.stampMode._placeStampAtPosition(coords.x, coords.y);
      }
    };
    
    // 既存のハンドラを削除（可能であれば）
    stampLayer.removeEventListener('click', window._fm_handleStampClick);
    stampLayer.removeEventListener('touchend', window._fm_handleStampClick);
    
    // 新しいハンドラを追加
    stampLayer.addEventListener('click', window._fm_handleStampClick);
    stampLayer.addEventListener('touchend', window._fm_handleStampClick, { passive: false });
    
    console.log('FileMaker用グローバルスタンプハンドラの設定が完了しました');
    
    // 重要: draw-areaにもクリックハンドラを追加（キャンバス全体をカバー）
    const drawArea = document.querySelector('.draw-area');
    if (drawArea) {
      drawArea.removeEventListener('click', window._fm_handleStampClick);
      drawArea.removeEventListener('touchend', window._fm_handleStampClick);
      
      drawArea.addEventListener('click', window._fm_handleStampClick);
      drawArea.addEventListener('touchend', window._fm_handleStampClick, { passive: false });
      
      // 長押しによるコンテキストメニュー表示を防止
      drawArea.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      
      console.log('draw-areaにもクリックハンドラを追加しました');
    } else {
      console.warn('draw-area要素が見つかりませんでした');
    }
  }
  
  // 9. 座標テストモード（デバッグ用）
  function createCoordinateTestMode() {
    // すでに存在する場合は作成しない
    if (document.getElementById('coord-test-button')) {
      return;
    }
    
    // ボタンを作成
    const testButton = document.createElement('div');
    testButton.id = 'coord-test-button';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '50px';
    testButton.style.left = '10px';
    testButton.style.backgroundColor = '#3498db'; // 青色
    testButton.style.color = 'white';
    testButton.style.padding = '5px 10px';
    testButton.style.borderRadius = '5px';
    testButton.style.fontWeight = 'bold';
    testButton.style.zIndex = '10000';
    testButton.style.fontSize = '14px';
    testButton.textContent = '座標テスト';
    testButton.style.webkitUserSelect = 'none';
    testButton.style.userSelect = 'none';
    testButton.style.webkitTouchCallout = 'none';
    
    // テスト用オーバーレイ
    const overlay = document.createElement('div');
    overlay.id = 'coord-test-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.3)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'none';
    overlay.style.cursor = 'crosshair';
    
    // 座標表示要素
    const coordDisplay = document.createElement('div');
    coordDisplay.id = 'coord-display';
    coordDisplay.style.position = 'fixed';
    coordDisplay.style.top = '10px';
    coordDisplay.style.left = '10px';
    coordDisplay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    coordDisplay.style.color = 'white';
    coordDisplay.style.padding = '5px 10px';
    coordDisplay.style.borderRadius = '5px';
    coordDisplay.style.fontFamily = 'monospace';
    coordDisplay.style.fontSize = '14px';
    coordDisplay.style.zIndex = '10001';
    coordDisplay.textContent = '座標テストモード: クリックして座標を取得';
    
    overlay.appendChild(coordDisplay);
    
    // クリックイベント - テストモードの切り替え
    testButton.addEventListener('click', function() {
      const isActive = overlay.style.display === 'block';
      if (isActive) {
        overlay.style.display = 'none';
        testButton.textContent = '座標テスト';
      } else {
        overlay.style.display = 'block';
        testButton.textContent = 'テスト終了';
      }
    });
    
    // オーバーレイのクリックイベント - 座標テスト
    overlay.addEventListener('click', function(e) {
      const canvas = document.getElementById('stamp-layer');
      if (!canvas) {
        coordDisplay.textContent = 'エラー: スタンプレイヤーが見つかりません';
        return;
      }
      
      // 通常の座標計算
      const rect = canvas.getBoundingClientRect();
      const simpleX = e.clientX - rect.left;
      const simpleY = e.clientY - rect.top;
      
      // 強化された座標計算
      const coords = calculateCanvasCoordinates(e, canvas);
      
      // マーカーを表示（クリック位置を示す）
      const marker = document.createElement('div');
      marker.style.position = 'fixed';
      marker.style.width = '10px';
      marker.style.height = '10px';
      marker.style.backgroundColor = 'red';
      marker.style.borderRadius = '50%';
      marker.style.transform = 'translate(-50%, -50%)';
      marker.style.left = e.clientX + 'px';
      marker.style.top = e.clientY + 'px';
      marker.style.zIndex = '10000';
      marker.style.pointerEvents = 'none';
      document.body.appendChild(marker);
      
      // 座標情報を表示
      coordDisplay.innerHTML = `
        クリック位置: (${e.clientX}, ${e.clientY})<br>
        簡易キャンバス座標: (${Math.round(simpleX)}, ${Math.round(simpleY)})<br>
        強化キャンバス座標: (${Math.round(coords.x)}, ${Math.round(coords.y)})<br>
        キャンバスサイズ: ${canvas.width}x${canvas.height}<br>
        CSS表示サイズ: ${Math.round(rect.width)}x${Math.round(rect.height)}<br>
        スケールファクター: ${(canvas.width/rect.width).toFixed(2)}x${(canvas.height/rect.height).toFixed(2)}
      `;
      
      // テストスタンプを配置
      directDrawStamp('Tool/Reload.png', coords.x, coords.y, 30, 'coord_test_' + Date.now());
      
      // 2秒後にマーカーを削除
      setTimeout(() => {
        if (marker.parentNode) {
          marker.parentNode.removeChild(marker);
        }
      }, 2000);
    });
    
    // タッチデバイス用のイベント
    testButton.addEventListener('touchend', function(e) {
      e.preventDefault();
      testButton.click();
    });
    
    overlay.addEventListener('touchend', function(e) {
      e.preventDefault();
      overlay.click(e);
    });
    
    document.body.appendChild(testButton);
    document.body.appendChild(overlay);
  }
  
  // 10. 状態表示
  function createStatusIndicator() {
    // ステータス表示用の要素を作成
    const statusDiv = document.createElement('div');
    statusDiv.id = 'filemaker-fix-status';
    statusDiv.style.position = 'fixed';
    statusDiv.style.bottom = '10px';
    statusDiv.style.left = '10px';
    statusDiv.style.backgroundColor = '#8e44ad'; // 紫色
    statusDiv.style.color = 'white';
    statusDiv.style.padding = '5px 10px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.fontWeight = 'bold';
    statusDiv.style.zIndex = '10000';
    statusDiv.style.fontSize = '14px';
    statusDiv.textContent = 'FileMaker修正V7適用済';
    statusDiv.style.webkitUserSelect = 'none';
    statusDiv.style.userSelect = 'none';
    statusDiv.style.webkitTouchCallout = 'none';
    
    // クリックでテストスタンプを配置
    statusDiv.addEventListener('click', function() {
      console.log('FileMaker修正テストスタンプを配置します');
      
      // スタンプレイヤーを取得
      const canvas = document.getElementById('stamp-layer');
      if (!canvas) {
        console.error('スタンプレイヤーが見つかりません');
        return;
      }
      
      // 中央に配置
      const x = canvas.width / 2;
      const y = canvas.height / 2;
      
      // テスト用のスタンプを直接描画
      directDrawStamp('Tool/Reload.png', x, y, 30, 'fm_test_' + Date.now());
      
      alert('FileMaker用テストスタンプを配置しました');
    });
    
    // タッチデバイス用のイベント
    statusDiv.addEventListener('touchend', function(e) {
      e.preventDefault();
      statusDiv.click();
    });
    
    document.body.appendChild(statusDiv);
  }
  
  // 11. カーソルテストモード
  function createCursorTestMode() {
    // すでに存在する場合は作成しない
    if (document.getElementById('cursor-test-button')) {
      return;
    }
    
    // ボタンを作成
    const testButton = document.createElement('div');
    testButton.id = 'cursor-test-button';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '90px';
    testButton.style.left = '10px';
    testButton.style.backgroundColor = '#e74c3c'; // 赤色
    testButton.style.color = 'white';
    testButton.style.padding = '5px 10px';
    testButton.style.borderRadius = '5px';
    testButton.style.fontWeight = 'bold';
    testButton.style.zIndex = '10000';
    testButton.style.fontSize = '14px';
    testButton.textContent = 'カーソルテスト';
    testButton.style.webkitUserSelect = 'none';
    testButton.style.userSelect = 'none';
    testButton.style.webkitTouchCallout = 'none';
    
    // クリックイベント
    testButton.addEventListener('click', function() {
      // テスト用のカーソルを切り替え
      const isActive = document.getElementById('fm-cursor-image') !== null;
      if (isActive) {
        window.removeCustomCursor();
        testButton.textContent = 'カーソルテスト';
      } else {
        window.setCustomCursor('Tool/Reload.png');
        testButton.textContent = 'カーソル解除';
      }
    });
    
    // タッチデバイス用のイベント
    testButton.addEventListener('touchend', function(e) {
      e.preventDefault();
      testButton.click();
    });
    
    document.body.appendChild(testButton);
  }
  
  // 12. 強制クリックイベント関数（スタンプが確定しない問題に対応）
  function createForceClickButton() {
    // すでに存在する場合は作成しない
    if (document.getElementById('force-click-button')) {
      return;
    }
    
    // ボタンを作成
    const clickButton = document.createElement('div');
    clickButton.id = 'force-click-button';
    clickButton.style.position = 'fixed';
    clickButton.style.bottom = '130px';
    clickButton.style.left = '10px';
    clickButton.style.backgroundColor = '#27ae60'; // 緑色
    clickButton.style.color = 'white';
    clickButton.style.padding = '5px 10px';
    clickButton.style.borderRadius = '5px';
    clickButton.style.fontWeight = 'bold';
    clickButton.style.zIndex = '10000';
    clickButton.style.fontSize = '14px';
    clickButton.textContent = 'スタンプ確定';
    clickButton.style.webkitUserSelect = 'none';
    clickButton.style.userSelect = 'none';
    clickButton.style.webkitTouchCallout = 'none';
    
    // クリックイベント
    clickButton.addEventListener('click', function() {
      if (!window.stampMode || !window.stampMode.isActive) {
        alert('スタンプモードがアクティブではありません');
        return;
      }
      
      // スタンプレイヤーを取得
      const canvas = document.getElementById('stamp-layer');
      if (!canvas) {
        alert('スタンプレイヤーが見つかりません');
        return;
      }
      
      // 現在のマウス位置を取得
      const cursorImg = document.getElementById('fm-cursor-image');
      let x = canvas.width / 2;
      let y = canvas.height / 2;
      
      if (cursorImg) {
        // カーソル位置からキャンバス座標を計算
        const rect = canvas.getBoundingClientRect();
        const cursorRect = cursorImg.getBoundingClientRect();
        const centerX = cursorRect.left + cursorRect.width / 2;
        const centerY = cursorRect.top + cursorRect.height / 2;
        
        // キャンバス座標に変換
        x = (centerX - rect.left) * (canvas.width / rect.width);
        y = (centerY - rect.top) * (canvas.height / rect.height);
      }
      
      // スタンプを配置
      window.stampMode._placeStampAtPosition(x, y);
      
      alert(`カーソル位置にスタンプを確定しました (${Math.round(x)}, ${Math.round(y)})`);
    });
    
    // タッチデバイス用のイベント
    clickButton.addEventListener('touchend', function(e) {
      e.preventDefault();
      clickButton.click();
    });
    
    document.body.appendChild(clickButton);
  }
  
  // 13. アイコンタッチイベントの改善（長押しメニュー対策）
  function enhanceIconButtons() {
    // すべてのアイコンボタンを取得
    const iconButtons = document.querySelectorAll('.icon-button, .icon-wrapper, .icon-img');
    
    if (iconButtons.length === 0) {
      console.log('アイコンボタンが見つかりません。1秒後に再試行します。');
      setTimeout(enhanceIconButtons, 1000);
      return;
    }
    
    iconButtons.forEach(button => {
      button.style.webkitUserSelect = 'none';
      button.style.userSelect = 'none';
      button.style.webkitTouchCallout = 'none';
      
      // 長押しメニュー表示を防止
      button.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      
      // タッチ開始時にデフォルト動作を無効化
      button.addEventListener('touchstart', function(e) {
        // passiveをfalseにしないとiOSでは動作しない
      }, { passive: false });
    });
    
    console.log('アイコンボタンの長押し対策を適用しました');
  }
  
  // 14. 初期化（DOMロード完了後に実行）
  function init() {
    console.log('FileMaker WebViewer カーソル＆クリック修正 V7を初期化しています');
    
    // 長押し防止スタイルを追加
    addPreventLongPressStyle();
    
    // カスタムカーソル機能を初期化
    setupCustomCursor();
    
    // iPad用にCanvasDataModelを拡張
    extendCanvasDataModel();
    
    // スタンプメソッドを置き換え
    replaceStampMethods();
    
    // グローバルハンドラを設定
    setupGlobalStampHandler();
    
    // タブ切り替え時のスタンプ保持を設定
    setupTabSwitchPersistence();
    
    // アイコンタッチイベントを改善
    enhanceIconButtons();
    
    // 座標テストモードを作成
    createCoordinateTestMode();
    
    // カーソルテストモードを作成
    createCursorTestMode();
    
    // 強制クリックボタンを作成
    createForceClickButton();
    
    // ステータス表示
    createStatusIndicator();
    
    // iPad用スタンプを描画（ページロード時）
    if (window.drawIpadStamps) {
      setTimeout(window.drawIpadStamps, 1000);
    }
    
    console.log('FileMaker WebViewer カーソル＆クリック修正 V7の初期化が完了しました');
  }
  
  // コンテキストメニュー表示を全体的に抑制
  document.addEventListener('contextmenu', function(e) {
    if (e.target.nodeName !== 'INPUT' && e.target.nodeName !== 'TEXTAREA') {
      e.preventDefault();
      return false;
    }
  });
  
  // iOSの長押し対策
  document.addEventListener('touchstart', function(e) {
    // ここでは特に何もしないが、passiveをfalseにして長押し対策
  }, { passive: false });
  
  // ページ読み込み完了時または既に完了している場合に初期化
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();