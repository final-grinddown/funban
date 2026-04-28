#!/bin/bash
# prod-to-dev.sh
# Migrates the production database to development/staging

set -euo pipefail

# Verify required environment variables are set
if [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
    echo "❌ Error: MYSQL_ROOT_PASSWORD not set. Please run: source generated-secrets.env"
    exit 1
fi

if [ -z "${FUNBAN_DB_PASSWORD:-}" ] || [ -z "${FUNBAN_STAGING_DB_PASSWORD:-}" ]; then
    echo "❌ Error: Database passwords not set. Please run: source generated-secrets.env"
    exit 1
fi

# Configuration
PROD_DB="funban"
PROD_USER="funban"
PROD_PASSWORD="${FUNBAN_DB_PASSWORD}"

DEV_DB="funban-dev"
DEV_USER="funban-dev"
DEV_PASSWORD="${FUNBAN_STAGING_DB_PASSWORD}"

# MySQL connection settings (can be overridden by environment)
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_SSL_MODE="--ssl-mode=DISABLED"
BACKUP_DIR="./db_backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directories if they don't exist
mkdir -p "$BACKUP_DIR/prod"
mkdir -p "$BACKUP_DIR/dev"

# Backup development database first (safety measure)
echo "📦 Backing up development database..."
mysqldump -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE "$DEV_DB" > "$BACKUP_DIR/dev/${DEV_DB}_backup_${DATE}.sql" || {
    echo "❌ Failed to backup development database. Aborting."
    exit 1
}
echo "✅ Development backup created at $BACKUP_DIR/dev/${DEV_DB}_backup_${DATE}.sql"

# Export production database
echo "📤 Exporting production database..."
mysqldump -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE "$PROD_DB" > "$BACKUP_DIR/prod/${PROD_DB}_export_${DATE}.sql" || {
    echo "❌ Failed to export production database. Aborting."
    exit 1
}

# Drop and recreate development database
echo "🗑️  Dropping development database..."
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE -e "DROP DATABASE IF EXISTS \`$DEV_DB\`; CREATE DATABASE \`$DEV_DB\`;" || {
    echo "❌ Failed to recreate development database. Aborting."
    exit 1
}

# Restore user permissions
echo "🔑 Restoring user permissions..."
{
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE -e "GRANT ALL PRIVILEGES ON \`$DEV_DB\`.* TO '$DEV_USER'@'%';"
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE -e "FLUSH PRIVILEGES;"
} || {
    echo "❌ Failed to restore user permissions. Aborting."
    exit 1
}

# Import production database to development
echo "📥 Importing production database to development..."
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE "$DEV_DB" < "$BACKUP_DIR/prod/${PROD_DB}_export_${DATE}.sql" || {
    echo "❌ Failed to import to development database."
    echo "🔄 Restoring from backup..."
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE "$DEV_DB" < "$BACKUP_DIR/dev/${DEV_DB}_backup_${DATE}.sql" || {
        echo "❌ CRITICAL: Restore failed! Database may be in an inconsistent state!"
        exit 2
    }
    # Restore permissions after rollback
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE -e "GRANT ALL PRIVILEGES ON \`$DEV_DB\`.* TO '$DEV_USER'@'%';" || {
        echo "❌ CRITICAL: Failed to restore permissions after rollback!"
        exit 2
    }
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_SSL_MODE -e "FLUSH PRIVILEGES;"
    exit 1
}

echo "✅ Successfully migrated production database to development"
echo "💾 Backup saved at: $BACKUP_DIR/dev/${DEV_DB}_backup_${DATE}.sql"
