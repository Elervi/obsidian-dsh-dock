#!/usr/bin/env bash
# cleanup-orphans.sh —— 清理 dsh-dock / 官方 dsh web 的残留孤儿进程
# （Obsidian 崩溃/强退时 onunload 未执行、遗留的 dsh web 服务）。
#
# 用法:
#   bash scripts/cleanup-orphans.sh            # 清理并复核端口
#   bash scripts/cleanup-orphans.sh --dry-run  # 只列出，不清理
#
# 说明: 升级到 0.2.5 后插件每次启动会自动清扫本库端口上的孤儿，
#       本脚本用于一次性清掉存量残留（或应急手动清理）。
set -u

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

pids=$(pgrep -f "@deepseek-ai/dsh.* web " 2>/dev/null || true)
pids="$pids $(pgrep -f "bin/dsh web" 2>/dev/null || true)"
pids=$(printf '%s\n' $pids | sort -nu | tr '\n' ' ')

if [ -z "${pids// /}" ]; then
  echo "没有发现 dsh web 进程。"
  exit 0
fi

echo "发现 dsh web 进程:"
for p in $pids; do
  ps -o pid=,ppid=,command= -p "$p" 2>/dev/null | cut -c1-110
done

if [ "$DRY" = "1" ]; then
  echo "[dry-run] 未执行清理。"
  exit 0
fi

echo "发送 SIGTERM…"
for p in $pids; do kill -TERM "$p" 2>/dev/null || true; done
sleep 3
for p in $pids; do
  if kill -0 "$p" 2>/dev/null; then
    echo "  SIGKILL $p"
    kill -9 "$p" 2>/dev/null || true
  fi
done

echo "复核常见 dsh 端口:"
for port in 3080 3956 5190 5707 6047 7141; do
  if curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$port/" 2>/dev/null; then
    echo "  port $port 仍在响应！"
  else
    echo "  port $port 已释放"
  fi
done
echo "完成。"
