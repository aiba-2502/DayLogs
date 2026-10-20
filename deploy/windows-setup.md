# 社内 PC（Windows）での DayLogs 稼働環境

DayLogs を社内 PC 192.168.40.150 で動かすために行った設定の記録です（2026-10-20 実施）。
社内ネットワーク（192.168.40.x）からのみ `http://192.168.40.150:3030` で利用できます。

パスワードはこの文書に書いていません。

## 構成

```
社内の PC のブラウザ ──(LAN 3030番)──> Windows 11（192.168.40.150）
                                          └ WSL2「Ubuntu-24.04」
                                              └ Docker Engine
                                                  └ コンテナ daylogs-traggo-1（イメージ daylogs:<コミット>）
                                                      └ データ /opt/daylogs/data/traggo.db（SQLite）
```

| 項目 | 内容 |
|---|---|
| PC | DESKTOP-F7DBHH6（Windows 11 Pro、ワークグループ） |
| 作業用アカウント | `aiba`（Windows の管理者） |
| WSL | ディストリビューション `Ubuntu-24.04`（systemd 有効、Docker Engine 導入済み） |
| アプリの場所 | WSL 内 `/opt/daylogs`（エクスプローラーからは `\\wsl.localhost\Ubuntu-24.04\opt\daylogs`） |
| データ | `/opt/daylogs/data/traggo.db` |
| バックアップ | `C:\DayLogsBackup`（WSL からは `/mnt/c/DayLogsBackup`） |

### 変更していない既存の設定

- `C:\Users\aiba\.wslconfig`: `memory=16GB`、`swap=8GB`、`networkingMode=mirrored`。
  ミラーモードのため、WSL 内のポート 3030 は Windows の IP アドレスでそのまま受けられる（ポート転送の設定は不要）。
- 電源設定: AC 電源時のスリープ・休止状態は「なし」。
- WSL の Docker には別のプロジェクト（`receipt-ocr…`）のコンテナもある。

## 実施した設定

### 1. OpenSSH サーバー（遠隔から作業するため）

