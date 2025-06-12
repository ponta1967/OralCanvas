<?php
// log_viewer.php - ログファイルを閲覧するためのシンプルなビューア
$logDir = 'logs/';

// ログディレクトリが存在しない場合は作成
if (!is_dir($logDir)) {
    mkdir($logDir, 0777, true);
}

// ログファイル一覧を取得
$logFiles = glob($logDir . '*.txt');
rsort($logFiles); // 新しい順に並べ替え

// ファイル選択
$selectedFile = isset($_GET['file']) ? $_GET['file'] : '';
$filePath = $logDir . $selectedFile;

// セキュリティチェック
if ($selectedFile && (!file_exists($filePath) || !is_file($filePath) || !preg_match('/^(log|MFMlog|iFMGlog)_\d{4}-\d{2}-\d{2}_[a-z0-9]+\.txt$/', $selectedFile))) {
    $selectedFile = '';
}

// ログ内容の取得
$logContent = '';
if ($selectedFile && file_exists($filePath)) {
    $logContent = file_get_contents($filePath);
    
    // HTMLエスケープ
    $logContent = htmlspecialchars($logContent);
    
    // シンタックスハイライト
    $logContent = preg_replace('/\[(.*?)\]/', '<span style="color:#3498db">[$1]</span>', $logContent);
    $logContent = preg_replace('/\[error\]/', '<span style="color:#e74c3c">[error]</span>', $logContent);
    $logContent = preg_replace('/\[warn\]/', '<span style="color:#f39c12">[warn]</span>', $logContent);
    $logContent = preg_replace('/\[system\]/', '<span style="color:#27ae60">[system]</span>', $logContent);
    $logContent = preg_replace('/\[stamp\]/', '<span style="color:#9b59b6">[stamp]</span>', $logContent);
    $logContent = preg_replace('/\[event\]/', '<span style="color:#2ecc71">[event]</span>', $logContent);
    
    // === マーカー ===
    $logContent = preg_replace('/===\s(.*?)\s===/m', '<strong style="color:#e67e22">===== $1 =====</strong>', $logContent);
    
    // 行の整形
    $logContent = nl2br($logContent);
}

// ファイル情報
$fileInfo = [];
if ($selectedFile && file_exists($filePath)) {
    $fileInfo = [
        'name' => $selectedFile,
        'size' => round(filesize($filePath) / 1024, 2) . ' KB',
        'modified' => date('Y-m-d H:i:s', filemtime($filePath)),
        'lines' => count(file($filePath))
    ];
}

// デバイスタイプの色
$deviceColors = [
    'log' => '#3498db',      // 青
    'MFMlog' => '#e74c3c',   // 赤
    'iFMGlog' => '#2ecc71'   // 緑
];

// ファイル削除処理
if (isset($_GET['delete']) && $_GET['delete'] === $selectedFile) {
    if (file_exists($filePath) && unlink($filePath)) {
        header('Location: log_viewer.php');
        exit;
    }
}

// すべてのログをダウンロード
if (isset($_GET['download_all'])) {
    $zipFile = 'all_logs_' . date('Y-m-d_H-i-s') . '.zip';
    $zip = new ZipArchive();
    
    if ($zip->open($zipFile, ZipArchive::CREATE) === TRUE) {
        foreach ($logFiles as $file) {
            $zip->addFile($file, basename($file));
        }
        $zip->close();
        
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $zipFile . '"');
        header('Content-Length: ' . filesize($zipFile));
        readfile($zipFile);
        unlink($zipFile);
        exit;
    }
}

