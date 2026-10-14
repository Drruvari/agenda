package com.drruvari.agenda

import com.drruvari.agenda.data.AgendaDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CompatibilityTest {
    @Test fun legacyIdentityIsStable() {
        assertEquals("agenda.v3.db", AgendaDatabase.DATABASE_NAME)
        assertEquals(3, AgendaDatabase.VERSION)
        assertTrue(AgendaDatabase.schema.any { it.contains("ink-v1") })
    }
}
