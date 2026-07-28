# Database Loss Incident Report

## Incident status

This is a read-only incident report for the local MySQL database used by SIMOPRO. No database restoration, migration, seeding, test, import, or SQL write was performed during this investigation.

The affected database must be treated as critical research-partner data. The current records are not a recovery of the manually entered partner dataset.

## Confirmed cause

The destructive command recorded in the prior execution transcript was:

```text
php artisan migrate:fresh --env=testing --force --no-interaction
```

The command was intended as migration/rollback validation. Laravel's `migrate:fresh` command drops all tables on the resolved default database connection before running migrations again.

The previous recovery transcript then records these commands against the same local database:

```text
php artisan migrate --force --no-interaction
php artisan db:seed --force --no-interaction
```

Those commands recreated the schema and populated standard sample data. They did not recover the deleted research-partner records.

### Why `--env=testing` still used MySQL `provillo`

At the time of inspection, the project configuration is:

```text
.env APP_ENV=local
.env DB_CONNECTION=mysql
.env DB_HOST=127.0.0.1
.env DB_PORT=3306
.env DB_DATABASE=provillo
.env.testing: not present
bootstrap/cache/config.php: not present
```

No database password is included in this report.

Laravel handles `--env=testing` in two separate ways:

1. The console environment detector reports the application environment as `testing`.
2. The environment loader attempts to load `.env.testing`.

Because `.env.testing` does not exist, Laravel falls back to `.env`. Consequently, the database variables remained `mysql`, `127.0.0.1:3306`, and `provillo`. The `--env=testing` flag changed the logical application environment but did not inject PHPUnit's database variables.

`phpunit.xml` does explicitly define:

