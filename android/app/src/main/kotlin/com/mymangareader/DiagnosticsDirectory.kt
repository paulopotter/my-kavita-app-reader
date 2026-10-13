package com.mymangareader

import android.content.Context
import java.io.File

// Where DiagnosticLog keeps its files. The app-specific EXTERNAL files dir when there is one, so the
// log can be pulled with a plain `adb pull` on any build (no run-as, which only works on debuggable
// builds); the private files dir otherwise.
fun diagnosticsDirectory(context: Context): File = context.getExternalFilesDir("diagnostics") ?: File(context.filesDir, "diagnostics")

// True when [diagnosticsDirectory] fell back to the private dir.
fun diagnosticsAreInternal(context: Context): Boolean = context.getExternalFilesDir("diagnostics") == null
