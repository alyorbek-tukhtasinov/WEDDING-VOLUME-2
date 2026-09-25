#!/usr/bin/env bash
# nginx sozlamalarini o'rnatish va HTTPS sertifikatlarini olish (deploy.sh har safar chaqiradi).
#
# Sertifikat faqat DNS'i allaqachon shu serverga (SERVER_IP) yo'naltirilgan subdomenlarga olinadi —
# shuning uchun mijozni ko'chirishda faqat DNS yozuvini o'zgartirish kifoya, qolgani o'zi bo'ladi.
# Har o'zgarishdan oldin "nginx -t" tekshiriladi; xato bo'lsa eski sozlama qaytariladi
# (serverdagi boshqa saytlar — botlar — hech qachon to'xtab qolmasligi uchun).
set -euo pipefail

APP=/opt/taklifnoma
LIB=/usr/local/lib/taklifnoma
CERT_NAME=taklifnoma
LIVE=/etc/letsencrypt/live/$CERT_NAME
WEBROOT=/var/www/letsencrypt
MAP=/etc/nginx/taklifnoma-https.map
SNIPPET=/etc/nginx/snippets/taklifnoma-site.conf
HTTP_CONF=/etc/nginx/sites-available/taklifnoma.conf
SSL_CONF=/etc/nginx/sites-available/taklifnoma-ssl.conf
# shellcheck source=/dev/null
. /etc/taklifnoma/deploy.conf

log() { echo "[web] $*"; }

DOMAIN_RE=$(printf '%s' "$SITE_DOMAIN" | sed 's/\./\\\\./g')
render() { sed "s|__DOMAIN_RE__|$DOMAIN_RE|g; s|__DOMAIN__|$SITE_DOMAIN|g" "$LIB/nginx/$1"; }

# --- Xavfsiz o'zgartirish: zaxira → yozish → nginx -t → (xato bo'lsa) qaytarish ---
MANAGED=("$MAP" "$SNIPPET" "$HTTP_CONF" "$SSL_CONF" /etc/nginx/sites-enabled/taklifnoma.conf /etc/nginx/sites-enabled/taklifnoma-ssl.conf)
BACKUP=$(mktemp -d)
trap 'rm -rf "$BACKUP"' EXIT
for f in "${MANAGED[@]}"; do
  [ -e "$f" ] || [ -L "$f" ] && cp -a "$f" "$BACKUP/$(echo "$f" | tr / _)" || true
done
restore() {
  for f in "${MANAGED[@]}"; do
    local b="$BACKUP/$(echo "$f" | tr / _)"
    rm -f "$f"
    [ -e "$b" ] || [ -L "$b" ] && cp -a "$b" "$f" || true
  done
}
changed=0
put() { # put <fayl> <mazmun>
  if [ ! -f "$1" ] || [ "$(cat "$1")" != "$2" ]; then printf '%s\n' "$2" > "$1"; changed=1; fi
}
enable() {
  [ -L "/etc/nginx/sites-enabled/$1" ] || { ln -sfn "/etc/nginx/sites-available/$1" "/etc/nginx/sites-enabled/$1"; changed=1; }
}
apply() {
  [ "$changed" = 1 ] || return 0
  if nginx -t -q 2>/tmp/taklifnoma-nginx.err; then
    systemctl reload nginx
    log "nginx yangilandi"
  else
    cat /tmp/taklifnoma-nginx.err
    restore
    nginx -t -q && systemctl reload nginx || true
    log "✖ nginx sozlamasida xato — eski holat qaytarildi"
    exit 1
  fi
  changed=0
}

cert_hosts() { # sertifikatdagi manzillar
  [ -f "$LIVE/cert.pem" ] || return 0
  openssl x509 -in "$LIVE/cert.pem" -noout -ext subjectAltName 2>/dev/null | grep -o 'DNS:[^,]*' | sed 's/^DNS://' | sort -u
}

write_map() {
  local body="# taklifnoma: HTTPS sertifikati bor manzillar (web.sh avtomatik yozadi)"
  for h in $(cert_hosts); do body+=$'\n'"$h 1;"; done
  put "$MAP" "$body"
}

# 1) HTTP qismi — har doim
mkdir -p "$WEBROOT" /etc/nginx/snippets
[ -f "$MAP" ] || write_map
put "$SNIPPET" "$(render taklifnoma-site.conf)"
put "$HTTP_CONF" "$(render taklifnoma.conf)"
enable taklifnoma.conf
apply

# 2) Qaysi subdomenlar shu serverga yo'naltirilgan?
want=()
for d in "$APP"/current/sites/*/; do
  host="$(basename "$d").$SITE_DOMAIN"
  if getent ahostsv4 "$host" | awk '{print $1}' | grep -qx "$SERVER_IP"; then want+=("$host"); fi
done
have=$(cert_hosts)
missing=$(comm -23 <(printf '%s\n' "${want[@]}" | sed '/^$/d' | sort -u) <(printf '%s\n' "$have" | sed '/^$/d'))

# 3) Yangi manzillar bo'lsa — sertifikatni kengaytirish
if [ -n "$missing" ]; then
  log "sertifikat olinmoqda: $(echo "$missing" | tr '\n' ' ')"
  args=()
  for h in $(printf '%s\n' "${want[@]}" $have | sed '/^$/d' | sort -u); do args+=(-d "$h"); done
  certbot certonly --webroot -w "$WEBROOT" --cert-name "$CERT_NAME" "${args[@]}" \
    --non-interactive --agree-tos -m "$CERT_EMAIL" --expand --allow-subset-of-names \
    --deploy-hook "systemctl reload nginx" \
    || log "! sertifikat olinmadi (DNS hali tarqalmagan bo'lishi mumkin) — keyingi deployda yana urinadi"
fi

# 4) HTTPS qismi — sertifikat bo'lsa
if [ -f "$LIVE/fullchain.pem" ]; then
  put "$SSL_CONF" "$(render taklifnoma-ssl.conf)"
  enable taklifnoma-ssl.conf
  apply
  write_map
  apply
fi
