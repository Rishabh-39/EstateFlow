# Database invariant verifier fix — Milestone 2

Problem: The third and fourth `GROUP BY ... HAVING` checks returned zero rows when no violations existed. The verifier accessed `rows[0].violations` and crashed.

Fix: Each query now counts violating groups in an outer `COUNT(*)`, so the returned `violations` count is always zero or greater. The script also validates each result before reading it.

Run with `npm run db:verify` after loading `.env`. These checks are read-only and do not modify your database.

This fix has not been run against your local PostgreSQL instance, which is not accessible here. If a genuine invariant fails it will print `FAIL` with a nonzero count and exit with code 1.
