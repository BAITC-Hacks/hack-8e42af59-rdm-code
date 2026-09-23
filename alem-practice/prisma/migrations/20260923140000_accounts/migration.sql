CREATE TABLE "User" (
 "id" TEXT NOT NULL PRIMARY KEY, "phone" TEXT NOT NULL, "provider" TEXT NOT NULL,
 "role" TEXT NOT NULL, "actorId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "bio" TEXT NOT NULL DEFAULT '', "location" TEXT NOT NULL DEFAULT '',
 "education" TEXT NOT NULL DEFAULT '', "skills" TEXT NOT NULL DEFAULT '[]',
 "website" TEXT NOT NULL DEFAULT '', "publicProfile" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_actorId_key" ON "User"("actorId");
CREATE UNIQUE INDEX "User_phone_provider_key" ON "User"("phone", "provider");
CREATE TABLE "Session" (
 "tokenHash" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL,
 CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "AuthChallenge" (
 "id" TEXT NOT NULL PRIMARY KEY, "phone" TEXT NOT NULL, "provider" TEXT NOT NULL,
 "codeHash" TEXT NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
 "expiresAt" DATETIME NOT NULL, "consumedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuthChallenge_phone_provider_createdAt_idx" ON "AuthChallenge"("phone", "provider", "createdAt");
CREATE TABLE "RateBucket" ("id" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" DATETIME NOT NULL);
