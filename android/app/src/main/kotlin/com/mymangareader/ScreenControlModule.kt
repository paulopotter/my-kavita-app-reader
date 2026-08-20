package com.mymangareader

import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.graphics.Insets
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.mymangareader.core.database.UiPreferencesDao
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// Generic Android screen-control primitives — not reader-specific, reusable by any screen that
// needs to keep the display awake (e.g. a future video/animation viewer). getKeepScreenOnDuringReading
// lives here (not in ReaderChapterModule) because it's a generic UiPreferencesDao read, same
// category as keepScreenOn/allowScreenOff — not chapter/page data.
@Singleton
class ScreenControlModule @Inject constructor(
    private val uiPreferencesDao: UiPreferencesDao,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "ScreenControlModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @ReactMethod
    fun keepScreenOn(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun allowScreenOff(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getKeepScreenOnDuringReading(promise: Promise) {
        scope.launch {
            runCatching { uiPreferencesDao.getKeepScreenOnDuringReading() ?: true }.resolveOrReject(promise, "KEEP_SCREEN_ON_ERROR")
        }
    }

    // Modo imersivo fullscreen sticky: esconde status bar e barra de navegação, desenhando o
    // conteúdo por trás delas (edge-to-edge); o usuário revela as barras temporariamente com um
    // swipe da borda (comportamento "sticky" padrão do Android). Restrito à tela do Reader —
    // enable/disable é chamado explicitamente ao entrar/sair dela, nunca fica ligado globalmente.
    //
    // setDecorFitsSystemWindows(false) sozinho só faz a Window parar de aplicar padding — a
    // ReactRootView (RN, targetSdk 35, que já segue o padrão edge-to-edge automático do Android
    // 15) continua consumindo os WindowInsets reais e aplicando padding para eles por conta
    // própria, deixando uma faixa (o android:windowBackground do tema) visível atrás de onde a
    // status bar estaria — a Compose tree do Reader nunca chega a desenhar ali. O listener abaixo
    // intercepta os insets na decorView e os zera antes que cheguem à ReactRootView, forçando o
    // conteúdo a de fato ocupar a tela inteira; ao desativar, o listener é substituído por um que
    // devolve os insets originais sem modificação — setOnApplyWindowInsetsListener(null) sozinho
    // NÃO restaura o comportamento padrão da View (confirmado em teste: a DecorView não propaga
    // os insets automaticamente sem um listener explícito), então precisa ficar sempre presente.
    @ReactMethod
    fun setImmersiveMode(enabled: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            val activity = currentActivity
            val window = activity?.window
            if (activity == null || window == null) {
                promise.resolve(null)
                return@runOnUiThread
            }
            WindowCompat.setDecorFitsSystemWindows(window, !enabled)
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            if (enabled) {
                controller.hide(WindowInsetsCompat.Type.systemBars())
                controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                window.decorView.setOnApplyWindowInsetsListener { view, insets -> zeroOutSystemBarsInsets(view, insets) }
            } else {
                controller.show(WindowInsetsCompat.Type.systemBars())
                window.decorView.setOnApplyWindowInsetsListener { _, insets -> insets }
            }
            // Força o sistema a recalcular/reaplicar os insets imediatamente (sem esperar o
            // próximo evento natural, ex: rotação), tanto ao ligar quanto ao desligar.
            window.decorView.requestApplyInsets()
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getImmersiveModeDuringReading(promise: Promise) {
        scope.launch {
            runCatching { uiPreferencesDao.getImmersiveModeDuringReading() ?: false }.resolveOrReject(promise, "IMMERSIVE_MODE_ERROR")
        }
    }

    companion object {
        // Extraído como função nomeada (não lambda inline) para ser testável isoladamente sem
        // precisar inspecionar o listener instalado numa View real.
        internal fun zeroOutSystemBarsInsets(view: android.view.View, insets: android.view.WindowInsets): android.view.WindowInsets {
            val compat = WindowInsetsCompat.toWindowInsetsCompat(insets, view)
            return WindowInsetsCompat.Builder(compat)
                .setInsets(WindowInsetsCompat.Type.systemBars(), Insets.NONE)
                .build()
                .toWindowInsets() ?: insets
        }
    }
}
