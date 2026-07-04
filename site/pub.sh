#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

REMOTE_HOST="${1:-root@119.29.137.64}"
REMOTE_DIR="${2:-/opt/domiai/www/}"
REMOTE_DIR="${REMOTE_DIR%/}"

echo "==> [1/4] 检查运行环境"
command -v node >/dev/null 2>&1 || { echo "未找到 node"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "未找到 pnpm"; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "未找到 rsync（本地）"; exit 1; }
command -v ssh >/dev/null 2>&1 || { echo "未找到 ssh"; exit 1; }

echo "==> [2/4] 安装依赖并构建"
pnpm install --frozen-lockfile
pnpm build

if [ ! -d "dist" ]; then
  echo "构建成功但未找到 dist 目录，请检查构建脚本"
  exit 1
fi

echo "==> [3/4] 准备远程目录: $REMOTE_HOST:$REMOTE_DIR"
ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

echo "==> [4/4] rsync 同步 dist 到远程（本机与远端均需有 rsync）"
# 纯静态发布：只同步构建产物 dist/ 内容到站点目录
# 进度：rsync 3.1+ 用整体进度条；更旧版本回退为 --progress（文件多时输出较多）
RSYNC_PROGRESS=(--info=progress2)
if ! rsync --help 2>&1 | grep -qF 'info=progress2'; then
  RSYNC_PROGRESS=(--progress)
fi
rsync -az --delete "${RSYNC_PROGRESS[@]}" \
  -e ssh \
  dist/ \
  "$REMOTE_HOST:$REMOTE_DIR/"

echo ""
echo "发布完成: $REMOTE_HOST:$REMOTE_DIR"
echo "可在服务器执行:"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "若需更新 nginx 配置模板（首次/变更时）："
echo "  sudo install -m 644 deploy/nginx.domiai.conf /etc/nginx/conf.d/domiai.conf"
