# ADR-003: Stack and hosting

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owner:** Davi

## Context

The brief allows any modern stack. The aim is a small, conventional, quick-to-explain stack, and, treating this as a first project at the company, one that fits what the company appears to run. Public signals are in [boundless-tech-stack](../research/boundless-tech-stack.md).

## Options considered

1. **Next.js (App Router) + TypeScript on Node, Tailwind, deployed to Netlify.** One language end to end, matches observed framework and host.
2. **Same stack deployed to Vercel.** Native Next.js hosting, account already set up, but does not match the observed host.
3. **Separate C# API plus a React front end.** Two toolchains, separate hosting, and no benefit for this scope.

## Decision

**Option 1, with Vercel as fallback.**

- Next.js App Router, React, TypeScript strict, Node runtime, Route Handlers for the API.
- Tailwind for styling. Whether Boundless uses Tailwind is unverified; it is a sound default with Next.js.
- Zod for runtime validation, Vitest for unit tests, Playwright for e2e, ESLint and Prettier, GitHub Actions for CI.
- Netlify documents full support for App Router route handlers, streaming and ISR through its OpenNext-based adapter. Function execution time limits were **not** verified.
- Phase 0 includes a deploy spike of a minimal route handler to Netlify, checking timeouts. If unacceptable, deploy to Vercel instead and record the reason.
- Avoid platform-specific services (KV stores, edge config) so moving between hosts stays a configuration change.

## Consequences

- One language, one deploy, one CI pipeline.
- A Netlify account is needed. Fallback cost is low.
- Choosing a host to match the company is a hypothesis about reuse, not a requirement of the brief.

## Weakest assumption

That Netlify's function limits fit a model call within a request. Mitigated by one model call per endpoint and verified in the Phase 0 spike.

## Evidence

- [boundless-tech-stack](../research/boundless-tech-stack.md)
- Netlify Next.js support: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
