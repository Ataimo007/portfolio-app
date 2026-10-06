#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set=portal_password="$PORTAL_DB_PASSWORD" --set=keycloak_password="$KEYCLOAK_DB_PASSWORD" <<'SQL'
CREATE ROLE portal LOGIN PASSWORD :'portal_password';
CREATE ROLE keycloak LOGIN PASSWORD :'keycloak_password';
CREATE DATABASE portfolio OWNER portal;
CREATE DATABASE keycloak OWNER keycloak;
SQL
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname portfolio -f /docker-entrypoint-initdb.d/portal-schema.sql.inc
