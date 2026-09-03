package com.srivatsan.vibentra.auth

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srivatsan.vibentra.components.*
import com.srivatsan.vibentra.theme.*

/**
 * Vibentra Native Auth Screen
 * Replicates the liquid glass auth.html & auth.js UI and functionality.
 */
@Composable
fun AuthScreen(
    onNavigateToHome: () -> Unit,
    viewModel: AuthViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
    onGoogleSignInClick: (() -> Unit)? = null
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    // Built-in Google Sign-In Launcher
    val launchGoogleSignIn = rememberGoogleSignInLauncher(
        onTokenReceived = { idToken ->
            viewModel.signInWithGoogle(idToken)
        },
        onError = { errorMsg ->
            // Error handling matching auth.js
        }
    )

    // Auto navigate on successful authentication
    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated) {
            onNavigateToHome()
        }
    }

    LiquidGlassBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            // Notification Banner at Top
            InAppNotificationBanner(
                message = uiState.errorMessage ?: uiState.successMessage,
                isError = uiState.errorMessage != null,
                onDismiss = { viewModel.dismissNotification() },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
            )

            // Scrollable Auth Container
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp)
                    .navigationBarsPadding(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Spacer(modifier = Modifier.height(48.dp))

                // Brand Header Badge matching .brand-header
                BrandHeader()

                Spacer(modifier = Modifier.height(28.dp))

                // Smooth Animated Transitions between Login, Register, Forgot Password
                AnimatedContent(
                    targetState = uiState.currentCard,
                    transitionSpec = {
                        fadeIn() + slideInHorizontally { width -> if (targetState > initialState) width else -width } togetherWith
                                fadeOut() + slideOutHorizontally { width -> if (targetState > initialState) -width else width }
                    },
                    label = "auth_card_transition"
                ) { cardMode ->
                    when (cardMode) {
                        AuthCardMode.LOGIN -> {
                            LoginCard(
                                uiState = uiState,
                                viewModel = viewModel,
                                onGoogleClick = {
                                    onGoogleSignInClick?.invoke()
                                    launchGoogleSignIn()
                                },
                                onRegisterClick = { viewModel.switchToRegister() },
                                onForgotPasswordClick = { viewModel.switchToForgotPassword() }
                            )
                        }
                        AuthCardMode.REGISTER -> {
                            RegisterCard(
                                uiState = uiState,
                                viewModel = viewModel,
                                onLoginClick = { viewModel.switchToLogin() }
                            )
                        }
                        AuthCardMode.FORGOT_PASSWORD -> {
                            ForgotPasswordCard(
                                uiState = uiState,
                                viewModel = viewModel,
                                onBackClick = { viewModel.switchToLogin() }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(40.dp))
            }
        }
    }
}

/**
 * Brand Header with waveform icon and sanctuary tagline
 */
