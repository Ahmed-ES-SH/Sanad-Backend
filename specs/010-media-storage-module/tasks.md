# Tasks: Media Storage Module

**Input**: Design documents from `/specs/010-media-storage-module/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, create the module skeleton, constants, config, and DTOs

- [ ] T001 Install AWS S3 SDK by running `npm install @aws-sdk/client-s3@^3.750.0`
- [ ] T002 Create media-storage module directory structure: `src/media-storage/`, `src/media-storage/dto/`, `src/media-storage/constants/`
- [ ] T003 [P] Create media constants in `src/media-storage/constants/media.constants.ts` — export `ALLOWED_MIME_TYPES` array (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`), `MAX_FILE_SIZE` (5MB in bytes), `ALLOWED_ENTITIES` array (`services`, `projects`, `articles`, `users`), and TypeScript types `AllowedMimeType` and `AllowedEntity`
- [ ] T004 [P] Create B2/S3 client factory provider in `src/config/b2-storage.config.ts` — instantiate `S3Client` with `B2_ENDPOINT`, `B2_REGION`, `B2_KEY_ID`, `B2_APP_KEY` from env vars, export as `B2_STORAGE_PROVIDER` token

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up DTOs, service skeleton, controller, and module that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create `UploadFileDto` in `src/media-storage/dto/upload-file.dto.ts` with entity (required, @IsIn(ALLOWED_ENTITIES)) and subfolder (required, string) — all with @ApiProperty decorators
- [ ] T006 [P] Create `UploadResponseDto` in `src/media-storage/dto/upload-response.dto.ts` with url, key, filename fields — all with @ApiProperty decorators
- [ ] T007 [P] Create `DeleteFileDto` in `src/media-storage/dto/delete-file.dto.ts` with fileUrlOrKey (required, string) — with @ApiProperty decorator
- [ ] T008 Create `MediaStorageService` skeleton in `src/media-storage/media-storage.service.ts` — inject S3Client via `@Inject(B2_STORAGE_PROVIDER)`, inject `ConfigService` for `B2_BUCKET_NAME` and `B2_PUBLIC_URL`
- [ ] T009 Create `MediaStorageController` skeleton in `src/media-storage/media-storage.controller.ts` — route prefix `admin/media`, inject `MediaStorageService`, add `@Roles(UserRoleEnum.ADMIN)` guard
- [ ] T010 Create `MediaStorageModule` in `src/media-storage/media-storage.module.ts` — import `ConfigModule`, register `b2StorageProvider`, register controller and service, **export `MediaStorageService`** for cross-module use
- [ ] T011 Register `MediaStorageModule` in `src/app.module.ts` imports array

**Checkpoint**: Module compiles and is loaded by NestJS — no functional endpoints yet

---

## Phase 3: User Story 4 — System Generates UUID Filenames (Priority: P1)

**Goal**: Every uploaded file gets a UUID-based filename preserving the original extension

**Independent Test**: Call `generateFileName('photo.jpg')` twice → verify unique UUIDs with `.jpg` extension

**Note**: Implemented first because US1 (upload) depends on this utility.

### Implementation for User Story 4

- [ ] T012 [US4] Implement `generateFileName(originalname: string): string` private method in `src/media-storage/media-storage.service.ts` — extract extension from `originalname`, generate UUID via `crypto.randomUUID()`, return `{uuid}.{ext}`
- [ ] T013 [US4] Implement `buildStorageKey(entity: string, subfolder: string, filename: string): string` private method in `src/media-storage/media-storage.service.ts` — return `{entity}/{subfolder}/{filename}`

**Checkpoint**: UUID filename generation utility works — ready for upload flow

---

## Phase 4: User Story 2 — System Validates File Before Upload (Priority: P1)

**Goal**: Files are validated for MIME type, size, and non-emptiness before any cloud transfer

**Independent Test**: Submit files of various types/sizes → verify rejections for invalid types, oversized files, and empty files

**Note**: Implemented before US1 because the upload endpoint depends on validation.

