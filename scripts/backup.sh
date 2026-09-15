#!/usr/bin/env bash
# Nightly backup of the database and the photo files.
#
# Keeps 30 daily snapshots, which matches the retention stated in the privacy
# policy. Run from cron on the host:
#   0 3 * * * /home/palos/server/backup-bucketlist.sh >> /var/log/bucketlist-backup.log 2>&1
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/home/palos/server/backups/bucketlist}"
MONGO_CONTAINER="${MONGO_CONTAINER:-bucketlist-mongo}"
PHOTO_DIR="${PHOTO_DIR:-/home/palos/server/data/bucketlist/photos}"
KEEP_DAYS="${KEEP_DAYS:-30}"

stamp="$(date +%Y-%m-%d)"
dest="${BACKUP_ROOT}/${stamp}"
mkdir -p "$dest"

echo "[backup] $(date -Is) starting -> ${dest}"

# Database: dump inside the container, then copy the archive out.
docker exec "$MONGO_CONTAINER" sh -c 'mongodump --archive --gzip --db=bucketlist' > "${dest}/mongo.archive.gz"
echo "[backup] mongo dump $(du -h "${dest}/mongo.archive.gz" | cut -f1)"

# Photos: hard-linked against yesterday so unchanged files cost no extra disk.
prev="$(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d ! -name "$stamp" | sort | tail -1)"
if [ -n "$prev" ] && [ -d "${prev}/photos" ]; then
  rsync -a --delete --link-dest="${prev}/photos" "${PHOTO_DIR}/" "${dest}/photos/"
else
  rsync -a "${PHOTO_DIR}/" "${dest}/photos/"
fi
echo "[backup] photos $(du -sh "${dest}/photos" | cut -f1) (apparent)"

# Age out old snapshots.
find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} +

echo "[backup] $(date -Is) done; $(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d | wc -l) snapshots retained"
