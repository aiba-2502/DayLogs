#!/bin/sh
# SQLite を Windows 側の C:\DayLogsBackup にコピーし、30日より古いものを消す。
# 毎日 /etc/cron.d/daylogs-backup（daylogs-backup.cron）から、入れ替え前は switch.sh から呼ばれる。
set -eu
dest=/mnt/c/DayLogsBackup
mkdir -p "$dest"
if [ -f /opt/daylogs/data/traggo.db ]; then
	sqlite3 /opt/daylogs/data/traggo.db ".backup '$dest/traggo-$(date +%Y%m%d-%H%M%S)${1:+-$1}.db'"
fi
find "$dest" -name 'traggo-*.db' -mtime +30 -delete
