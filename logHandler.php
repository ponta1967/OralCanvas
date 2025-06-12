<?php
// logHandler.php - ログデータを受け取り、ファイルに書き込む

// CORS対応
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエストの場合は終了
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ログファイル名を取得
$logFileName = isset($_GET['file']) ? $_GET['file'] : 'log.txt';

// ファイル名の検証（セッションID形式のファイルのみ許可）
if (!preg_match('/^(log|MFMlog|iFMGlog)_\d{4}-\d{2}-\d{2}_[a-z0-9]+\.txt$/', $logFileName)) {
    http_response_code(400);
    exit('不正なログファイル名です');
}

// 新規ファイルかどうかを確認
$isNewFile = isset($_GET['new']) && $_GET['new'] == '1';

// ログディレクトリ
$logDir = 'logs/';
if (!is_dir($logDir)) {
    mkdir($logDir, 0777, true);
}

// 完全なファイルパス
$logFilePath = $logDir . $logFileName;

// POSTデータを取得
$rawData = file_get_contents('php://input');
if (!$rawData) {
    http_response_code(400);
    exit('データが空です');
}

// JSONデータをデコード
$logData = json_decode($rawData, true);
if (!$logData) {
    http_response_code(400);
    exit('不正なJSONデータです');
}

// ファイルモード（新規作成か追記か）
$fileMode = ($isNewFile || !file_exists($logFilePath)) ? 'w' : 'a';

// ログファイルに書き込み
$logFile = fopen($logFilePath, $fileMode);
if (!$logFile) {
    http_response_code(500);
    exit('ログファイルを開けませんでした');
}

// デバイス情報をヘッダーとして書き込み（新規ファイルの場合）
if ($fileMode === 'w') {
    fwrite($logFile, "=== デバッグログ ===\n");
    fwrite($logFile, "セッション開始: " . date('Y-m-d H:i:s') . "\n");
    fwrite($logFile, "=== デバイス情報 ===\n");
    foreach ($logData['device'] as $key => $value) {
        fwrite($logFile, "$key: $value\n");
    }
    fwrite($logFile, "=================\n\n");
    
    // キャンバス情報も記録（存在する場合）
    if (!empty($logData['canvasInfo'])) {
        fwrite($logFile, "=== キャンバス情報 ===\n");
        fwrite($logFile, json_encode($logData['canvasInfo'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
        fwrite($logFile, "=================\n\n");
    }
}

// ログを書き込み
foreach ($logData['logs'] as $log) {
    $timestamp = isset($log['timestamp']) ? $log['timestamp'] : date('Y-m-d H:i:s');
    $elapsed = isset($log['elapsed']) ? sprintf("(+%0.3fs)", $log['elapsed'] / 1000) : '';
    $type = isset($log['type']) ? $log['type'] : 'info';
    $message = isset($log['message']) ? $log['message'] : '';
    
    $logLine = "[$timestamp] $elapsed [$type] $message";
    
    if (!empty($log['data'])) {
        $logLine .= "\n  データ: " . $log['data'];
    }
    
    fwrite($logFile, $logLine . "\n");
}

// 最終ログの場合、終了マーカーを追加
if (isset($logData['isFinal']) && $logData['isFinal']) {
    fwrite($logFile, "\n=== ログ終了: " . date('Y-m-d H:i:s') . " ===\n");
    
    // 最終キャンバス情報も記録（存在する場合）
    if (!empty($logData['canvasInfo'])) {
        fwrite($logFile, "\n=== 最終キャンバス情報 ===\n");
        fwrite($logFile, json_encode($logData['canvasInfo'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
        fwrite($logFile, "=================\n");
    }
}

fclose($logFile);

// 古いログファイルのクリーンアップ (7日以上前のファイルを削除)
if (rand(1, 10) === 1) { // 10%の確率でクリーンアップを実行（負荷軽減）
    $files = glob($logDir . '*.txt');
    $now = time();
    foreach ($files as $file) {
        if (is_file($file) && ($now - filemtime($file)) >= 7 * 24 * 60 * 60) {
            unlink($file);
        }
    }
}

echo json_encode([
    'success' => true,
    'message' => 'ログが保存されました',
    'file' => $logFileName,
    'logCount' => count($logData['logs'])
]);