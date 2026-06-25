const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendVerificationCodeParams {
  to: string;
  username: string;
  code: string;
}

export async function sendVerificationCode({ to, username, code }: SendVerificationCodeParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY not set");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000000; font-family: 'JetBrains Mono', monospace; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #131313; border: 1px solid #262626; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-family: 'Azonix', sans-serif; font-size: 24px; font-weight: 400; color: #ffffff; text-transform: uppercase; letter-spacing: 4px; }
    .header p { font-family: 'Source Serif 4', serif; font-size: 14px; color: #999999; margin-top: 8px; }
    .divider { height: 1px; background: #262626; margin: 24px 0; }
    .code-container { text-align: center; padding: 24px 0; }
    .code-label { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
    .code { font-family: 'JetBrains Mono', monospace; font-size: 42px; font-weight: 400; color: #ffffff; letter-spacing: 12px; }
    .code-divider { width: 32px; height: 1px; background: #3a3a3a; margin: 16px auto; }
    .footer { font-family: 'Source Serif 4', serif; font-size: 12px; color: #666666; text-align: center; margin-top: 24px; }
    .footer span { color: #c3d9f3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OCTANE</h1>
      <p>Operator Verification</p>
    </div>
    <div class="divider"></div>
    <div class="code-container">
      <div class="code-label">Verification Code</div>
      <div class="code">${code}</div>
      <div class="code-divider"></div>
      <p style="font-family: 'Source Serif 4', serif; font-size: 13px; color: #cccccc;">
        Welcome, <span style="color: #c3d9f3;">${username}</span>. Enter this code to activate your operator terminal.
      </p>
    </div>
    <div class="divider"></div>
    <div class="footer">
      This code expires in 10 minutes. If you did not request this, ignore this message.<br />
      OCTANE &mdash; <span>Fuel Intelligence</span>
    </div>
  </div>
</body>
</html>`;

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "OCTANE", email: process.env.BREVO_FROM_EMAIL || "noreply@octane.local" },
      to: [{ email: to }],
      subject: "OCTANE — Operator Verification Code",
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Brevo send failed:", err);
    throw new Error("Failed to send verification email");
  }
}
