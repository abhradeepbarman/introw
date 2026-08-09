-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "maxTime" INTEGER NOT NULL DEFAULT 0;
