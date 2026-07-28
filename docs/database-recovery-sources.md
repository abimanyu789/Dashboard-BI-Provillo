# Database Recovery Sources

## Safety boundary

This inventory was produced through read-only file, archive-listing, configuration, log, database metadata, count, and timestamp inspection. No backup was restored, no binary log was decoded with `mysqlbinlog`, and no database write was performed.

Private customer names and transaction details are intentionally omitted.

## Ranked recovery sources

### 1. MySQL binary logs — highest likelihood

- **Location:** `C:/laragon/data/mysql-8.4/binlog.000013` through `binlog.000020`, with `binlog.index` in the same directory.
- **Date range:** `binlog.000013` begins 2026-07-06; `binlog.000019` covers the incident day; `binlog.000020` contains post-restart activity.
- **Estimated contents:** MySQL DDL and row-level changes for databases on the local server. Server settings confirm `log_bin=ON` and `binlog_format=ROW`.
- **Predates incident:** Yes. Logs begin weeks before the 2026-07-28 reset.
- **Safe to restore:** Potentially, but only by point-in-time replay into `provillo_recovery` or an isolated MySQL instance. Never replay directly into `provillo`.
- **Recovery confidence:** **High, pending read-only binlog inspection.** The logs start near the initial project database creation and may contain all schema and row changes up to immediately before the destructive `migrate:fresh` event.
- **Critical action:** Preserve copies immediately. MySQL retention is 2,592,000 seconds (30 days), so logs can expire automatically.

### 2. Pre-incident research-data archive — strong reconstruction source, not a database backup

- **Location:** `C:/Users/Abimanyu.ABIMANYUPUTRA/Downloads/Data Provillo-20260726T210827Z-1-001.zip`
- **Date:** 2026-07-27 04:50 local; predates the incident by approximately 36 hours.
- **Estimated contents:** A large archive of research-partner operational source documents, including scanned work books, order/transaction documents, employee spreadsheets, cash-flow/order spreadsheets, and other operational records.
- **Predates incident:** Yes.
- **Safe to restore:** Not directly into MySQL. It is safe as a manual verification/reconstruction source after recovery into a separate database.
- **Recovery confidence:** **Medium for reconstructing source business facts; low for exact SIMOPRO database state.** It does not contain an SQL dump, database snapshot, or application row IDs.
- **Privacy:** Contains sensitive research-partner operational material. Access and reporting must remain restricted.

### 3. Stock movement workbook — partial reconstruction source

- **Location:** `C:/Users/Abimanyu.ABIMANYUPUTRA/Downloads/Laporan_Barang_Keluar_Masuk_Provillo.xlsm`
- **Date:** 2026-07-13 14:35 local.
- **Estimated contents:** Material or inventory movement information based on the filename; file contents were not opened during this investigation.
- **Predates incident:** Yes.
- **Safe to restore:** Not as an automated database import without a separately approved mapping and validation process.
- **Recovery confidence:** **Medium-low.** May help validate/reconstruct raw-material and stock records but cannot recreate the full SIMOPRO relational dataset.

### 4. Other research spreadsheets within the pre-incident archive

- **Location:** Inside `Data Provillo-20260726T210827Z-1-001.zip`.
- **Date:** Archive created 2026-07-27.
- **Estimated contents:** Employee, order, work-output, cost, and cash-flow source spreadsheets.
- **Predates incident:** Yes.
- **Safe to restore:** Manual review only; no automated import without approval.
- **Recovery confidence:** **Medium-low.** Useful for cross-checking recovered employee, order, production, and financial information, but not an exact database backup.

### 5. drawSQL schema export — schema reference only

- **Location:** `C:/Users/Abimanyu.ABIMANYUPUTRA/Downloads/drawSQL-mysql-export-2026-07-14.sql`
- **Date:** 2026-07-14 08:12 local.
- **Estimated contents:** `CREATE TABLE` statements for the earlier database design. Read-only inspection found schema DDL and no `INSERT` statements.
- **Predates incident:** Yes.
- **Safe to restore:** Only into an isolated scratch database for schema comparison. It is outdated relative to final migrations and contains no partner records.
- **Recovery confidence:** **Very low for data; medium as a historical schema reference.**

