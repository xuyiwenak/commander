#!/usr/bin/env bash

set -euo pipefail

readonly DEPLOY_HOST="${COMMANDER_DEPLOY_HOST:-bn}"
readonly REMOTE_REPO_DIR="${COMMANDER_REMOTE_REPO_DIR:-/root/workspace/commander}"
readonly REMOTE_DIST_DIR="${COMMANDER_REMOTE_DIST_DIR:-${REMOTE_REPO_DIR}/dist}"
readonly DEPLOY_URL="${COMMANDER_DEPLOY_URL:-https://www.starryspark.com.cn/art}"
readonly DEPLOY_BRANCH="${COMMANDER_DEPLOY_BRANCH:-master}"
readonly DEFAULT_COMMIT_MESSAGE='chore(deploy): update commander'

logStep() {
  local stepName="$1"
  printf '\n==> %s\n' "$stepName"
}

verifyBranch() {
  local currentBranch
  currentBranch="$(git branch --show-current)"

  if [[ "$currentBranch" != "$DEPLOY_BRANCH" ]]; then
    printf '错误：当前分支为 %s，部署分支应为 %s。\n' "$currentBranch" "$DEPLOY_BRANCH" >&2
    exit 1
  fi
}

buildFrontend() {
  logStep '1/6 本地构建前端'
  npm run build
  test -f dist/index.html
}

commitAndPush() {
  local commitMessage="$1"

  logStep '2/6 提交并推送源码'
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "$commitMessage"
  else
    printf '没有新的源码改动，跳过提交。\n'
  fi
  git push origin "$DEPLOY_BRANCH"
}

syncRemoteSource() {
  logStep '3/6 服务器同步源码'
  ssh "$DEPLOY_HOST" \
    "cd '$REMOTE_REPO_DIR' && git pull --ff-only origin '$DEPLOY_BRANCH'"
}

uploadStaticAssets() {
  logStep '4/6 上传静态资源'
  ssh "$DEPLOY_HOST" "mkdir -p '$REMOTE_DIST_DIR'"
  rsync -az --exclude 'index.html' dist/ "$DEPLOY_HOST:$REMOTE_DIST_DIR/"
}

publishIndex() {
  logStep '5/6 原子发布入口文件'
  rsync -az dist/index.html "$DEPLOY_HOST:$REMOTE_DIST_DIR/.index.html.next"
  ssh "$DEPLOY_HOST" \
    "mv '$REMOTE_DIST_DIR/.index.html.next' '$REMOTE_DIST_DIR/index.html'"
}

verifyDeployment() {
  local localHash
  local remoteHash

  logStep '6/6 验证线上文件和页面'
  localHash="$(shasum -a 256 dist/index.html | awk '{print $1}')"
  remoteHash="$(ssh "$DEPLOY_HOST" "sha256sum '$REMOTE_DIST_DIR/index.html'" | awk '{print $1}')"

  if [[ "$localHash" != "$remoteHash" ]]; then
    printf '错误：线上 index.html 与本地构建结果不一致。\n' >&2
    exit 1
  fi
  curl --fail --silent --show-error --location --output /dev/null "$DEPLOY_URL"
  printf '部署完成：%s\n' "$DEPLOY_URL"
  printf '静态文件已生效，无需重启 Docker 或 reload Nginx。\n'
}

main() {
  local commitMessage="${1:-$DEFAULT_COMMIT_MESSAGE}"

  verifyBranch
  buildFrontend
  commitAndPush "$commitMessage"
  syncRemoteSource
  uploadStaticAssets
  publishIndex
  verifyDeployment
}

main "$@"
