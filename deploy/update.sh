#!/bin/sh
# 開発 PC（WSL）で実行: 今の HEAD でイメージを作り、社内 PC（192.168.40.150）に送って入れ替える。
# 社内 PC 側の設定と運用手順は deploy/windows-setup.md を参照。
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
