import { createSignal, createEffect, onCleanup, type Component } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { Navigate } from "@solidjs/router";
import { apiPost, setToken, getRole, getToken } from "../api";
import { requestCookieConsent } from "../components/CookieConsent";

const AuthPage: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();
  if (token) {
    return <Navigate href={getRole() === "admin" ? "/admin" : "/dashboard"} />;
  }

  const sessionExpired = location.query.reason === "timeout";
  const [dismissed, setDismissed] = createSignal(false);
  const [username, setUsername] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
  const [isRegistering, setIsRegistering] = createSignal(false);
  const [isForgotPassword, setIsForgotPassword] = createSignal(false);
  const [isResettingPassword, setIsResettingPassword] = createSignal(false);
  const [resetUserId, setResetUserId] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmNewPassword, setConfirmNewPassword] = createSignal("");
  const [resetOtp, setResetOtp] = createSignal(["", "", "", "", "", ""]);
  const [resetDone, setResetDone] = createSignal(false);
  const [resetOtpRefs, setResetOtpRefs] = createSignal<HTMLInputElement[]>([]);
  const [animating, setAnimating] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [isMounted, setIsMounted] = createSignal(false);
  const [placeholderText, setPlaceholderText] = createSignal("");

  // 2FA verification state
  const [pendingVerification, setPendingVerification] = createSignal(false);
  const [pendingUserId, setPendingUserId] = createSignal("");
  const [pendingEmail, setPendingEmail] = createSignal("");
  const [otp, setOtp] = createSignal(["", "", "", "", "", ""]);
  const otpRefs: HTMLInputElement[] = [];

  createEffect(() => {
    setIsMounted(true);

    if (isRegistering()) {
      setPlaceholderText("e.g. operator01");
      return;
    }

    const word = "username";
    let index = 0;
    let phase: "typing" | "paused" | "deleting" = "typing";
    let pauseTick = 0;

    const interval = setInterval(() => {
      if (phase === "typing") {
        index++;
        setPlaceholderText(word.slice(0, index) + "|");
        if (index === word.length) {
          phase = "paused";
          pauseTick = 0;
        }
      } else if (phase === "paused") {
        pauseTick++;
        if (pauseTick % 4 === 0) {
          setPlaceholderText(
            pauseTick % 8 === 0 ? word : word + "|"
          );
        }
        if (pauseTick > 24) {
          phase = "deleting";
        }
      } else if (phase === "deleting") {
        index--;
        setPlaceholderText(word.slice(0, index) + "|");
        if (index === 0) {
          phase = "typing";
        }
      }
    }, 120);

    onCleanup(() => clearInterval(interval));
  });

  const handleOtpInput = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp()];
    newOtp[index] = value;
    setOtp(newOtp);
    if (error()) setError("");
    if (value && index < 5) {
      otpRefs[index + 1]?.focus();
    }
    if (!value && index > 0) {
      otpRefs[index - 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === "Backspace" && !otp()[index] && index > 0) {
      otpRefs[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text") || "";
    const digits = text.replace(/\D/g, "").slice(0, 6).split("");
    const newOtp = ["", "", "", "", "", ""];
    digits.forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    const nextIndex = Math.min(digits.length, 5);
    otpRefs[nextIndex]?.focus();
  };

  const handleResetOtpInput = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...resetOtp()];
    next[index] = value;
    setResetOtp(next);
    if (error()) setError("");
    const refs = resetOtpRefs();
    if (value && index < 5) refs[index + 1]?.focus();
    if (!value && index > 0) refs[index - 1]?.focus();
  };

  const handleResetOtpKeyDown = (index: number, e: KeyboardEvent) => {
    const refs = resetOtpRefs();
    if (e.key === "Backspace" && !resetOtp()[index] && index > 0) {
      refs[index - 1]?.focus();
    }
  };

  const handleResetOtpPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text") || "";
    const digits = text.replace(/\D/g, "").slice(0, 6).split("");
    const next = ["", "", "", "", "", ""];
    digits.forEach((d, i) => { next[i] = d; });
    setResetOtp(next);
    resetOtpRefs()[Math.min(digits.length, 5)]?.focus();
  };

  const handleForgotPassword = async (e: Event) => {
    e.preventDefault();
    setError("");

    if (isResettingPassword()) {
      // Stage 2: code + new password -> POST /auth/reset-password
      const code = resetOtp().join("");
      if (code.length !== 6) {
        setError("Enter the complete 6-digit code.");
        return;
      }
      if (newPassword().length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (newPassword() !== confirmNewPassword()) {
        setError("Passwords do not match.");
        return;
      }

      setIsLoading(true);
      const result = await apiPost<{ message: string }>("/auth/reset-password", {
        userId: resetUserId(),
        code,
        password: newPassword(),
      });
      setIsLoading(false);

      if (result.success) {
        setResetDone(true);
        setError("");
      } else {
        setError(result.error || "Reset failed.");
      }
      return;
    }

    // Stage 1: email -> POST /auth/forgot-password
    const trimmedEmail = email().trim();
    if (!trimmedEmail) {
      setError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsLoading(true);
    const result = await apiPost<{ message: string; userId?: string }>("/auth/forgot-password", {
      email: trimmedEmail,
    });
    setIsLoading(false);

    if (result.success) {
      setResetUserId(result.data?.userId || "");
      setIsResettingPassword(true);
      setResetOtp(["", "", "", "", "", ""]);
      setError("");
    } else {
      setError(result.error || "Request failed.");
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    if (pendingVerification()) {
      const code = otp().join("");
      if (code.length !== 6) {
        setError("Enter the complete 6-digit code.");
        return;
      }
      requestCookieConsent();

      setIsLoading(true);
      const result = await apiPost<{ token: string; username: string; role: string; cookiePreferences?: Record<string, boolean> }>("/auth/verify", {
        userId: pendingUserId(),
        code,
      });
      setIsLoading(false);
      if (result.success && result.data) {
        setToken(result.data.token, result.data.username, result.data.role);
        if (result.data.cookiePreferences) {
          localStorage.setItem("octane_cookie_consent", JSON.stringify(result.data.cookiePreferences));
        }
        navigate(result.data.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      } else {
        setError(result.error || "Verification failed.");
      }
      return;
    }

    const trimmedUsername = username().trim();
    const trimmedEmail = email().trim();

    if (!trimmedUsername || !password()) {
      setError("All fields are required.");
      return;
    }

    if (isRegistering()) {
      if (!trimmedEmail) {
        setError("Email address is required.");
        return;
      }
      if (trimmedUsername.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        setError("Username must only contain letters, numbers, and underscores.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError("Enter a valid email address.");
        return;
      }
      if (password() !== confirmPassword()) {
        setError("Passwords do not match.");
        return;
      }
    }

    if (password().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    const endpoint = isRegistering() ? "/auth/register" : "/auth/signin";
    const body: Record<string, unknown> = { username: trimmedUsername, password: password() };
    if (isRegistering()) body.email = trimmedEmail;

    const result = await apiPost<{ token: string; username: string; role: string; cookiePreferences?: Record<string, boolean>; needsVerification?: boolean; userId?: string; email?: string }>(endpoint, body);

    setIsLoading(false);

    if (result.success && result.data) {
      if (result.data.needsVerification) {
        setPendingUserId(result.data.userId || "");
        setPendingEmail(result.data.email || "");
        setPendingVerification(true);
        setOtp(["", "", "", "", "", ""]);
      } else if (result.data.token) {
        setToken(result.data.token, result.data.username, result.data.role);
        if (result.data.cookiePreferences) {
          localStorage.setItem("octane_cookie_consent", JSON.stringify(result.data.cookiePreferences));
        }
        navigate(result.data.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }
    } else {
      setError(result.error || "Operation failed.");
    }
  };

  const toggleMode = () => {
    if (animating()) return;
    setPendingVerification(false);
    setIsForgotPassword(false);
    setIsResettingPassword(false);
    setResetDone(false);
    setAnimating(true);
    setError("");
    setTimeout(() => {
      setIsRegistering((prev) => !prev);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setTimeout(() => setAnimating(false), 50);
    }, 200);
  };

  const toggleForgotPassword = () => {
    if (animating()) return;
    setPendingVerification(false);
    setAnimating(true);
    setError("");
    setTimeout(() => {
      setIsForgotPassword((prev) => !prev);
      setIsResettingPassword(false);
      setResetDone(false);
      setEmail("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetOtp(["", "", "", "", "", ""]);
      setResetOtpRefs([]);
      setTimeout(() => setAnimating(false), 50);
    }, 200);
  };

  return (
    <div class="min-h-dvh w-full flex items-start sm:items-center justify-center px-container-margin py-2 sm:py-lg md:py-0 bg-black relative">
      {/* Atmospheric Background - Clinical Grid */}
      <div class="absolute inset-0 z-0 opacity-[0.07] pointer-events-none" aria-hidden="true">
        <div
          class="absolute inset-0"
          style={{
            "background-image": "radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)",
            "background-size": "32px 32px",
          }}
        ></div>
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black"></div>
      </div>

      {/* Auth Card */}
      <div
        classList={{
          "relative w-full max-w-[480px] min-w-0 p-sm sm:p-lg bg-surface-card border border-hairline flex flex-col transition-all duration-700 ease-out z-10 my-auto -my-1": true,
          "opacity-0 translate-y-8": !isMounted(),
          "opacity-100 translate-y-0": isMounted(),
        }}
      >
        {/* Session Expired Banner */}
        {sessionExpired && !dismissed() && (
          <div class="mb-md sm:mb-lg p-md border-l-2 border-ice-blue bg-surface-soft flex flex-col gap-xs sm:gap-sm">
            <div class="flex items-center gap-sm">
              <span class="material-symbols-outlined text-ice-blue text-lg">schedule</span>
              <span class="font-label-md text-label-md text-ice-blue uppercase tracking-[2px]">
                Session Expired
              </span>
            </div>
            <p class="font-body-md text-body-md text-text-body leading-relaxed">
              Your session ended after a period of inactivity. Sign in again to continue.
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              class="self-start font-label-sm text-label-sm text-text-body uppercase tracking-[2px] underline underline-offset-4 decoration-hairline hover:text-primary transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            if (pendingVerification()) {
              setPendingVerification(false);
              setError("");
            } else if (isForgotPassword()) {
              toggleForgotPassword();
            } else {
              navigate("/", { replace: true });
            }
          }}
          class="group self-start -ml-2 mb-md flex items-center gap-xs text-text-muted hover:text-primary transition-colors"
          aria-label={
            pendingVerification() || isForgotPassword() ? "Go back" : "Back to home"
          }
        >
          <span class="material-symbols-outlined transition-transform group-hover:-translate-x-1" style="font-size: 20px;">arrow_back</span>
          <span class="font-label-sm text-label-sm uppercase tracking-[2px]">
            {pendingVerification() || isForgotPassword() ? "Back" : "Back to Home"}
          </span>
        </button>

        {isForgotPassword() ? (
          <>
            <div class="mb-xs sm:mb-md text-center w-full">
              <h1 class="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-primary uppercase tracking-[3px] mb-xs sm:mb-sm">
                {resetDone() ? "Done" : isResettingPassword() ? "Set New Password" : "Reset Password"}
              </h1>
              <p class="font-label-sm sm:font-body-md sm:text-body-md text-label-sm sm:text-body-md text-text-body leading-relaxed mx-auto max-w-[44ch]">
                {resetDone()
                  ? "Your password is updated. Sign in with it below."
                  : isResettingPassword()
                    ? "Enter the 6-digit code we emailed you, then choose a new password."
                    : "Enter the email on your account and we will send you a reset code."}
              </p>
            </div>

            {error() && (
              <div
                class="mb-md px-md py-sm border-l-2 border-error bg-error-container/40 flex items-start gap-sm"
                role="alert"
                aria-live="polite"
              >
                <span class="material-symbols-outlined text-error text-[18px] shrink-0 mt-[1px]">error</span>
                <p class="font-body-md text-body-md text-error leading-relaxed">{error()}</p>
              </div>
            )}

            {resetDone() ? (
              <button
                type="button"
                onClick={toggleForgotPassword}
                class="w-full h-12 bg-primary text-background font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:opacity-90 transition-opacity"
              >
                Back to Sign In
              </button>
            ) : (
              <form class="flex flex-col gap-sm sm:gap-lg w-full" onSubmit={handleForgotPassword} novalidate>
                {!isResettingPassword() ? (
                  <div class="flex flex-col gap-xs w-full group">
                    <label for="forgot-email" class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email()}
                      onInput={(e) => { setEmail(e.currentTarget.value); if (error()) setError(""); }}
                      placeholder="e.g. username@email.com"
                      autocomplete="email"
                      class="w-full bg-surface-soft border border-hairline-strong py-sm sm:py-md px-md text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted scroll-mt-md"
                    />
                  </div>
                ) : (
                  <>
                    <div class="flex flex-col gap-xs w-full">
                      <span class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px]">
                        Reset Code
                      </span>
                      <div class="flex gap-xs sm:gap-sm md:gap-md" onPaste={handleResetOtpPaste}>
                        {resetOtp().map((digit, index) => (
                          <input
                            ref={(el) => {
                              const refs = resetOtpRefs();
                              refs[index] = el;
                              setResetOtpRefs(refs);
                            }}
                            type="text"
                            inputmode="numeric"
                            maxLength={1}
                            value={digit}
                            onInput={(e) => handleResetOtpInput(index, e.currentTarget.value)}
                            onKeyDown={(e) => handleResetOtpKeyDown(index, e)}
                            autocomplete="one-time-code"
                            aria-label={`Reset code digit ${index + 1} of 6`}
                            class="w-9 h-12 sm:w-10 sm:h-12 md:w-12 md:h-14 bg-surface-soft border border-hairline-strong text-center text-primary font-data-lg text-data-lg outline-none focus:border-primary focus:bg-surface-container transition-colors"
                          />
                        ))}
                      </div>
                    </div>

                    <div class="flex flex-col gap-xs w-full group">
                      <label for="new-password" class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                        New Password
                      </label>
                      <div class="relative w-full">
                        <input
                          id="new-password"
                          type={showPassword() ? "text" : "password"}
                          value={newPassword()}
                          onInput={(e) => { setNewPassword(e.currentTarget.value); if (error()) setError(""); }}
                          placeholder="At least 6 characters"
                          autocomplete="new-password"
                          class="w-full bg-surface-soft border border-hairline-strong py-sm sm:py-md px-md pr-14 text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted scroll-mt-md"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword())}
                          class="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-center text-text-muted hover:text-primary transition-colors"
                          aria-label={showPassword() ? "Hide password" : "Show password"}
                        >
                          <span class="material-symbols-outlined text-[20px]">
                            {showPassword() ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div class="flex flex-col gap-xs w-full group">
                      <label for="confirm-new-password" class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                        Confirm
                      </label>
                      <div class="relative w-full">
                        <input
                          id="confirm-new-password"
                          type={showConfirmPassword() ? "text" : "password"}
                          value={confirmNewPassword()}
                          onInput={(e) => { setConfirmNewPassword(e.currentTarget.value); if (error()) setError(""); }}
                          placeholder="Repeat password"
                          autocomplete="new-password"
                          class="w-full bg-surface-soft border border-hairline-strong py-sm sm:py-md px-md pr-14 text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted scroll-mt-md"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword())}
                          class="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-center text-text-muted hover:text-primary transition-colors"
                          aria-label={showConfirmPassword() ? "Hide password" : "Show password"}
                        >
                          <span class="material-symbols-outlined text-[20px]">
                            {showConfirmPassword() ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div class="flex flex-col gap-sm mt-sm sm:mt-md w-full">
                  <button
                    type="submit"
                    disabled={isLoading()}
                    classList={{
                      "w-full h-12 font-label-md text-label-md uppercase tracking-[2.5px] rounded-full transition-all duration-300 flex items-center justify-center": true,
                      "bg-primary text-background hover:opacity-90": !isLoading(),
                      "bg-surface-container text-text-muted cursor-not-allowed": isLoading(),
                    }}
                  >
                    {isLoading() ? (
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined animate-spin text-sm">sync</span>
                        <span>Sending...</span>
                      </div>
                    ) : isResettingPassword() ? (
                      "Update Password"
                    ) : (
                      "Send Reset Code"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={toggleForgotPassword}
                    class="w-full h-12 border border-hairline-strong text-primary font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:bg-hairline transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </>
        ) : pendingVerification() ? (
          <>
            {/* Verification Header */}
            <div class="mb-md sm:mb-lg text-center w-full">
              <h1 class="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-primary uppercase tracking-[3px] mb-xs sm:mb-sm">Verify Identity</h1>
              <p class="font-body-md text-body-md text-text-body">
                A 6-digit code was sent to <span class="text-ice-blue break-all">{pendingEmail()}</span>
              </p>
            </div>

            {/* Error Message */}
            {error() && (
              <div
                class="mb-md px-md py-sm border-l-2 border-error bg-error-container/40 flex items-start gap-sm"
                role="alert"
                aria-live="polite"
              >
                <span class="material-symbols-outlined text-error text-[18px] shrink-0 mt-[1px]">error</span>
                <p class="font-body-md text-body-md text-error leading-relaxed">{error()}</p>
              </div>
            )}

            {/* OTP Input */}
            <form class="flex flex-col items-center gap-md sm:gap-lg w-full" onSubmit={handleSubmit}>
              <div class="flex gap-xs sm:gap-sm md:gap-md justify-center w-full" onPaste={handleOtpPaste}>
                {otp().map((digit, index) => (
                  <input
                    ref={(el) => { otpRefs[index] = el; }}
                    type="text"
                    inputmode="numeric"
                    maxLength={1}
                    value={digit}
                    onInput={(e) => handleOtpInput(index, e.currentTarget.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    autocomplete="one-time-code"
                    aria-label={`Digit ${index + 1} of 6`}
                    class="w-9 h-12 sm:w-10 sm:h-12 md:w-12 md:h-14 bg-surface-soft border border-hairline-strong text-center text-primary font-data-lg text-data-lg outline-none focus:border-primary focus:bg-surface-container transition-colors"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading()}
                classList={{
                  "w-full h-12 font-label-md text-label-md uppercase tracking-[2.5px] rounded-full transition-all duration-300 flex items-center justify-center": true,
                  "bg-primary text-background hover:opacity-90": !isLoading(),
                  "bg-surface-container text-text-muted cursor-not-allowed": isLoading(),
                }}
              >
                {isLoading() ? (
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify"
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Header */}
            <div class="mb-xs sm:mb-md text-center w-full">
              <h1 class="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-primary uppercase tracking-[3px] mb-xs sm:mb-sm">
                {isRegistering() ? "Register" : "Sign In"}
              </h1>
              <p class="font-label-sm sm:font-body-md sm:text-body-md text-label-sm sm:text-body-md text-text-body leading-relaxed mx-auto max-w-[44ch]">
                {isRegistering()
                  ? "Create an account to save stations."
                  : "Sign in to open your watchlist."}
              </p>
            </div>

            {/* Error Message */}
            {error() && (
              <div
                class="mb-md px-md py-sm border-l-2 border-error bg-error-container/40 flex items-start gap-sm"
                role="alert"
                aria-live="polite"
              >
                <span class="material-symbols-outlined text-error text-[18px] shrink-0 mt-[1px]">error</span>
                <p class="font-body-md text-body-md text-error leading-relaxed">{error()}</p>
              </div>
            )}

            {/* Form - noValidate so our own styled errors show instead of the
                browser's native bubble, which blocks submit before handleSubmit runs. */}
            <form class="flex flex-col gap-sm sm:gap-lg w-full" onSubmit={handleSubmit} novalidate>
              <div
                classList={{
                  "flex flex-col gap-sm sm:gap-lg w-full transition-all duration-300 ease-out": true,
                  "opacity-0 translate-y-2": animating(),
                  "opacity-100 translate-y-0": !animating(),
                }}
              >
              <div class="flex flex-col gap-xs w-full group">
                <label for="auth-username" class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                  Username
                </label>
                <div class="relative w-full">
                  <input
                    id="auth-username"
                    type="text"
                    value={username()}
                    onInput={(e) => { setUsername(e.currentTarget.value); if (error()) setError(""); }}
                    placeholder={placeholderText()}
                    autocomplete="username"
                    class="w-full bg-surface-soft border border-hairline-strong py-sm sm:py-md px-md text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted scroll-mt-md"
                  />
                </div>
              </div>

              {isRegistering() && (
                <div class="flex flex-col gap-xs w-full group">
                  <label for="auth-email" class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                    Email Address
                  </label>
                  <div class="relative w-full">
                    <input
                      id="auth-email"
                      type="email"
                      value={email()}
                      onInput={(e) => { setEmail(e.currentTarget.value); if (error()) setError(""); }}
                      placeholder="e.g. username@email.com"
                      autocomplete="email"
                      class="w-full bg-surface-soft border border-hairline-strong py-sm sm:py-md px-md text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted scroll-mt-md"
                    />
                  </div>
                </div>
              )}

                <div class="flex flex-col gap-xs w-full group">
                  <div class="flex justify-between items-center">
                    <label for="auth-password" class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                      Password
                    </label>
                    {!isRegistering() && (
                      <button
                        type="button"
                        onClick={toggleForgotPassword}
                        class="font-label-sm text-label-sm text-text-muted uppercase tracking-[1px] hover:text-primary transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div class="relative w-full">
                  <input
                    id="auth-password"
                    type={showPassword() ? "text" : "password"}
                    value={password()}
                    onInput={(e) => { setPassword(e.currentTarget.value); if (error()) setError(""); }}
                    placeholder={isRegistering() ? "At least 6 characters" : "••••••••"}
                    autocomplete={isRegistering() ? "new-password" : "current-password"}
                    class="w-full bg-surface-soft border border-hairline-strong py-sm sm:py-md px-md pr-14 text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted scroll-mt-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword())}
                    class="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-center text-text-muted hover:text-primary transition-colors"
                    aria-label={showPassword() ? "Hide password" : "Show password"}
                  >
                    <span class="material-symbols-outlined text-[20px]">
                      {showPassword() ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {isRegistering() && (
                <div class="flex flex-col gap-xs w-full group">
                  <label for="auth-confirm" class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                    Confirm
                  </label>
                  <div class="relative w-full">
                    <input
                      id="auth-confirm"
                      type={showConfirmPassword() ? "text" : "password"}
                      value={confirmPassword()}
                      onInput={(e) => { setConfirmPassword(e.currentTarget.value); if (error()) setError(""); }}
                      placeholder="Repeat password"
                      autocomplete="new-password"
                      class="w-full bg-surface-soft border border-hairline-strong py-sm sm:py-md px-md pr-14 text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted scroll-mt-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword())}
                      class="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-center text-text-muted hover:text-primary transition-colors"
                      aria-label={showConfirmPassword() ? "Hide password" : "Show password"}
                    >
                      <span class="material-symbols-outlined text-[20px]">
                        {showConfirmPassword() ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
              </div>

              <div class="flex flex-col gap-sm mt-sm sm:mt-md w-full">
                <button
                  type="submit"
                  disabled={isLoading()}
                  classList={{
                    "w-full h-12 font-label-md text-label-md uppercase tracking-[2.5px] rounded-full transition-all duration-300 flex items-center justify-center": true,
                    "bg-primary text-background hover:opacity-90": !isLoading(),
                    "bg-surface-container text-text-muted cursor-not-allowed": isLoading(),
                  }}
                >
                  {isLoading() ? (
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-sm">sync</span>
                      <span>Processing...</span>
                    </div>
                  ) : isRegistering() ? (
                    "Register"
                  ) : (
                    "Log In"
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleMode}
                  class="w-full h-12 border border-hairline-strong text-primary font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:bg-hairline transition-colors"
                >
                  {isRegistering() ? "Back to Log In" : "Sign Up"}
                </button>
                <p class="font-label-sm text-label-sm text-text-muted leading-relaxed text-center">
                  By signing in you agree to our{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/terms")}
                    class="text-text-body underline underline-offset-4 decoration-hairline hover:decoration-white transition-colors"
                  >
                    Terms of Use
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/privacy")}
                    class="text-text-body underline underline-offset-4 decoration-hairline hover:decoration-white transition-colors"
                  >
                    Privacy Policy
                  </button>.
                </p>
              </div>
            </form>

            {/* Footer */}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;


// what