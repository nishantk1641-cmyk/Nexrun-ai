const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const MODEL = "gemini-2.5-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM = {
  builder: 'You are Nexrun AI. Return ONLY JSON: {"title","description","html","css","js"}. "html" is body markup only (no html, head, style or script tags). css and js must be complete and working. Use no external libraries or network calls.',
  assistant: 'You are Nexrun AI, a friendly coding teacher. Return ONLY JSON: {"answer","code"}. Keep the answer short and clear. "code" may be an empty string.',
  code: 'You are Nexrun AI, a code editor assistant. Return ONLY JSON: {"answer","code"}. "code" is the full corrected or updated code.'
};

exports.nexrunAI = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: "512MiB", cors: true },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Please log in first.");
    const { mode, prompt, context } = req.data || {};
    if (!SYSTEM[mode]) throw new HttpsError("invalid-argument", "Unknown mode.");
    if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 2000)
      throw new HttpsError("invalid-argument", "Prompt must be 3 to 2000 characters.");

    const ref = admin.firestore().doc(`users/${req.auth.uid}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("failed-precondition", "Profile missing. Log out and log in again.");
    const u = snap.data();
    // Plan comes from Firestore (server side), never from the client.
    const plan = u.plan === "pro" && u.subscriptionStatus === "active" ? "pro" : "free";
    const last = u.lastAIRequestAt ? u.lastAIRequestAt.toMillis() : 0;
    if (Date.now() - last < (plan === "pro" ? 2000 : 8000))
      throw new HttpsError("resource-exhausted", "Please wait a few seconds and try again.");
    await ref.update({ lastAIRequestAt: admin.firestore.FieldValue.serverTimestamp() });

    let text = prompt;
    if (typeof context === "string" && context) text += "\n\nCurrent code:\n" + context.slice(0, 20000);

    let res;
    try {
      res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY.value() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM[mode] }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
        })
      });
    } catch (e) {
      throw new HttpsError("unavailable", "AI service could not be reached.");
    }
    if (!res.ok) {
      console.error("Gemini error", res.status);
      throw new HttpsError("internal", "AI request failed. Please try again.");
    }
    let o;
    try {
      const j = await res.json();
      o = JSON.parse(j.candidates[0].content.parts[0].text);
    } catch (e) {
      throw new HttpsError("internal", "AI returned an unreadable answer. Please try again.");
    }
    const s = (v) => (typeof v === "string" ? v : "");
    return mode === "builder"
      ? { title: s(o.title) || "Untitled project", description: s(o.description), html: s(o.html), css: s(o.css), js: s(o.js) }
      : { answer: s(o.answer), code: s(o.code) };
  }
);
