/**
 * English / Hindi strings. Customers pick a language on their phone; the choice is kept in a cookie.
 * `t()` falls back to English for any key missing in Hindi, and a test checks both
 * dictionaries have the same keys so nothing ships half-translated.
 */
export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "ql_lang";

export const en = {
  "app.tagline": "Skip the waiting room. Wait from anywhere.",
  "app.lead":
    "QueueLess gives clinics, salons and service counters a live digital queue. Customers scan a QR code, join from their phone and get told when it's their turn.",
  "app.cta.start": "Set up your queue — free",
  "app.cta.login": "Staff login",
  "step.qr.title": "Put up your QR code",
  "step.qr.body": "Print it from your dashboard and stick it by the door. Customers don't install anything.",
  "step.join.title": "Customers join from their phone",
  "step.join.body": "They get a token and watch their place and wait time update live, in Hindi or English.",
  "step.call.title": "Call the next person",
  "step.call.body": "One tap at the counter moves the line, and every screen updates at once.",

  "join.title": "Join the queue",
  "join.waiting": "{n} waiting",
  "join.eta": "About {m} min wait",
  "join.etaNone": "No wait right now",
  "join.name": "Your name",
  "join.phone": "Mobile number (optional)",
  "join.phoneHint": "Only the staff can see it, in case they need to reach you.",
  "join.submit": "Get my token",
  "join.closed": "This queue is closed right now. Please check with the front desk.",
  "join.nowServing": "Now serving",
  "join.nobodyServing": "Nobody yet",

  "ticket.yourToken": "Your token",
  "ticket.position": "Your position",
  "ticket.ahead": "{n} people ahead of you",
  "ticket.aheadOne": "1 person ahead of you",
  "ticket.aheadNone": "You're next",
  "ticket.eta": "Estimated wait: about {m} min",
  "ticket.called": "It's your turn! Please go to the counter.",
  "ticket.served": "You've been served. Thank you!",
  "ticket.skipped": "You missed your turn. Please speak to the front desk.",
  "ticket.cancelled": "You left the queue.",
  "ticket.leave": "Leave the queue",
  "ticket.leaveConfirm": "Leave the queue? You'll lose your place.",
  "ticket.keepOpen": "Keep this page open — it updates by itself. Bookmark it to come back.",
  "ticket.live": "Live",
  "ticket.reconnecting": "Reconnecting…",
  "ticket.notFound": "We couldn't find this ticket.",

  "lang.switch": "हिन्दी",
} as const;

export type MessageKey = keyof typeof en;

export const hi: Record<MessageKey, string> = {
  "app.tagline": "वेटिंग रूम छोड़िए। कहीं से भी इंतज़ार कीजिए।",
  "app.lead":
    "QueueLess क्लिनिक, सैलून और सर्विस काउंटरों को लाइव डिजिटल कतार देता है। ग्राहक QR कोड स्कैन करके फ़ोन से जुड़ते हैं और बारी आने पर उन्हें बताया जाता है।",
  "app.cta.start": "अपनी कतार बनाइए — मुफ़्त",
  "app.cta.login": "स्टाफ़ लॉगिन",
  "step.qr.title": "अपना QR कोड लगाइए",
  "step.qr.body": "डैशबोर्ड से प्रिंट करके दरवाज़े पर लगाइए। ग्राहकों को कुछ इंस्टॉल नहीं करना पड़ता।",
  "step.join.title": "ग्राहक फ़ोन से जुड़ते हैं",
  "step.join.body": "उन्हें टोकन मिलता है और उनकी स्थिति व इंतज़ार का समय लाइव दिखता है, हिन्दी या अंग्रेज़ी में।",
  "step.call.title": "अगले व्यक्ति को बुलाइए",
  "step.call.body": "काउंटर पर एक टैप से कतार आगे बढ़ती है और हर स्क्रीन तुरंत अपडेट होती है।",

  "join.title": "कतार में जुड़ें",
  "join.waiting": "{n} लोग इंतज़ार में",
  "join.eta": "लगभग {m} मिनट का इंतज़ार",
  "join.etaNone": "अभी कोई इंतज़ार नहीं",
  "join.name": "आपका नाम",
  "join.phone": "मोबाइल नंबर (वैकल्पिक)",
  "join.phoneHint": "इसे सिर्फ़ स्टाफ़ देख सकता है, ज़रूरत पड़ने पर संपर्क के लिए।",
  "join.submit": "मेरा टोकन लें",
  "join.closed": "यह कतार अभी बंद है। कृपया रिसेप्शन पर पूछें।",
  "join.nowServing": "अभी बारी",
  "join.nobodyServing": "अभी कोई नहीं",

  "ticket.yourToken": "आपका टोकन",
  "ticket.position": "आपकी स्थिति",
  "ticket.ahead": "आपसे पहले {n} लोग",
  "ticket.aheadOne": "आपसे पहले 1 व्यक्ति",
  "ticket.aheadNone": "अगली बारी आपकी है",
  "ticket.eta": "अनुमानित इंतज़ार: लगभग {m} मिनट",
  "ticket.called": "आपकी बारी आ गई! कृपया काउंटर पर जाएँ।",
  "ticket.served": "आपका काम हो गया। धन्यवाद!",
  "ticket.skipped": "आपकी बारी निकल गई। कृपया रिसेप्शन पर बात करें।",
  "ticket.cancelled": "आपने कतार छोड़ दी।",
  "ticket.leave": "कतार छोड़ें",
  "ticket.leaveConfirm": "कतार छोड़ें? आपकी जगह चली जाएगी।",
  "ticket.keepOpen": "यह पेज खुला रखें — यह अपने-आप अपडेट होता है। वापस आने के लिए बुकमार्क करें।",
  "ticket.live": "लाइव",
  "ticket.reconnecting": "फिर से जुड़ रहा है…",
  "ticket.notFound": "यह टोकन नहीं मिला।",

  "lang.switch": "English",
};

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, hi };

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = DICTS[lang][key] ?? en[key];
  return vars ? template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : template;
}

/** Picks a language from the cookie, then the browser's Accept-Language header, then English. */
export function pickLang(cookieValue: string | undefined, acceptLanguage: string | null): Lang {
  if (isLang(cookieValue)) return cookieValue;
  if (acceptLanguage && /(^|,)\s*hi\b/i.test(acceptLanguage)) return "hi";
  return "en";
}
