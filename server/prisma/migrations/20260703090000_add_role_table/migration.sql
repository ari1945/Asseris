-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capsJson" TEXT NOT NULL DEFAULT '[]',
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "Role_firmId_name_key" ON "Role"("firmId", "name");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