// 単一ログファイルのダウンロード
if (isset($_GET['download']) && $_GET['download'] === $selectedFile) {
    if (file_exists($filePath)) {
        header('Content-Type: text/plain');
        header('Content-Disposition: attachment; filename="' . $selectedFile . '"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }
}

// ページタイトル
$title = 'OralCanvas デバッグログビューア';
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $title; ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            margin-top: 0;
        }
        .file-list {
            float: left;
            width: 30%;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-right: 2%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .log-content {
            float: left;
            width: 65%;
            max-height: 80vh;
            overflow-y: auto;
            background: #f0f0f0;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            white-space: nowrap;
        }
        .file-item {
            padding: 8px;
            margin-bottom: 5px;
            border-radius: 3px;
            transition: background 0.2s;
        }
        .file-item:hover {
            background: #e9e9e9;
        }
        .file-item.active {
            background: #ddd;
            font-weight: bold;
        }
        .file-item a {
            text-decoration: none;
            color: #333;
            display: block;
        }
        .device-type {
            display: inline-block;
            width: 80px;
            padding: 2px 5px;
            border-radius: 3px;
            color: white;
            text-align: center;
            font-size: 0.8em;
            margin-right: 8px;
        }
        .timestamp {
            font-size: 0.8em;
            color: #777;
        }
        .file-actions {
            margin-top: 5px;
            text-align: right;
        }
        .file-actions a {
            margin-left: 10px;
            font-size: 0.8em;
            color: #3498db;
        }
        .clear {
            clear: both;
        }
        .file-info {
            margin: 20px 0;
            padding: 10px;
            background: #e9e9e9;
            border-radius: 3px;
        }
        .file-info dt {
            font-weight: bold;
            display: inline-block;
            width: 100px;
        }
        .file-info dd {
            display: inline-block;
            margin-left: 0;
            margin-bottom: 5px;
        }
        .actions {
            margin: 20px 0;
        }
        .btn {
            display: inline-block;
            padding: 8px 15px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            margin-right: 10px;
        }
        .btn:hover {
            background: #2980b9;
        }
        .btn.delete {
            background: #e74c3c;
        }
        .btn.delete:hover {
            background: #c0392b;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><?php echo $title; ?></h1>
        
        <div class="file-list">
            <h2>ログファイル一覧</h2>
            <?php if (empty($logFiles)): ?>
                <p>ログファイルはありません。</p>
            <?php else: ?>
                <?php foreach ($logFiles as $file): ?>
                    <?php
                        $filename = basename($file);
                        $parts = explode('_', $filename);
                        $deviceType = $parts[0];
                        $date = isset($parts[1]) ? $parts[1] : '';
                        $time = date('H:i:s', filemtime($file));
                        $color = isset($deviceColors[$deviceType]) ? $deviceColors[$deviceType] : '#777';
                    ?>
                    <div class="file-item <?php echo ($selectedFile === $filename) ? 'active' : ''; ?>">
                        <a href="?file=<?php echo urlencode($filename); ?>">
                            <span class="device-type" style="background-color: <?php echo $color; ?>">
                                <?php echo $deviceType; ?>
                            </span>
                            <?php echo $date; ?>
                            <span class="timestamp"><?php echo $time; ?></span>
                        </a>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
            
            <div class="actions">
                <a href="?download_all=1" class="btn">すべてダウンロード</a>
            </div>
        </div>
        
        <div class="log-content">
            <?php if ($selectedFile): ?>
                <div class="file-info">
                    <dl>
                        <dt>ファイル名:</dt>
                        <dd><?php echo $fileInfo['name']; ?></dd>
                        <dt>サイズ:</dt>
                        <dd><?php echo $fileInfo['size']; ?></dd>
                        <dt>更新日時:</dt>
                        <dd><?php echo $fileInfo['modified']; ?></dd>
                        <dt>行数:</dt>
                        <dd><?php echo $fileInfo['lines']; ?></dd>
                    </dl>
                </div>
                
                <div class="actions">
                    <a href="?download=<?php echo urlencode($selectedFile); ?>" class="btn">ダウンロード</a>
                    <a href="?delete=<?php echo urlencode($selectedFile); ?>" class="btn delete" onclick="return confirm('本当に削除しますか？');">削除</a>
                </div>
                
                <pre><?php echo $logContent; ?></pre>
            <?php else: ?>
                <p>ログファイルを選択してください。</p>
            <?php endif; ?>
        </div>
        
        <div class="clear"></div>
    </div>
</body>
</html>