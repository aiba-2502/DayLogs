#!/bin/sh
# 開発 PC（WSL）で実行: 今の HEAD でイメージを作り、社内 PC（192.168.40.150）に送って入れ替える。
#
# 社内 PC の初回設定（実施済み。作り直すときの控え）:
#   - OpenSSH サーバーを有効化し、ファイアウォールで同じネットワークからの 22 番を許可
#   - 開発 PC の公開鍵（~/.ssh/daylogs_win_ed25519.pub）を C:\ProgramData\ssh\administrators_authorized_keys に登録
#   - WSL「Ubuntu-24.04」（systemd 有効、Docker Engine 導入済み）の /opt/daylogs に
#     docker-compose.yml・switch.sh・backup.sh と .env を置き、sqlite3 を入れ、daylogs-backup.cron を /etc/cron.d/daylogs-backup に置く
#   - Hyper-V ファイアウォールで WSL への 3030 番の受信を同じネットワークから許可
#   - タスク スケジューラ「DayLogs WSL」: 起動時に wsl -d Ubuntu-24.04 -u root -- sleep infinity を実行（WSL を止めないため）
set -eu
cd "$(git rev-parse --show-toplevel)"
host=aiba@192.168.40.150
key=$HOME/.ssh/daylogs_win_ed25519
tag=$(git rev-parse --short HEAD)
file=daylogs-$tag.tar.gz

docker build -f docker/Dockerfile.dev -t "daylogs:$tag" .
docker save "daylogs:$tag" | gzip > "/tmp/$file"
scp -i "$key" -o BatchMode=yes "/tmp/$file" "$host:$file"
rm -f "/tmp/$file"
ssh -i "$key" -o BatchMode=yes "$host" "wsl -d Ubuntu-24.04 -u root -- sh -c \"docker load -i /mnt/c/Users/aiba/$file && rm /mnt/c/Users/aiba/$file && /opt/daylogs/switch.sh $tag\""
