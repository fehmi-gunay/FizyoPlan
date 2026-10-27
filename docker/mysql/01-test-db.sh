#!/bin/sh
# MySQL ilk açılışta çalışır: testler için ayrı <DB_NAME>_test veritabanı ve yetkisi
set -e
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
