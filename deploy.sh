#!/bin/bash
# ============================================================
# Goto Coffee Shaka² — デプロイスクリプト
# GitHub Pages (https://ken-10-go.github.io/RJ) へプッシュ
# ============================================================

set -e

BRANCH="main"

# スクリプトのあるディレクトリに移動
cd "$(dirname "$0")"

echo "================================================"
echo "  Goto Coffee Shaka² — デプロイ"
echo "================================================"
echo ""

# git リポジトリ確認
if [ ! -d ".git" ]; then
  echo "[エラー] git リポジトリが初期化されていません。"
  echo "  先に setup-git.sh を実行してください。"
  exit 1
fi

# 現在の差分確認
echo "[確認] 変更されたファイル:"
git status --short
echo ""

# 変更がなければ終了
if git diff --quiet && git diff --cached --quiet; then
  if git status | grep -q "nothing to commit"; then
    echo "[情報] 変更はありません。デプロイ不要です。"
    exit 0
  fi
fi

# コミットメッセージを入力
DEFAULT_MSG="Update: $(date '+%Y-%m-%d %H:%M')"
read -p "コミットメッセージ (Enter でデフォルト: \"$DEFAULT_MSG\"): " MSG
MSG="${MSG:-$DEFAULT_MSG}"

echo ""
echo "[実行] ステージング..."
git add index.html
[ -f "焙煎ログ.html" ] && git add "焙煎ログ.html"
[ -f "HANDOFF.md" ] && git add HANDOFF.md
[ -f ".gitignore" ] && git add .gitignore

echo "[実行] コミット: \"$MSG\""
git commit -m "$MSG"

echo ""
echo "[実行] GitHub へプッシュ中..."
git push origin "$BRANCH"

echo ""
echo "================================================"
echo "  デプロイ完了！"
echo "  数分後に反映されます:"
echo "  https://ken-10-go.github.io/RJ"
echo "================================================"
