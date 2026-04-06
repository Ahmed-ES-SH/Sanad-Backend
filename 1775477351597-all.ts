import { MigrationInterface, QueryRunner } from "typeorm";

export class All1775477351597 implements MigrationInterface {
    name = 'All1775477351597'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "slug" character varying(160) NOT NULL, "short_description" text NOT NULL, "long_description" text, "icon_url" character varying(255), "cover_image_url" character varying(255), "is_published" boolean NOT NULL DEFAULT false, "order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_02cf0d0f46e11d22d952f623670" UNIQUE ("slug"), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_61a27c3637cb3232e8e9dc9ffa" ON "services" ("is_published", "order") `);
        await queryRunner.query(`CREATE TABLE "articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(300) NOT NULL, "slug" character varying(350) NOT NULL, "excerpt" text, "content" text NOT NULL, "coverImageUrl" character varying, "tags" text array NOT NULL DEFAULT '{}', "isPublished" boolean NOT NULL DEFAULT false, "publishedAt" TIMESTAMP, "readTimeMinutes" integer NOT NULL DEFAULT '0', "viewsCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1123ff6815c5b8fec0ba9fec370" UNIQUE ("slug"), CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3fddf7592d60b1d2c483214d87" ON "articles" ("isPublished", "publishedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_3fddf7592d60b1d2c483214d87"`);
        await queryRunner.query(`DROP TABLE "articles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_61a27c3637cb3232e8e9dc9ffa"`);
        await queryRunner.query(`DROP TABLE "services"`);
    }

}
