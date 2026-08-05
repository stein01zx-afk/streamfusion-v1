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
  "culo",
  "culiao",
  "culiada",
  "cagada",
  "cagar",
  "cagon",
  "cagón",
  "cagona",
  "mierda",
  "mierdas",
  "mierdero",
  "mierderos",
  "mierdoso",
  "mierdosa",
  "mierd",
  "mrd",
  "mierda seca",
  "mierd4",
  "mi3rda",
  "m1erda",
  "m13rda",
  "mierdha",
  "puta",
  "puta madre",
  "puto",
  "putos",
  "putas",
  "putísima",
  "putisima",
  "put4",
  "put0",
  "phuta",
  "phutha",
  "putha",
  "phuto",
  "phutho",
  "putho",
  "phu tha",
  "pu tha",
  "phu-tha",
  "pu-tha",
  "verga",
  "vergas",
  "vergon",
  "vergón",
  "vergota",
  "vergudo",
  "verg4",
  "vrga",
  "v3rga",
  "vergha",
  "v3rg4",
  "pinga",
  "p1nga",
  "pinnga",
  "pingga",
  "pingaa",
  "pingaaa",
  "pin ga",
  "pin-ga",
  "pin.ga",
  "ganpi",
  "gampi",
  "gan pee",
  "gan-pi",
  "piinga",
  "pihnga",
  "pene",
  "nepe",
  "pn",
  "poto",
  "boludo",
  "boluda",
  "boludos",
  "boludas",
  "huevon",
  "huevona",
  "huevones",
  "huevonazo",
  "huevada",
  "huevadas",
  "huevón",
  "weon",
  "weona",
  "weá",
  "wea",
  "weón",
  "webon",
  "webona",
  "webón",
  "webonazo",
  "wey",
  "guey",
  "güey",
  "guei",
  "güei",
  "marica",
  "marico",
  "maricon",
  "maricón",
  "marik",
  "mariko",
  "maricao",
  "marikon",
  "marikón",
  "maric",
  "marikhon",
  "mariquita",
  "marikita",
  "mariqta",
  "mariquitaa",
  "mariquitas",
  "maricha",
  "marikha",
  "maricona",
  "mariconazo",
  "gay",
  "gey",
  "gei",
  "gai",
  "ghey",
  "ghei",
  "g4y",
  "g3y",
  "g@y",
  "cachar",
  "kachar",
  "ca char",
  "ka char",
  "ca-char",
  "ka-char",
  "cchar",
  "kchar",
  "ch char",
  "ch-char",
  "chchar",
  "pendejo",
  "pendeja",
  "pendejos",
  "pendejas",
  "pendejazo",
  "pendejita",
  "idiota",
  "imbecil",
  "imbécil",
  "gilipollas",
  "tonto",
  "tarado",
  "baboso",
  "subnormal",
  "mongol",
  "gonorrea",
  "hijoputa",
  "hijo de puta",
  "hijodeputa",
  "hijueputa",
  "hdp",
  "hp",
  "malparido",
  "malparida",
  "malparío",
  "malparia",
  "careverga",
  "careculo",
  "carepinga",
  "caremonda",
  "pirobo",
  "chupamela",
  "chupamelo",
  "chupame",
  "chu pamela",
  "chu-pamela",
  "mamamela",
  "mamamelo",
  "mamame",
  "conchetumadre",
  "conchasumadre",
  "conchesumadre",
  "conchetumare",
  "conchatumadre",
  "conchetu madre",
  "qlo",
  "qliao",
  "ctmre",
  "csmre",
  "csmr",
  "ctmr",
  "ctm",
  "csm",
  "tmr",
  "ptm",
  "ptmr",
  "pta",
  "zorra",
  "perra",
  "bitch",
  "fuck",
  "shit",
  "asshole",
  "coño",
  "cojon",
  "cojones",
  "joder",
  "jodido",
  "jodida",
  "jodón",
  "jodona",
  "jodete",
  "chingar",
  "chingada",
  "chingado",
  "chingon",
  "chingona",
  "chingón",
  "ching4r",
  "chingad0",
  "mamon",
  "mamón",
  "violar",
  "semen",
  "bcspn",
  "zhemen",
  "cmen",
  "zemen",
  "coji",
  "cojí",
  "cojer",
  "coger",
  "cogi",
  "cogí",
  "cogida",
  "cogido",
  "cogeme",
  "cógeme",
  "teta",
  "tetas",
  "vagina",
  "vaginas",
  "penetrar",
  "penetracion",
  "penetración",
  "sexo",
  "sexual",
  "naco",
  "naca",
  "culero",
  "culera",
  "pinche",
  "pinchis",
  "maricónazo",
  "pito",
  "pene",
  "nepe",
  "pinga",
  "piho",
  "phito",
  "phinga",
  "culo",
  "culos",
  "culitos",
  "culero",
  "culera",
  "culiao",
  "culiada",
  "culh0",
  "culho",
  "teta",
  "tetas",
  "pezon",
  "pezones",
  "teton",
  "tetona",
  "tetonas",
  "vagina",
  "vaginas",
  "vulva",
  "clitoris",
  "clit",
  "anal",
  "ano",
  "ahno",
  "porno",
  "pornografia",
  "pornográfico",
  "pornografico",
  "pornhub",
  "sexo",
  "sexual",
  "semen",
  "masturbar",
  "masturbacion",
  "masturbación",
  "puta",
  "puto",
  "putos",
  "putas",
  "putísima",
  "putisima",
  "put4",
  "put0",
  "phuta",
  "phutha",
  "putha",
  "phuto",
  "phutho",
  "putho",
  "phu tha",
  "pu tha",
  "phu-tha",
  "pu-tha",
  "verga",
  "vergas",
  "vergon",
  "vergón",
  "vergota",
  "vergudo",
  "vrga",
  "v3rga",
  "verg4",
  "vergha",
  "v3rg4",
  "cabro",
  "cabrona",
  "cabrones",
  "cabron",
  "cabronazo",
  "cabroncete",
  "kbro",
  "ca bro",
  "c a b r o",
  "k bro",
  "marica",
  "marico",
  "maricon",
  "maricón",
  "marikon",
  "marik",
  "maric",
  "marikhon",
  "mariquita",
  "marikita",
  "mariqta",
  "mari khon",
  "mari k",
  "mari-k",
  "mari con",
  "mari c on",
  "maricona",
  "mariconazo",
  "gay",
  "gey",
  "gei",
  "gai",
  "ghey",
  "ghei",
  "g4y",
  "g3y",
  "weon",
  "weona",
  "weón",
  "weá",
  "wea",
  "webon",
  "webona",
  "webón",
  "wueon",
  "wueona",
  "guey",
  "güey",
  "guei",
  "güei",
  "huevon",
  "huevón",
  "huevona",
  "huevones",
  "huevonazo",
  "huevada",
  "huevadas",
  "pendejo",
  "pendeja",
  "pendejos",
  "pendejas",
  "pendejazo",
  "pendejita",
  "pinche",
  "pinchis",
  "pajero",
  "pajera",
  "pajear",
  "pajazo",
  "pelotudo",
  "pelotuda",
  "boludo",
  "boluda",
  "forro",
  "gilipollas",
  "capullo",
  "idiota",
  "imbecil",
  "imbécil",
  "tarado",
  "tarada",
  "baboso",
  "babosa",
  "subnormal",
  "mongol",
  "mierda",
  "mierdas",
  "mierdero",
  "mierderos",
  "mierdoso",
  "mierdosa",
  "mierd",
  "mrd",
  "mierda seca",
  "mierd4",
  "mi3rda",
  "m1erda",
  "m13rda",
  "mierdha",
  "cagar",
  "cagada",
  "cagado",
  "cagon",
  "cagón",
  "cagona",
  "chingar",
  "chingada",
  "chingado",
  "chingon",
  "chingón",
  "chingona",
  "ching4r",
  "chingad0",
  "joder",
  "jodido",
  "jodida",
  "jodón",
  "jodona",
  "jodete",
  "coño",
  "cojon",
  "cojones",
  "coñazo",
  "coñito",
  "cojudo",
  "cojuda",
  "gonorrea",
  "malparido",
  "malparida",
  "malparío",
  "malparia",
  "pirobo",
  "careverga",
  "careculo",
  "carepinga",
  "caremonda",
  "hdp",
  "hp",
  "ctm",
  "ctmr",
  "csm",
  "csmr",
  "ctmre",
  "csmre",
  "tmr",
  "ptm",
  "ptmr",
  "pta",
  "qlo",
  "qliao",
  "hijoputa",
  "hijo de puta",
  "hijodeputa",
  "hijueputa",
  "bitch",
  "fuck",
  "shit",
  "asshole",
  "chucha",
  "chucha madre",
  "chuchamadre",
  "chuchetu mare",
  "chu che tu mare",
  "con che tu mare",
  "conche tu mare",
  "conchetumadre",
  "conchetumare",
  "conchasumadre",
  "conchesumadre",
  "conchetu madre",
  "concha de tu madre",
  "concha tu madre",
  "violar",
  "coger",
  "cojer",
  "cogi",
  "coji",
  "cogido",
  "cogida",
  "cogeme",
  "cógeme",
  "mamon",
  "mamón",
  "mamada",
  "mamame",
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

