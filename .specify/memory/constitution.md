<!--
=== Sync Impact Report ===
Version change: 0.0.0 (template) → 1.0.0 (initial ratification)
Modified principles: N/A (all new)
Added sections:
  - 10 Core Principles (PRD Alignment, Feature-Based Task Structure,
    Dependency Version Control, Code Quality & Architecture,
    Git Worktree Workflow Awareness, Validation & Security,
    Performance & Scalability, Documentation, Testing Standards,
    Version Consistency Enforcement)
  - Output Expectations
  - Development Workflow
  - Governance
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md          ✅ aligned (Constitution Check section present)
  - .specify/templates/spec-template.md           ✅ aligned (user stories, requirements, success criteria)
  - .specify/templates/tasks-template.md          ✅ aligned (phased structure, dependencies, parallel markers)
Follow-up TODOs: None
-->

# Sanad Backend Constitution

## Core Principles

### I. PRD Alignment

- The PRD file (`PRD.md`) located in the project root is the **single source
  of truth** for all product requirements.
- Every feature, task, and implementation MUST map explicitly to a requirement
  defined in the PRD.
- No features or logic MAY be introduced unless they are defined in the PRD or
  explicitly instructed by the project owner.
- Any ambiguity in the PRD MUST be resolved with the project owner before
  implementation begins.

### II. Feature-Based Task Structure

- Each feature MUST have its own dedicated tasks file stored under the
  `specs/` directory.
- Tasks MUST be grouped by feature and clearly reference the corresponding
  PRD section.
- Each task MUST include:
  - **Description** — what the task accomplishes.
  - **Acceptance criteria** — measurable conditions for completion.
  - **Dependencies** — other tasks or modules that MUST be completed first.
  - **Affected modules/files** — exact file paths that will be created or
    modified.

### III. Dependency Version Control

- All libraries and packages used in any feature MUST have explicitly defined
  versions.
- Versions MUST be documented inside the feature's tasks file under a
  "Dependencies" section.
- Only stable, production-ready versions are permitted; experimental or
  deprecated packages are prohibited.
- Every dependency MUST be verified for compatibility with the current NestJS
  version and existing project dependencies before adoption.
- Native Node.js or NestJS solutions MUST be preferred over third-party
  libraries when they provide equivalent functionality.

### IV. Code Quality & Architecture

- All code MUST follow NestJS best practices: modular architecture, providers,
  DTOs, guards, and interceptors.
- Separation of concerns MUST be enforced across controller, service, and
  repository layers.
- TypeScript MUST be used with strict typing; the `any` type is prohibited
  unless justified with a code comment explaining the rationale.
- Clean code principles and consistent naming conventions (camelCase for
  variables/functions, PascalCase for classes/interfaces) MUST be followed.

### V. Git Worktree Workflow Awareness

- Features MAY be developed in isolated git worktrees.
- Tasks and implementation MUST be independent and MUST NOT be tightly coupled
  with unfinished features in other worktrees.
- Cross-feature side effects are prohibited; each feature branch MUST be
  self-contained and mergeable independently.

### VI. Validation & Security

- `class-validator` and DTOs MUST be used for all input validation on every
  endpoint.
- Authentication and authorization MUST be enforced on every protected
  endpoint using guards.
- Common vulnerabilities MUST be actively prevented:
  - SQL/NoSQL injection (parameterized queries via TypeORM).
  - Mass assignment (explicit DTO whitelisting).
  - CSRF, XSS, and header injection (NestJS security middleware).

### VII. Performance & Scalability

- Unnecessary database queries MUST be avoided; use eager/lazy loading
  intentionally.
- Pagination MUST be implemented on all list endpoints
  (`?page=1&limit=10`).
- Indexing MUST be applied to frequently queried columns (slugs, foreign
  keys, status fields).
- Caching SHOULD be applied where read frequency significantly exceeds
  write frequency.
- APIs MUST be designed to scale horizontally without session affinity.

### VIII. Documentation

- Each feature MUST include:
  - **Technical notes** — architecture decisions and rationale.
  - **API contract** — request/response shapes with example payloads.
  - **Dependency list** — every package with its pinned version.
- Documentation MUST be concise but sufficient for a new developer to
  understand and operate the feature in production.
- Swagger/OpenAPI annotations MUST be present on every endpoint.

### IX. Testing Standards

- Each feature MUST include test considerations documenting which unit and
  e2e tests are required.
- Testability MUST be ensured by design: dependency injection, modular
  structure, and mockable services.
- Tests MUST cover:
  - Happy path for every endpoint.
  - Validation rejection (invalid DTOs).
  - Authorization rejection (missing/invalid tokens, wrong roles).

### X. Version Consistency Enforcement

- Before adding any dependency, the existing `package.json` MUST be checked
  for a similar or overlapping package.
- Functionality MUST NOT be duplicated across libraries.
- The dependency footprint MUST be kept minimal; every addition requires
  explicit justification.

## Output Expectations

- All outputs (specifications, plans, tasks, code) MUST be structured
  clearly and consistently.
- Dependency versions MUST be included whenever a package is introduced.
- All work MUST map back to PRD requirements with explicit references.
- Work MUST be organized per feature with isolated task files.

## Development Workflow

- **Branching**: One branch per feature, compatible with git worktree
  isolation.
- **Task Execution**: Follow the phased approach defined in the tasks
  template (Setup → Foundational → User Stories → Polish).
- **Code Review**: Every PR MUST pass constitution compliance checks before
  merge.
- **Deployment**: Vercel-hosted (as per `vercel.json`); environment
  variables managed via `.env` + `@nestjs/config`.

## Governance

- This constitution supersedes all other development practices for the
  Sanad Backend project.
- Amendments MUST be documented with version bump rationale, approved by
  the project owner, and accompanied by a migration plan for any breaking
  changes.
- Versioning follows semantic versioning:
  - **MAJOR**: Backward-incompatible principle removals or redefinitions.
  - **MINOR**: New principle or section added, or material expansion.
  - **PATCH**: Clarifications, wording, or non-semantic refinements.
- All PRs and code reviews MUST verify compliance with these principles.
- Complexity MUST be justified; simpler alternatives MUST be considered
  first.

**Version**: 1.0.0 | **Ratified**: 2026-04-06 | **Last Amended**: 2026-04-06