管理者の PowerShell で実行:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service sshd -StartupType Automatic
```

### 2. ファイアウォール: SSH（22番）を同じネットワークからだけ許可

```powershell
New-NetFirewallRule -Name sshd-lan -DisplayName "OpenSSH Server (LAN)" -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow -Profile Any -RemoteAddress LocalSubnet
```

ネットワークの種類が「パブリック」のため、`-Profile Any` にしている。

### 3. SSH の鍵認証

開発 PC（192.168.40.44 の WSL）で作った鍵 `~/.ssh/daylogs_win_ed25519` の公開鍵を登録した。
`aiba` は管理者なので、登録先はユーザーの `.ssh` ではなく次のファイルになる。

```powershell
Add-Content -Path C:\ProgramData\ssh\administrators_authorized_keys -Value '<公開鍵 ssh-ed25519 AAAA...>' -Encoding ascii
icacls C:\ProgramData\ssh\administrators_authorized_keys /inheritance:r /grant 'Administrators:F' /grant 'SYSTEM:F'
```

### 4. WSL 内のアプリ配置（`/opt/daylogs`）

リポジトリの `deploy/` から次を置いた（所有者 root）:

| ファイル | 役割 |
|---|---|
| `docker-compose.yml` | コンテナの設定（ポート 3030、データは `./data`） |
| `.env` | `TAG`（使うイメージの版）、`TRAGGO_DEFAULT_USER_NAME` / `TRAGGO_DEFAULT_USER_PASS`（初回起動時に作られる管理者）。権限 600 |
| `switch.sh` | 版の入れ替え（入れ替え前にバックアップ、起動しなければ元の版に戻す） |
| `backup.sh` | SQLite を `C:\DayLogsBackup` にコピーし、30日より古いものを削除 |

あわせて WSL 内で次を行った:

```sh
apt-get install -y sqlite3                                       # backup.sh で使う
install -m 644 daylogs-backup.cron /etc/cron.d/daylogs-backup    # 毎日 12:30 にバックアップ
```

### 5. Hyper-V ファイアウォール: WSL への 3030 番を同じネットワークからだけ許可

ミラーモードの WSL への受信は Hyper-V ファイアウォールで既定で拒否されるため、ルールを追加した。

```powershell
New-NetFirewallHyperVRule -Name daylogs-3030 -DisplayName 'DayLogs 3030 (WSL)' -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3030 -RemoteAddresses 192.168.40.0/24 -Action Allow
```

### 6. タスク スケジューラ「DayLogs WSL」（ログインしなくても動かし続けるため）

WSL は使っているプロセスがなくなると止まり、Docker と DayLogs も一緒に止まる。
そこで PC の起動時に WSL 内で `sleep infinity` を動かし続け、WSL を止めないようにした。

```powershell
$action = New-ScheduledTaskAction -Execute 'C:\Windows\System32\wsl.exe' -Argument '-d Ubuntu-24.04 -u root -- sleep infinity'
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName 'DayLogs WSL' -Description 'DayLogs: keep WSL Ubuntu-24.04 (Docker) running without logon' -Action $action -Trigger $trigger -Settings $settings -User 'aiba' -Password '<aiba の Windows パスワード>' -Force
```

WSL が起動すると systemd が Docker を起動し、Docker が DayLogs のコンテナ（`restart: unless-stopped`）を起動する。

## 運用

以下、WSL 内のコマンドは Windows 側から `wsl -d Ubuntu-24.04 -u root` で入って実行する。

### 更新（新しい版を入れる）

開発 PC のリポジトリで実行する。今のコミットでイメージを作って PC に送り、`switch.sh` で入れ替える。

```sh
deploy/update.sh
```

### 前の版に戻す

```sh
docker images daylogs            # 残っている版（タグ）を確認
/opt/daylogs/switch.sh <タグ>     # 例: /opt/daylogs/switch.sh 0851c75
```

### バックアップから復元する

```sh
cd /opt/daylogs
docker compose stop traggo
cp /mnt/c/DayLogsBackup/traggo-<日時>.db data/traggo.db
docker compose start traggo
```

動いている間に `traggo.db` を直接コピー・上書きしないこと（壊れる恐れがある）。

### 状態とログの確認

```sh
cd /opt/daylogs
docker compose ps
docker compose logs --tail 100
```

Windows 側では `wsl -l -v` で `Ubuntu-24.04` が Running になっていること、
タスク スケジューラで「DayLogs WSL」が実行中であることを確認する。

## 注意

- **aiba の Windows パスワードを変えたら、タスクのパスワードも更新する。** 更新しないと再起動後に DayLogs が起動しない。

  ```powershell
  Set-ScheduledTask -TaskName 'DayLogs WSL' -User 'aiba' -Password '<新しいパスワード>'
  ```

- WSL の Docker は別のプロジェクトと共用している。`docker system prune` や `docker image prune -a` など、ほかのコンテナやイメージを消すコマンドは使わない。
- SSH はパスワードでもログインできる状態のまま。必要なら `C:\ProgramData\ssh\sshd_config` で `PasswordAuthentication no` にして `Restart-Service sshd` する（鍵を持つ開発 PC からは引き続き接続できる）。
- バックアップは同じ PC の C ドライブにある。PC の故障に備えるなら、NAS など別の場所にもコピーする。
- この PC の Windows は Insider（開発版）ビルドで、更新による再起動が多い。再起動後はタスクで自動復帰する。
- 2026-10-20 時点で、再起動後の自動起動は未確認。

## 撤去する場合

```powershell
Unregister-ScheduledTask -TaskName 'DayLogs WSL' -Confirm:$false
Remove-NetFirewallHyperVRule -Name daylogs-3030
Remove-NetFirewallRule -Name sshd-lan          # SSH も使わない場合
wsl -d Ubuntu-24.04 -u root -- sh -c "cd /opt/daylogs && docker compose down && rm /etc/cron.d/daylogs-backup"
```

データ（`/opt/daylogs/data`）とバックアップ（`C:\DayLogsBackup`）は、不要と確認してから手動で削除する。
