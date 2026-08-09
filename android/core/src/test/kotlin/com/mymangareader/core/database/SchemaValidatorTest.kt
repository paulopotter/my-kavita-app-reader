package com.mymangareader.core.database

import com.mymangareader.core.database.validator.SchemaValidator
import org.junit.Test
import org.junit.Assert.assertThrows

class SchemaValidatorTest {

    @Test
    fun `passes when versions match`() {
        SchemaValidator.assertNoSchemaDrift(currentVersion = 1, expectedVersion = 1)
    }

    @Test
    fun `throws when versions diverge`() {
        assertThrows(IllegalStateException::class.java) {
            SchemaValidator.assertNoSchemaDrift(currentVersion = 2, expectedVersion = 1)
        }
    }
}
