(() => {
  const LEET_MAP = new Map([
    ["0", "o"],
    ["1", "i"],
    ["!", "i"],
    ["|", "i"],
    ["3", "e"],
    ["4", "a"],
    ["@", "a"],
    ["5", "s"],
    ["7", "t"],
    ["8", "b"],
    ["9", "g"],
    ["6", "g"],
  ]);

  const BLOCKED_WORDS = new Set([
    "culo", "culiao", "culiada", "cagada", "cagar", "cagon", "cagón",
    "mierda", "mierdas", "mierdero", "mierdoso",
    "puta", "puta madre", "puto", "putos", "putas",
    "verga", "vergas", "pinga", "pene", "nepe", "pn",
    "poto", "boludo", "boluda", "boludos", "boludas",
    "marica", "marico", "maricon", "maricón", "marik", "mariko", "maricao",
    "cabron", "cabrona", "cabrones", "cabronazo", "cabrón",
    "coño", "cojon", "cojones", "joder", "jodido", "jodida",
    "chingar", "chingada", "chingado", "chingon", "chingona",
    "pendejo", "pendeja", "pendejos", "pendejas",
    "idiota", "imbecil", "imbécil", "gilipollas", "tonto", "tarado", "baboso",
    "gonorrea", "hijoputa", "hijo de puta", "hijodeputa", "hdp", "hijueputa", "hp",
    "weon", "weona", "weá", "wea", "weón",
    "zhemen", "cmen", "bcspn",
  ]);

  const SHORT_BLOCKED = new Set(["ctm", "csm", "tmr", "wtf", "xdm", "xdd", "xddd"]);
  const LAUGHTER_UNITS = new Set(["ja", "je", "ji", "jo", "ju", "xa", "xe", "xi", "xo", "xu", "xd"]);

  function stripBracketedSegments(value) {
    return String(value ?? "")
      .replace(/\s*\[[^\]]*\]\s*/g, " ")
      .replace(/\s*\([^\)]*\)\s*/g, " ")
      .replace(/\s*\{[^\}]*\}\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function stripDiacritics(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function mapLeet(value) {
    let out = "";
    for (const ch of String(value ?? "")) {
      out += LEET_MAP.get(ch) || ch;
    }
    return out;
  }

  function normalizeForMatch(value) {
    return mapLeet(stripDiacritics(value)).toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function normalizeSpaces(value) {
    return String(value ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/[\p{S}\p{P}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compressRepeatedLetters(value) {
    return String(value ?? "").replace(/(.)\1{2,}/gi, "$1$1");
  }

  function compressLaughToken(token, maxRepeats = 3) {
    const raw = String(token ?? "");
    const lower = raw.toLowerCase();
    if (lower.length < 4 || lower.length % 2 !== 0) return raw;

    const pair = lower.slice(0, 2);
    if (!LAUGHTER_UNITS.has(pair)) return raw;

    let repeated = true;
    for (let i = 0; i < lower.length; i += 2) {
      if (lower.slice(i, i + 2) !== pair) {
        repeated = false;
        break;
      }
    }
    if (!repeated) return raw;

    const count = lower.length / 2;
    if (count <= maxRepeats) return raw;
    return pair.repeat(maxRepeats);
  }

  function isGibberishToken(token) {
    const compact = normalizeForMatch(token);
    if (!compact) return true;
    if (/^\d+$/.test(compact)) return false;
    if (BLOCKED_WORDS.has(compact) || SHORT_BLOCKED.has(compact)) return true;

    const squeezed = compact.replace(/(.)\1+/g, "$1");
    if (BLOCKED_WORDS.has(squeezed) || SHORT_BLOCKED.has(squeezed)) return true;

    const vowelCount = (compact.match(/[aeiou]/g) || []).length;
    if (compact.length >= 6 && vowelCount === 0) return true;
    if (compact.length >= 8 && vowelCount <= 1) return true;
    if (compact.length >= 10 && /[bcdfghjklmnpqrstvwxyz]{6,}/.test(compact)) return true;
    return false;
  }

  function shouldDropToken(token) {
    const compact = normalizeForMatch(token);
    if (!compact) return true;
    if (BLOCKED_WORDS.has(compact) || SHORT_BLOCKED.has(compact)) return true;

    const squeezed = compact.replace(/(.)\1+/g, "$1");
    if (BLOCKED_WORDS.has(squeezed) || SHORT_BLOCKED.has(squeezed)) return true;

    if (/^\d+$/.test(compact)) return false;
    return isGibberishToken(compact);
  }

  function sanitizeWord(token, { maxDigits = 4, maxLaughRepeats = 3 } = {}) {
    let value = String(token ?? "").trim();
    if (!value) return "";

    value = stripDiacritics(value);
    value = mapLeet(value);
    value = value.replace(/[^\p{L}\p{N}]+/gu, "");
    if (!value) return "";

    if (/^\d+$/.test(value)) {
      return value.slice(0, Math.max(1, maxDigits));
    }

    const laugh = compressLaughToken(value, maxLaughRepeats);
    if (laugh !== value) {
      return laugh;
    }

    value = compressRepeatedLetters(value);
    if (shouldDropToken(value)) return "";

    if (/\d/.test(value)) {
      value = value.replace(/\d{5,}/g, (match) => match.slice(0, Math.max(1, maxDigits)));
    }

    return value;
  }

  function sanitizeStreamText(value, options = {}) {
    const maxDigits = Number.isFinite(Number(options.maxDigits)) ? Number(options.maxDigits) : 4;
    const maxLaughRepeats = Number.isFinite(Number(options.maxLaughRepeats)) ? Number(options.maxLaughRepeats) : 3;
    const source = normalizeSpaces(stripBracketedSegments(value));
    if (!source) return "";

    const tokens = source.split(/\s+/).filter(Boolean);
    const out = [];
    for (const rawToken of tokens) {
      const token = rawToken
        .replace(/^[^\p{L}\p{N}]+/gu, "")
        .replace(/[^\p{L}\p{N}]+$/gu, "");
      if (!token) continue;

      const cleaned = sanitizeWord(token, { maxDigits, maxLaughRepeats });
      if (cleaned) out.push(cleaned);
    }

    return out.join(" ").replace(/\s{2,}/g, " ").trim();
  }

  function sanitizeDisplayName(value, fallback = "Usuario") {
    const cleaned = sanitizeStreamText(value, { maxDigits: 4, maxLaughRepeats: 3 });
    return cleaned || fallback;
  }

  function sanitizeSpeechText(value, fallback = "") {
    return sanitizeStreamText(value, { maxDigits: 4, maxLaughRepeats: 3 }) || fallback;
  }

  function sanitizeIdentifier(value, fallback = "") {
    const cleaned = sanitizeStreamText(value, { maxDigits: 4, maxLaughRepeats: 3 });
    return cleaned || fallback;
  }

  window.StreamFusionTextFilter = {
    stripBracketedSegments,
    sanitizeStreamText,
    sanitizeDisplayName,
    sanitizeSpeechText,
    sanitizeIdentifier,
  };
})();
