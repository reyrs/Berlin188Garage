-- Adds bayar_supplier (paying down supplier payables, distinct from the
-- immediate pembelian_part purchase) and bayar_hutang_owner (repaying the
-- owner's personal loans into the business) as valid Expense.category
-- values -- real recurring cost lines already tracked in the business's
-- manual books (Excel) but previously uncapturable in the app.
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('operasional', 'pembelian_part', 'gaji', 'utilitas', 'bayar_supplier', 'bayar_hutang_owner', 'lainnya'));
