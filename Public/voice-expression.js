export const VOICE_EXPRESSION_CATALOG = {
  s: { emotion: "singing", marker: "[singing]", label: "Cantando" },
  a: { emotion: "angry", marker: "[angry]", label: "Enojo" },
  w: { emotion: "whispering", marker: "[whispering]", label: "Susurrando" },
  g: { emotion: "laughing", marker: "[laughing]", label: "Risa" },
  l: { emotion: "laughing", marker: "[laughing]", label: "Risa" },
  e: { emotion: "excited", marker: "[excited]", label: "Entusiasta" },
  c: { emotion: "crying", marker: "[crying]", label: "Llorando" },
  p: { emotion: "pause", marker: "[pause]", label: "Pausa" },
  b: { emotion: "break", marker: "[break]", label: "Pausa larga" },
};

export function parseVoiceExpressionPrefix(text, enabled = true) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return { text: "", emotion: "", markers: [], used: false };
  if (!enabled) return { text: raw, emotion: "", markers: [], used: false };

  const tokens = raw.split(" ").filter(Boolean);
  const markers = [];
  const remaining = [];
  let emotion = "";

  const commandSpecForToken = (token) => {
    const tokenText = String(token || "").trim();
    if (!tokenText) return null;
    const trimmed = tokenText.replace(/[.,;:!?]+$/g, "");
    const match = trimmed.match(/^([!/])([sawglecpb])$/i);
    if (match) return VOICE_EXPRESSION_CATALOG[match[2].toLowerCase()] || null;
    return null;
  };

  let consuming = true;
  for (const token of tokens) {
    const spec = consuming ? commandSpecForToken(token) : null;
    if (spec) {
      if (!emotion && spec.emotion) emotion = spec.emotion;
      if (!markers.includes(spec.marker)) markers.push(spec.marker);
      continue;
    }
    consuming = false;
    remaining.push(token);
  }

  const cleanText = remaining.join(" ").replace(/\s+/g, " ").trim();
  return { text: cleanText, emotion, markers, used: markers.length > 0 };
}

export function fishEmotionMarker(emotion, modelName = "") {
  const key = String(emotion || "").trim().toLowerCase();
  if (!key) return "";
  return String(modelName || "").toLowerCase().startsWith("s1")
    ? `(${key})`
    : `[${key}]`;
}

export function composeFishAudioText(rawText, emotion = "", singSlashCommand = true, modelName = "") {
  let safeText = String(rawText || "").trim();
  if (!safeText) return { text: "", emotion: "" };

  const parsed = parseVoiceExpressionPrefix(safeText, singSlashCommand);
  safeText = parsed.text;
  const effectiveEmotion = String(emotion || parsed.emotion || "").trim();

  if (!safeText) return { text: "", emotion: effectiveEmotion };
  if (effectiveEmotion && !/^\s*[\[\(][^\]\)]+[\]\)]/.test(safeText)) {
    safeText = `${fishEmotionMarker(effectiveEmotion, modelName)} ${safeText}`;
  }

  return { text: safeText, emotion: effectiveEmotion };
}
