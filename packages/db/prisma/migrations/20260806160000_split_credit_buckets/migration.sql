-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freeCredits" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "paidCredits" INTEGER NOT NULL DEFAULT 0;

-- Existing balances belong to whichever tier the user is currently on.
UPDATE "User"
SET "freeCredits" = CASE WHEN "plan" = 'FREE' THEN "credits" ELSE 0 END,
    "paidCredits" = CASE WHEN "plan" = 'STARTER' THEN "credits" ELSE 0 END;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "credits";
