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
  "culo", "culo", "culera", "culero", "culiao", "culiada", "culiado", "culito", "culazo",
  "cagar", "cagada", "cagado", "cagados", "cagadas", "cagao", "cagon", "cagón", "cagona",
  "mierda", "mierdas", "mierdero", "mierderos", "mierdoso", "mierdosa", "mierd", "mrd",
  "puta", "puta madre", "puto", "putos", "putas", "putísima", "putisima", "putero", "putero",
  "verga", "vergas", "vergon", "vergón", "pinga", "pene", "nepe", "pn", "poto",
  "boludo", "boluda", "boludos", "boludas", "pelotudo", "pelotuda",
  "marica", "marico", "maricon", "maricón", "marik", "mariko", "maricao",
  "cabron", "cabrona", "cabrones", "cabronazo", "cabrón",
  "coño", "cojon", "cojones", "joder", "jodido", "jodida", "jodón", "jodona",
  "chingar", "chingada", "chingado", "chingon", "chingona",
  "pendejo", "pendeja", "pendejos", "pendejas", "pendejazo", "pendejita",
  "idiota", "imbecil", "imbécil", "gilipollas", "tonto", "tarado", "baboso", "subnormal",
  "gonorrea", "hijoputa", "hijodeputa", "hijo de puta", "hijueputa", "hdp", "hp",
  "weon", "weona", "weá", "wea", "weón",
  "zorra", "perra", "bitch", "fuck", "shit", "asshole",
  "zhemen", "cmen", "bcspn",
]);

const BLOCKED_PHRASES = [
  ["puta", "madre"],
  ["hijo", "de", "puta"],
  ["hijo", "de", "perra"],
];

const BLOCKED_PATTERNS = [
  /^coj(?:er|e|i|o|a|on|ón|ones?|azo|azos|ito|ita|ido|ida|idos|idas|iendo|ete|eme|erse|erse)?$/,
  /^cog(?:er|e|i|o|a|on|ón|ones?|iendo|ido|ida|idos|idas|ieron|iste|isteis|amos|aste)?$/,
  /^cul(?:o|a|ero|era|iao|iada|iado|itos?|azas?|ón|on|ones?)?$/,
  /^mierd(?:a|as|ero|eros|osa|oso|ón|on)?$/,
  /^put(?:a|o|os|as|ísima|isima|ito|ita|azos?|adas?|ados?|ero|ería|ete|ete)?$/,
  /^verg(?:a|as|ón|on|otas?|azo|azos)?$/,
  /^pendej(?:o|a|os|as|azo|azos|ita|itas|ón|on)?$/,
  /^cabr(?:on|ón|ona|onas|ones|azo|azos)?$/,
  /^maric(?:a|o|ón|on|ona|onas|ones|k|ko)?$/,
  /^jod(?:er|e|ido|ida|idos|idas|ón|on|ona|ete|anse)?$/,
  /^cag(?:ar|ada|ado|ados|adas|ón|on|ona|ones)?$/,
  /^we(?:on|ón|ona|onas|ones|a)?$/,
];

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
  if (!["ja", "je", "ji", "jo", "ju", "xa", "xe", "xi", "xo", "xu", "xd"].includes(pair)) return raw;

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

function isBlockedCompact(compact) {
  if (!compact) return true;
  const squeezed = compact.replace(/(.)\1+/g, "$1");
  if (BLOCKED_WORDS.has(compact) || BLOCKED_WORDS.has(squeezed)) return true;
  if (BLOCKED_PATTERNS.some((re) => re.test(compact) || re.test(squeezed))) return true;
  return false;
}

function tokenCore(token) {
  return String(token ?? "")
    .replace(/^[^\p{L}\p{N}]+/gu, "")
    .replace(/[^\p{L}\p{N}]+$/gu, "");
}

function capDigits(value, maxDigits) {
  return String(value ?? "").replace(/\d{5,}/g, (match) => match.slice(0, Math.max(1, maxDigits)));
}

function sanitizeWord(token, { maxDigits = 4, maxLaughRepeats = 3 } = {}) {
  let value = tokenCore(token);
  if (!value) return "";

  const compact = normalizeForMatch(value);
  if (isBlockedCompact(compact)) return "";

  if (/^\d+$/.test(value)) {
    return value.slice(0, Math.max(1, maxDigits));
  }

  const laugh = compressLaughToken(value, maxLaughRepeats);
  if (laugh !== value) {
    value = laugh;
  }

  value = capDigits(value, maxDigits);
  if (isBlockedCompact(normalizeForMatch(value))) return "";

  return value;
}

function matchBlockedPhrase(normalizedTokens, start) {
  for (const phrase of BLOCKED_PHRASES) {
    if (start + phrase.length > normalizedTokens.length) continue;
    let ok = true;
    for (let i = 0; i < phrase.length; i++) {
      if (normalizedTokens[start + i] !== phrase[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return phrase.length;
  }
  return 0;
}

function matchBlockedLetterRun(normalizedTokens, start, maxLetters = 8) {
  let combined = "";
  let end = start;
  while (end < normalizedTokens.length && normalizedTokens[end].length === 1 && combined.length < maxLetters) {
    combined += normalizedTokens[end];
    end += 1;
    if (combined.length >= 3 && isBlockedCompact(combined)) {
      return end - start;
    }
  }
  return 0;
}

function sanitizeStreamText(value, options = {}) {
  const maxDigits = Number.isFinite(Number(options.maxDigits)) ? Number(options.maxDigits) : 4;
  const maxLaughRepeats = Number.isFinite(Number(options.maxLaughRepeats)) ? Number(options.maxLaughRepeats) : 3;
  const source = normalizeSpaces(stripBracketedSegments(value));
  if (!source) return "";

  const tokens = source.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map((token) => normalizeForMatch(tokenCore(token)));
  const out = [];

  for (let i = 0; i < tokens.length; i++) {
    const rawToken = tokenCore(tokens[i]);
    if (!rawToken) continue;

    const phraseLen = matchBlockedPhrase(normalizedTokens, i);
    if (phraseLen) {
      i += phraseLen - 1;
      continue;
    }

    const letterRunLen = matchBlockedLetterRun(normalizedTokens, i);
    if (letterRunLen) {
      i += letterRunLen - 1;
      continue;
    }

    const cleaned = sanitizeWord(rawToken, { maxDigits, maxLaughRepeats });
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

export {
  stripBracketedSegments,
  sanitizeStreamText,
  sanitizeDisplayName,
  sanitizeSpeechText,
  sanitizeIdentifier,
};
