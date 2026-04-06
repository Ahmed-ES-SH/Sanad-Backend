
Establish strict engineering and development principles for a production-grade NestJS backend project that follows PRD-driven development and git worktree workflow.

Core Principles:

1. PRD Alignment
- The PRD file located in the project root is the single source of truth.
- Every feature, task, and implementation must map explicitly to a requirement in the PRD.
- Do not introduce features or logic not defined in the PRD unless explicitly instructed.

2. Feature-Based Task Structure
- Each feature must have its own dedicated tasks file.
- Tasks must be grouped by feature and clearly reference the corresponding PRD section.
- Each task must include:
  - Description
  - Acceptance criteria
  - Dependencies
  - Affected modules/files

3. Dependency Version Control
- All libraries and packages used in any feature must have explicitly defined versions.
- Versions must be documented inside the feature’s tasks file under a "Dependencies" section.
- Prefer stable, production-ready versions (avoid experimental or deprecated packages).
- Ensure compatibility with the current NestJS version and existing project dependencies.
- Do not introduce unnecessary libraries if native Node.js or NestJS solutions are sufficient.

4. Code Quality & Architecture
- Follow NestJS best practices (modular architecture, providers, DTOs, guards, interceptors).
- Enforce separation of concerns (controller, service, repository layers).
- Use TypeScript strictly with proper typing (no any unless justified).
- Follow clean code principles and consistent naming conventions.

5. Git Worktree Workflow Awareness
- Assume features may be developed in isolated worktrees.
- Tasks and implementation must be independent and not tightly coupled with unfinished features.
- Avoid cross-feature side effects.

6. Validation & Security
- Use class-validator and DTOs for input validation.
- Enforce authentication and authorization where required.
- Prevent common vulnerabilities (injection, mass assignment, etc.).

7. Performance & Scalability
- Avoid unnecessary database queries.
- Use pagination, indexing, and caching where appropriate.
- Design APIs to be scalable and efficient.

8. Documentation
- Each feature must include:
  - Technical notes
  - API contract (request/response)
  - Dependency list with versions
- Keep documentation concise but sufficient for production use.

9. Testing Standards
- Each feature must include test considerations (unit/e2e where applicable).
- Ensure testability in design (dependency injection, modular structure).

Output Expectations:
- Always structure outputs clearly.
- Always include dependency versions when introducing any package.
- Always map work back to PRD requirements.
- Always organize work per feature with isolated task files.

10. Version Consistency Enforcement
- Before adding any dependency, check if a similar package already exists in the project.
- Do not duplicate functionality across libraries.
- Keep dependency footprint minimal.