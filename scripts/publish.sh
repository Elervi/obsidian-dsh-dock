#!/usr/bin/env bash
# publish.sh - publish DSH Dock <version> via api.github.com (works even when github.com is blocked)
#
# Why api.github.com: when github.com times out (common in CN networks), api.github.com
# usually stays reachable, while Obsidian's plugin download goes through the blocked
# github.com releases/download domain.
#
# Usage:
#   GH_TOKEN=<token> bash scripts/publish.sh [version, default 0.3.0]
#
# Token requirements (write access to Elervi/obsidian-dsh-dock):
#   - classic PAT: at least `repo` scope
#   - fine-grained PAT: Contents read+write (covers releases and contents APIs)
#
# Steps:
#   1) Push versions.json (with $TAG) to main via the Contents API (no git push needed)
#   2) Publish the $TAG draft release if it exists; otherwise create it and upload
#      main.js / manifest.json / styles.css (built from the local working tree)
#   3) Verify latest release == $TAG with all assets present
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="Elervi/obsidian-dsh-dock"
TAG="${1:-0.3.0}"
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "Error: set GH_TOKEN (or GITHUB_TOKEN) with write access to $REPO" >&2
  exit 1
fi
API="https://api.github.com"
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="Accept: application/vnd.github+json"

echo "==> 1/3 update versions.json on main (add $TAG)"
VJ="$(curl -sS -m 30 -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/contents/versions.json")"
SHA="$(python3 -c "import json,sys;print(json.loads(sys.stdin.read())['sha'])" <<<"$VJ")"
NEW_B64="$(python3 -c "
import json, base64
d = json.load(open('versions.json'))
d.setdefault('$TAG', '1.5.0')
print(base64.b64encode(json.dumps(d, separators=(',', ':')).encode()).decode())
")"
curl -sS -m 30 -X PUT -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/contents/versions.json" \
  -d "{\"message\":\"chore: add $TAG to versions.json\",\"content\":\"$NEW_B64\",\"sha\":\"$SHA\",\"branch\":\"main\"}" \
  -o /dev/null -w "    versions.json updated: HTTP %{http_code}\n"

echo "==> 2/3 publish release $TAG"
RID="$(curl -sS -m 30 -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases/tags/$TAG" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('id') or '')" 2>/dev/null || true)"
if [ -n "$RID" ]; then
  curl -sS -m 30 -X PATCH -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases/$RID" \
    -d '{"draft":false}' -o /dev/null -w "    draft published: HTTP %{http_code}\n"
else
  echo "    no draft found for $TAG; creating new release..."
  RID="$(curl -sS -m 30 -X POST -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases" \
    -d "{\"tag_name\":\"$TAG\",\"name\":\"DSH Dock $TAG\",\"draft\":false}" \
    | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")"
  echo "    release created (id $RID); uploading assets..."
  U="https://uploads.github.com/repos/$REPO/releases/$RID/assets"
  curl -sS -m 90 -X POST -H "$AUTH" -H "Content-Type: application/javascript" \
    --data-binary @main.js "$U?name=main.js" -o /dev/null -w "      main.js: HTTP %{http_code}\n"
  curl -sS -m 60 -X POST -H "$AUTH" -H "Content-Type: application/json" \
    --data-binary @manifest.json "$U?name=manifest.json" -o /dev/null -w "      manifest.json: HTTP %{http_code}\n"
  curl -sS -m 60 -X POST -H "$AUTH" -H "Content-Type: text/css" \
    --data-binary @styles.css "$U?name=styles.css" -o /dev/null -w "      styles.css: HTTP %{http_code}\n"
fi

echo "==> 3/3 verify"
curl -sS -m 30 -H "$AUTH" -H "$ACCEPT" "$API/repos/$REPO/releases/latest" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('    latest release:', d['tag_name'])
print('    assets:', sorted(a['name'] for a in d['assets']))
"
echo "Done. Obsidian market will offer installable $TAG once the obsidian-release bot validates (usually a few minutes)."
