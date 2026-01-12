#!/bin/bash

# DeckSmith 快速啟動腳本
# 1. 檢查並產生自簽 SSL 憑證
# 2. 啟動 Docker Compose

echo "🚀 正在檢查 DeckSmith 環境配置..."

# 檢查 .env 檔案
if [ ! -f ".env" ]; then
    echo "📝 正在建立預設 .env 檔案..."
    cp .env.example .env 2>/dev/null || touch .env
fi

# 檢查 ssl 目錄是否存在
if [ ! -d "./ssl" ]; then
    mkdir -p ssl
fi

# 檢查憑證檔案是否存在
if [ ! -f "./ssl/fullchain.pem" ] || [ ! -f "./ssl/privkey.pem" ]; then
    echo "⚠️ 未偵測到 SSL 憑證，正在產生自簽憑證 (僅供測試使用)..."
    
    # 使用 openssl 產生 365 天效期的自簽憑證
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout ssl/privkey.pem \
      -out ssl/fullchain.pem \
      -subj "/C=TW/ST=Taiwan/L=Taipei/O=DeckSmith/OU=AI/CN=localhost"
    
    if [ $? -eq 0 ]; then
        echo "✅ 自簽憑證產生成功！"
    else
        echo "❌ 憑證產生失敗，請確認系統是否已安裝 openssl。"
        exit 1
    fi
else
    echo "✅ SSL 憑證已存在。"
fi

# 執行 Docker Compose
echo "📦 正在啟動 DeckSmith 容器服務..."
docker-compose up -d --build

echo "------------------------------------------------"
echo "🎉 DeckSmith 服務啟動成功！"
echo "請訪問: https://localhost"
echo "注意：使用自簽憑證時，瀏覽器會提示不安全，請點選「進階」並「繼續前往」。"
echo "------------------------------------------------"
