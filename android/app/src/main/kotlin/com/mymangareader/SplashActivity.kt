package com.mymangareader

import android.content.Intent
import android.text.SpannableStringBuilder
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.net.toUri
import com.mymangareader.tools.ota.OtaCheckResult
import com.mymangareader.tools.ota.OtaManager
import com.mymangareader.tools.ota.OtaStore
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject
import android.os.Bundle

private const val STABLE_BOOT_DELAY_MS = 5_000L

@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    @Inject lateinit var otaManager: OtaManager
    @Inject lateinit var otaStore: OtaStore

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var mainActivityLaunched = false
    private var isBlocked = false

    private lateinit var progressBar: ProgressBar
    private lateinit var updateButton: Button
    private lateinit var versionApp: TextView
    private lateinit var versionKotlin: TextView
    private lateinit var versionRn: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        progressBar = findViewById(R.id.splash_progress)
        updateButton = findViewById(R.id.splash_update_button)
        versionApp = findViewById(R.id.splash_version_app)
        versionKotlin = findViewById(R.id.splash_version_kotlin)
        versionRn = findViewById(R.id.splash_version_rn)

        bindVersions()
        otaManager.applyRollbackIfNeeded()
        otaManager.recordBootStart()

        scope.launch(Dispatchers.IO) {
            val progressJob = launch {
                otaManager.downloadProgress.collect { progress ->
                    withContext(Dispatchers.Main) { applyProgress(progress) }
                }
            }

            val result = otaManager.checkAndDownload()
            progressJob.cancel()

            withContext(Dispatchers.Main) {
                handleOtaResult(result)
                if (!mainActivityLaunched && !isBlocked) launchMain()
            }
        }

        scope.launch {
            kotlinx.coroutines.delay(STABLE_BOOT_DELAY_MS)
            otaManager.recordStableBoot()
        }
    }

    private fun bindVersions() {
        versionApp.text = BuildConfig.APP_BUILD_DATETIME
        versionKotlin.text = BuildConfig.KOTLIN_VERSION_NAME
        val currentRn = otaStore.readState().currentBundleVersion.ifBlank { BuildConfig.RN_VERSION }
        versionRn.text = currentRn
    }

    private fun markRnUpdated(prevVersion: String, newVersion: String) {
        val prev = prevVersion.ifBlank { BuildConfig.RN_VERSION }
        val green = 0xFF4ADE80.toInt()
        val suffix = " → $newVersion ↑"
        val ssb = SpannableStringBuilder(prev).apply {
            val start = length
            append(suffix)
            setSpan(ForegroundColorSpan(green), start, length, 0)
            setSpan(RelativeSizeSpan(0.85f), start, length, 0)
        }
        versionRn.text = ssb
    }

    private fun handleOtaResult(result: OtaCheckResult) {
        when (result) {
            is OtaCheckResult.PolicyMatch -> {
                when (result.mode) {
                    "required" -> {
                        // Store in bridge so RN splash can show its own blocking UI,
                        // but also block at Android level — MainActivity never launches.
                        OtaEventBridge.pendingPolicy = Pair(result.mode, result.releaseNotesUrl)
                        isBlocked = true
                        showBlockedScreen(result.releaseNotesUrl)
                    }
                    else -> {
                        // Delegate advisory dialogs (highly_recommended, recommended) to RN splash.
                        OtaEventBridge.pendingPolicy = Pair(result.mode, result.releaseNotesUrl)
                    }
                }
            }
            is OtaCheckResult.Updated -> {
                markRnUpdated(result.prevVersion, result.newVersion)
                if (!mainActivityLaunched) {
                    progressBar.visibility = View.GONE
                    updateButton.visibility = View.VISIBLE
                    updateButton.setOnClickListener { restartApp() }
                } else {
                    OtaEventBridge.notifyBundleReady()
                }
                result.policy?.let {
                    // Advisory policy after download: pass to RN as well.
                    if (it.mode != "required") {
                        OtaEventBridge.pendingPolicy = Pair(it.mode, it.releaseNotesUrl)
                    }
                }
            }
            is OtaCheckResult.UpToDate -> Unit
            is OtaCheckResult.Error -> Unit
        }
    }

    private fun applyProgress(progress: Float) {
        if (progress < 0f) {
            progressBar.isIndeterminate = true
        } else {
            progressBar.isIndeterminate = false
            progressBar.progress = (progress * 100).toInt()
            progressBar.max = 100
        }
    }

    private fun showBlockedScreen(releaseNotesUrl: String) {
        progressBar.visibility = View.GONE
        AlertDialog.Builder(this)
            .setTitle("Atualização obrigatória")
            .setMessage("Esta versão do app não é mais suportada. Atualize para continuar.")
            .setCancelable(false)
            .setPositiveButton("Baixar atualização") { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, releaseNotesUrl.toUri()))
            }
            .show()
    }

    private fun showUpdateAvailableDialog(releaseNotesUrl: String, mode: String) {
        val title = if (mode == "highly_recommended") "Atualização recomendada" else "Nova versão disponível"
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage("Uma nova versão do app está disponível.")
            .setPositiveButton("Ver novidades") { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, releaseNotesUrl.toUri()))
            }
            .setNegativeButton("Agora não", null)
            .show()
    }

    private fun launchMain() {
        if (mainActivityLaunched) return
        mainActivityLaunched = true
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun restartApp() {
        val intent = Intent(this, SplashActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
    }
}
