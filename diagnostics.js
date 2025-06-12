// diagnostics.js - 包括的なログ収集システム
(function() {
  // 環境検出
  const isFileMaker = window.FileMaker !== undefined || navigator.userAgent.indexOf('FileMaker') !== -1;
  const isiPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // セッションIDを生成
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  
  // 日時文字列を生成（ファイル名用）
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  // デバイスタイプに基づいてログファイルプレフィックスを決定
  let logFilePrefix = 'log';
  if (isFileMaker && isiPad) {
    logFilePrefix = 'iFMGlog';
  } else if (isFileMaker) {
    logFilePrefix = 'MFMlog';
  }
  
  // 最終的なログファイル名を構築
  const logFileName = `${logFilePrefix}_${dateStr}_${sessionId}.txt`;
  
  // デバイス情報を収集
  const deviceInfo = {
    sessionId: sessionId,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    pixelRatio: window.devicePixelRatio,
    isFileMaker: isFileMaker,
    isiPad: isiPad,
    isTouch: isTouch,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer
  };
  
  // ログ収集の制限時間（3分 = 180000ミリ秒）
  const LOG_DURATION = 180000;
  let loggingEnabled = true;
  let startTime = Date.now();
  
  // ログメッセージキュー
  const logQueue = [];
  let isSending = false;
  const MAX_QUEUE_SIZE = 20;  // このサイズになったら送信
  
  // 一定時間後にログ収集を停止
  setTimeout(function() {
    loggingEnabled = false;
    log('ログ収集期間終了（3分経過）', 'system');
    // 残っているログを送信
    sendLogs(true);
  }, LOG_DURATION);
  
  // キャンバス情報を取得する関数
  function getCanvasInfo() {
    const canvasInfo = {};
    try {
      // スタンプレイヤー情報
      const stampLayer = document.getElementById('stamp-layer');
      if (stampLayer) {
        canvasInfo.stampLayer = {
          width: stampLayer.width,
          height: stampLayer.height,
          cssWidth: stampLayer.getBoundingClientRect().width,
          cssHeight: stampLayer.getBoundingClientRect().height,
          scaleX: stampLayer.width / stampLayer.getBoundingClientRect().width,
          scaleY: stampLayer.height / stampLayer.getBoundingClientRect().height
        };
      }
      
      // 描画エリア情報
      const drawArea = document.querySelector('.draw-area');
      if (drawArea) {
        canvasInfo.drawArea = {
          width: drawArea.clientWidth,
          height: drawArea.clientHeight,
          position: {
            left: drawArea.getBoundingClientRect().left,
            top: drawArea.getBoundingClientRect().top
          }
        };
      }
      
      // 他のレイヤー情報も収集
      ['background-layer', 'freedraw-layer', 'text-layer', 'overlay-layer'].forEach(id => {
        const layer = document.getElementById(id);
        if (layer) {
          canvasInfo[id] = {
            width: layer.width,
            height: layer.height
          };
        }
      });
      
    } catch (e) {
      canvasInfo.error = e.message;
    }
    
    return canvasInfo;
  }
  
  // ログ送信用関数
  function sendLogs(isFinal = false) {
    if (isSending || logQueue.length === 0) return;
    
    isSending = true;
    const logsToSend = [...logQueue];
    logQueue.length = 0;  // キューをクリア
    
    // 経過時間を計算
    const elapsedTime = Date.now() - startTime;
    
    // ログデータをフォーマット
    const logData = {
      device: deviceInfo,
      logs: logsToSend,
      isFinal: isFinal,
      elapsedTime: elapsedTime,
      canvasInfo: getCanvasInfo()
    };
    
    // サーバーにログを送信
    fetch(`logHandler.php?file=${logFileName}&new=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    })
    .then(response => {
      if (!response.ok) {
        console.error('ログの送信に失敗しました', response.status, response.statusText);
      }
    })
    .catch(error => {
      console.error('ログ送信エラー:', error);
    })
    .finally(() => {
      isSending = false;
      // 最終ログでなく、キューにまだログがあれば続けて送信
      if (!isFinal && logQueue.length >= MAX_QUEUE_SIZE) {
        sendLogs();
      }
    });
  }
  
  // ログ関数を定義
  function log(message, type = 'info', data = null) {
    if (!loggingEnabled && type !== 'system') return;
    
    const timestamp = new Date().toISOString();
    const elapsedTime = Date.now() - startTime;
    
    const logEntry = {
      timestamp: timestamp,
      elapsed: elapsedTime,
      type: type,
      message: message,
      data: data ? JSON.stringify(data).substring(0, 1000) : null  // データを1000文字までに制限
    };
    
    // コンソールにも出力（開発時に便利）
    console.log(`[${type}] ${message}`, data);
    
    // キューに追加
    logQueue.push(logEntry);
    
    // キューが一定サイズになったら送信
    if (logQueue.length >= MAX_QUEUE_SIZE) {
      sendLogs();
    }
  }
  
  // エラーログ関数
  function logError(error, context = '') {
    const errorData = {
      message: error.message || String(error),
      stack: error.stack,
      context: context,
      time: new Date().toISOString(),
      canvasState: getCanvasInfo()
    };
    
    log(`エラー: ${errorData.message}`, 'error', errorData);
  }
  
  // イベントログ関数
  function logEvent(eventType, x, y, extra = null) {
    const eventData = {
      x: Math.round(x),
      y: Math.round(y),
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      extra: extra
    };
    
    log(`イベント: ${eventType}`, 'event', eventData);
  }
  
  // StampModeの操作をログに記録
  function setupStampModeLogging() {
    if (!window.StampMode) {
      setTimeout(setupStampModeLogging, 1000);
      return;
    }
    
    log('StampMode クラスが検出されました', 'system');
    
    // スタンプモードのメソッドをラップしてログを記録
    const originalActivate = StampMode.prototype.activate;
    StampMode.prototype.activate = function(stampType) {
      const result = originalActivate.apply(this, arguments);
      log(`スタンプモード有効化: ${stampType || 'default'}`, 'stamp', {
        stampType: stampType,
        isActive: this.isActive,
        currentStamp: this.currentStamp
      });
      return result;
    };
    
    const originalActivateWithIcon = StampMode.prototype.activateWithCustomIcon;
    StampMode.prototype.activateWithCustomIcon = function(iconPath, iconId) {
      const result = originalActivateWithIcon.apply(this, arguments);
      log(`カスタムスタンプ有効化: ${iconPath}, ID: ${iconId}`, 'stamp', {
        iconPath: iconPath,
        iconId: iconId,
        isActive: this.isActive,
        currentStamp: this.currentStamp,
        currentStampType: this.currentStampType
      });
      return result;
    };
    
    const originalDeactivate = StampMode.prototype.deactivate;
    StampMode.prototype.deactivate = function() {
      log('スタンプモード無効化', 'stamp');
      return originalDeactivate.apply(this, arguments);
    };
    
    const originalPlaceStamp = StampMode.prototype._placeStampAtPosition;
    StampMode.prototype._placeStampAtPosition = function(x, y) {
      try {
        const stampInfo = {
          x: x,
          y: y,
          stampType: this.currentStampType,
          stampSrc: this.currentStamp,
          stampWidth: this.stampWidth,
          canvasSize: {
            width: this.canvas ? this.canvas.width : null,
            height: this.canvas ? this.canvas.height : null
          }
        };
        
        logEvent('スタンプ配置', x, y, stampInfo);
        return originalPlaceStamp.apply(this, arguments);
      } catch (e) {
        logError(e, 'スタンプ配置エラー');
        throw e;  // 元のエラーを再スロー
      }
    };
    
    // RedrawAllStamps のログ記録
    if (StampMode.prototype.redrawAllStamps) {
      const originalRedrawAllStamps = StampMode.prototype.redrawAllStamps;
      StampMode.prototype.redrawAllStamps = function() {
        log('スタンプ再描画開始', 'stamp');
        const result = originalRedrawAllStamps.apply(this, arguments);
        log('スタンプ再描画完了', 'stamp');
        return result;
      };
    }
    
    log('StampMode ログ機能を有効化しました', 'system');
  }
  
  // canvasDataModelの操作をログに記録
  function setupDataModelLogging() {
    if (!window.canvasDataModel) {
      setTimeout(setupDataModelLogging, 1000);
      return;
    }
    
    log('CanvasDataModel が検出されました', 'system');
    
    // addElement のログ記録
    const originalAddElement = window.canvasDataModel.addElement;
    window.canvasDataModel.addElement = function(type, data) {
      log(`要素を追加: ${type}`, 'data', {
        type: type,
        id: data.id,
        elementData: type === 'stamp' ? {
          src: data.src,
          x: data.x,
          y: data.y,
          width: data.width
        } : null
      });
      return originalAddElement.apply(this, arguments);
    };
    
    // removeElement のログ記録
    if (window.canvasDataModel.removeElement) {
      const originalRemoveElement = window.canvasDataModel.removeElement;
      window.canvasDataModel.removeElement = function(type, id) {
        log(`要素を削除: ${type}, ID: ${id}`, 'data');
        return originalRemoveElement.apply(this, arguments);
      };
    }
    
    // clearElementsByType のログ記録
    if (window.canvasDataModel.clearElementsByType) {
      const originalClearElements = window.canvasDataModel.clearElementsByType;
      window.canvasDataModel.clearElementsByType = function(type) {
        log(`要素をクリア: ${type}`, 'data');
        return originalClearElements.apply(this, arguments);
      };
    }
    
    // saveToLocalStorage のログ記録
    if (window.canvasDataModel.saveToLocalStorage) {
      const originalSaveToLocalStorage = window.canvasDataModel.saveToLocalStorage;
      window.canvasDataModel.saveToLocalStorage = function() {
        log('ローカルストレージに保存', 'data', {
          stampCount: this.elements.stamp ? this.elements.stamp.length : 0
        });
        return originalSaveToLocalStorage.apply(this, arguments);
      };
    }
    
    log('CanvasDataModel ログ機能を有効化しました', 'system');
  }
  
  // グローバルイベントの監視
  function setupGlobalEventLogging() {
    // スタンプレイヤーを取得
    const stampLayer = document.getElementById('stamp-layer');
    if (!stampLayer) {
      setTimeout(setupGlobalEventLogging, 1000);
      return;
    }
    
    log('グローバルイベントロギングを設定', 'system');
    
    // クリックイベントの監視
    stampLayer.addEventListener('click', function(e) {
      const rect = stampLayer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // キャンバス座標に変換
      const scaleX = stampLayer.width / rect.width;
      const scaleY = stampLayer.height / rect.height;
      
      logEvent('クリック', x * scaleX, y * scaleY, {
        clientX: e.clientX,
        clientY: e.clientY,
        canvasX: x,
        canvasY: y,
        scaleX: scaleX,
        scaleY: scaleY
      });
    });
    
    // タッチイベントの監視
    stampLayer.addEventListener('touchend', function(e) {
      if (e.changedTouches && e.changedTouches.length) {
        const rect = stampLayer.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // キャンバス座標に変換
        const scaleX = stampLayer.width / rect.width;
        const scaleY = stampLayer.height / rect.height;
        
        logEvent('タッチ終了', x * scaleX, y * scaleY, {
          clientX: touch.clientX,
          clientY: touch.clientY,
          canvasX: x,
          canvasY: y,
          scaleX: scaleX,
          scaleY: scaleY,
          touches: e.touches.length,
          changedTouches: e.changedTouches.length
        });
      }
    });
    
    // タブ切り替えの監視
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        const tabId = this.getAttribute('data-tab');
        log(`タブ切替: ${tabId}`, 'ui', {
          tabId: tabId,
          previousActiveTab: document.querySelector('.tab-button.active')?.getAttribute('data-tab')
        });
      });
    });
    
    // グローバルエラー監視
    window.addEventListener('error', function(e) {
      logError(e.error || new Error(e.message), 'グローバルエラー');
    });
    
    // Promise エラー監視
    window.addEventListener('unhandledrejection', function(e) {
      logError(e.reason || new Error('Unhandled Promise rejection'), 'Promise エラー');
    });
    
    log('グローバルイベントロギングを有効化しました', 'system');
  }
  
  // 30秒ごとにキューを確認して送信
  const logInterval = setInterval(function() {
    if (logQueue.length > 0) {
      sendLogs();
    }
    
    if (!loggingEnabled) {
      clearInterval(logInterval);
    }
  }, 30000);  // 30秒ごと
  
  // 初期化
  function init() {
    log('診断ログ開始', 'system', deviceInfo);
    
    // 初期キャンバス情報を記録
    const initialCanvasInfo = getCanvasInfo();
    log('初期キャンバス状態', 'system', initialCanvasInfo);
    
    // 各種ログ機能を設定
    setupStampModeLogging();
    setupDataModelLogging();
    setupGlobalEventLogging();
  }
  
  // 初期ログ送信
  function sendInitialLog() {
    log('ページ読み込み完了', 'system');
    
    // DOMの読み込みが完了したことをログに記録
    log('DOM構造', 'info', {
      hasStampLayer: !!document.getElementById('stamp-layer'),
      hasDrawArea: !!document.querySelector('.draw-area'),
      hasIconButtons: document.querySelectorAll('.icon-button').length,
      tabCount: document.querySelectorAll('.tab-button').length,
      layerCount: document.querySelectorAll('.canvas-layer').length
    });
    
    // すぐに送信
    sendLogs();
  }
  
  // グローバルに公開
  window.diagnosticsLogger = {
    log: log,
    logError: logError,
    logEvent: logEvent,
    getCanvasInfo: getCanvasInfo,
    
    // ログ収集を手動で停止する関数
    stopLogging: function() {
      loggingEnabled = false;
      log('ログ収集手動停止', 'system');
      sendLogs(true);
      return '診断ログ収集を停止しました';
    },
    
    // 手動でログを送信する関数
    flushLogs: function() {
      log('手動ログ送信', 'system');
      sendLogs();
      return `${logQueue.length}件のログを送信しました`;
    },
    
    // 現在のセッション情報を取得
    getSessionInfo: function() {
      return {
        sessionId: sessionId,
        fileName: logFileName,
        elapsedTime: Date.now() - startTime,
        loggingEnabled: loggingEnabled,
        queuedLogs: logQueue.length
      };
    }
  };
  
  // ページ読み込み完了時に初期化
  if (document.readyState === 'complete') {
    init();
    sendInitialLog();
  } else {
    window.addEventListener('load', function() {
      init();
      sendInitialLog();
    });
  }
  
  // ページ離脱時に最終ログを送信
  window.addEventListener('beforeunload', function() {
    log('ページ離脱', 'system');
    // 同期的にログを送信するため、navigator.sendBeaconを使用
    if (navigator.sendBeacon) {
      const finalData = {
        device: deviceInfo,
        logs: [{
          timestamp: new Date().toISOString(),
          elapsed: Date.now() - startTime,
          type: 'system',
          message: 'ページ離脱（最終ログ）',
          data: null
        }],
        isFinal: true,
        canvasInfo: getCanvasInfo()
      };
      navigator.sendBeacon(
        `logHandler.php?file=${logFileName}`,
        JSON.stringify(finalData)
      );
    }
  });
})();