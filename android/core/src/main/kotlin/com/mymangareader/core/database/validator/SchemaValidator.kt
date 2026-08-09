package com.mymangareader.core.database.validator

/**
 * Runtime guard: called on app startup in debug builds to detect if the
 * Room schema version in the APK matches the latest exported schema file.
 * Crashes loudly in debug so the developer knows a migration is missing
 * before the app ships.
 *
 * In production this is a no-op — Room's own migration engine handles it.
 */
object SchemaValidator {
    fun assertNoSchemaDrift(currentVersion: Int, expectedVersion: Int) {
        check(currentVersion == expectedVersion) {
            "Room schema drift detected: database version is $currentVersion " +
                "but expected $expectedVersion. " +
                "Run scripts/generate-migration.sh and add a migration before building."
        }
    }
}
