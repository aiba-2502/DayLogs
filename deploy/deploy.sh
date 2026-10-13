#!/bin/sh
# GitHub Actions が SSH で実行するデプロイ処理。authorized_keys の command= 指定で、Actions の鍵ではこれしか実行できない。
# SSH のコマンド部分に「<コミットSHA> <GitHubユーザー名>」、標準入力に GHCR を読むトークンを受け取る。
#
# 初回のみ root で:
#   useradd -m -s /bin/sh deploy && usermod -aG docker deploy
#   install -d -o deploy -g deploy /opt/daylogs /opt/daylogs/backups
#   このフォルダの docker-compose.yml・Caddyfile・deploy.sh を /opt/daylogs に置く（deploy.sh は chmod 755）
#   /opt/daylogs/.env を作る（docker-compose.yml の先頭を参照）
#   ~deploy/.ssh/authorized_keys に GitHub Actions 用の公開鍵を次の形で1行:
#     command="/opt/daylogs/deploy.sh",restrict ssh-ed25519 AAAA... github-actions
set -eu
cd "$(dirname "$0")"
image=ghcr.io/aiba-2502/daylogs

set -f
# shellcheck disable=SC2086 # 空白で分けるため
set -- ${SSH_ORIGINAL_COMMAND:-}
set +f
if [ $# -ne 2 ] || ! printf '%s' "$1" | grep -Eqx '[0-9a-f]{40}' || ! printf '%s' "$2" | grep -Eqx '[A-Za-z0-9-]+'; then
	echo 'usage: <commit sha> <github user>' >&2
	exit 2
fi
sha=$1
user=$2

docker login ghcr.io -u "$user" --password-stdin
trap 'docker logout ghcr.io >/dev/null 2>&1' EXIT
docker pull "$image:$sha"

# 入れ替える前に止めて SQLite をバックアップする（直近30件を残す）
docker compose stop traggo
if [ -f data/traggo.db ]; then
	cp data/traggo.db "backups/traggo-$(date +%Y%m%d-%H%M%S)-$sha.db"
fi
# shellcheck disable=SC2012 # ファイル名は上で作ったものだけ
ls -t backups/*.db 2>/dev/null | tail -n +31 | xargs -r rm --
docker tag "$image:$sha" daylogs:current
docker compose up -d
docker image prune -af >/dev/null

for _ in 1 2 3 4 5 6 7 8 9 10; do
	if curl -fsS -o /dev/null -H 'Content-Type: application/json' -d '{"query":"{version{name}}"}' http://127.0.0.1:3030/graphql; then
		echo "deployed $sha"
		exit 0
	fi
	sleep 3
done
echo 'DayLogs did not start' >&2
exit 1
