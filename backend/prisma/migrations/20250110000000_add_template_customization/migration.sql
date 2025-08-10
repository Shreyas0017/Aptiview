-- CreateTable for enhanced template customization fields
-- This migration adds new fields to support advanced AI template customization

-- Add new columns to the Job table
ALTER TABLE "Job" ADD COLUMN "aiTemplateId" TEXT;
ALTER TABLE "Job" ADD COLUMN "customInterviewContext" TEXT;
ALTER TABLE "Job" ADD COLUMN "customQuestionsList" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Job" ADD COLUMN "scoringWeights" JSONB;
ALTER TABLE "Job" ADD COLUMN "interviewDuration" INTEGER DEFAULT 20;
ALTER TABLE "Job" ADD COLUMN "difficultyLevel" TEXT DEFAULT 'intermediate';
ALTER TABLE "Job" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have default values
UPDATE "Job" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
