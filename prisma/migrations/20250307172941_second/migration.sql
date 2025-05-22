/*
  Warnings:

  - Added the required column `arrivalTime` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departureTime` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flightDate` to the `Flight` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "arrivalTime" TIME NOT NULL,
ADD COLUMN     "departure" TEXT,
ADD COLUMN     "departureTime" TIME NOT NULL,
ADD COLUMN     "flightDate" DATE NOT NULL;