### Implementation for User Story 2

- [ ] T014 [US2] Configure `FileInterceptor` in `src/media-storage/media-storage.controller.ts` — use `multer.memoryStorage()` and `limits: { fileSize: MAX_FILE_SIZE }` from constants
- [ ] T015 [US2] Configure `ParseFilePipe` with validators in `src/media-storage/media-storage.controller.ts` — add `MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })` and `FileTypeValidator({ fileType: regex pattern matching ALLOWED_MIME_TYPES })` on the upload endpoint's `@UploadedFile()` parameter
- [ ] T016 [US2] Add empty file check in `src/media-storage/media-storage.service.ts` or controller — if `file.size === 0`, throw `BadRequestException('File is empty')`

**Checkpoint**: Validation rejects invalid files before cloud transfer — US2 + US4 functional

---

## Phase 5: User Story 1 — Admin Uploads a File (Priority: P1) 🎯 MVP

**Goal**: Admin can upload a file via multipart form; file is stored in B2 with UUID name in correct entity path; CDN URL is returned

**Independent Test**: POST `/admin/media/upload` with a valid JPEG + entity `projects` + subfolder `covers` → verify file exists in B2 at `projects/covers/{uuid}.jpeg` and URL is returned

### Implementation for User Story 1

- [ ] T017 [US1] Implement `uploadFile(file: Express.Multer.File, entity: string, subfolder: string): Promise<UploadResponseDto>` method in `src/media-storage/media-storage.service.ts` — generate UUID filename, build storage key, call S3 `PutObjectCommand` with file buffer + content type + key + bucket, construct CDN URL from `B2_PUBLIC_URL` + key, return `{ url, key, filename }`. If S3 fails, throw `BadGatewayException`.
- [ ] T018 [US1] Implement `buildPublicUrl(key: string): string` private method in `src/media-storage/media-storage.service.ts` — concatenate `B2_PUBLIC_URL` + `/` + key
- [ ] T019 [US1] Wire `POST /admin/media/upload` endpoint in `src/media-storage/media-storage.controller.ts` — use `@UseInterceptors(FileInterceptor('file'))`, accept `@UploadedFile(ParseFilePipe)` and `@Body() UploadFileDto`, call `this.mediaStorageService.uploadFile()`, return 201 Created with `UploadResponseDto`

**Checkpoint**: File upload works end-to-end — US1 + US2 + US4 fully functional (MVP)

---

## Phase 6: User Story 3 — Admin Deletes a File (Priority: P2)

**Goal**: Admin can delete a file from B2 by providing the CDN URL or storage key

**Independent Test**: Upload a file → delete by URL → verify removed from B2; delete non-existent key → verify 200 OK (idempotent)

### Implementation for User Story 3

- [ ] T020 [US3] Implement `extractKeyFromUrl(fileUrlOrKey: string): string` private method in `src/media-storage/media-storage.service.ts` — if input starts with `B2_PUBLIC_URL`, strip the prefix to extract the storage key; otherwise treat input as a raw key
- [ ] T021 [US3] Implement `deleteFile(fileUrlOrKey: string): Promise<void>` method in `src/media-storage/media-storage.service.ts` — extract key via `extractKeyFromUrl()`, call S3 `DeleteObjectCommand` with key + bucket. S3 DeleteObject is naturally idempotent — no error if key doesn't exist.
- [ ] T022 [US3] Wire `DELETE /admin/media` endpoint in `src/media-storage/media-storage.controller.ts` — accept `@Body() DeleteFileDto`, call `this.mediaStorageService.deleteFile()`, return 200 OK with `{ message: 'File deleted successfully' }`

**Checkpoint**: File deletion works — all 4 user stories fully functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Swagger documentation, env var documentation, and final verification