@Composable
private fun BrandHeader() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(54.dp)
                .clip(CircleShape)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(PrimaryCyan.copy(alpha = 0.4f), Color.Transparent)
                    )
                )
                .border(BorderStroke(1.5.dp, PrimaryCyan.copy(alpha = 0.6f)), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.GraphicEq,
                contentDescription = null,
                tint = SecondaryCyan,
                modifier = Modifier.size(28.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "VIBENTRA",
            fontSize = 26.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color.White,
            letterSpacing = 3.sp
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "Your Liquid Sound Sanctuary",
            fontSize = 13.sp,
            color = TextSecondary,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * 1. Login Card matching #loginCard in auth.html
 */
@Composable
private fun LoginCard(
    uiState: AuthUiState,
    viewModel: AuthViewModel,
    onGoogleClick: () -> Unit,
    onRegisterClick: () -> Unit,
    onForgotPasswordClick: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    GlassCardContainer {
        Text(
            text = "Welcome Back",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Sign in to resume your music stream",
            fontSize = 13.sp,
            color = TextSecondary,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        GlassTextField(
            value = uiState.loginEmail,
            onValueChange = { viewModel.onLoginEmailChange(it) },
            label = "Email Address",
            placeholder = "name@example.com",
            leadingIcon = Icons.Default.Email,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
        )

        Spacer(modifier = Modifier.height(14.dp))

        GlassTextField(
            value = uiState.loginPassword,
            onValueChange = { viewModel.onLoginPasswordChange(it) },
            label = "Password",
            placeholder = "Enter your password",
            leadingIcon = Icons.Default.Lock,
            isPassword = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = {
                focusManager.clearFocus()
                viewModel.loginWithEmail()
            })
        )

        Spacer(modifier = Modifier.height(20.dp))

        PrimaryGradientButton(
            text = "Login",
            onClick = {
                focusManager.clearFocus()
                viewModel.loginWithEmail()
            },
            icon = Icons.Default.Login,
            isLoading = uiState.isLoading
        )

        Spacer(modifier = Modifier.height(16.dp))

        // OR Divider
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Divider(modifier = Modifier.weight(1f), color = Color(0x33138086))
            Text(
                text = "OR",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextMuted,
                modifier = Modifier.padding(horizontal = 12.dp)
            )
            Divider(modifier = Modifier.weight(1f), color = Color(0x33138086))
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Google Sign-In
        GoogleSignInButton(onClick = onGoogleClick, isLoading = uiState.isLoading)

        Spacer(modifier = Modifier.height(20.dp))

        // Footer links
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center
        ) {
            Text(text = "Don't have an account? ", fontSize = 13.sp, color = TextSecondary)
            Text(
                text = "Register here",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = SecondaryCyan,
                modifier = Modifier.clickable { onRegisterClick() }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "Forgot Password?",
            fontSize = 13.sp,
            color = PrimaryCyan,
            fontWeight = FontWeight.Medium,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .clickable { onForgotPasswordClick() }
        )
    }
}

/**
 * 2. Register Card matching #registerCard in auth.html
 */
@Composable
private fun RegisterCard(
    uiState: AuthUiState,
    viewModel: AuthViewModel,
    onLoginClick: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    GlassCardContainer {
        Text(
            text = "Create Account",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Join Vibentra to discover & stream tunes",
            fontSize = 13.sp,
            color = TextSecondary,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        GlassTextField(
            value = uiState.regUsername,
            onValueChange = { viewModel.onRegUsernameChange(it) },
            label = "Username",
            placeholder = "Choose a username",
            leadingIcon = Icons.Default.Person,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
        )

        Spacer(modifier = Modifier.height(14.dp))

        GlassTextField(
            value = uiState.regEmail,
            onValueChange = { viewModel.onRegEmailChange(it) },
            label = "Email Address",
            placeholder = "name@example.com",
            leadingIcon = Icons.Default.Email,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
        )

        Spacer(modifier = Modifier.height(14.dp))

        GlassTextField(
            value = uiState.regPassword,
            onValueChange = { viewModel.onRegPasswordChange(it) },
            label = "Password",
            placeholder = "Create a password",
            leadingIcon = Icons.Default.Lock,
            isPassword = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
        )

        Spacer(modifier = Modifier.height(14.dp))

        GlassTextField(
            value = uiState.regConfirmPassword,
            onValueChange = { viewModel.onRegConfirmPasswordChange(it) },
            label = "Confirm Password",
            placeholder = "Confirm your password",
            leadingIcon = Icons.Default.Shield,
            isPassword = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = {
                focusManager.clearFocus()
                viewModel.registerUser()
            })
        )

        Spacer(modifier = Modifier.height(22.dp))

        PrimaryGradientButton(
            text = "Create Account",
            onClick = {
                focusManager.clearFocus()
                viewModel.registerUser()
            },
            icon = Icons.Default.PersonAdd,
            isLoading = uiState.isLoading
        )

        Spacer(modifier = Modifier.height(20.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center
        ) {
            Text(text = "Already have an account? ", fontSize = 13.sp, color = TextSecondary)
            Text(
                text = "Login here",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = SecondaryCyan,
                modifier = Modifier.clickable { onLoginClick() }
            )
        }
    }
}

/**
 * 3. Forgot Password Card matching #forgotPasswordCard in auth.html
 */
@Composable
private fun ForgotPasswordCard(
    uiState: AuthUiState,
    viewModel: AuthViewModel,
    onBackClick: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    GlassCardContainer {
        Text(
            text = "Reset Password",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "Enter your email to receive a password reset link.",
            fontSize = 13.sp,
            color = TextSecondary,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        GlassTextField(
            value = uiState.resetEmail,
            onValueChange = { viewModel.onResetEmailChange(it) },
            label = "Email Address",
            placeholder = "Enter your email",
            leadingIcon = Icons.Default.Email,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = {
                focusManager.clearFocus()
                viewModel.sendPasswordReset()
            })
        )

        Spacer(modifier = Modifier.height(22.dp))

        PrimaryGradientButton(
            text = "Send Reset Link",
            onClick = {
                focusManager.clearFocus()
                viewModel.sendPasswordReset()
            },
            icon = Icons.Default.Send,
            isLoading = uiState.isLoading
        )

        Spacer(modifier = Modifier.height(20.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onBackClick() },
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.ArrowBack,
                contentDescription = null,
                tint = SecondaryCyan,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "Back to Login",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = SecondaryCyan
            )
        }
    }
}

/**
 * Reusable Glass Panel Container matching .glass-panel.auth-card
 */
@Composable
private fun GlassCardContainer(
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(24.dp, RoundedCornerShape(20.dp), spotColor = PrimaryCyan)
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0xD90E3538)) // 85% opacity cards color
            .border(
                BorderStroke(1.dp, Brush.verticalGradient(listOf(Color(0x4D138086), Color(0x1A138086)))),
                shape = RoundedCornerShape(20.dp)
            )
            .padding(24.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            content()
        }
    }
}
