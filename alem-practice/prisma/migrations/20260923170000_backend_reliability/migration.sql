-- Additive migration: existing tasks, proposals and accounts remain untouched.
ALTER TABLE "Task" ADD COLUMN "reviewRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Draft" ADD COLUMN "sourceKey" TEXT;
ALTER TABLE "Draft" ADD COLUMN "answers" TEXT NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX "Draft_sourceKey_key" ON "Draft"("sourceKey");
ALTER TABLE "Proposal" ADD COLUMN "submissionKey" TEXT;
CREATE UNIQUE INDEX "Proposal_submissionKey_key" ON "Proposal"("submissionKey");
