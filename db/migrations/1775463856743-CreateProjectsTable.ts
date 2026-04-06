import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjectsTable1775463856743 implements MigrationInterface {
    name = 'CreateProjectsTable1775463856743'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying, "name" character varying, "avatar" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "googleId" character varying, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "isEmailVerified" boolean NOT NULL DEFAULT false, "emailVerificationToken" character varying, "emailVerificationTokenExpiry" TIMESTAMP, "passwordResetToken" character varying, "passwordResetTokenExpiry" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_51b8b26ac168fbe7d6f5653e6cf" UNIQUE ("name"), CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "slug" character varying(220) NOT NULL, "short_description" text NOT NULL, "long_description" text, "cover_image_url" character varying(500), "images" text array NOT NULL DEFAULT '{}', "tech_stack" text array NOT NULL DEFAULT '{}', "category" character varying(100), "live_url" character varying(500), "repo_url" character varying(500), "is_published" boolean NOT NULL DEFAULT false, "is_featured" boolean NOT NULL DEFAULT false, "order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_96e045ab8b0271e5f5a91eae1ee" UNIQUE ("slug"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_22611978869ac4a34bd7a97fc1" ON "projects" ("category") `);
        await queryRunner.query(`CREATE INDEX "IDX_1a080dd6b10bf0649bc0ed385e" ON "projects" ("is_published", "order") `);
        await queryRunner.query(`ALTER TABLE "black_list_tokens" ALTER COLUMN "userId" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "black_list_tokens" ALTER COLUMN "userId" SET DEFAULT ''`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a080dd6b10bf0649bc0ed385e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_22611978869ac4a34bd7a97fc1"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
