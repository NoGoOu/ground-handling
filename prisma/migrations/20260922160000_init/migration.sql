-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SHIFT_LEAD', 'AGENT');

-- CreateEnum
CREATE TYPE "MilestoneAnchor" AS ENUM ('ARRIVAL', 'DEPARTURE');

-- CreateEnum
CREATE TYPE "MilestonePart" AS ENUM ('ARRIVAL_PART', 'DEPARTURE_PART');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iataCode" TEXT NOT NULL,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnaroundTemplate" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minTurnaroundMinutes" INTEGER NOT NULL,
    "travelMinutes" INTEGER NOT NULL,
    "postDepartureMinutes" INTEGER NOT NULL,
    "departureReportMinutes" INTEGER NOT NULL,
    "minBreakMinutes" INTEGER NOT NULL,

    CONSTRAINT "TurnaroundTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneDefinition" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "anchor" "MilestoneAnchor" NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL,
    "part" "MilestonePart" NOT NULL,

    CONSTRAINT "MilestoneDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "inboundFlightNumber" TEXT NOT NULL,
    "outboundFlightNumber" TEXT NOT NULL,
    "sta" TIMESTAMP(3) NOT NULL,
    "eta" TIMESTAMP(3),
    "std" TIMESTAMP(3) NOT NULL,
    "etd" TIMESTAMP(3),
    "stand" TEXT NOT NULL,
    "ata" TIMESTAMP(3),
    "atd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PLANNED',
    "arrivalAgentId" TEXT,
    "departureAgentId" TEXT,
    "templateSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneRecord" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "milestoneDefinitionId" TEXT NOT NULL,
    "actualTime" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MilestoneRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_iataCode_key" ON "Airline"("iataCode");

-- CreateIndex
CREATE UNIQUE INDEX "TurnaroundTemplate_airlineId_name_key" ON "TurnaroundTemplate"("airlineId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneDefinition_templateId_code_key" ON "MilestoneDefinition"("templateId", "code");

-- CreateIndex
CREATE INDEX "Flight_sta_idx" ON "Flight"("sta");

-- CreateIndex
CREATE INDEX "Flight_std_idx" ON "Flight"("std");

-- CreateIndex
CREATE UNIQUE INDEX "Task_flightId_key" ON "Task"("flightId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneRecord_taskId_milestoneDefinitionId_key" ON "MilestoneRecord"("taskId", "milestoneDefinitionId");

-- AddForeignKey
ALTER TABLE "TurnaroundTemplate" ADD CONSTRAINT "TurnaroundTemplate_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneDefinition" ADD CONSTRAINT "MilestoneDefinition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TurnaroundTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TurnaroundTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_arrivalAgentId_fkey" FOREIGN KEY ("arrivalAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_departureAgentId_fkey" FOREIGN KEY ("departureAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneRecord" ADD CONSTRAINT "MilestoneRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneRecord" ADD CONSTRAINT "MilestoneRecord_milestoneDefinitionId_fkey" FOREIGN KEY ("milestoneDefinitionId") REFERENCES "MilestoneDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneRecord" ADD CONSTRAINT "MilestoneRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneRecord" ADD CONSTRAINT "MilestoneRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

