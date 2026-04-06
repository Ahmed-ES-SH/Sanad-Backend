import { MigrationInterface, QueryRunner } from 'typeorm';

export class BlackList1775024295566 implements MigrationInterface {
  name = 'BlackList1775024295566';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "black_list_tokens" ("id" SERIAL NOT NULL, "token" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a136c27667742b133d262dd411f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8eb1cabd6b6e30a13c1dc85326" ON "black_list_tokens" ("token") `,
    );
    const hasColumn = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'black_list_tokens' AND column_name = 'userId'`,
    );
    if (hasColumn.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "black_list_tokens" ADD "userId" character varying NOT NULL DEFAULT ''`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "black_list_tokens" DROP COLUMN "userId"`,
    );
  }
}
