#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

# 固定线上发布目的地（按需修改）
SSH_TARGET="root@8.138.171.25"
DEPLOY_DIR="/opt/www.aidomi.net/"
SSH_BASE="ssh -p 22"

cd "$REPO_ROOT"

echo "==> build admin dist (embedded into Go binary)"
"$REPO_ROOT/scripts/build-admin.sh"

echo "==> build binary"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o gopress .

echo "==> ensure remote directory: ${DEPLOY_DIR}"
# shellcheck disable=SC2086
${SSH_BASE} "${SSH_TARGET}" "mkdir -p '${DEPLOY_DIR}' '${DEPLOY_DIR}/configs' '${DEPLOY_DIR}/site/dist'"

echo "==> sync runtime files to remote"
# shellcheck disable=SC2086
rsync -az --delete -e "${SSH_BASE}" \
  --include "/gopress" \
  --include "/configs/***" \
  --include "/site/" \
  --include "/site/dist/***" \
  --exclude "*" \
  "${REPO_ROOT}/" "${SSH_TARGET}:${DEPLOY_DIR}/"

echo "==> deploy complete"
echo "remote: ${SSH_TARGET}:${DEPLOY_DIR}"

echo "done."
echo "tips:"
echo "- only runtime files are synced: gopress/configs/site/dist"
echo "- data/ is untouched on remote (sqlite preserved)"
