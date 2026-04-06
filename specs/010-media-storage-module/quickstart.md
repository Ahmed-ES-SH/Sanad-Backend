# Quickstart: Media Storage Module

**Feature**: 010-media-storage-module
**Date**: 2026-04-06

## Prerequisites

- Node.js LTS installed
- Backblaze B2 account with a bucket created
- B2 application key with read/write access to the bucket
- `.env` file configured with B2 credentials
- Project dependencies installed (`npm install`)

## Setup Steps

### 1. Install AWS S3 SDK

```bash
npm install @aws-sdk/client-s3@^3.750.0
```

### 2. Configure Environment Variables

Add to your `.env.development` file:

```env
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004
B2_KEY_ID=your_b2_key_id
B2_APP_KEY=your_b2_application_key
B2_BUCKET_NAME=your-bucket-name
B2_PUBLIC_URL=https://your-bucket.s3.us-west-004.backblazeb2.com
```

### 3. No Migration Needed

This module creates no database tables.

### 4. Register Module

Add `MediaStorageModule` to `AppModule` imports in `src/app.module.ts`:

```typescript
import { MediaStorageModule } from './media-storage/media-storage.module';

@Module({
  imports: [
    // ... existing imports
    MediaStorageModule,
  ],
})
export class AppModule {}
```

### 5. Start Development Server

```bash
npm run start:dev
```

### 6. Verify Endpoints

**Admin — upload a file:**
```bash
curl -X POST http://localhost:3000/admin/media/upload \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@/path/to/image.jpg" \
  -F "entity=projects" \
  -F "subfolder=covers"
```

**Admin — delete a file:**
```bash
curl -X DELETE http://localhost:3000/admin/media \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"fileUrlOrKey": "projects/covers/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpeg"}'
```

**Test validation — oversized file:**
```bash
curl -X POST http://localhost:3000/admin/media/upload \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@/path/to/large-file-6mb.jpg" \
  -F "entity=projects" \
  -F "subfolder=covers"
# Expected: 400 Bad Request — "File too large"
```

**Test validation — invalid MIME type:**
```bash
curl -X POST http://localhost:3000/admin/media/upload \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@/path/to/file.exe" \
  -F "entity=projects" \
  -F "subfolder=covers"
# Expected: 400 Bad Request — "Unsupported file type"
```

### 7. Swagger Documentation

Visit `http://localhost:3000/api` to see the media endpoints documented in Swagger UI.

## File Checklist

| File | Purpose |
|------|---------|
| `src/media-storage/media-storage.module.ts` | Module definition (exports service) |
| `src/media-storage/media-storage.controller.ts` | Admin endpoints (upload + delete) |
| `src/media-storage/media-storage.service.ts` | B2/S3 operations + validation |
| `src/media-storage/dto/upload-file.dto.ts` | Upload form fields validation |
| `src/media-storage/dto/upload-response.dto.ts` | Upload response shape |
| `src/media-storage/dto/delete-file.dto.ts` | Delete request validation |
| `src/media-storage/constants/media.constants.ts` | MIME types, max size, entities whitelist |
| `src/config/b2-storage.config.ts` | B2/S3 client factory provider |
| `src/app.module.ts` | Updated — MediaStorageModule imported |
