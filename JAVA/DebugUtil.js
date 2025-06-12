// DebugUtil.js - OralCanvasのデバッグユーティリティ (改良版 - 大きなデータを除外)
// このファイルをOralCanvasのJAVAディレクトリに追加して、index.htmlで読み込む

class DebugUtil {
  constructor() {
    console.log('DebugUtil: 初期化開始');
    
    // 環境情報を収集
    this.environment = this._collectEnvironmentInfo();
    
    // デバッグパネルの作成
    this._createDebugPanel();
    
    // ログフィルタリング設定
    this._setupLogFiltering();
    
    console.log('DebugUtil: 初期化完了', this.environment);
  }
  
  // 環境情報を収集
  _collectEnvironmentInfo() {
    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio
      },
      platform: {
        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        isWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) ||
                  navigator.userAgent.includes('wv')
      },
      timestamp: new Date().toISOString()
    };
  }
  
  // ログフィルタリングを設定
  _setupLogFiltering() {
    // オリジナルのconsole.logを保存
    this._originalConsoleLog = console.log;
    this._originalConsoleError = console.error;
    this._originalConsoleWarn = console.warn;
    
    // console.logをオーバーライド
    console.log = (...args) => {
      // 大きなデータをフィルタリングした引数を作成
      const filteredArgs = args.map(arg => this._filterLargeData(arg));
      
      // オリジナルのconsole.logを呼び出し
      this._originalConsoleLog.apply(console, filteredArgs);
      
      // ログを記録（大きなデータをフィルタリング）
      if (this.isLoggingEvents && this.eventLogs) {
        const timestamp = new Date().toISOString().substr(11, 12);
        const logEntry = {
          timestamp,
          type: 'log',
          message: filteredArgs.map(arg => this._stringifyForLog(arg)).join(' ')
        };
        
        this.eventLogs.push(logEntry);
        
        // 最大100件まで保持
        if (this.eventLogs.length > 100) {
          this.eventLogs.shift();
        }
        
        // ログ表示を更新
        this._updateEventLogDisplay();
      }
    };
    
    // console.errorとconsole.warnも同様にオーバーライド
    console.error = (...args) => {
      const filteredArgs = args.map(arg => this._filterLargeData(arg));
      this._originalConsoleError.apply(console, filteredArgs);
      
      if (this.isLoggingEvents && this.eventLogs) {
        const timestamp = new Date().toISOString().substr(11, 12);
        const logEntry = {
          timestamp,
          type: 'error',
          message: filteredArgs.map(arg => this._stringifyForLog(arg)).join(' ')
        };
        
        this.eventLogs.push(logEntry);
        
        if (this.eventLogs.length > 100) {
          this.eventLogs.shift();
        }
        
        this._updateEventLogDisplay();
      }
    };
    
    console.warn = (...args) => {
      const filteredArgs = args.map(arg => this._filterLargeData(arg));
      this._originalConsoleWarn.apply(console, filteredArgs);
      
      if (this.isLoggingEvents && this.eventLogs) {
        const timestamp = new Date().toISOString().substr(11, 12);
        const logEntry = {
          timestamp,
          type: 'warn',
          message: filteredArgs.map(arg => this._stringifyForLog(arg)).join(' ')
        };
        
        this.eventLogs.push(logEntry);
        
        if (this.eventLogs.length > 100) {
          this.eventLogs.shift();
        }
        
        this._updateEventLogDisplay();
      }
    };
  }
  
  // 大きなデータをフィルタリングする
  _filterLargeData(data) {
    if (typeof data === 'string') {
      // base64データを検出して置換
      if (data.length > 1000 && (
          data.indexOf('data:image') !== -1 || 
          data.match(/^[A-Za-z0-9+/=]{1000,}$/))) {
        return '[大きな画像データ...]';
      }
      return data;
    } else if (data === null) {
      return null;
    } else if (typeof data === 'object') {
      if (Array.isArray(data)) {
        // 配列の場合は各要素をフィルタリング
        return data.map(item => this._filterLargeData(item));
      } else {
        // オブジェクトの場合はコピーを作成してフィルタリング
        const filtered = {};
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            // src属性に大きなデータが含まれていないか確認
            if (key === 'src' && typeof data[key] === 'string' && 
                data[key].length > 1000 && (
                data[key].indexOf('data:image') !== -1 || 
                data[key].match(/^[A-Za-z0-9+/=]{1000,}$/))) {
              filtered[key] = '[大きな画像データ...]';
            } else {
              filtered[key] = this._filterLargeData(data[key]);
            }
          }
        }
        return filtered;
      }
    }
    return data;
  }
  
  // ログ用に値を文字列化
  _stringifyForLog(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (typeof value === 'object') {
      try {
        // 循環参照を避けるための簡易的な処理
        const seen = new WeakSet();
        const replacer = (key, val) => {
          // 関数は文字列化
          if (typeof val === 'function') return '[Function]';
          
          // オブジェクトの循環参照チェック
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);
          }
          return val;
        };
        
        return JSON.stringify(value, replacer);
      } catch (e) {
        return String(value);
      }
    }
    
    return String(value);
  }
  
  // デバッグパネルの作成
  _createDebugPanel() {
    // スタイルの追加
    const style = document.createElement('style');
    style.textContent = `
      #debug-panel {
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 5px;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        max-width: 90%;
        z-index: 10000;
        max-height: 80%;
        overflow-y: auto;
        display: none;
      }
      #debug-panel.visible {
        display: block;
      }
      #debug-toggle {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 30px;
        height: 30px;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        font-weight: bold;
        cursor: pointer;
        z-index: 10001;
        user-select: none;
      }
      .debug-section {
        margin-bottom: 10px;
        border-bottom: 1px solid #555;
        padding-bottom: 5px;
      }
      .debug-section h3 {
        margin: 0 0 5px 0;
        font-size: 14px;
      }
      .debug-action {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .debug-button {
        background-color: #444;
        border: none;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
        font-family: monospace;
        font-size: 12px;
      }
      .debug-button:hover {
        background-color: #666;
      }
      .debug-logs {
        max-height: 200px;
        overflow-y: auto;
        background-color: #222;
        padding: 5px;
        border-radius: 3px;
        margin-top: 5px;
      }
      .debug-log-entry {
        margin-bottom: 3px;
        border-bottom: 1px solid #333;
        padding-bottom: 2px;
        font-size: 11px;
      }
      .debug-log-entry.error {
        color: #ff5555;
      }
      .debug-log-entry.warn {
        color: #ffaa55;
      }
      .debug-status {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .debug-status-item {
        background-color: #333;
        padding: 3px 8px;
        border-radius: 3px;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
    
    // トグルボタン
    const toggle = document.createElement('div');
    toggle.id = 'debug-toggle';
    toggle.textContent = 'D';
    toggle.title = 'デバッグパネル';
    document.body.appendChild(toggle);
    
    // デバッグパネル
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    
    // 環境情報セクション
    const envSection = document.createElement('div');
    envSection.className = 'debug-section';
    envSection.innerHTML = `
      <h3>環境情報</h3>
      <div class="debug-status">
        <div class="debug-status-item">モバイル: ${this.environment.platform.isMobile ? '✓' : '✗'}</div>
        <div class="debug-status-item">iOS: ${this.environment.platform.isIOS ? '✓' : '✗'}</div>
        <div class="debug-status-item">Safari: ${this.environment.platform.isSafari ? '✓' : '✗'}</div>
        <div class="debug-status-item">WebView: ${this.environment.platform.isWebView ? '✓' : '✗'}</div>
        <div class="debug-status-item">画面: ${this.environment.viewport.width}x${this.environment.viewport.height}</div>
        <div class="debug-status-item">ピクセル比: ${this.environment.viewport.pixelRatio}</div>
      </div>
    `;
    
    // キャンバス情報セクション
    const canvasSection = document.createElement('div');
    canvasSection.className = 'debug-section';
    canvasSection.innerHTML = `
      <h3>キャンバス情報</h3>
      <div id="debug-canvas-info">
        <div>情報を取得中...</div>
      </div>
      <div class="debug-action">
        <button class="debug-button" id="refresh-canvas-info">情報更新</button>
        <button class="debug-button" id="force-redraw">強制再描画</button>
      </div>
    `;
    
    // スタンプ情報セクション
    const stampSection = document.createElement('div');
    stampSection.className = 'debug-section';
    stampSection.innerHTML = `
      <h3>スタンプ情報</h3>
      <div id="debug-stamp-info">
        <div>情報を取得中...</div>
      </div>
      <div class="debug-action">
        <button class="debug-button" id="test-stamp">テストスタンプ配置</button>
        <button class="debug-button" id="clear-stamps">スタンプクリア</button>
        <button class="debug-button" id="redraw-stamps">スタンプ再描画</button>
      </div>
    `;
    
    // イベント情報セクション
    const eventSection = document.createElement('div');
    eventSection.className = 'debug-section';
    eventSection.innerHTML = `
      <h3>イベントログ</h3>
      <div class="debug-logs" id="debug-event-logs"></div>
      <div class="debug-action">
        <button class="debug-button" id="clear-event-logs">ログクリア</button>
        <button class="debug-button" id="copy-logs">ログコピー</button>
      </div>
    `;
    
    // パネルに各セクションを追加
    panel.appendChild(envSection);
    panel.appendChild(canvasSection);
    panel.appendChild(stampSection);
    panel.appendChild(eventSection);
    
    document.body.appendChild(panel);
    
    // トグルボタンのイベント
    toggle.addEventListener('click', () => {
      panel.classList.toggle('visible');
      if (panel.classList.contains('visible')) {
        this.updateDebugInfo();
        this.startEventLogging();
      } else {
        this.stopEventLogging();
      }
    });
    
    // 各ボタンのイベント
    document.getElementById('refresh-canvas-info').addEventListener('click', () => {
      this.updateCanvasInfo();
    });
    
    document.getElementById('force-redraw').addEventListener('click', () => {
      this.forceRedraw();
    });
    
    document.getElementById('test-stamp').addEventListener('click', () => {
      this.placeTestStamp();
    });
    
    document.getElementById('clear-stamps').addEventListener('click', () => {
      this.clearStamps();
    });
    
    document.getElementById('redraw-stamps').addEventListener('click', () => {
      this.redrawStamps();
    });
    
    document.getElementById('clear-event-logs').addEventListener('click', () => {
      this.clearEventLogs();
    });
    
    document.getElementById('copy-logs').addEventListener('click', () => {
      this.copyLogs();
    });
  }
  
  // デバッグ情報を更新
  updateDebugInfo() {
    this.updateCanvasInfo();
    this.updateStampInfo();
  }
  
  // キャンバス情報を更新
  updateCanvasInfo() {
    const canvasInfo = document.getElementById('debug-canvas-info');
    
    if (!window.layerManager) {
      canvasInfo.innerHTML = '<div class="debug-log-entry error">layerManagerが見つかりません</div>';
      return;
    }
    
    const layers = window.layerManager.layers;
    const info = [];
    
    for (const layerName in layers) {
      const layer = layers[layerName];
      if (layer) {
        info.push(`
          <div class="debug-status-item">
            ${layerName}: ${layer.width}x${layer.height}
          </div>
        `);
      }
    }
    
    canvasInfo.innerHTML = `
      <div class="debug-status">
        ${info.join('')}
      </div>
    `;
  }
  
  // スタンプ情報を更新
  updateStampInfo() {
    const stampInfo = document.getElementById('debug-stamp-info');
    
    if (!window.canvasDataModel) {
      stampInfo.innerHTML = '<div class="debug-log-entry error">canvasDataModelが見つかりません</div>';
      return;
    }
    
    const stamps = window.canvasDataModel.elements.stamp || [];
    
    stampInfo.innerHTML = `
      <div class="debug-status">
        <div class="debug-status-item">スタンプ数: ${stamps.length}</div>
        <div class="debug-status-item">
          スタンプモード: ${window.stampMode ? (window.stampMode.isActive ? '有効' : '無効') : '未初期化'}
        </div>
      </div>
      ${stamps.length > 0 ? `
        <div style="margin-top: 5px;">
          <b>最新スタンプ:</b> ${this._getSafePathDisplay(stamps[stamps.length - 1].src)} 
          (${stamps[stamps.length - 1].x}, ${stamps[stamps.length - 1].y})
        </div>
      ` : ''}
    `;
  }
  
  // パス名を安全に表示する（長すぎる場合は省略）
  _getSafePathDisplay(path) {
    if (!path) return 'undefined';
    if (typeof path !== 'string') return String(path);
    
    // base64データの場合は省略
    if (path.indexOf('data:') === 0) {
      return '[Base64画像データ]';
    }
    
    // 長すぎるパスは省略
    if (path.length > 50) {
      return path.substring(0, 25) + '...' + path.substring(path.length - 25);
    }
    
    return path;
  }
  
  // イベントログの記録を開始
  startEventLogging() {
    if (this.isLoggingEvents) return;
    
    const eventLogs = document.getElementById('debug-event-logs');
    this.eventLogs = [];
    
    // タッチイベントのログ取得
    const logEvent = (e) => {
      const timestamp = new Date().toISOString().substr(11, 12);
      let logEntry = {
        timestamp,
        type: 'event',
        eventType: e.type,
        targetId: e.target.id || 'unknown',
        targetClass: e.target.className || 'unknown'
      };
      
      // タッチ座標を追加
      if (e.type.startsWith('touch')) {
        if (e.touches && e.touches.length) {
          logEntry.touchX = e.touches[0].clientX;
          logEntry.touchY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length) {
          logEntry.touchX = e.changedTouches[0].clientX;
          logEntry.touchY = e.changedTouches[0].clientY;
        }
      }
      
      this.eventLogs.push(logEntry);
      
      // 最大100件まで保持
      if (this.eventLogs.length > 100) {
        this.eventLogs.shift();
      }
      
      // ログ表示を更新
      this._updateEventLogDisplay();
    };
    
    // イベントリスナーを設定
    const stampLayer = window.layerManager ? window.layerManager.layers.stamp : null;
    if (stampLayer) {
      stampLayer.addEventListener('touchstart', logEvent);
      stampLayer.addEventListener('touchmove', logEvent);
      stampLayer.addEventListener('touchend', logEvent);
      stampLayer.addEventListener('click', logEvent);
    }
    
    this.isLoggingEvents = true;
    this.logEvent = logEvent;
    this.stampLayer = stampLayer;
  }
  
  // イベントログの表示を更新
  _updateEventLogDisplay() {
    const eventLogs = document.getElementById('debug-event-logs');
    
    eventLogs.innerHTML = this.eventLogs.map(log => {
      // イベントタイプによって表示を変える
      if (log.type === 'event') {
        return `
          <div class="debug-log-entry">
            [${log.timestamp}] ${log.eventType} - 
            Target: ${log.targetId || log.targetClass}
            ${log.touchX !== undefined ? ` (${log.touchX}, ${log.touchY})` : ''}
          </div>
        `;
      } else {
        return `
          <div class="debug-log-entry ${log.type === 'error' ? 'error' : (log.type === 'warn' ? 'warn' : '')}">
            [${log.timestamp}] ${log.type}: ${log.message}
          </div>
        `;
      }
    }).join('');
    
    // 最新のログが見えるようにスクロール
    eventLogs.scrollTop = eventLogs.scrollHeight;
  }
  
  // イベントログの記録を停止
  stopEventLogging() {
    if (!this.isLoggingEvents) return;
    
    // イベントリスナーを削除
    if (this.stampLayer) {
      this.stampLayer.removeEventListener('touchstart', this.logEvent);
      this.stampLayer.removeEventListener('touchmove', this.logEvent);
      this.stampLayer.removeEventListener('touchend', this.logEvent);
      this.stampLayer.removeEventListener('click', this.logEvent);
    }
    
    this.isLoggingEvents = false;
  }
  
  // イベントログをクリア
  clearEventLogs() {
    this.eventLogs = [];
    document.getElementById('debug-event-logs').innerHTML = '';
  }
  
  // ログをコピー
  copyLogs() {
    if (!this.eventLogs || this.eventLogs.length === 0) {
      alert('ログがありません');
      return;
    }
    
    // ログを文字列に変換
    const logText = this.eventLogs.map(log => {
      if (log.type === 'event') {
        return `[${log.timestamp}] EVENT ${log.eventType} - Target: ${log.targetId || log.targetClass} ${log.touchX !== undefined ? `(${log.touchX}, ${log.touchY})` : ''}`;
      } else {
        return `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`;
      }
    }).join('\n');
    
    // 環境情報を追加
    const envInfo = `
=== 環境情報 ===
UserAgent: ${this.environment.userAgent}
画面サイズ: ${this.environment.viewport.width}x${this.environment.viewport.height}
ピクセル比: ${this.environment.viewport.pixelRatio}
モバイル: ${this.environment.platform.isMobile ? 'Yes' : 'No'}
iOS: ${this.environment.platform.isIOS ? 'Yes' : 'No'}
Safari: ${this.environment.platform.isSafari ? 'Yes' : 'No'}
WebView: ${this.environment.platform.isWebView ? 'Yes' : 'No'}
タイムスタンプ: ${this.environment.timestamp}

=== キャンバス情報 ===
`;
    
    // キャンバス情報を追加
    let canvasInfo = '';
    if (window.layerManager) {
      const layers = window.layerManager.layers;
      for (const layerName in layers) {
        const layer = layers[layerName];
        if (layer) {
          canvasInfo += `${layerName}: ${layer.width}x${layer.height}\n`;
        }
      }
    } else {
      canvasInfo = 'layerManagerが見つかりません\n';
    }
    
    // スタンプ情報を追加
    let stampInfo = '\n=== スタンプ情報 ===\n';
    if (window.canvasDataModel) {
      const stamps = window.canvasDataModel.elements.stamp || [];
      stampInfo += `スタンプ数: ${stamps.length}\n`;
      stampInfo += `スタンプモード: ${window.stampMode ? (window.stampMode.isActive ? '有効' : '無効') : '未初期化'}\n`;
      
      if (stamps.length > 0) {
        const latestStamp = stamps[stamps.length - 1];
        stampInfo += `最新スタンプ: ${this._getSafePathDisplay(latestStamp.src)} (${latestStamp.x}, ${latestStamp.y})\n`;
      }
    } else {
      stampInfo += 'canvasDataModelが見つかりません\n';
    }
    
    // 全体のログテキストを作成
    const fullLogText = envInfo + canvasInfo + stampInfo + '\n=== ログ ===\n' + logText;
    
    // クリップボードにコピー
    try {
      navigator.clipboard.writeText(fullLogText)
        .then(() => {
          alert('ログをクリップボードにコピーしました');
        })
        .catch(err => {
          this._fallbackCopy(fullLogText);
        });
    } catch (e) {
      // NavigatorAPIに対応していない場合はフォールバック
      this._fallbackCopy(fullLogText);
    }
  }
  
  // クリップボードAPIが使えない場合のフォールバック
  _fallbackCopy(text) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        alert('ログをクリップボードにコピーしました');
      } else {
        alert('クリップボードへのコピーに失敗しました');
      }
    } catch (e) {
      alert('クリップボードへのコピーに失敗しました: ' + e.message);
    }
  }
  
  // テストスタンプを配置
  placeTestStamp() {
    if (!window.stampMode) {
      alert('stampModeが初期化されていません');
      return;
    }
    
    const canvas = window.layerManager.layers.stamp;
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    
    // テスト用のアイコンを設定
    window.stampMode.currentStamp = 'Tool/Reload.png';
    window.stampMode.stampWidth = 30;
    
    // 直接配置メソッドを呼び出し
    window.stampMode._placeStampAtPosition(x, y);
    
    this.updateStampInfo();
    
    alert(`テストスタンプを配置しました (${x}, ${y})`);
  }
  
  // スタンプをクリア
  clearStamps() {
    if (!window.stampMode) {
      alert('stampModeが初期化されていません');
      return;
    }
    
    window.stampMode.clearLayer();
    this.updateStampInfo();
    
    alert('スタンプをクリアしました');
  }
  
  // スタンプを再描画
  redrawStamps() {
    if (!window.stampMode) {
      alert('stampModeが初期化されていません');
      return;
    }
    
    window.stampMode.redrawAllStamps();
    this.updateStampInfo();
    
    alert('スタンプを再描画しました');
  }
  
  // 強制再描画
  forceRedraw() {
    if (!window.layerManager) {
      alert('layerManagerが初期化されていません');
      return;
    }
    
    window.layerManager.redrawAllLayers();
    this.updateDebugInfo();
    
    alert('すべてのレイヤーを強制再描画しました');
  }
}

// 初期化してグローバル参照を設定
window.debugUtil = new DebugUtil();