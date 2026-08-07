-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');

-- AlterTable: convert existing "role" TEXT to "UserRole" (invalid values become NULL)
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE WHEN "role" IN ('STUDENT', 'ADMIN') THEN "role"::"UserRole" ELSE NULL END
);
