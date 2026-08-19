#!/usr/bin/env bash
# publish-0.2.5.sh — 通过 api.github.com 完成 DSH Dock 0.2.5 的社区发布
#
# 为什么走 api.github.com：github.com 被墙/超时时，api.github.com 通常仍可达，
# 而 Obsidian 装插件依赖的 releases/download 恰好在被墙的 github.com 上。
#
# 用法：
#   GH_TOKEN=<token> bash scripts/publish-0.2.5.sh
#
# token 要求（对 Elervi/obsidian-dsh-dock 有写权限）：
#   - classic PAT：scope 至少 `repo`
#   - fine-grained PAT：Contents 读+写（覆盖 release 与 contents API）
#
# 脚本做的事：
#   1) 把 versions.json（含 0.2.5）更新到 main 分支（Contents API，无需 git push）
#   2) 找到 0.2.5 的草稿 release 并发布（draft:false）；找不到则按 tag 新建
#   3) 验证 latest release == 0.2.5 且资产齐全
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="Elervi/obsidian-dsh-dock"
TAG="0.2.5"
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "错误: 请设置 GH_TOKEN（或 GITHUB_TOKEN），需要该仓库写权限" >&2
  exit 1
fi
API="https://api.github.com"
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="Accept: application/vnd.github+json"

echo "==> 1/3 更新 main 分支 versions.json（补 0.2.5）"
VJ="$(curl -sS -m 30 -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/contents/versions.json")"
SHA="$(python3 -c "import json,sys;print(json.loads(sys.stdin.read())['sha'])" <<<"$VJ")"
NEW_B64="$(python3 -c "
import json, base64
d = json.load(open('versions.json'))
d.setdefault('0.2.5', '1.5.0')
print(base64.b64encode(json.dumps(d, separators=(',', ':')).encode()).decode())
")"
curl -sS -m 30 -X PUT -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/contents/versions.json" \
  -d "{\"message\":\"chore: add 0.2.5 to versions.json\",\"content\":\"$NEW_B64\",\"sha\":\"$SHA\",\"branch\":\"main\"}" \
  -o /dev/null -w "    versions.json 更新: HTTP %{http_code}\n"

echo "==> 2/3 发布 $TAG release（草稿 → 公开）"
RID="$(curl -sS -m 30 -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases/tags/$TAG" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('id') or '')" 2>/dev/null || true)"
if [ -n "$RID" ]; then
  curl -sS -m 30 -X PATCH -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases/$RID" \
    -d '{"draft":false}' -o /dev/null -w "    release 已公开: HTTP %{http_code}\n"
else
  echo "    未找到 $TAG 的草稿，按 tag 新建 release…"
  curl -sS -m 30 -X POST -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases" \
    -d "{\"tag_name\":\"$TAG\",\"name\":\"DSH Dock $TAG\",\"draft\":false}" \
    -o /dev/null -w "    release 创建: HTTP %{http_code}\n"
fi

echo "==> 3/3 验证"
curl -sS -m 30 -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases/latest" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('    latest release:', d['tag_name'])
print('    assets:', [a['name'] for a in d['assets']])
"
echo "完成。Obsidian 市场将出现可安装的 $TAG（需等发布机器人 obsidian-release 验证通过）。"
