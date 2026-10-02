-- CreateEnum
CREATE TYPE "LoginResult" AS ENUM ('SUCCESS', 'FAILURE', 'BLOCKED');

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "result" "LoginResult" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_username_at_idx" ON "LoginAttempt"("username", "at");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_at_idx" ON "LoginAttempt"("ip", "at");

-- CreateIndex
CREATE INDEX "LoginAttempt_at_idx" ON "LoginAttempt"("at");

