-- Free and paid credits now buy the same 5-minute interview, so the two buckets collapse into one.
-- AlterTable
ALTER TABLE "User" DROP COLUMN "freeCredits",
DROP COLUMN "paidCredits",
ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 1;
