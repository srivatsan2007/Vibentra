package com.srivatsan.vibentra.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * AuthViewModel matching the exact business logic and error handling
 * of frontend/js/auth.js
 */
class AuthViewModel(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        // Check if already authenticated
        if (auth.currentUser != null) {
            _uiState.update { it.copy(isAuthenticated = true) }
        }
    }

    // Card Navigation
    fun switchToLogin() {
        _uiState.update { it.copy(currentCard = AuthCardMode.LOGIN, errorMessage = null) }
    }

    fun switchToRegister() {
        _uiState.update { it.copy(currentCard = AuthCardMode.REGISTER, errorMessage = null) }
    }

    fun switchToForgotPassword() {
        _uiState.update { it.copy(currentCard = AuthCardMode.FORGOT_PASSWORD, errorMessage = null) }
    }

    // Form Field Updates
    fun onLoginEmailChange(value: String) = _uiState.update { it.copy(loginEmail = value) }
    fun onLoginPasswordChange(value: String) = _uiState.update { it.copy(loginPassword = value) }
    fun onRegUsernameChange(value: String) = _uiState.update { it.copy(regUsername = value) }
    fun onRegEmailChange(value: String) = _uiState.update { it.copy(regEmail = value) }
    fun onRegPasswordChange(value: String) = _uiState.update { it.copy(regPassword = value) }
    fun onRegConfirmPasswordChange(value: String) = _uiState.update { it.copy(regConfirmPassword = value) }
    fun onResetEmailChange(value: String) = _uiState.update { it.copy(resetEmail = value) }

    fun dismissNotification() {
        _uiState.update { it.copy(successMessage = null, errorMessage = null) }
    }

    // 1. Login with Email & Password
    fun loginWithEmail() {
        val email = _uiState.value.loginEmail.trim()
        val password = _uiState.value.loginPassword

        if (email.isEmpty() || password.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Please enter both email and password.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                auth.signInWithEmailAndPassword(email, password).await()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        successMessage = "Login successful!",
                        isAuthenticated = true
                    )
                }
            } catch (e: Exception) {
                val message = when (e) {
                    is FirebaseAuthInvalidCredentialsException -> "Invalid email or password."
                    else -> e.localizedMessage ?: "Login failed. Please try again."
                }
                _uiState.update { it.copy(isLoading = false, errorMessage = message) }
            }
        }
    }

    // 2. Register New User
    fun registerUser() {
        val state = _uiState.value
        val username = state.regUsername.trim()
        val email = state.regEmail.trim()
        val password = state.regPassword
        val confirmPassword = state.regConfirmPassword

        if (username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Please fill in all fields.") }
            return
        }

        if (password != confirmPassword) {
            _uiState.update { it.copy(errorMessage = "Passwords do not match!") }
            return
        }

        if (password.length < 6) {
            _uiState.update { it.copy(errorMessage = "Password should be at least 6 characters.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val result = auth.createUserWithEmailAndPassword(email, password).await()
                val user = result.user

                if (user != null) {
                    // Update Auth Profile with username
                    val profileUpdates = UserProfileChangeRequest.Builder()
                        .setDisplayName(username)
                        .build()
                    user.updateProfile(profileUpdates).await()

                    // Save user profile to Firestore (matching auth.js handleSuccessfulUser)
                    saveUserToFirestore(user, username)
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        successMessage = "Registration successful!",
                        isAuthenticated = true
                    )
                }
            } catch (e: Exception) {
                val message = when (e) {
                    is FirebaseAuthUserCollisionException -> "Email is already registered."
                    is FirebaseAuthWeakPasswordException -> "Password should be at least 6 characters."
                    else -> e.localizedMessage ?: "Registration failed."
                }
                _uiState.update { it.copy(isLoading = false, errorMessage = message) }
            }
        }
    }

    // 3. Reset Password
    fun sendPasswordReset() {
        val email = _uiState.value.resetEmail.trim()
        if (email.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Please enter your email address.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                auth.sendPasswordResetEmail(email).await()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        resetEmail = "",
                        successMessage = "Password reset link sent to your email!",
                        currentCard = AuthCardMode.LOGIN
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.localizedMessage ?: "Error sending reset email.")
                }
            }
        }
    }

    // 4. Google Sign-In (Credential Handler)
    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val credential = com.google.firebase.auth.GoogleAuthProvider.getCredential(idToken, null)
                val authResult = auth.signInWithCredential(credential).await()
                val user = authResult.user

                if (user != null) {
                    saveUserToFirestore(user, user.displayName)
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        successMessage = "Google Sign-in successful!",
                        isAuthenticated = true
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = e.localizedMessage ?: "Google Sign-in failed."
                    )
                }
            }
        }
    }

    // 5. Save User to Firestore (users collection matching auth.js handleSuccessfulUser)
    private suspend fun saveUserToFirestore(user: FirebaseUser, displayName: String?) {
        try {
            val userMap = hashMapOf(
                "uid" to user.uid,
                "username" to (displayName ?: user.displayName ?: "Google User"),
                "email" to (user.email ?: ""),
                "profileImage" to (user.photoUrl?.toString() ?: ""),
                "bio" to "",
                "createdAt" to System.currentTimeMillis().toString()
            )
            db.collection("users").document(user.uid)
                .set(userMap, SetOptions.merge())
                .await()
        } catch (ignored: Exception) {
            // Firestore write warning non-fatal
        }
    }
}
