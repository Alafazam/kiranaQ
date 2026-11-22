package com.kiranaq.shell

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.app.Activity
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File

/** Full-screen WebView that shows the KiranaQ web UI from BuildConfig.SERVER_URL. */
class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var pendingWebPermission: PermissionRequest? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var captureUri: Uri? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { handleWebPermission(request) }
            }

            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams,
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                // The page asks for image/* with capture: open the camera app.
                val intent = if (params.isCaptureEnabled) cameraIntent() else params.createIntent()
                return try {
                    startActivityForResult(intent, REQ_FILE)
                    true
                } catch (e: Exception) {
                    fileCallback = null
                    callback.onReceiveValue(null)
                    false
                }
            }
        }

        requestRuntimePermissions()
        webView.loadUrl(BuildConfig.SERVER_URL)
    }

    // Full-size photo: the camera app writes into a cache file we share through FileProvider.
    private fun cameraIntent(): Intent {
        val dir = File(cacheDir, "captures").apply { mkdirs() }
        val file = File(dir, "shelf-${System.currentTimeMillis()}.jpg")
        captureUri = FileProvider.getUriForFile(this, "$packageName.files", file)
        return Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            .putExtra(MediaStore.EXTRA_OUTPUT, captureUri)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    }

    private fun requestRuntimePermissions() {
        val needed = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            .filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (needed.isNotEmpty()) requestPermissions(needed.toTypedArray(), REQ_PERMS)
    }

    private fun handleWebPermission(request: PermissionRequest) {
        val grantable = request.resources.filter {
            (it == PermissionRequest.RESOURCE_VIDEO_CAPTURE && hasPerm(Manifest.permission.CAMERA)) ||
                (it == PermissionRequest.RESOURCE_AUDIO_CAPTURE && hasPerm(Manifest.permission.RECORD_AUDIO))
        }
        if (grantable.isNotEmpty()) {
            request.grant(grantable.toTypedArray())
        } else {
            pendingWebPermission = request
            requestRuntimePermissions()
        }
    }

    private fun hasPerm(p: String) = checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        pendingWebPermission?.let { handleWebPermissionOrDeny(it) }
        pendingWebPermission = null
    }

    private fun handleWebPermissionOrDeny(request: PermissionRequest) {
        val grantable = request.resources.filter {
            (it == PermissionRequest.RESOURCE_VIDEO_CAPTURE && hasPerm(Manifest.permission.CAMERA)) ||
                (it == PermissionRequest.RESOURCE_AUDIO_CAPTURE && hasPerm(Manifest.permission.RECORD_AUDIO))
        }
        if (grantable.isNotEmpty()) request.grant(grantable.toTypedArray()) else request.deny()
    }

    @Deprecated("Simple shell: uses the classic result API")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_FILE) return
        val uris = if (captureUri != null) {
            if (resultCode == RESULT_OK) arrayOf(captureUri!!) else null
        } else {
            WebChromeClient.FileChooserParams.parseResult(resultCode, data)
        }
        captureUri = null
        fileCallback?.onReceiveValue(uris)
        fileCallback = null
    }

    @Deprecated("Simple shell: back goes through WebView history")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    private companion object {
        const val REQ_PERMS = 1
        const val REQ_FILE = 2
    }
}
