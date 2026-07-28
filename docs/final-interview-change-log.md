# Final Interview Change Log

## Scope

Final prototype revision after the Provillo owner interview. The project remains **Sistem Informasi Manajemen Operasional Provillo (SIMOPRO)** with one actor, **Admin**, and no RBAC module or new top-level use case.

## Resolved installed stack

- PHP 8.3
- Laravel 13.18.1
- Inertia Laravel 3.1.1
- Inertia React 3.6.0
- React 19.2.7
- Pest 4.7.4
- Tailwind CSS 4.3.2

Package constraints remain separately defined in `composer.json` and `package.json`, including PHP `^8.3`, Laravel `^13.17`, Inertia Laravel `^3.0`, Inertia React `^3.0.0`, React `^19.2.0`, Pest `^4.7`, Tailwind CSS `^4.0.0`, Vite `^8.0.0`, and Playwright `^1.61.1`.

## Confirmed interview rules

1. Production may start only when every target product has a valid, non-empty BOM.
2. Planned requirements are `qty_per_pair × qty_target` and do not change stock.
3. Production may start while planned stock is incomplete; shortages remain visible.
4. `issued` and `additional` physically release material and reduce warehouse stock.
5. `consumed` marks issued material as used and does not reduce stock again.
6. `returned` restores only issued/additional material that has not been consumed or previously returned.
7. Stock never becomes negative and every stock-changing movement is atomic, locked, traceable, and idempotent.
8. QC is recorded per product and worker. Failed QC requires a reason and disposition.
9. Passed QC adds normal finished stock exactly once and becomes worker wage-basis output.
10. Failed QC never adds normal stock and never becomes wage-basis output.
11. Rework references its failed parent; only a later passed rework result adds normal stock and wage basis.
12. `jual_cacat` and `dimusnahkan` remain in a separate audit ledger, not normal stock.
13. Completion requires passed quantity to meet target, no unresolved disposition/rework, consistent material movements, and valid stock state.
14. Existing partial delivery, multiple payments, overpayment protection, derived payment status, payment-to-cash-flow integration, invoice, PDF, and Excel behavior remain in place.

Approved thesis/UI wording:

> Raw-material stock decreases when material is issued for use in production. Issued material that has actually been used is marked as consumed and cannot be returned. If production is cancelled, only issued but unused material may be returned to stock.

## Old behavior

- Production start was blocked by insufficient stock.
- Starting production deducted the complete BOM requirement.
- Cancellation restored the complete BOM requirement.
- Progress represented team output and had no direct worker attribution.
- Failed QC had no reason, disposition, inspector, or rework lineage.
- Worker productivity divided passed output equally among all assigned workers.
- Completion checked only passed quantity against target.
- Playwright used only Chromium, a fixed localhost URL, fixed credentials, and no retained failure trace.

## New behavior

- Production start snapshots BOM requirements as `planned` and changes `draft → proses` without stock deduction.
- Material issue, additional issue, consumption, return, and adjustment are explicit ledger actions.
- Detail pages expose planned, available, issued, consumed, returned, shortage, returnable quantity, status, and chronological movement history.
- Failed QC requires reason/disposition for new records. Historical failed rows remain unresolved until manually reviewed.
- Active rework and completed rework lineage are visible chronologically.
- Worker output is the sum of directly attributed passed-QC quantities; failed and legacy unattributed quantities are excluded.
- Employee export includes `Dasar Perhitungan Upah` and failed-QC output.
- Dashboard adds compact indicators for active rework, failed QC, production shortages, receivables, and orders not fully shipped.
- Playwright supports environment base URL/credentials, Chromium, conditional Edge, Firefox, CI retries/workers, failure screenshots, retained failure traces, and HTML report.

## Database changes

### `produksi_pemakaian_bahan`

New material ledger with production/material/user foreign keys, movement type, quantity, date, description, and unique idempotency key.

### `detail_produksi`

Added nullable legacy-safe fields:

- `karyawan_id`
- `alasan_qc`
- `disposisi_qc`
- `rework_parent_id`
- `catatan`
- `inspected_by`
- `inspected_at`
- `idempotency_key`

New records require worker attribution through validation/service rules. Existing rows are not silently converted.

### `stok_produk_cacat`