### 6. Local SQLite file — not a business-data recovery source

- **Location:** `provillo-app/database/database.sqlite`
- **Date:** 2026-07-06 09:32 local.
- **Estimated contents:** Read-only inspection found only framework/authentication tables: cache, jobs, migrations, passkeys, sessions, users, and related infrastructure tables.
- **Predates incident:** Yes.
- **Safe to restore:** Not relevant to MySQL business-data recovery.
- **Recovery confidence:** **None for material, product, BOM, employee, customer, order, production, stock, payment, or cash-flow records.**

## Sources not found

Read-only searches did not find a usable database backup in:

- project directories;
- `provillo-app/storage`;
- project backup directories;
- Downloads/Documents/Desktop SQL dump locations other than the schema-only drawSQL export;
- Docker configuration or Docker volume backup references;
- CI artifacts;
- GitHub workflow artifacts;
- phpMyAdmin data exports;
- MySQL Workbench backup files;
- `*.sql.gz` files;
- `*.dump` files;
- application database snapshots.

No Docker Compose or Dockerfile configuration exists in the inspected workspace.

The only project `*.bak` match is `.pnpm-workspace.yaml.bak`, which is unrelated to database recovery.

## Log and history sources

### MySQL server logs

- **Location:** `C:/laragon/data/mysql-8.4/mysqld.log`
- **Contents:** Server startup/shutdown and operational messages.
- **Incident usefulness:** Confirms the later 19:21 shutdown and 19:40 restart, but general SQL logging was disabled, so it does not list the destructive DDL.
- **Recovery confidence:** Low for row recovery; useful for timeline corroboration.

### MySQL general and slow logs

- `general_log=OFF`
- `slow_query_log=OFF`

These do not provide the destructive command.

### Laravel logs

- **Location:** `provillo-app/storage/logs/laravel.log`
- **Contents:** Historical `FreshCommand`/`db:seed` stack traces from July 10 and July 11 and normal application exceptions.
- **Incident usefulness:** Demonstrates prior `migrate:fresh --seed` execution paths but does not preserve the July 28 shell command or exact incident timestamp.
- **Recovery confidence:** None for row recovery; low-to-medium for command-path evidence.

### Terminal and shell histories

Checked sources include shell histories, PowerShell PSReadLine history, Laragon/Cmder history, and visible Zed logs. No retained July 28 destructive command was found.

## Point-in-time recovery recommendation

The binary logs are the only source likely capable of reconstructing the exact manually entered SIMOPRO dataset. The recommended order is:

1. User manually stops MySQL.
2. Preserve a byte-for-byte copy of `C:/laragon/data/mysql-8.4`, especially `binlog.000013` through `binlog.000020` and `binlog.index`.
3. Resume MySQL only under user control.
4. Decode only an incident time window from `binlog.000019` to identify the first destructive event and its exact position.
5. Replay logs only up to the position immediately before that event.
6. Target `provillo_recovery`, preferably first in a separate temporary MySQL instance.
7. Compare counts and selected non-sensitive fingerprints against source documents.
8. Keep the current `provillo` database unchanged throughout recovery analysis.

Exact proposed commands are documented in `docs/database-loss-incident-report.md`. None have been executed.

## Recovery confidence summary

| Source | Exact database-state recovery | Manual reconstruction | Confidence |
|---|---:|---:|---|
| MySQL binary logs | Potentially yes | Yes | High, pending binlog validation |
| Pre-incident research archive | No | Yes | Medium |
| Stock movement workbook | No | Partial | Medium-low |
| Other operational spreadsheets | No | Partial | Medium-low |
| drawSQL schema export | No data | No | Very low for data |
| Local SQLite file | No | No | None for business data |
| Laravel/MySQL logs | No | No | Timeline evidence only |
