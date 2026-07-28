# Final Interview — Unresolved Business Decisions

This document records decisions that remain unresolved after the final Provillo owner interview. They must not be implemented speculatively.

## Unresolved decisions

1. **Refund and payment reversal workflow**
   - No rule has been confirmed for refund initiation, approval, payment reversal, or matching cash-flow reversal entries.
   - Do not add refund or payment-reversal actions until this workflow is confirmed.

2. **Editing a payment after cash-flow creation**
   - It is not yet confirmed whether an existing payment may be edited after it has generated an `arus_kas` entry.
   - Do not add payment-edit functionality or silently rewrite linked cash-flow records.

3. **Material-usage tolerance against BOM standard**
   - BOM remains the source of planned requirements, but the accepted tolerance between planned and actual material usage has not been defined.
   - Do not reject production completion solely because actual consumption differs from the BOM plan.

4. **Additional material for rework**
   - It is not confirmed whether every rework operation always requires additional material.
   - Rework must remain traceable, but no automatic material issue may be generated for rework.

5. **Payment consequences of order cancellation**
   - The treatment of deposits, installments, settlements, outstanding balances, and possible refunds after cancellation is not confirmed.
   - Do not automatically alter, reverse, or refund payment and cash-flow records when an order is cancelled.

6. **Invoice payment history requirement**
   - It is not confirmed whether payment history must always appear on an invoice or is optional.
   - Preserve the existing invoice behavior until the owner confirms this requirement.

## Confirmed boundary

The material warehouse semantics approved for this iteration are not unresolved:

> Raw-material stock decreases when material is issued for use in production. Issued material that has actually been used is marked as consumed and cannot be returned. If production is cancelled, only issued but unused material may be returned to stock.

`planned` and `consumed` do not change stock. `issued` and `additional` reduce stock. `returned` adds eligible unused material back to stock. An `adjustment` must include a reason, remain auditable, and may never make stock negative.