New audit ledger for `jual_cacat` and `dimusnahkan`, uniquely linked to the failed QC source record.

### Stock-history source links

- `stok_bahan_baku.produksi_pemakaian_bahan_id`
- `stok_produk_jadi.detail_produksi_id`
- `stok_bahan_baku.created_by`

Nullable unique source links preserve historical rows and prevent duplicate stock posting.

## Service changes

- Added `ProduksiMaterialService` for planned snapshots, material movements, balances, shortage status, cancellation returns, consistency checks, and idempotency.
- `StockBahanBakuService` and `StockProdukService` now lock current stock rows and support source-linked idempotent history entries.
- `ProduksiService` no longer performs full BOM deduction/rollback; it handles worker-attributed QC, dispositions, rework bounds, defect audit, direct wage basis, and conservative completion.
- `PembayaranService` now handles an omitted optional `keterangan` without aborting payment/cash-flow creation.

## UI changes

Production detail now displays:

- BOM material plan, availability, issue, consumption, return, shortage, and status;
- material movement entry and history;
- production workers and progress worker attribution;
- QC reason/disposition and inspector audit data;
- active rework queue and chronological rework/QC history;
- normal pass, failed, sellable-defect, destroyed, and active-rework totals;
- direct worker output as wage basis.

The existing UI component system, Wayfinder route functions, Tailwind conventions, dark mode, and responsive layout are preserved.

## Test changes and traceability

### External workbook IDs

- `TC_MFG_008`: valid BOM starts production, snapshots planned requirements, no automatic deduction.
- `TC_MFG_010`: insufficient stock still starts production and exposes shortage.
- `TC_MFG_013`: failed QC requires reason/disposition, excludes normal stock and wages, and supports rework.
- `TC_MFG_020`: cancellation returns only unused issued/additional material.
- `TC_MFG_022`: movement and stock history are atomic, locked, traceable, and idempotent.

### New IDs

- `TC_MAT_001`: actual usage; consumption does not deduct stock twice.
- `TC_MAT_002`: material shortage visibility (covered with `TC_MFG_010`).
- `TC_MAT_003`: partial material return on cancellation.
- `TC_QC_001`: QC reason and disposition.
- `TC_RWK_001`: rework parent traceability and later pass.
- `TC_WAGE_001`: worker-attributed passed quantity as wage basis.
- `TC_SHP_001`: partial delivery regression.

Pest feature suites cover material movements, QC/rework, wage basis, completion blocking, multiple payments, overpayment rollback, payment/cash-flow linkage, partial shipment, remaining shipment, and order auto-completion.

Playwright smoke titles include the external production IDs and run across configured browser projects when `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, and a safe `E2E_PRODUCTION_ID` fixture are supplied.

## Affected functional requirements

This revision affects the existing final requirements for dashboard, reports, raw-material stock, finished-product stock, production, QC, worker productivity, order shipment, payment, invoice/report regression, and cross-cutting audit/export behavior. It does not introduce a new actor, role-management requirement, or top-level use case.

## Unresolved decisions

See `docs/final-interview-unresolved-decisions.md`:

- refund/payment reversal workflow;
- editing payments after cash-flow generation;
- accepted BOM usage tolerance;
- whether every rework requires additional material;
- payment consequences when an order is cancelled;
- mandatory versus optional invoice payment history.

No speculative implementation was added for these items.

## Migration instructions

1. Back up the production database.
2. Deploy application code.
3. Run `php artisan migrate --force`.
4. Verify new tables/columns and foreign keys.
5. Review legacy `detail_produksi` rows where `karyawan_id`, failed-QC reason, or disposition is null.
6. Do not assign invented workers or dispositions during backfill. Review unresolved failed rows through the production detail UI.
7. Run targeted production/payment/shipment smoke tests.

MySQL production and SQLite development/test compatibility must both be verified before deployment.

## Rollback instructions

Within the same deployment window and before new material/QC data is relied upon:

1. Put the application in maintenance mode.
2. Back up the database, including the new ledgers.
3. Run `php artisan migrate:rollback --step=4 --force` to reverse the four migrations in reverse order.
4. Restore the previous application release.
5. Confirm stock totals against the backup before reopening the application.

Rollback removes new ledger/QC data and source links. Do not roll back after operational use without exporting/reconciling those records first.
