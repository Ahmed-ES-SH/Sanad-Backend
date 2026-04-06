import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentsTable1775466869156 implements MigrationInterface {
    name = 'CreatePaymentsTable1775466869156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'succeeded', 'failed', 'refunded')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "stripe_payment_intent_id" character varying(255) NOT NULL, "stripe_customer_id" character varying(255), "amount" numeric(10,2) NOT NULL, "currency" character varying(10) NOT NULL DEFAULT 'usd', "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "description" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_94c6e6376625bc6710d7dbb4b6b" UNIQUE ("stripe_payment_intent_id"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1237daf748b7653a6ebb9492fe" ON "payments" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_427785468fb7d2733f59e7d7d3" ON "payments" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_427785468fb7d2733f59e7d7d3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1237daf748b7653a6ebb9492fe"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    }

}