```xml
<env name="APP_ENV" value="testing"/>
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

However, those variables are applied by PHPUnit/Pest. They do not automatically apply to an arbitrary `php artisan migrate:fresh --env=testing` process.

### Configuration cache assessment

Laravel configuration cache could theoretically force stale database values because environment loading is skipped when configuration is cached. In this incident, there is no current `bootstrap/cache/config.php`, and no retained evidence shows that a configuration cache existed at the incident time. Configuration cache is therefore not the confirmed cause.

The confirmed cause is the combination of:

- executing `migrate:fresh`;
- using `--env=testing` without a `.env.testing` file;
- relying on `phpunit.xml` values that were not loaded by the Artisan migration process;
- absence of a guard preventing destructive test commands from connecting to `provillo`.

## Timeline

All local times below use UTC+07:00 unless stated otherwise.

| Time | Event | Confidence/evidence |
|---|---|---|
| Before 2026-07-28 17:32 | `provillo` contained manually entered research-partner data, including material, product, BOM, and employee records, with possible customer, order, production, stock, and financial records. | Confirmed by incident report and prior execution transcript. Exact row inventory is no longer available from the current database. |
| Approximately 2026-07-28 17:32 | `php artisan migrate:fresh --env=testing --force --no-interaction` resolved to local MySQL `provillo`, dropped its tables, and began recreating the schema. | Confirmed command from prior execution transcript. `information_schema` shows the recreated migration table at approximately 17:32:19 and subsequent application tables beginning at approximately 17:32:20. Exact shell-start timestamp was not retained. |
| 2026-07-28 17:32–17:39 | Schema recreation and follow-up migration validation continued. | Current table creation times and migration batches. |
| 2026-07-28 17:39:49–17:39:50 | Standard seed records were created. Laravel stores these application timestamps in UTC as `2026-07-28 10:39:49–10:39:50`; converting to local time gives 17:39:49–17:39:50. | Current record timestamps exactly match seeder fingerprints. |
| Approximately 2026-07-28 18:49:48–18:50:00 | Additional validation/fixture records were created: one production, one production item, four worker assignments, and six planned material movements. | Current UTC application timestamps are 11:49:48–11:50:00. These are not part of the standard seed dataset and must not be represented as recovered partner data. |
| 2026-07-28 19:21:42 | MySQL received a normal shutdown from local user `root`. | `C:/laragon/data/mysql-8.4/mysqld.log`. This investigation did not initiate that shutdown. |
| 2026-07-28 19:40:20–19:40:25 | MySQL was started and became ready for connections. | `mysqld.log`. This investigation did not start MySQL. |
| Current investigation | Read-only configuration, metadata, count, timestamp, log, archive, and binary-log inventory performed. | No database writes, service control, migrations, tests, imports, or recovery commands were run. |

The exact destructive event position is expected to be present in `binlog.000019`, but `mysqlbinlog` was deliberately not executed. The exact binary-log position must be identified during an approved recovery session.

## Deleted real data versus current data

### Deleted real data

The deleted data included manually entered research-partner records, especially:

- raw materials;
- products;
- Bills of Materials;
- employees;
- possibly customers, orders, production, stock movements, payments, and cash-flow records.

The current sample rows must not be labeled as recovered versions of those records.

### Recreated schema

The current MySQL `provillo` schema was recreated after the destructive command. It contains the expected application tables and the final production material/QC migration tables.

### Seeded sample data currently present

`DatabaseSeeder` calls these seeders in this order:

1. `AdminSeeder`
2. `BahanBakuSeeder`
3. `ProdukSeeder`
4. `BomCategorieSeeder`
5. `CustomerSeeder`
6. `KaryawanSeeder`
7. `PesananSeeder`
8. `ProduksiSeeder`
9. `PembayaranSeeder`
10. `ArusKasSeeder`

Current rows matching standard seeder quantities and creation windows are:

| Table | Seed-origin rows currently identifiable |
|---|---:|
| `users` | 1 default admin |
| `bahan_baku` | 8 sample materials; all codes match the seeder range |
| `produk` | 20 sample products; all codes match the seeder range |
| `bom_categorie` | 10 sample BOM headers |
| `bom_detail` | 54 sample BOM details |
| `karyawan` | 20 sample employees |
| `customer` | 20 sample customers |
| `pesanan` | 12 randomly generated sample orders |
| `detail_pesanan` | 20 randomly generated sample order lines in this run |
| `produksi` | 4 production rows from the seeder window |
| `produksi_item` | 6 rows from the seeder window |
| `pembayaran` | 4 sample payments |
| `arus_kas` | 9 rows: 4 payment-linked inflows and 5 manually seeded sample transactions |

The following operational tables currently have no persisted business rows:

- `detail_produksi`;
- `stok_bahan_baku`;
- `stok_produk_jadi`;
- `stok_produk_cacat`.

### Newly created validation/fixture data

After seeding, the current database acquired:

- 1 additional production row;
- 1 additional production-item row;
- 4 production-worker assignment rows;
- 6 planned production material-movement rows.

These records were created around 18:49–18:50 local time and are classified as validation/fixture data. They are not recovered research-partner records.

## Logs and command evidence

- Shell histories checked: no retained July 28 destructive command found.
- PowerShell PSReadLine history checked: no matching command found.
- Zed logs/history references checked: no matching command found.
- Laragon/Cmder history checked: no matching command found.
- Laravel log contains historical `FreshCommand`/`db:seed` stack traces from July 10 and July 11, but these are earlier development incidents, not the July 28 reset.
- MySQL general log was and remains `OFF`.
- MySQL slow query log was and remains `OFF`.
- MySQL server log records shutdown/start events but not the DDL statements.
- Binary logging is enabled and is the primary source expected to contain the July 28 destructive DDL and all earlier row changes.

## MySQL binary logging

Read-only server metadata confirms:

```text
log_bin=ON
binlog_format=ROW
binlog_expire_logs_seconds=2592000
log_bin_basename=C:\laragon\data\mysql-8.4\binlog
log_bin_index=C:\laragon\data\mysql-8.4\binlog.index
```

Available binary logs:

- `binlog.000013` — begins 2026-07-06;
- `binlog.000014`;
- `binlog.000015`;
- `binlog.000016`;
- `binlog.000017`;
- `binlog.000018`;
- `binlog.000019` — includes the incident day and ends near the later MySQL shutdown;
- `binlog.000020` — post-restart activity.

Because logging begins on the same date that the SIMOPRO database was initially developed, the logs may contain enough DDL and row events to reconstruct `provillo` from creation through the instant before the first destructive `DROP` event. This must be verified in an isolated recovery operation.

## Immediate preservation recommendation

No command below was executed.

Before any approved recovery analysis, the user should manually stop MySQL through Laragon and copy the entire data directory to separate storage. The agent must not control the service automatically.

Proposed preservation commands to run only after the user has manually stopped MySQL:

```bat
mkdir D:\Provillo-Incident\mysql-8.4-copy
robocopy C:\laragon\data\mysql-8.4 D:\Provillo-Incident\mysql-8.4-copy /E /COPYALL /R:0 /W:0
```

At minimum, preserve the binary logs and index:

```bat
mkdir D:\Provillo-Incident\binlogs
copy C:\laragon\data\mysql-8.4\binlog.* D:\Provillo-Incident\binlogs\
```

Do not purge logs or continue unrelated database testing before preservation.

## Proposed point-in-time recovery plan

No command in this section was executed.

### Step 1: identify the exact first destructive event

After preserving the binary logs, generate a human-readable incident window without applying it to MySQL:

```bat
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqlbinlog.exe" --base64-output=DECODE-ROWS -vv --start-datetime="2026-07-28 17:20:00" --stop-datetime="2026-07-28 17:40:00" "D:\Provillo-Incident\binlogs\binlog.000019" > "D:\Provillo-Incident\incident-window.txt"
findstr /N /I "DROP TABLE DROP DATABASE" "D:\Provillo-Incident\incident-window.txt"
```

Record the binary-log position immediately before the first destructive event affecting `provillo`. Use that position as `<STOP_POSITION_BEFORE_FIRST_DROP>`.

### Step 2: restore only into `provillo_recovery`

Create a new empty recovery database only after explicit approval:

```bat
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3306 -u root -p -e "CREATE DATABASE provillo_recovery CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Generate replay SQL for review; do not pipe directly into MySQL until it has been checked for any remaining reference to `provillo`:

