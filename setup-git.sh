#!/bin/bash
# ============================================================
# Goto Coffee Shaka² — Git 初期セットアップスクリプト
# 初回のみ実行してください
# ============================================================

set -e

REPO_URL="https://github.com/ken-10-go/RJ.git"
BRANCH="main"

echo "================================================"
echo "  Goto Coffee Shaka² — Git セットアップ"
echo "================================================"
echo ""

# スクリプトのあるディレクトリに移動
cd "$(dirname "$0")"
echo "作業ディレクトリ: $(pwd)"
echo ""

# git 初期化
if [ -d ".git" ]; then
  echo "[スキップ] すでに git リポジトリです"
else
  echo "[実行] git init..."
  git init
  git checkout -b "$BRANCH" 2>/dev/null || git branch -M "$BRANCH"
  echo "  → git 初期化完了"
fi
echo ""

# リモート設定
if git remote get-url origin &>/dev/null; then
  echo "[スキップ] origin リモートはすでに設定済み: $(git remote get-url origin)"
else
  echo "[実行] リモート追加: $REPO_URL"
  git remote add origin "$REPO_URL"
  echo "  → リモート設定完了"
fi
echo ""

# .gitignore 作成
if [ ! -f ".gitignore" ]; then
  echo "[実行] .gitignore を作成..."
  cat > .gitignore << 'EOF'
.DS_Store
*.log
eval-review-*.html
EOF
  echo "  → .gitignore 作成完了"
else
  echo "[スキップ] .gitignore はすでに存在します"
fi
echo ""

# GitHub からリモートの内容を取得（既存コミットがある場合）
echo "[実行] GitHub からリモートの状態を取得..."
git fetch origin "$BRANCH" 2>/dev/null && {
  echo "  → フェッチ完了"
  echo ""
  echo "[情報] リモートとローカルを比較します..."
  echo "  リモートのコミット:"
  git log --oneline origin/"$BRANCH" | head -5 2>/dev/null || echo "  （履歴なし）"
  echo ""
  read -p "リモートの内容を取り込みますか？ (y/N): " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    git reset --hard origin/"$BRANCH"
    echo "  → リモートの内容に合わせました"
  else
    echo "  → スキップしました（ローカルのファイルをそのまま使います）"
  fi
} || {
  echo "  → リモートにまだコンテンツがないか、接続できません"
  echo "  （GitHub に初回プッシュするときは deploy.sh を使ってください）"
}

echo ""
echo "================================================"
echo "  セットアップ完了！"
echo "  次は deploy.sh を使ってデプロイできます。"
echo "================================================"
