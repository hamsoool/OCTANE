import { createSignal, onMount, Show, type Component } from "solid-js";
import {
  getMe,
  saveProfile,
  geocodeAddress,
  requestPasswordChange,
  confirmPasswordChange,
  getUsername,
  getRole,
} from "../api";

const Label: Component<{ for?: string; children: string }> = (props) => (
  <label for={props.for} class="font-label-sm text-label-sm text-text-body uppercase tracking-[2px]">
    {props.children}
  </label>
);

const inputClass =
  "w-full bg-surface-soft border border-hairline-strong py-sm px-md text-primary font-body-md text-body-md outline-none focus:border-primary focus:bg-surface-container transition-colors placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed";

type Status = { kind: "idle" | "ok" | "error"; text: string };

const Settings: Component = () => {
  const [firstName, setFirstName] = createSignal("");
  const [middleName, setMiddleName] = createSignal("");
  const [lastName, setLastName] = createSignal("");
  const [birthday, setBirthday] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [address, setAddress] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [addressLabel, setAddressLabel] = createSignal<string | null>(null);

  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [profileStatus, setProfileStatus] = createSignal<Status>({ kind: "idle", text: "" });

  // Password change is a two-step flow: current password -> emailed 6-digit
  // code -> new password. Kept in its own form so a failed code never discards
  // the profile edits above.
  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [code, setCode] = createSignal("");
  const [pwStep, setPwStep] = createSignal<"verify" | "code">("verify");
  const [pwBusy, setPwBusy] = createSignal(false);
  const [pwStatus, setPwStatus] = createSignal<Status>({ kind: "idle", text: "" });

  onMount(async () => {
    const me = await getMe();
    if (me) {
      setFirstName(me.firstName ?? "");
      setMiddleName(me.middleName ?? "");
      setLastName(me.lastName ?? "");
      setPhone(me.phone ?? "");
      setAddress(me.address ?? "");
      setEmail(me.email ?? "");
      setAddressLabel(me.addressLabel ?? null);
      if (me.birthday) {
        const d = new Date(me.birthday);
        if (!Number.isNaN(d.getTime())) {
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setBirthday(`${d.getFullYear()}-${mm}-${dd}`);
        }
      }
    }
    setLoading(false);
  });

  async function handleProfileSave(e: Event) {
    e.preventDefault();
    if (saving()) return;

    setSaving(true);
    setProfileStatus({ kind: "idle", text: "" });

    const res = await saveProfile({
      firstName: firstName(),
      middleName: middleName(),
      lastName: lastName(),
      birthday: birthday(),
      phone: phone(),
      address: address(),
    });

    if (!res.success) {
      setProfileStatus({ kind: "error", text: res.error || "Could not save your profile." });
      setSaving(false);
      return;
    }

    // A changed address clears the stored pin server-side, so re-resolve it.
    if (address().trim()) {
      setProfileStatus({ kind: "idle", text: "Resolving address..." });
      const geo = await geocodeAddress(address().trim());
      if (!geo.success || !geo.data) {
        setProfileStatus({
          kind: "error",
          text: geo.error || "Saved, but the address could not be pinned.",
        });
        setSaving(false);
        return;
      }
      setAddressLabel(geo.data.label);
    } else {
      setAddressLabel(null);
    }

    setProfileStatus({ kind: "ok", text: "Saved." });
    setSaving(false);
  }

  function resetPasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCode("");
    setPwStep("verify");
  }

  async function handlePasswordSubmit(e: Event) {
    e.preventDefault();
    if (pwBusy()) return;

    setPwStatus({ kind: "idle", text: "" });

    if (pwStep() === "verify") {
      if (!currentPassword()) {
        setPwStatus({ kind: "error", text: "Enter your current password." });
        return;
      }
      setPwBusy(true);
      const res = await requestPasswordChange(currentPassword());
      setPwBusy(false);
      if (!res.success) {
        setPwStatus({ kind: "error", text: res.error || "Could not send a code." });
        return;
      }
      setPwStep("code");
      setPwStatus({ kind: "ok", text: `Code sent to ${email()}.` });
      return;
    }

    if (newPassword().length < 8) {
      setPwStatus({ kind: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword() !== confirmPassword()) {
      setPwStatus({ kind: "error", text: "New passwords do not match." });
      return;
    }
    if (code().length !== 6) {
      setPwStatus({ kind: "error", text: "Enter the 6-digit code." });
      return;
    }

    setPwBusy(true);
    const res = await confirmPasswordChange({
      code: code(),
      newPassword: newPassword(),
      confirmPassword: confirmPassword(),
    });
    setPwBusy(false);

    if (!res.success) {
      setPwStatus({ kind: "error", text: res.error || "Could not update your password." });
      return;
    }
    setPwStatus({ kind: "ok", text: "Password updated." });
    resetPasswordForm();
  }

  return (
    <div class="bg-surface text-on-surface min-h-screen">
      <section class="relative w-full h-[220px] md:h-[260px] flex items-end overflow-hidden bg-gradient-to-b from-surface-card to-surface">
        <div
          class="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            "background-image": "radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)",
            "background-size": "32px 32px",
          }}
        ></div>
        <div class="relative z-10 px-container-margin pb-lg w-full max-w-screen-xl mx-auto">
          <div class="flex flex-col gap-xs">
            <span class="font-label-md text-label-md text-ice-blue tracking-[4px] uppercase">Account</span>
            <h1 class="font-headline-lg text-headline-lg text-primary uppercase">Settings</h1>
            <p class="font-body-md text-body-md text-text-muted">
              {getUsername() || "OPERATOR"} — {getRole() === "admin" ? "Administrator" : "Regular user"}
            </p>
          </div>
        </div>
      </section>

      <section class="px-container-margin py-section-gap max-w-screen-xl mx-auto">
        <Show
          when={!loading()}
          fallback={
            <div class="py-lg text-center font-label-md text-label-md text-ice-blue uppercase tracking-[4px]">
              Loading...
            </div>
          }
        >
          <form onSubmit={handleProfileSave} class="flex flex-col gap-section-gap">
            <div>
              <h2 class="font-headline-md text-headline-md text-primary uppercase border-b border-hairline-strong pb-md mb-lg">
                Name
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div class="flex flex-col gap-xs">
                  <Label for="first-name">First Name</Label>
                  <input
                    id="first-name"
                    value={firstName()}
                    disabled={saving()}
                    onInput={(e) => setFirstName(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
                <div class="flex flex-col gap-xs">
                  <Label for="middle-name">Middle Name</Label>
                  <input
                    id="middle-name"
                    value={middleName()}
                    disabled={saving()}
                    onInput={(e) => setMiddleName(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
                <div class="flex flex-col gap-xs">
                  <Label for="last-name">Last Name</Label>
                  <input
                    id="last-name"
                    value={lastName()}
                    disabled={saving()}
                    onInput={(e) => setLastName(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 class="font-headline-md text-headline-md text-primary uppercase border-b border-hairline-strong pb-md mb-lg">
                Details
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div class="flex flex-col gap-xs">
                  <Label for="birthday">Birthday</Label>
                  <input
                    id="birthday"
                    type="date"
                    value={birthday()}
                    disabled={saving()}
                    onInput={(e) => setBirthday(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
                <div class="flex flex-col gap-xs">
                  <Label for="phone">Phone Number</Label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone()}
                    disabled={saving()}
                    placeholder="e.g. +63 917 000 0000"
                    onInput={(e) => setPhone(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
                <div class="flex flex-col gap-xs">
                  <Label for="email">Email</Label>
                  <input id="email" type="email" value={email()} disabled class={inputClass} />
                </div>
                <div class="flex flex-col gap-xs">
                  <Label for="address">Address</Label>
                  <input
                    id="address"
                    value={address()}
                    disabled={saving()}
                    onInput={(e) => setAddress(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
              </div>

              <Show when={addressLabel()}>
                <div class="mt-md border border-hairline bg-surface-soft p-sm">
                  <p class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] mb-xs">
                    Pinned To
                  </p>
                  <p class="font-body-md text-body-md text-primary break-words">{addressLabel()}</p>
                </div>
              </Show>
            </div>

            <div class="flex flex-col gap-sm">
              <button
                type="submit"
                disabled={saving()}
                class="w-full md:w-auto h-12 px-xl bg-primary text-background font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving() ? "Saving..." : "Save"}
              </button>
              <Show when={profileStatus().text}>
                <p
                  class="font-label-sm text-label-sm uppercase tracking-[2px]"
                  classList={{
                    "text-secondary": profileStatus().kind === "ok",
                    "text-error": profileStatus().kind === "error",
                    "text-text-muted": profileStatus().kind === "idle",
                  }}
                >
                  {profileStatus().text}
                </p>
              </Show>
            </div>
          </form>

          <form onSubmit={handlePasswordSubmit} class="flex flex-col gap-section-gap mt-section-gap">
            <div>
              <h2 class="font-headline-md text-headline-md text-primary uppercase border-b border-hairline-strong pb-md mb-lg">
                Password
              </h2>

              <div class="flex flex-col gap-md max-w-md">
                <Show when={pwStep() === "verify"}>
                  <div class="flex flex-col gap-xs">
                    <Label for="current-password">Current Password</Label>
                    <input
                      id="current-password"
                      type="password"
                      autocomplete="current-password"
                      value={currentPassword()}
                      disabled={pwBusy()}
                      onInput={(e) => setCurrentPassword(e.currentTarget.value)}
                      class={inputClass}
                    />
                  </div>
                </Show>

                <Show when={pwStep() === "code"}>
                  <div class="flex flex-col gap-xs">
                    <Label for="pw-code">Confirmation Code</Label>
                    <input
                      id="pw-code"
                      inputmode="numeric"
                      maxlength={6}
                      value={code()}
                      disabled={pwBusy()}
                      placeholder="000000"
                      onInput={(e) => setCode(e.currentTarget.value.replace(/\D/g, ""))}
                      class={`${inputClass} font-data-lg text-data-lg tracking-[4px]`}
                    />
                  </div>
                  <div class="flex flex-col gap-xs">
                    <Label for="new-password">New Password</Label>
                    <input
                      id="new-password"
                      type="password"
                      autocomplete="new-password"
                      value={newPassword()}
                      disabled={pwBusy()}
                      onInput={(e) => setNewPassword(e.currentTarget.value)}
                      class={inputClass}
                    />
                  </div>
                  <div class="flex flex-col gap-xs">
                    <Label for="confirm-password">Confirm Password</Label>
                    <input
                      id="confirm-password"
                      type="password"
                      autocomplete="new-password"
                      value={confirmPassword()}
                      disabled={pwBusy()}
                      onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                      class={inputClass}
                    />
                  </div>
                </Show>

                <div class="flex flex-wrap gap-sm items-center">
                  <button
                    type="submit"
                    disabled={pwBusy()}
                    class="w-full md:w-auto h-12 px-xl bg-primary text-background font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pwBusy() ? "Working..." : pwStep() === "verify" ? "Send Code" : "Update Password"}
                  </button>
                  <Show when={pwStep() === "code"}>
                    <button
                      type="button"
                      onClick={() => {
                        resetPasswordForm();
                        setPwStatus({ kind: "idle", text: "" });
                      }}
                      class="border border-hairline-strong px-md py-sm font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] rounded-full hover:border-primary hover:text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </Show>
                </div>

                <Show when={pwStatus().text}>
                  <p
                    class="font-label-sm text-label-sm uppercase tracking-[2px]"
                    classList={{
                      "text-secondary": pwStatus().kind === "ok",
                      "text-error": pwStatus().kind === "error",
                      "text-text-muted": pwStatus().kind === "idle",
                    }}
                  >
                    {pwStatus().text}
                  </p>
                </Show>
              </div>
            </div>
          </form>
        </Show>
      </section>
    </div>
  );
};

export default Settings;
