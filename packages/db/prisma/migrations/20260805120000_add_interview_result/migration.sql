-- CreateTable
CREATE TABLE "InterviewResult" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "rubric" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewResult_interviewId_key" ON "InterviewResult"("interviewId");

-- AddForeignKey
ALTER TABLE "InterviewResult" ADD CONSTRAINT "InterviewResult_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move existing evaluations onto the new table. The old rubric shape (assessed flags,
-- per-dimension strengths/improvements) no longer parses, so only score and feedback carry over;
-- those rows render as a score with feedback and no breakdown.
INSERT INTO "InterviewResult" ("id", "interviewId", "score", "feedback", "rubric")
SELECT gen_random_uuid()::text, "id", "score", "feedback", NULL
FROM "Interview"
WHERE "feedback" IS NOT NULL;

-- DropColumn
ALTER TABLE "Interview" DROP COLUMN "score",
DROP COLUMN "feedback",
DROP COLUMN "rubric";