```bat
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqlbinlog.exe" --database=provillo --rewrite-db="provillo->provillo_recovery" "D:\Provillo-Incident\binlogs\binlog.000013" "D:\Provillo-Incident\binlogs\binlog.000014" "D:\Provillo-Incident\binlogs\binlog.000015" "D:\Provillo-Incident\binlogs\binlog.000016" "D:\Provillo-Incident\binlogs\binlog.000017" "D:\Provillo-Incident\binlogs\binlog.000018" > "D:\Provillo-Incident\replay-before-incident-log.sql"
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqlbinlog.exe" --database=provillo --rewrite-db="provillo->provillo_recovery" --stop-position=<STOP_POSITION_BEFORE_FIRST_DROP> "D:\Provillo-Incident\binlogs\binlog.000019" >> "D:\Provillo-Incident\replay-before-incident-log.sql"
findstr /N /I "provillo" "D:\Provillo-Incident\replay-before-incident-log.sql"
```

After review confirms that all replay targets are `provillo_recovery`, apply it:

```bat
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -h 127.0.0.1 -P 3306 -u root -p provillo_recovery < "D:\Provillo-Incident\replay-before-incident-log.sql"
```

An even safer alternative is replaying into a separate temporary MySQL instance on another port, validating the recovered database there, then dumping only that recovered database and importing it as `provillo_recovery` on the current server.

Never replay the logs into the existing `provillo` database.

## Prevention plan — proposed only

No prevention change has been implemented yet.

1. Create `.env.testing` with `APP_ENV=testing`, `DB_CONNECTION=sqlite`, and an isolated SQLite path or `:memory:` where appropriate.
2. Keep `phpunit.xml` explicitly configured with `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:`.
3. Add an application/test bootstrap guard that throws before any test or migration operation when `APP_ENV=testing` and the resolved database is `provillo` or `provillo_real`.
4. Add a console guard that blocks `migrate:fresh`, `migrate:refresh`, `migrate:reset`, destructive rollback, and seeding against protected research databases without explicit user confirmation.
5. Configure Playwright with a dedicated `provillo_e2e` database and environment file.
6. Separate databases:
   - `provillo_real` — research-partner/manual data;
   - `provillo_testing` — integration tests only;
   - `provillo_e2e` — browser tests only;
   - `provillo_recovery` — incident recovery only.
7. Require explicit user confirmation before any destructive database command.
8. Add a pre-migration backup procedure. Proposed command:

```bat
mkdir backups
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe" --single-transaction --routines --triggers --events --set-gtid-purged=OFF -h 127.0.0.1 -P 3306 -u root -p provillo_real > backups\provillo_real_YYYYMMDD_HHMMSS.sql
```

9. Add prominent repository warnings that research databases must never be used with `migrate:fresh`, `migrate:refresh`, `migrate:reset`, destructive rollback, factories, or seeders.
10. Preserve and monitor binary-log retention and keep backups on separate storage.
