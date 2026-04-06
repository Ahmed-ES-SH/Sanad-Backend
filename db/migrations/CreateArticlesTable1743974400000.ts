import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArticlesTable1743974400000 implements MigrationInterface {
  name = 'CreateArticlesTable1743974400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(300) NOT NULL,
        "slug" character varying(350) NOT NULL,
        "excerpt" text,
        "content" text NOT NULL,
        "coverImageUrl" character varying,
        "tags" text[] NOT NULL DEFAULT '{}',
        "isPublished" boolean NOT NULL DEFAULT false,
        "publishedAt" TIMESTAMP,
        "readTimeMinutes" integer NOT NULL DEFAULT 0,
        "viewsCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_articles_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_articles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_articles_isPublished_publishedAt" ON "articles" ("isPublished", "publishedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_articles_isPublished_publishedAt"`);
    await queryRunner.query(`DROP TABLE "articles"`);
  }
}