function stripDiacriticsPreservingEnye(value) {
  const raw = String(value ?? "");
  if (!raw) return "";
  const lower = "__STREAMFUSION_ENYE_LOWER__";
  const upper = "__STREAMFUSION_ENYE_UPPER__";
  return raw
    .replace(/ñ/g, lower)
    .replace(/Ñ/g, upper)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(new RegExp(lower, "g"), "ñ")
    .replace(new RegExp(upper, "g"), "Ñ");
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

function makeProfanityPattern(word) {
  const normalized = normalizeForMatch(word).trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  const collapsed = normalized.replace(/\s+/g, "");
  const core = normalized
    .split(" ")
    .filter(Boolean)
    .map((piece) => piece
      .split("")
      .map((ch, index, arr) => {
        const safe = ch.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&");
        return index < arr.length - 1
          ? `${safe}+[\\s._-]*(?:h+[\\s._-]*)?`
          : `${safe}+`;
      })
      .join(""))
    .join("[\\s._-]+");
  return collapsed.length <= 4
    ? `(^|[^\\p{L}\\p{N}])(?:${core})(?=$|[^\\p{L}\\p{N}])`
    : `(?:${core})`;
}

const PROFANITY_RE = new RegExp([...new Set([...BLOCKED_WORDS].map(makeProfanityPattern).filter(Boolean))].join("|"), "giu");

function censorProfanityText(value) {
  const source = normalizeSpaces(stripBracketedSegments(value));
  if (!source || !PROFANITY_RE) return source;
  return source.replace(PROFANITY_RE, " ");
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

function sanitizeWord(token, { maxDigits = 4, maxLaughRepeats = 3, preserveEnye = false } = {}) {
  let value = String(token ?? "").trim();
  if (!value) return "";

  value = preserveEnye ? stripDiacriticsPreservingEnye(value) : stripDiacritics(value);
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
  const preserveEnye = Boolean(options.preserveEnye);
  const source = censorProfanityText(value);
  if (!source) return "";

  const tokens = source.split(/\s+/).filter(Boolean);
  const out = [];
  for (const rawToken of tokens) {
    const token = rawToken
      .replace(/^[^\p{L}\p{N}]+/gu, "")
      .replace(/[^\p{L}\p{N}]+$/gu, "");
    if (!token) continue;

    const cleaned = sanitizeWord(token, { maxDigits, maxLaughRepeats, preserveEnye });
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