- [ ] T023 [P] Add Swagger `@ApiTags('Media Storage')` to `MediaStorageController` in `src/media-storage/media-storage.controller.ts`
- [ ] T024 [P] Add `@ApiOperation()` and `@ApiResponse()` decorators to both endpoints (upload + delete) in `src/media-storage/media-storage.controller.ts`
- [ ] T025 [P] Add `@ApiConsumes('multipart/form-data')` and `@ApiBody()` decorator with file schema to the upload endpoint in `src/media-storage/media-storage.controller.ts`
- [ ] T026 Add B2 environment variables (`B2_ENDPOINT`, `B2_REGION`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET_NAME`, `B2_PUBLIC_URL`) to `.env.example` (or equivalent)
- [ ] T027 Validate all endpoints against contracts by running through the quickstart.md curl commands in `specs/010-media-storage-module/quickstart.md`
- [ ] T028 Verify Swagger documentation renders correctly at `http://localhost:3000/api`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US4 (Phase 3)**: Depends on Foundational — UUID utilities needed by US1
- **US2 (Phase 4)**: Depends on Foundational — validation needed by US1
- **US1 (Phase 5)**: Depends on US4 + US2 (uses UUID generation + validation)
- **US3 (Phase 6)**: Depends on Foundational only — independently implementable
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US4 (P1)**: Can start after Phase 2 — UUID utility, no external dependencies
- **US2 (P1)**: Can start after Phase 2 — validation config, independent of US4
- **US1 (P1)**: Depends on US4 + US2 — upload flow uses both
- **US3 (P2)**: Can start after Phase 2 — delete flow is independent of upload

### Within Each User Story

- Private utility methods before public service methods
- Service methods before controller wiring

### Parallel Opportunities

- **Phase 1**: T003 + T004 can run in parallel (different files)
- **Phase 2**: T006 + T007 can run in parallel (different DTO files)
- **Phase 3 + Phase 4**: US4 and US2 can run in parallel (UUID generation and validation are independent)
- **Phase 6**: US3 can run in parallel with US1 if US4 is complete (delete doesn't depend on upload)
- **Phase 7**: T023 + T024 + T025 can all run in parallel (different decorators)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch in parallel (different files):
Task: "Create media constants in src/media-storage/constants/media.constants.ts"
Task: "Create B2/S3 config in src/config/b2-storage.config.ts"
```

## Parallel Example: Phase 2 DTOs

```bash
# Launch in parallel (different DTO files):
Task: "Create UploadResponseDto in src/media-storage/dto/upload-response.dto.ts"
Task: "Create DeleteFileDto in src/media-storage/dto/delete-file.dto.ts"
```

---

## Implementation Strategy

### MVP First (Upload Only — US4 + US2 + US1)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T011)
3. Complete Phase 3: US4 — UUID Generation (T012–T013)
4. Complete Phase 4: US2 — Validation (T014–T016)
5. Complete Phase 5: US1 — Upload (T017–T019)
6. **STOP and VALIDATE**: Test uploading files to B2 with various types/sizes
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Module wired and compiling
2. Add US4 (UUID) + US2 (Validation) → Test independently → Foundation ready
3. Add US1 (Upload) → Test end-to-end → **MVP ready!**
4. Add US3 (Delete) → Test independently → Full file lifecycle
5. Polish → Swagger docs + final verification

### Parallel Team Strategy

With multiple developers after Phase 2:
- Developer A: US4 (UUID) → US1 (Upload) — upload flow
- Developer B: US2 (Validation) + US3 (Delete) — validation + delete
- Developer C: Polish (Swagger + env docs)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This module has **no database migration** — purely cloud storage operations
- This module **exports** `MediaStorageService` so other modules (services, projects, articles, users) can inject it
- **1 new dependency**: `@aws-sdk/client-s3@^3.750.0`
- Files are buffered in memory — no disk writes (FR-008)
- UUID filenames prevent all naming conflicts — no deduplication (each upload is unique)
- S3 `DeleteObject` is naturally idempotent — no existence check needed
- The `FileInterceptor` and `ParseFilePipe` provide defense-in-depth validation at both the Multer and NestJS pipe levels
