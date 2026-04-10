# GitHub Pages デプロイ手順

**アプリURL**: https://ken-10-go.github.io/RJ  
**リポジトリ**: https://github.com/ken-10-go/RJ

---

## 初回セットアップ（1回だけ）

### 1. GitHub の認証設定

Macのターミナルで以下を実行してください。

**Personal Access Token を使う場合（推奨）:**

1. GitHubにログイン → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" → `repo` スコープにチェック → 生成
3. 表示されたトークンをコピー（一度しか見られません）
4. ターミナルで以下を実行しておく（次回から自動的に認証されます）:

```bash
git config --global credential.helper osxkeychain
```

### 2. Develop フォルダで初期設定

```bash
cd ~/（Developフォルダのパス）
chmod +x setup-git.sh deploy.sh
bash setup-git.sh
```

実行すると以下が行われます:
- git リポジトリの初期化
- GitHub リモートの接続
- .gitignore の作成
- GitHub から既存コンテンツの取得（リモートの内容で初期化）

---

## 日常のデプロイ手順（毎回）

Cowork で `index.html` を編集したら、Macのターミナルで:

```bash
cd ~/（Developフォルダのパス）
bash deploy.sh
```

プロンプトが表示されます:
```
変更されたファイル:
 M index.html

コミットメッセージ (Enter でデフォルト: "Update: 2026-04-10 15:30"):
```

- メッセージを入力 → Enter（例: `カメラOCR改善`）
- または何も入力せずEnter（日時が自動でメッセージになります）

数分後に https://ken-10-go.github.io/RJ に反映されます。

---

## トラブルシューティング

### 「Authentication failed」と出る場合
GitHubのPersonal Access Tokenが必要です（上記「初回セットアップ」参照）。  
プッシュ時にユーザー名とパスワード（トークン）を求められたら:
- Username: `ken-10-go`
- Password: 発行したPersonal Access Token

### 「rejected」「non-fast-forward」と出る場合
GitHub側で直接編集した内容と競合しています:
```bash
git pull origin main --rebase
bash deploy.sh
```

### GitHub Pages が更新されない場合
- GitHubリポジトリ → Settings → Pages → Source が `main` ブランチのルート(`/`)になっているか確認
- 数分待ってもダメなら Actions タブでエラーがないか確認

---

## 開発フロー全体像

```
Cowork (Claude) で編集
       ↓
Develop フォルダ内の index.html が更新される
       ↓
Macターミナルで bash deploy.sh
       ↓
GitHub (ken-10-go/RJ) に push
       ↓
GitHub Pages が自動で更新
       ↓
https://ken-10-go.github.io/RJ に反映（数分後）
```
