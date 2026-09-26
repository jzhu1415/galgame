#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ ! -d node_modules ]]; then
  npm install || exit 1
fi
if curl --silent --fail http://127.0.0.1:5173/ >/dev/null; then
  open http://127.0.0.1:5173/
  exit 0
fi
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort &
server_pid=$!
trap 'kill $server_pid 2>/dev/null' EXIT
for _ in {1..40}; do
  if curl --silent --fail http://127.0.0.1:5173/ >/dev/null; then
    open http://127.0.0.1:5173/
    wait $server_pid
    exit $?
  fi
  sleep 0.25
done
echo "本地服务未能启动，请检查上方错误信息。"
wait $server_pid
