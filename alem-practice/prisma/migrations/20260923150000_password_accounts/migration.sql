-- Preserve every existing profile and session. Legacy phone accounts can add
-- credentials from an already authenticated session; no passwords are invented.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
 "id" TEXT NOT NULL PRIMARY KEY, "phone" TEXT, "provider" TEXT NOT NULL,
 "username" TEXT, "passwordHash" TEXT,
 "role" TEXT NOT NULL, "actorId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "bio" TEXT NOT NULL DEFAULT '', "location" TEXT NOT NULL DEFAULT '',
 "education" TEXT NOT NULL DEFAULT '', "skills" TEXT NOT NULL DEFAULT '[]',
 "website" TEXT NOT NULL DEFAULT '', "publicProfile" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("id","phone","provider","role","actorId","name","bio","location","education","skills","website","publicProfile","createdAt")
 SELECT "id","phone","provider","role","actorId","name","bio","location","education","skills","website","publicProfile","createdAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_actorId_key" ON "User"("actorId");
CREATE UNIQUE INDEX "User_phone_provider_key" ON "User"("phone","provider");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
