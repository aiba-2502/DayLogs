#!/bin/sh
# 社内 PC の WSL で root が実行: daylogs:<タグ> に入れ替える。update.sh から呼ばれる。
# 入れ替え前に SQLite をバックアップし、起動しなければ元のタグに戻す。
set -eu
cd /opt/daylogs
tag=$1
printf '%s' "$tag" | grep -Eqx '[0-9a-f]{7,40}' || { echo "invalid tag: $tag" >&2; exit 2; }
old=$(sed -n 's/^TAG=//p' .env)

./backup.sh "pre-$tag"
sed -i "s/^TAG=.*/TAG=$tag/" .env
docker compose up -d

for _ in 1 2 3 4 5 6 7 8 9 10; do
	if curl -fsS -o /dev/null -H 'Content-Type: application/json' -d '{"query":"{version{name}}"}' http://127.0.0.1:3030/graphql; then
		echo "deployed $tag"
		exit 0
	fi
	sleep 3
done
echo "DayLogs did not start, rolling back to $old" >&2
sed -i "s/^TAG=.*/TAG=$old/" .env
docker compose up -d
exit 1
