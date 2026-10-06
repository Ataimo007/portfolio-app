#!/usr/bin/env bash
set -euo pipefail
psql --username="$POSTGRES_USER" --dbname=postgres --set=ON_ERROR_STOP=1 --set=kc_password="$KEYCLOAK_DB_PASSWORD" --set=app_password="$PORTAL_DB_PASSWORD" --set=grafana_password="$GRAFANA_DB_PASSWORD" <<'SQL'
SELECT 'CREATE ROLE keycloak LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'keycloak') \gexec
SELECT 'CREATE ROLE portal LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'portal') \gexec
SELECT 'CREATE ROLE grafana LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grafana') \gexec
SELECT 'CREATE DATABASE grafana OWNER grafana' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'grafana') \gexec
ALTER ROLE grafana PASSWORD :'grafana_password';
ALTER DATABASE grafana OWNER TO grafana;
REVOKE ALL ON DATABASE grafana FROM PUBLIC;
ALTER ROLE keycloak PASSWORD :'kc_password';
ALTER ROLE portal PASSWORD :'app_password';
ALTER DATABASE keycloak OWNER TO keycloak;
ALTER DATABASE portfolio OWNER TO portal;
REVOKE ALL ON DATABASE keycloak FROM PUBLIC;
REVOKE ALL ON DATABASE portfolio FROM PUBLIC;
SQL
psql --username="$POSTGRES_USER" --dbname=keycloak --set=ON_ERROR_STOP=1 <<'SQL'
ALTER SCHEMA public OWNER TO keycloak;
SELECT format('ALTER TABLE %I.%I OWNER TO keycloak', n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relowner <> 'keycloak'::regrole \gexec
SELECT format('ALTER SEQUENCE %I.%I OWNER TO keycloak', n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relkind = 'S' AND c.relowner <> 'keycloak'::regrole \gexec
SQL
psql --username="$POSTGRES_USER" --dbname=portfolio --set=ON_ERROR_STOP=1 -c 'ALTER SCHEMA public OWNER TO portal;'
psql --username="$POSTGRES_USER" --dbname=grafana --set=ON_ERROR_STOP=1 -c 'ALTER SCHEMA public OWNER TO grafana;'
