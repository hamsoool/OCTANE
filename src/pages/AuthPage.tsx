import { createSignal, createEffect, onCleanup, type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Navigate } from "@solidjs/router";
import { apiPost, setToken, getRole, getToken } from "../api";

const AuthPage: Component = () => {
  const navigate = useNavigate();
  const token = getToken();
  if (token) {
    return <Navigate href={getRole() === "admin" ? "/admin" : "/dashboard"} />;
  }
  const [username, setUsername] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
  const [isRegistering, setIsRegistering] = createSignal(false);
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

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    if (pendingVerification()) {
      const code = otp().join("");
      if (code.length !== 6) {
        setError("Enter the complete 6-digit code.");
        return;
      }
      setIsLoading(true);
      const result = await apiPost<{ token: string; username: string }>("/auth/verify", {
        userId: pendingUserId(),
        code,
      });
      setIsLoading(false);
      if (result.success && result.data) {
        setToken(result.data.token);
        navigate(getRole() === "admin" ? "/admin" : "/dashboard", { replace: true });
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

    const result = await apiPost<{ token: string; username: string; needsVerification?: boolean; userId?: string; email?: string }>(endpoint, body);

    setIsLoading(false);

    if (result.success && result.data) {
      if (result.data.needsVerification) {
        setPendingUserId(result.data.userId || "");
        setPendingEmail(result.data.email || "");
        setPendingVerification(true);
        setOtp(["", "", "", "", "", ""]);
      } else if (result.data.token) {
        setToken(result.data.token);
        navigate(getRole() === "admin" ? "/admin" : "/dashboard", { replace: true });
      }
    } else {
      setError(result.error || "Operation failed.");
    }
  };

  const toggleMode = () => {
    if (animating()) return;
    setPendingVerification(false);
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

  return (
    <div class="min-h-screen w-full flex items-center justify-center px-container-margin bg-black overflow-hidden relative">
      {/* Atmospheric Background - Clinical Grid */}
      <div class="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div
          class="absolute inset-0"
          style={{
            "background-image": "radial-gradient(circle at 2px 2px, #262626 1px, transparent 0)",
            "background-size": "32px 32px",
          }}
        ></div>
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black"></div>
      </div>

      {/* Auth Card */}
      <div
        classList={{
          "relative w-full max-w-[512px] min-w-[320px] p-lg bg-surface-card border border-hairline flex flex-col transition-all duration-700 ease-out z-10": true,
          "opacity-0 translate-y-8": !isMounted(),
          "opacity-100 translate-y-0": isMounted(),
        }}
      >
        {/* Back Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (pendingVerification()) {
              setPendingVerification(false);
              setError("");
            } else {
              navigate("/", { replace: true });
            }
          }}
          class="absolute top-lg left-lg text-primary hover:text-white transition-colors flex items-center justify-center hover:bg-white/5 z-20"
          title={pendingVerification() ? "Back" : "Go Back"}
          style="width: 28px; height: 28px; border-radius: 9999px;"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
        </button>

        {pendingVerification() ? (
          <>
            {/* Verification Header */}
            <div class="mb-xl text-center w-full">
              <h1 class="font-headline-lg text-headline-lg text-primary uppercase tracking-[4px] mb-sm">Verify Identity</h1>
              <p class="font-body-md text-body-md text-text-muted">
                A 6-digit code was sent to <span class="text-ice-blue">{pendingEmail()}</span>
              </p>
            </div>

            {/* Error Message */}
            {error() && (
              <div class="mb-md px-md py-sm border border-ice-blue/30 bg-ice-blue/5 text-center">
                <p class="font-body-md text-label-sm text-ice-blue uppercase">{error()}</p>
              </div>
            )}

            {/* OTP Input */}
            <form class="flex flex-col items-center gap-lg w-full" onSubmit={handleSubmit}>
              <div class="flex gap-sm md:gap-md justify-center w-full" onPaste={handleOtpPaste}>
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
                    class="w-10 h-12 md:w-12 md:h-14 bg-transparent border border-hairline-strong text-center text-primary font-data-lg text-data-lg outline-none focus:border-primary transition-colors"
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
            <div class="mb-xl text-center w-full">
              <h1 class="font-headline-lg text-headline-lg text-primary uppercase tracking-[4px] mb-sm animate-pulse-slow">
                {isRegistering() ? "Register" : "Authentication"}
              </h1>
              {isRegistering() && (
                <p class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] opacity-60">
                  Create New Operator
                </p>
              )}
            </div>

            {/* Error Message */}
            {error() && (
              <div class="mb-md px-md py-sm border border-ice-blue/30 bg-ice-blue/5 text-center">
                <p class="font-body-md text-label-sm text-ice-blue uppercase">{error()}</p>
              </div>
            )}

            {/* Form */}
            <form class="flex flex-col gap-lg w-full" onSubmit={handleSubmit}>
              <div
                classList={{
                  "flex flex-col gap-lg w-full transition-all duration-300 ease-out": true,
                  "opacity-0 translate-y-2": animating(),
                  "opacity-100 translate-y-0": !animating(),
                }}
              >
              <div class="flex flex-col gap-xs w-full group">
                <label class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                  Username
                </label>
                <div class="relative w-full">
                  <input
                    type="text"
                    value={username()}
                    onInput={(e) => setUsername(e.currentTarget.value)}
                    placeholder={placeholderText()}
                    autocomplete="username"
                    class="bg-transparent border-b border-hairline-strong py-md text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
                  />
                  <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
                </div>
              </div>

              {isRegistering() && (
                <div class="flex flex-col gap-xs w-full group">
                  <label class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                    Email Address
                  </label>
                  <div class="relative w-full">
                    <input
                      type="email"
                      value={email()}
                      onInput={(e) => setEmail(e.currentTarget.value)}
                      placeholder="e.g. username@email.com"
                      autocomplete="email"
                      class="bg-transparent border-b border-hairline-strong py-md text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
                    />
                    <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
                  </div>
                </div>
              )}

              <div class="flex flex-col gap-xs w-full group">
                <label class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                  Password
                </label>
                <div class="relative w-full">
                  <input
                    type={showPassword() ? "text" : "password"}
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    placeholder="••••••••"
                    autocomplete={isRegistering() ? "new-password" : "current-password"}
                    class="bg-transparent border-b border-hairline-strong py-md pr-xl text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
                  />
                  <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword())}
                    class="absolute right-0 bottom-0 pb-md flex items-center text-text-muted hover:text-primary transition-colors"
                    tabindex="-1"
                  >
                    <span class="material-symbols-outlined text-[18px]">
                      {showPassword() ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {isRegistering() && (
                <div class="flex flex-col gap-xs w-full group">
                  <label class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                    Confirm Password
                  </label>
                  <div class="relative w-full">
                    <input
                      type={showConfirmPassword() ? "text" : "password"}
                      value={confirmPassword()}
                      onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                      placeholder="••••••••"
                      autocomplete="new-password"
                      class="bg-transparent border-b border-hairline-strong py-md pr-xl text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
                    />
                    <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword())}
                      class="absolute right-0 bottom-0 pb-md flex items-center text-text-muted hover:text-primary transition-colors"
                      tabindex="-1"
                    >
                      <span class="material-symbols-outlined text-[18px]">
                        {showConfirmPassword() ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
              </div>

              <div class="flex flex-col gap-sm mt-md w-full">
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
                <button
                  type="button"
                  onClick={() => navigate("/", { replace: true })}
                  class="w-full font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <div class="flex justify-center gap-md mt-sm">
                  <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[1px] opacity-60">Privacy Policy</span>
                  <span class="text-hairline">|</span>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[1px] opacity-60">Terms & Conditions</span>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div class="mt-xl pt-md border-t border-hairline text-center w-full">
              <p class="font-label-sm text-label-sm text-text-muted uppercase">
                Forgot credentials? <span class="text-primary opacity-60">Contact System Admin</span>
              </p>
            </div>
          </>
        )}

        <style>{`
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AuthPage;
