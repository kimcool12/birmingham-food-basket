// Replaceable external messaging provider. No provider is configured yet, so nothing is
// sent outside the app. When WhatsApp, SMS or email is added, replace the body of this
// function and return { sent: true }.
export async function sendExternal() {
  return { sent: false, reason: "No external provider is configured." };
}
