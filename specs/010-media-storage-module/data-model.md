# Data Model: Media Storage Module

**Feature**: 010-media-storage-module
**Date**: 2026-04-06
**PRD Reference**: §5.8 Media / Storage Module, §7 File Storage Strategy

## Entities

**No new database entities.** This module is a service layer for cloud storage operations. File metadata (URLs) is stored within consuming entities (e.g., `icon_url` on services, `cover_image_url` on projects).

## Constants

### Media Constants

**File**: `src/media-storage/constants/media.constants.ts`

```typescript
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export const ALLOWED_ENTITIES = [
  'services',
  'projects',
  'articles',
  'users',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type AllowedEntity = (typeof ALLOWED_ENTITIES)[number];
```

## DTO Definitions

### UploadFileDto

**File**: `src/media-storage/dto/upload-file.dto.ts`

```typescript
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ALLOWED_ENTITIES, AllowedEntity } from '../constants/media.constants';

export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_ENTITIES)
  @ApiProperty({
    description: 'Entity type for storage organization',
    enum: ALLOWED_ENTITIES,
    example: 'projects',
  })
  entity: AllowedEntity;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Subfolder within the entity directory',
    example: 'covers',
  })
  subfolder: string;
}
```

### UploadResponseDto

**File**: `src/media-storage/dto/upload-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: 'Public CDN URL of the uploaded file',
    example: 'https://bucket.s3.us-west-004.backblazeb2.com/projects/covers/f47ac10b.jpeg',
  })
  url: string;

  @ApiProperty({
    description: 'Storage key for the file (used for deletion)',
    example: 'projects/covers/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpeg',
  })
  key: string;

  @ApiProperty({
    description: 'Generated UUID filename',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479.jpeg',
  })
  filename: string;
}
```

### DeleteFileDto

**File**: `src/media-storage/dto/delete-file.dto.ts`

```typescript
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteFileDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Full CDN URL or storage key of the file to delete',
    example: 'https://bucket.s3.us-west-004.backblazeb2.com/projects/covers/f47ac10b.jpeg',
  })
  fileUrlOrKey: string;
}
```

## B2/S3 Configuration

### B2 Storage Config

**File**: `src/config/b2-storage.config.ts`

```typescript
import { S3Client } from '@aws-sdk/client-s3';

export const B2_STORAGE_PROVIDER = 'B2_STORAGE_CLIENT';

export const b2StorageProvider = {
  provide: B2_STORAGE_PROVIDER,
  useFactory: () => {
    return new S3Client({
      endpoint: process.env.B2_ENDPOINT,        // e.g., https://s3.us-west-004.backblazeb2.com
      region: process.env.B2_REGION,             // e.g., us-west-004
      credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APP_KEY!,
      },
    });
  },
};
```

## Storage Key Structure

```text
{bucket}/
├── services/
│   ├── icons/
│   │   └── {uuid}.{ext}
│   └── covers/
│       └── {uuid}.{ext}
├── projects/
│   ├── covers/
│   │   └── {uuid}.{ext}
│   └── gallery/
│       └── {uuid}.{ext}
├── articles/
│   └── covers/
│       └── {uuid}.{ext}
└── users/
    └── avatars/
        └── {uuid}.{ext}
```

## Migration

**No migration needed.** This module creates no database tables.
