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
ssh bn "bash -lc '
  set -e
  cd /root/workspace/commander
  echo \"HOST=\$(hostname)\"
  echo \"PWD=\$(pwd)\"
  echo \"PATH=\$PATH\"
  command -v node || true
  node -v || true
  command -v npm || true
  npm -v || true

  export NVM_DIR=\"\$HOME/.nvm\"
  if [ -s \"\$NVM_DIR/nvm.sh\" ]; then
    . \"\$NVM_DIR/nvm.sh\"
    if ! nvm use 20 >/dev/null; then
      echo \"[WARN] nvm node 20 not found, fallback to nvm default\"
      nvm use default >/dev/null || true
    fi
  fi

  echo \"FINAL_NODE=\$(node -v) \$(which node)\"

  NODE_MAJOR=\$(node -v | sed -E \"s/^v([0-9]+).*/\\1/\")
  if [ \"\$NODE_MAJOR\" -lt 20 ]; then
    echo \"[ERROR] Node version must be >= 20, current: \$(node -v)\"
    exit 1
  fi

  git pull
  npm run build
  echo deployed
'"

echo "=== 完成 ==="
