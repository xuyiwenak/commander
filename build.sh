#!/bin/bash
# Commander 一键构建 & 部署脚本
# 用法: ./build.sh [commit message]

set -e

MSG="${1:-deploy: update commander}"

echo "=== 1/4 提交本地改动 ==="
git add -A
git commit -m "$MSG" || echo "(nothing to commit, skipping)"

echo "=== 2/4 构建前端 ==="
npm run build

echo "=== 3/4 推送到远程 ==="
git push origin master

echo "=== 4/4 服务器拉取 & 构建 ==="
ssh bn "cd /root/workspace/commander && git pull && npm run build && echo deployed"

echo "=== 完成 ==="
