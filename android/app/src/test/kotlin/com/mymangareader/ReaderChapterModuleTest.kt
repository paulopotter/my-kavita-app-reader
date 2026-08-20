package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.mymangareader.features.kavita.chapter.ChapterDataSource
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever

class ReaderChapterModuleTest {

    private fun makeModule(dataSource: ChapterDataSource = mock()): ReaderChapterModule {
        val context = mock<ReactApplicationContext>()
        return ReaderChapterModule(dataSource, context)
    }

    @Test
    fun `getName retorna ReaderChapterModule`() {
        assertEquals("ReaderChapterModule", makeModule().name)
    }

    @Test
    fun `invalidatePageCache delega para ChapterDataSource`() = runTest {
        val dataSource: ChapterDataSource = mock()
        whenever(dataSource.invalidatePageCache("c1")).thenReturn(Result.success(Unit))
        val module = makeModule(dataSource = dataSource)
        val promise = FakePromise()

        module.invalidatePageCache("c1", promise)
        promise.awaitResolved()

        verify(dataSource).invalidatePageCache("c1")
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `saveReadingProgress delega para ChapterDataSource`() = runTest {
        val dataSource: ChapterDataSource = mock()
        whenever(dataSource.saveReadingProgress("c1", "s1", 5)).thenReturn(Result.success(Unit))
        val module = makeModule(dataSource = dataSource)
        val promise = FakePromise()

        module.saveReadingProgress("c1", "s1", 5, promise)
        promise.awaitResolved()

        verify(dataSource).saveReadingProgress("c1", "s1", 5)
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `saveLocalProgress converte scrollFraction Double para Float e delega`() = runTest {
        val dataSource: ChapterDataSource = mock()
        whenever(dataSource.saveLocalProgress("c1", "s1", 5, 0.25f)).thenReturn(Result.success(Unit))
        val module = makeModule(dataSource = dataSource)
        val promise = FakePromise()

        module.saveLocalProgress("c1", "s1", 5, 0.25, promise)
        promise.awaitResolved()

        verify(dataSource).saveLocalProgress("c1", "s1", 5, 0.25f)
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `getLocalProgress resolve nulo quando nao ha progresso`() = runTest {
        val dataSource: ChapterDataSource = mock()
        whenever(dataSource.getLocalProgress("c1")).thenReturn(Result.success(null))
        val module = makeModule(dataSource = dataSource)
        val promise = FakePromise()

        module.getLocalProgress("c1", promise)
        promise.awaitResolved()

        assertNull(promise.resolvedValue)
        assertNull(promise.rejectedCode)
    }

    // getLocalProgress com progresso não-nulo usa Arguments.createMap() (com.facebook.react.bridge),
    // que exige a lib nativa reactnativejni — indisponível mesmo sob Robolectric (Arguments não
    // tem um shadow do RN; confirmado tentando rodar sob RobolectricTestRunner). Coberto pelo
    // smoke test manual em dispositivo físico.

    @Test
    fun `getServerReadProgress rejeita quando dataSource falha`() = runTest {
        val dataSource: ChapterDataSource = mock()
        whenever(dataSource.getServerReadProgress("c1")).thenReturn(Result.failure(IllegalStateException("boom")))
        val module = makeModule(dataSource = dataSource)
        val promise = FakePromise()

        module.getServerReadProgress("c1", promise)
        promise.awaitResolved()

        assertEquals("SERVER_PROGRESS_ERROR", promise.rejectedCode)
    }
}
