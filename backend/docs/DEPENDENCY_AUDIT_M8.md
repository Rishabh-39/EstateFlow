# Milestone 8 — npm dependency audit runbook

The user's prior `npm install` logs reported **two high-severity vulnerabilities**, alongside deprecated `inflight`, `rimraf@2` and `glob@7` transitive packages. Those logs did not identify the specific affected packages or paths, so no precise advisory or severity resolution can be asserted from them alone.

Milestone 8 removes `ts-node-dev` from `devDependencies` and replaces `npm run dev` with Node 20's native watch mode plus `ts-node/register/transpile-only`. `ts-node-dev` was a likely source of deprecated transitive packages, but this is a source-level cleanup—not evidence that all vulnerabilities are gone.

After extracting the complete M8 project, from its inner backend directory:

```sh
npm install
npm audit
npm audit --omit=dev
npm ls inflight glob rimraf ts-node-dev
```

Interpret both reports separately: `npm audit --omit=dev` reports production dependency exposure; full `npm audit` includes development tooling. Do not ignore a real production advisory. Do not blindly use `npm audit fix --force`: check major-version changes, NestJS/runtime support and build/E2E tests first.

If a high-severity advisory remains, save the **redacted** audit report (package name, affected version, advisory ID, dependency path and fix range), not any credentials, and use the fix that is compatible with the rest of the project. Re-run `npm run build`, `npm run test:m8` and `npm run test:e2e` after applying updates.

Production notes: E2E tests intentionally reset only `estateflow_test`; they should never run against a production instance. The current in-memory request limiter is suitable for one local instance, not multi-instance security enforcement. Mock payment and simulated outbound communication must remain clearly labeled.
