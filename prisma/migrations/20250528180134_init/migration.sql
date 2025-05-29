-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "fullName" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomination" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "duration" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "photoName" TEXT,
    "nominationId" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" SERIAL NOT NULL,
    "answer" TEXT NOT NULL,
    "correctness" BOOLEAN NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_login_key" ON "Admin"("login");

-- CreateIndex
CREATE UNIQUE INDEX "User_number_key" ON "User"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Nomination_name_key" ON "Nomination"("name");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "Nomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
