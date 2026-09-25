#!/usr/bin/env bash
# Taklifnomalarni serverga o'rnatish (bir marta; qayta ishga tushirish xavfsiz — yangilaydi).
#
#   git clone https://github.com/alyorbek-tukhtasinov/WEDDING-VOLUME-2.git /tmp/taklifnoma
#   sudo bash /tmp/taklifnoma/deploy/install.sh <domen> <server-ip> <email>
#   masalan: sudo bash /tmp/taklifnoma/deploy/install.sh documen.uz 138.68.110.106 siz@gmail.com
#
# Nima qiladi: "taklifnoma" foydalanuvchisi, /opt/taklifnoma, systemd xizmatlari (API + har 2 daqiqada
# avtomatik yangilash), nginx sozlamalari. Serverdagi boshqa sayt va botlarga tegmaydi.
set -euo pipefail

SITE_DOMAIN=${1:-}
SERVER_IP=${2:-}
CERT_EMAIL=${3:-}
SRC=$(cd "$(dirname "$0")" && pwd)
APP=/opt/taklifnoma
LIB=/usr/local/lib/taklifnoma
RUN_USER=taklifnoma

die() { echo "✖ $*" >&2; exit 1; }
say() { echo "▸ $*"; }

[ "$(id -u)" = 0 ] || die "root sifatida ishga tushiring: sudo bash $0 ..."
[[ "$SITE_DOMAIN" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || die "domen noto'g'ri. Foydalanish: sudo bash $0 documen.uz 138.68.110.106 siz@gmail.com"
[[ "$SERVER_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "server IP noto'g'ri: $SERVER_IP"
[[ "$CERT_EMAIL" == *@*.* ]] || die "email noto'g'ri (HTTPS sertifikati uchun kerak): $CERT_EMAIL"

# --- Node.js: tizim bo'ylab o'rnatilgan bo'lishi kerak (taklifnoma foydalanuvchisi ham ishlata olsin)
NODE=$(command -v node || true)
[ -n "$NODE" ] || die "Node.js topilmadi"
NODE=$(readlink -f "$NODE")
case "$NODE" in /root/* | /home/*) die "Node.js $NODE da (nvm) — boshqa foydalanuvchi ishlata olmaydi. Tizim bo'ylab o'rnating: https://github.com/nodesource/distributions" ;; esac
NODE_VER=$("$NODE" -p 'process.versions.node')
"$NODE" -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=12)||(a===20&&b>=19)?0:1)' \
  || die "Node.js $NODE_VER eski — kamida 20.19 yoki 22.12 kerak"
command -v npm >/dev/null || die "npm topilmadi"
command -v nginx >/dev/null || die "nginx topilmadi"
say "Node.js $NODE_VER ($NODE), $(nginx -v 2>&1)"

# --- Kerakli dasturlar
missing=()
for p in git certbot curl; do command -v "$p" >/dev/null || missing+=("$p"); done
if [ ${#missing[@]} -gt 0 ]; then
  say "o'rnatilmoqda: ${missing[*]}"
  apt-get update -q && apt-get install -y -q "${missing[@]}"
fi

# --- Boshqa sayt shu domenning barcha subdomenlarini egallab olmaganini tekshirish
DOMAIN_ESC=${SITE_DOMAIN//./\\.}
if grep -rEn "server_name[^;]*[[:space:]](\*)?\.${DOMAIN_ESC}[[:space:];]" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | grep -v taklifnoma; then
  echo "! Yuqoridagi nginx sozlamasi *.${SITE_DOMAIN} ni egallagan — taklifnoma subdomenlari u yerga ketib qoladi."
  echo "  Davom etishdan oldin o'sha qatorni menga ko'rsating."
  exit 1
fi

# --- Foydalanuvchi va papkalar
id "$RUN_USER" >/dev/null 2>&1 || useradd --system --user-group --home-dir "$APP" --shell /usr/sbin/nologin "$RUN_USER"
install -d -o "$RUN_USER" -g "$RUN_USER" -m 755 "$APP" "$APP/releases" "$APP/panel-work" "$APP/trigger"
install -d -m 755 /var/www/letsencrypt "$LIB" "$LIB/nginx"
install -d -m 700 /etc/taklifnoma

cat > /etc/taklifnoma/deploy.conf <<EOF
SITE_DOMAIN=$SITE_DOMAIN
SERVER_IP=$SERVER_IP
CERT_EMAIL=$CERT_EMAIL
EOF
# Boshqa repo yoki branch'dan o'rnatish kerak bo'lsa: REPO_URL=... BRANCH=... sudo -E bash install.sh ...
[ -n "${REPO_URL:-}" ] && echo "REPO_URL=$REPO_URL" >> /etc/taklifnoma/deploy.conf
[ -n "${BRANCH:-}" ] && echo "BRANCH=$BRANCH" >> /etc/taklifnoma/deploy.conf
if [ ! -f /etc/taklifnoma/env ]; then
  install -m 600 "$SRC/env.example" /etc/taklifnoma/env
  say "/etc/taklifnoma/env yaratildi — REDIS_URL va admin parollarini yozing"
fi

# --- Skriptlar root'ga tegishli nusxada ishlaydi: repodagi o'zgarish serverda root huquqini bera olmaydi
install -m 755 "$SRC/deploy.sh" "$SRC/web.sh" "$LIB/"
install -m 644 "$SRC"/nginx/*.conf "$LIB/nginx/"

# --- systemd
for u in taklifnoma.service taklifnoma-deploy.service taklifnoma-deploy.timer taklifnoma-deploy.path; do
  sed "s|__NODE__|$NODE|g; s|__NODEDIR__|$(dirname "$NODE")|g" "$SRC/systemd/$u" > "/etc/systemd/system/$u"
done
systemctl daemon-reload
systemctl enable taklifnoma.service >/dev/null

# --- Birinchi deploy (keyingilari taymer orqali avtomatik)
say "birinchi yig'ish (1–3 daqiqa)..."
PATH="$(dirname "$NODE"):$PATH" "$LIB/deploy.sh" --force

systemctl enable --now taklifnoma-deploy.timer taklifnoma-deploy.path >/dev/null
# Yangi sozlamalar (masalan, panel o'zgaruvchilari) API'ga yetib borsin
systemctl restart taklifnoma

echo
echo "✔ O'rnatildi. Saytlar: https://<mijoz>.$SITE_DOMAIN"
echo "  Holat:      systemctl status taklifnoma"
echo "  Loglar:     journalctl -u taklifnoma -u taklifnoma-deploy -n 50"
echo "  Qo'lda:     sudo $LIB/deploy.sh --force   |   orqaga: sudo $LIB/deploy.sh --rollback"
grep -q '^REDIS_URL=.\+' /etc/taklifnoma/env || echo "! /etc/taklifnoma/env da REDIS_URL bo'sh — javoblar saqlanmaydi. To'ldirib: sudo systemctl restart taklifnoma"
grep -q '^OWNER_PASSWORD=.\+' /etc/taklifnoma/env || echo "! Boshqaruv paneli uchun /etc/taklifnoma/env ga OWNER_PASSWORD va GITHUB_TOKEN qo'shing, keyin: sudo systemctl restart taklifnoma"
