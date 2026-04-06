import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactMessagesTable1775462767591 implements MigrationInterface {
  name = 'CreateContactMessagesTable1775462767591';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contact_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "subject" character varying(200) NOT NULL, "message" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "replied_at" TIMESTAMP, "ip_address" character varying(45), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b74f96eb2edd977ccfba6533293" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_contact_messages_created_at" ON "contact_messages" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_contact_messages_is_read" ON "contact_messages" ("is_read") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_contact_messages_is_read"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_contact_messages_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "contact_messages"`);
  }
}
