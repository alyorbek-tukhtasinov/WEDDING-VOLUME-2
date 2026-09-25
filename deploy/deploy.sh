#!/usr/bin/env bash
# Taklifnomalarni serverda yangilash. taklifnoma-deploy.timer uni har 2 daqiqada chaqiradi:
# GitHub'da yangi commit bo'lsa — yuklab oladi, barcha mijozlarni yig'adi va almashtiradi.
#
#   sudo /usr/local/lib/taklifnoma/deploy.sh             — yangi versiya bo'lsa o'rnatish
#   sudo /usr/local/lib/taklifnoma/deploy.sh --force     — hozirgi commit'ni qayta yig'ish
#   sudo /usr/local/lib/taklifnoma/deploy.sh --rollback  — oldingi versiyaga qaytish
#
# Xavfsizlik: yig'ish oddiy "taklifnoma" foydalanuvchisi nomidan bajariladi. Yangi versiya
# yig'ilmasa yoki API javob bermasa — saytlar eski versiyada qoladi.
set -euo pipefail

APP=/opt/taklifnoma
LIB=/usr/local/lib/taklifnoma
REPO_URL=https://github.com/alyorbek-tukhtasinov/WEDDING-VOLUME-2.git
RUN_USER=taklifnoma
KEEP=3
BRANCH=main
# shellcheck source=/dev/null
. /etc/taklifnoma/deploy.conf

log() { echo "[deploy] $*"; }
as_app() { runuser -u "$RUN_USER" -- "$@"; }

exec 9>/run/taklifnoma-deploy.lock
flock -n 9 || { log "boshqa deploy ishlayapti"; exit 0; }

revision() { cat "$1/REVISION" 2>/dev/null || true; }

health() {
  local slug
  slug=$(ls "$APP/current/sites" | grep -x demo || ls "$APP/current/sites" | head -n1)
  for _ in $(seq 1 15); do
    curl -fsS -m 3 -H "X-Wedding-Slug: $slug" http://127.0.0.1:3190/api/settings >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

switch_to() {
  ln -sfn "$1" "$APP/current.new"
  mv -Tf "$APP/current.new" "$APP/current"
  systemctl restart taklifnoma 9>&-
}

cd "$APP"
PREV_REL=$(readlink -f current 2>/dev/null || true)
[ -n "$PREV_REL" ] && [ ! -d "$PREV_REL" ] && PREV_REL=""

if [ "${1:-}" = "--rollback" ]; then
  OLD=$(ls -1dt releases/*/ 2>/dev/null | sed 's:/$::' | while read -r r; do
    [ "$(readlink -f "$r")" != "$PREV_REL" ] && echo "$APP/$r" && break; done || true)
  [ -n "$OLD" ] || { log "qaytish uchun oldingi versiya yo'q"; exit 1; }
  switch_to "$OLD"
  # GitHub'dagi hozirgi commit taymer tomonidan qayta o'rnatilmasin — faqat yangi commit kelganda
  as_app git -C repo rev-parse "origin/$BRANCH" > "$APP/.failed" 2>/dev/null || revision "$PREV_REL" > "$APP/.failed"
  health && log "oldingi versiyaga qaytildi: $(revision "$OLD" | cut -c1-7)" || { log "✖ API javob bermayapti"; exit 1; }
  exit 0
fi

if [ ! -d repo/.git ]; then
  as_app git clone -q --branch "$BRANCH" "$REPO_URL" repo
fi
as_app git -C repo fetch -q origin "$BRANCH"
NEW=$(as_app git -C repo rev-parse "origin/$BRANCH")
CUR=$(revision current)

if [ "${1:-}" != "--force" ]; then
  # Yangi commit yo'q (yoki oldin yig'ilmagan commit — uni har 2 daqiqada qayta urinmaymiz).
  # Baribir sertifikatlarni tekshiramiz: DNS keyinroq yo'naltirilsa ham HTTPS o'zi yoqilsin.
  if [ "$NEW" = "$CUR" ] || [ "$NEW" = "$(cat .failed 2>/dev/null || true)" ]; then
    [ -n "$CUR" ] && { "$LIB/web.sh" 9>&- || true; }
    exit 0
  fi
fi
log "yangi versiya: ${NEW:0:7} (hozirgi: ${CUR:0:7})"

REL="$APP/releases/$(date +%Y%m%d-%H%M%S)-${NEW:0:7}"
TMP="$REL.tmp"
cleanup_tmp() { rm -rf "$TMP"; }
fail() {
  log "✖ $* — saytlar oldingi versiyada qoldi"
  echo "$NEW" > "$APP/.failed"
  cleanup_tmp
  exit 1
}
trap 'fail "kutilmagan xato (qator $LINENO)"' ERR

as_app mkdir -p "$TMP"
as_app sh -c "git -C '$APP/repo' archive '$NEW' | tar -x -C '$TMP'"
echo "$NEW" | as_app tee "$TMP/REVISION" >/dev/null

# package-lock.json o'zgarmagan bo'lsa, node_modules oldingi versiyadan olinadi (hardlink — joy olmaydi)
if [ -n "$PREV_REL" ] && [ -d "$PREV_REL/node_modules" ] && cmp -s "$PREV_REL/package-lock.json" "$TMP/package-lock.json"; then
  as_app cp -al "$PREV_REL/node_modules" "$TMP/node_modules"
else
  log "paketlar o'rnatilmoqda (npm ci)..."
  as_app sh -c "cd '$TMP' && npm ci --no-audit --no-fund --loglevel=error" || fail "npm ci bajarilmadi"
fi

log "saytlar yig'ilmoqda..."
as_app env NODE_OPTIONS=--max-old-space-size=512 SITE_DOMAIN="$SITE_DOMAIN" \
  sh -c "cd '$TMP' && node scripts/build-all.js --out sites" || fail "saytlar yig'ilmadi"

trap - ERR
as_app mv "$TMP" "$REL"
switch_to "$REL"

if ! health; then
  log "✖ yangi versiyada API javob bermadi"
  if [ -n "$PREV_REL" ]; then
    switch_to "$PREV_REL"
    rm -rf "$REL"
    log "oldingi versiyaga qaytildi: ${CUR:0:7}"
  fi
  echo "$NEW" > "$APP/.failed"
  exit 1
fi
rm -f "$APP/.failed"
log "✔ o'rnatildi: ${NEW:0:7} ($(ls "$REL/sites" | wc -l) ta sayt)"

# Eski versiyalarni tozalash (hozirgisi + oxirgi ${KEEP} tasi qoladi)
CURRENT=$(readlink -f current)
ls -1dt releases/*/ 2>/dev/null | sed 's:/$::' | tail -n +$((KEEP + 1)) | while read -r r; do
  [ "$(readlink -f "$r")" != "$CURRENT" ] && rm -rf "$r"
done
rm -rf releases/*.tmp 2>/dev/null || true

# nginx va HTTPS sertifikatlari (xato bo'lsa ham saytlar ishlashda davom etadi)
"$LIB/web.sh" 9>&- || log "! nginx/sertifikat bosqichida xato — journalctl -u taklifnoma-deploy"
