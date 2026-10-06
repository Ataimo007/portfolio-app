import os
from pathlib import Path
import sqlite3
import subprocess
import sys

subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "psycopg[binary]==3.2.12"], check=True)
import psycopg
from psycopg import sql

marker = Path("/data/grafana-postgres-migration-complete")
if marker.exists():
    print("Grafana PostgreSQL migration already completed; skipping")
    sys.exit(0)
source = sqlite3.connect("file:/data/grafana.db?mode=ro", uri=True)
backup = sqlite3.connect("/data/grafana.pre-postgres.db")
source.backup(backup)
backup.close()
source.row_factory = sqlite3.Row
connection = psycopg.connect(host="postgres.database.svc.cluster.local", dbname="grafana", user="grafana", password=os.environ["GRAFANA_DB_PASSWORD"])
with connection:
    cursor = connection.cursor()
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    targets = {row[0] for row in cursor.fetchall()}
    sources = {row[0] for row in source.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
    tables = sorted(table for table in sources if not table.endswith("migration_log"))
    plans = []
    for table in tables:
        rows = source.execute(f'SELECT * FROM "{table}"').fetchall()
        if table not in targets:
            if rows:
                raise RuntimeError(f"Target lacks populated source table {table}")
            continue
        cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=%s", (table,))
        types = dict(cursor.fetchall())
        columns = [row[1] for row in source.execute(f'PRAGMA table_info("{table}")')]
        missing = set(columns) - set(types)
        if rows and missing:
            raise RuntimeError(f"Target lacks columns for {table}: {sorted(missing)}")
        columns = [column for column in columns if column in types]
        plans.append((table, columns, types, rows))
    if not plans:
        raise RuntimeError("No compatible Grafana tables found")
    cursor.execute(sql.SQL("TRUNCATE {} RESTART IDENTITY CASCADE").format(sql.SQL(", ").join(sql.Identifier(plan[0]) for plan in plans)))
    for table, columns, types, rows in plans:
        statement = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(sql.Identifier(table), sql.SQL(", ").join(map(sql.Identifier, columns)), sql.SQL(", ").join(sql.Placeholder() for _ in columns))
        def convert(value, column):
            if value is None:
                return None
            if types[column] == "boolean":
                return bool(value)
            if types[column] in {"text", "character varying", "character"} and isinstance(value, bytes):
                return value.decode("utf-8")
            return value
        values = [tuple(convert(row[column], column) for column in columns) for row in rows]
        if values:
            cursor.executemany(statement, values)
        cursor.execute(sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(table)))
        if cursor.fetchone()[0] != len(rows):
            raise RuntimeError(f"Row count mismatch for {table}")
        for column in columns:
            cursor.execute("SELECT pg_get_serial_sequence(%s,%s)", (f'"{table}"', column))
            sequence = cursor.fetchone()[0]
            if sequence:
                cursor.execute(sql.SQL("SELECT max({}) FROM {}").format(sql.Identifier(column), sql.Identifier(table)))
                maximum = cursor.fetchone()[0]
                cursor.execute("SELECT setval(%s,%s,%s)", (sequence, max(maximum or 1, 1), maximum is not None))
        print(f"{table}: {len(rows)} rows verified")
marker.write_text("Verified SQLite-to-PostgreSQL migration\n")
print("Migration committed; source SQLite and consistent backup preserved")
