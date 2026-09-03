package com.srivatsan.vibentra.auth

import android.content.Context
import android.content.Intent
import androidx.activity.compose.ManagedActivityResultLauncher
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task

/**
 * Google Sign-In Helper for Vibentra Native Kotlin UI
 * Sets up Google Sign-In Options and handles the Activity Result Launcher in Jetpack Compose.
 */
object GoogleAuthHelper {

    /**
     * Build GoogleSignInClient configured with Web Client ID and Email request
     */
    fun getGoogleSignInClient(context: Context, webClientId: String = ""): GoogleSignInClient {
        val gsoBuilder = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()

        // If webClientId is provided, request ID Token for Firebase Auth
        if (webClientId.isNotEmpty()) {
            gsoBuilder.requestIdToken(webClientId)
        }

        return GoogleSignIn.getClient(context, gsoBuilder.build())
    }

    /**
     * Parse the Activity Result and extract the Google ID Token
     */
    fun parseSignInResult(result: ActivityResult): Result<String> {
        return try {
            val task: Task<GoogleSignInAccount> = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            val account = task.getResult(ApiException::class.java)
            val idToken = account?.idToken
            if (!idToken.isNullOrEmpty()) {
                Result.success(idToken)
            } else {
                Result.failure(Exception("Could not retrieve Google ID Token."))
            }
        } catch (e: ApiException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

/**
 * Composable helper that creates and remembers a Google Sign-In Launcher
 */
@Composable
fun rememberGoogleSignInLauncher(
    onTokenReceived: (String) -> Unit,
    onError: (String) -> Unit,
    webClientId: String = ""
): () -> Unit {
    val context = LocalContext.current
    val googleSignInClient = remember { GoogleAuthHelper.getGoogleSignInClient(context, webClientId) }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val parsed = GoogleAuthHelper.parseSignInResult(result)
        parsed.onSuccess { token ->
            onTokenReceived(token)
        }.onFailure { exception ->
            onError(exception.localizedMessage ?: "Google Sign-In was cancelled or failed.")
        }
    }

    return {
        // Sign out any previous cached local session to show account picker
        googleSignInClient.signOut().addOnCompleteListener {
            launcher.launch(googleSignInClient.signInIntent)
        }
    }
}
