#!/usr/bin/env fish

set -g self (realpath (status --current-filename))
set -g root (dirname $self)
set -g server $root/server
set -g port 8000
set -g run $server/.run
set -g pidfile $run/serve.pid
set -g guardfile $run/serve.guard
set -g log $run/serve.log
set -g manual "sudo ufw delete allow proto tcp from any to any port $port"

function close_port
    sudo ufw delete allow proto tcp from any to any port $port >/dev/null 2>&1
end

function port_open
    sudo ufw status | string match -qr "^$port/tcp(\s+\(v6\))?\s+ALLOW"
end

function ufw_active
    sudo ufw status | string match -q "Status: active"
end

function alive
    set -l pid (cat $argv[1] 2>/dev/null)
    string match -qr '^\d+$' -- "$pid"; and test -d /proc/$pid
end

function running
    alive $pidfile
end

function guard_alive
    alive $guardfile
end

function say
    echo $argv[2] >>$log
    test -w "$argv[1]"; and echo $argv[2] >$argv[1]
end

function close_and_check
    close_port
    port_open; and close_port
    not port_open
end

if test "$argv[1]" = guard
    set -l main $argv[2]
    set -l out $argv[3]
    set -l firewall $argv[4]
    echo $fish_pid >$guardfile
    while set -l st (ps -o stat= -p $main); and not string match -q "Z*" -- $st
        sleep 1
    end
    say $out "Останавливаю сервер…"
    rm -f $pidfile $guardfile
    if test "$firewall" != 1
        say $out "Сервер остановлен."
        exit 0
    end
    if close_and_check
        say $out "Сервер остановлен, порт $port закрыт (проверено по ufw status)."
        exit 0
    end
    say $out "!!! ВНИМАНИЕ: порт $port НЕ закрылся. Закройте вручную: $manual"
    exit 1
end

if test "$argv[1]" = stop
    if running
        kill (cat $pidfile)
        for i in (seq 60)
            test -f $pidfile; or break
            sleep 1
        end
        if test -f $pidfile
            echo "Сервер не остановился за минуту, подробности в $log"
            exit 1
        end
    end
    if not command -q ufw
        echo "Сервер остановлен."
        exit 0
    end
    sudo -v; or exit 1
    if close_and_check
        echo "Сервер остановлен, порт $port закрыт (проверено по ufw status)."
        exit 0
    end
    echo "!!! ВНИМАНИЕ: порт $port НЕ закрылся. Закройте вручную: $manual"
    exit 1
end

if running
    echo "Сервер уже запущен. Остановить: Ctrl+C в его терминале или ./serve.fish stop"
    exit 1
end

mkdir -p $run
echo -n >$log
cd $server

if not test -x .venv/bin/python
    echo "Создаю окружение Python…"
    python3 -m venv .venv >>$log 2>&1; or begin; tail -20 $log; exit 1; end
    .venv/bin/pip install -q -r req.txt >>$log 2>&1; or begin; tail -20 $log; exit 1; end
end
.venv/bin/python manage.py migrate --noinput >>$log 2>&1; or begin; tail -20 $log; exit 1; end
if test (.venv/bin/python manage.py shell -c "from catalog.models import Film; print(Film.objects.count())" 2>>$log) = 0
    echo "Загружаю демо-данные архива (около минуты)…"
    .venv/bin/python manage.py seed_demo >>$log 2>&1; or begin; tail -20 $log; exit 1; end
end

set -l firewall 1
if not command -q ufw
    set firewall 0
    echo "ufw не установлен, порт открывать не нужно."
else if begin
        echo "Для открытия порта $port нужен пароль sudo."
        sudo -v; or exit 1
        not ufw_active
    end
    set firewall 0
    echo "Файрвол ufw выключен, порт открывать не нужно."
else if port_open
    echo "Порт $port остался открытым с прошлого запуска, закрываю."
    if not close_and_check
        echo "!!! Не удалось закрыть порт $port. Закройте вручную: $manual"
        exit 1
    end
end

rm -f $guardfile
set -l out (tty 2>/dev/null); or set out /dev/null
if test $firewall = 1
    sudo setsid -f fish --no-config $self guard $fish_pid $out 1 </dev/null >>$log 2>&1
else
    setsid -f fish --no-config $self guard $fish_pid $out 0 </dev/null >>$log 2>&1
end
for i in (seq 50)
    guard_alive; and break
    sleep 0.1
end
if not guard_alive
    echo "Не удалось запустить сторожа, который закрывает порт при остановке. Порт не открываю."
    exit 1
end
echo $fish_pid >$pidfile

if test $firewall = 1
    sudo ufw allow proto tcp from any to any port $port >/dev/null; or exit 1
    if not port_open
        echo "Правило добавлено, но ufw status его не показывает: проверка закрытия не сработает. Останавливаю."
        sudo ufw status >>$log
        exit 1
    end
end

echo
echo "Сервер архива работает:"
echo "  на этом компьютере:   http://127.0.0.1:$port/api/"
set -l found 0
for dev in /sys/class/net/*
    test -e $dev/device; or continue
    set -l name (basename $dev)
    for addr in (ip -4 -o addr show dev $name scope global | string match -rg 'inet (\S+)/')
        echo "  с других устройств:  http://$addr:$port/api/"
        set found 1
    end
end
test $found = 1; or echo "  с других устройств:  нет подключения к сети"
echo "  приложения (exe/apk) собираются с адресом этого компьютера в сети"
echo
echo "Ctrl+C — остановить сервер и закрыть порт"

exec env DJANGO_DEBUG=0 DJANGO_SERVE_MEDIA=1 DJANGO_ALLOWED_HOSTS='*' \
    .venv/bin/python manage.py runserver 0.0.0.0:$port --noreload
