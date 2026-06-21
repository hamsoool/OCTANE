import { createSignal, onMount, type Component } from "solid-js";

interface AuthPageProps {
  onBack: () => void;
  onSignIn: () => void;
}

const AuthPage: Component<AuthPageProps> = (props) => {
  const [isLoading, setIsLoading] = createSignal(false);
  const [isMounted, setIsMounted] = createSignal(false);

  onMount(() => {
    setIsMounted(true);
  });

  const handleSignIn = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate "system validation" delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    props.onSignIn();
  };

  return (
    <div class="min-h-screen w-full flex items-center justify-center px-container-margin bg-black overflow-hidden relative">
      {/* Atmospheric Background - Clinical Grid */}
      <div class="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div 
          class="absolute inset-0" 
          style={{
            "background-image": "radial-gradient(circle at 2px 2px, #262626 1px, transparent 0)",
            "background-size": "32px 32px"
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
          onClick={props.onBack}
          class="absolute top-lg left-lg text-primary hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
          title="Go Back"
        >
          <span class="material-symbols-outlined text-label-md">arrow_back</span>
        </button>

        {/* Header */}
        <div class="mb-xl text-center w-full">
          <h1 class="font-headline-lg text-headline-lg text-primary uppercase tracking-[4px] mb-sm animate-pulse-slow">
            Authentication
          </h1>
          <p class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] opacity-60">
            Secure Access Protocol
          </p>
        </div>

        {/* Form */}
        <form 
          class="flex flex-col gap-lg w-full" 
          onSubmit={handleSignIn}
        >
          <div class="flex flex-col gap-xs w-full group">
            <label class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
              Operator ID
            </label>
            <div class="relative w-full">
              <input
                type="text"
                placeholder="ENTER ID"
                class="bg-transparent border-b border-hairline-strong py-md text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted uppercase tracking-widest w-full"
              />
              <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
            </div>
          </div>

          <div class="flex flex-col gap-xs w-full group">
            <label class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] transition-colors group-focus-within:text-primary">
              Access Key
            </label>
            <div class="relative w-full">
              <input
                type="password"
                placeholder="••••••••"
                class="bg-transparent border-b border-hairline-strong py-md text-primary font-body-md outline-none focus:border-primary transition-all placeholder:text-text-muted w-full"
              />
              <div class="absolute bottom-0 left-0 h-px bg-primary w-0 transition-all duration-300 group-focus-within:w-full"></div>
            </div>
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
                  <span>Validating...</span>
                </div>
              ) : (
                "Authorize"
              )}
            </button>
            <button
              type="button"
              onClick={props.onBack}
              class="w-full h-12 border border-hairline-strong text-primary font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:bg-hairline transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Footer */}
        <div class="mt-xl pt-md border-t border-hairline text-center w-full">
          <p class="font-label-sm text-label-sm text-text-muted uppercase">
            Forgot credentials? <a href="#" class="text-primary hover:underline transition-colors">Contact System Admin</a>
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
