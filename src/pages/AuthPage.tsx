import { createSignal, onMount, type Component } from "solid-js";
import { apiPost, setToken } from "../api";

interface AuthPageProps {
  onBack: () => void;
  onSignIn: () => void;
}

const AuthPage: Component<AuthPageProps> = (props) => {
  const [operatorId, setOperatorId] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [isRegistering, setIsRegistering] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [isMounted, setIsMounted] = createSignal(false);

  onMount(() => setIsMounted(true));

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    if (!operatorId().trim() || !password()) {
      setError("All fields are required.");
      return;
    }

    if (isRegistering() && password() !== confirmPassword()) {
      setError("Access Keys do not match.");
      return;
    }

    if (password().length < 6) {
      setError("Access Key must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    const endpoint = isRegistering() ? "/auth/register" : "/auth/signin";
    const result = await apiPost<{ token: string; operatorId: string }>(endpoint, {
      operatorId: operatorId(),
      password: password(),
    });

    setIsLoading(false);

    if (result.success && result.data) {
      setToken(result.data.token);
      props.onSignIn();
    } else {
      setError(result.error || "Operation failed.");
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering());
    setError("");
    setPassword("");
    setConfirmPassword("");
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
            props.onBack();
          }}
          class="absolute top-lg left-lg text-primary hover:text-white transition-colors flex items-center justify-center hover:bg-white/5 z-20"
          title="Go Back"
          style="width: 28px; height: 28px; border-radius: 9999px;"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
        </button>

        {/* Header */}
        <div class="mb-xl text-center w-full">
          <h1 class="font-headline-lg text-headline-lg text-primary uppercase tracking-[4px] mb-sm animate-pulse-slow">
            {isRegistering() ? "Register" : "Authentication"}
          </h1>
          <p class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] opacity-60">
            {isRegistering() ? "Create New Operator" : "Secure Access Protocol"}
          </p>
        </div>

        {/* Error Message */}
        {error() && (
          <div class="mb-md px-md py-sm border border-ice-blue/30 bg-ice-blue/5 text-center">
            <p class="font-body-md text-label-sm text-ice-blue uppercase">{error()}</p>
          </div>
        )}

        {/* Form */}
        <form class="flex flex-col gap-lg w-full" onSubmit={handleSubmit}>
          <div class="flex flex-col gap-xs w-full group">
            <label class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
              Operator ID
            </label>
            <div class="relative w-full">
              <input
                type="text"
                value={operatorId()}
                onInput={(e) => setOperatorId(e.currentTarget.value)}
                placeholder="ENTER ID"
                autocomplete="username"
                class="bg-transparent border-b border-hairline-strong py-md text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
              />
              <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
            </div>
          </div>

          <div class="flex flex-col gap-xs w-full group">
            <label class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
              {isRegistering() ? "Create Access Key" : "Access Key"}
            </label>
            <div class="relative w-full">
              <input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder="••••••••"
                autocomplete={isRegistering() ? "new-password" : "current-password"}
                class="bg-transparent border-b border-hairline-strong py-md text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
              />
              <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
            </div>
          </div>

          {isRegistering() && (
            <div class="flex flex-col gap-xs w-full group">
              <label class="font-body-md text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
                Confirm Access Key
              </label>
              <div class="relative w-full">
                <input
                  type="password"
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                  placeholder="••••••••"
                  autocomplete="new-password"
                  class="bg-transparent border-b border-hairline-strong py-md text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
                />
                <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
              </div>
            </div>
          )}

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
                "Authorize"
              )}
            </button>
            <button
              type="button"
              onClick={toggleMode}
              class="w-full h-12 border border-hairline-strong text-primary font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:bg-hairline transition-colors"
            >
              {isRegistering() ? "Back to Sign In" : "Register New Operator"}
            </button>
            <button
              type="button"
              onClick={props.onBack}
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
      </div>

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
  );
};

export default AuthPage;
