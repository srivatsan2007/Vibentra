package com.srivatsan.vibentra.auth

enum class AuthCardMode {
    LOGIN,
    REGISTER,
    FORGOT_PASSWORD
}

data class AuthUiState(
    val currentCard: AuthCardMode = AuthCardMode.LOGIN,
    // Login fields
    val loginEmail: String = "",
    val loginPassword: String = "",
    // Register fields
    val regUsername: String = "",
    val regEmail: String = "",
    val regPassword: String = "",
    val regConfirmPassword: String = "",
    // Forgot password field
    val resetEmail: String = "",
    // Status
    val isLoading: Boolean = false,
    val successMessage: String? = null,
    val errorMessage: String? = null,
    val isAuthenticated: Boolean = false
)
