const DEFAULT_MAX_DISTANCE = 3;

function normalizeCommentText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshteinDistance(a = "", b = "") {
  const s = String(a || "");
  const t = String(b || "");
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const rows = s.length + 1;
  const cols = t.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[rows - 1][cols - 1];
}

function normalizeVoiceQuery(value) {
  return normalizeCommentText(value).replace(/\s+/g, " ").trim();
}

function uniqueNormalizedAliases(aliases = []) {
  const seen = new Set();
  const out = [];
  for (const alias of Array.isArray(aliases) ? aliases : []) {
    const normalized = normalizeVoiceQuery(alias);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}


const CUSTOM_VOICE_RULES_BY_OWNER = new Map();

export function setCustomVoiceRules(ownerId = "", voices = []) {
  const key = String(ownerId || "").trim();
  if (!key) return;
  const rules = (Array.isArray(voices) ? voices : []).map((voice) => ({
    voiceKey: `fish:${String(voice.fishId || voice.id || '').trim()}`,
    voiceLabel: String(voice.label || voice.name || voice.fishId || 'Voz personalizada').trim(),
    aliases: uniqueNormalizedAliases([voice.label, voice.fishId, ...(Array.isArray(voice.tags) ? voice.tags : String(voice.tags || '').split(','))]),
  })).filter((rule) => rule.aliases.length);
  CUSTOM_VOICE_RULES_BY_OWNER.set(key, rules);
}
export const VOICE_RULE_SPECS = [
  { voiceKey: "verity", voiceLabel: "Verity", aliases: ["verity"] },
  { voiceKey: "barney", voiceLabel: "Barney", aliases: ["barney", "barnei", "barni", "barney voz", "barney voice", "barneyy"] },
  { voiceKey: "naruto", voiceLabel: "Naruto Shippuden", aliases: ["naruto", "naruto shippuden", "narutoshippuden", "shippuden"] },
  { voiceKey: "goku", voiceLabel: "Goku", aliases: ["goko", "gokuu", "gok", "goku", "gokuuuu", "gocu"] },
  { voiceKey: "stitch", voiceLabel: "Stitch", aliases: ["stitch"] },
  { voiceKey: "elmo", voiceLabel: "Elmo", aliases: ["elmo"] },
  { voiceKey: "minion", voiceLabel: "Minion", aliases: ["minion"] },
  { voiceKey: "mordecai", voiceLabel: "Mordecai", aliases: ["mordecai"] },
  { voiceKey: "rigby", voiceLabel: "Rigby", aliases: ["rigby"] },
  { voiceKey: "akaza_ds", voiceLabel: "Akaza DS", aliases: ["akaza ds", "akaza", "akazads"] },
  { voiceKey: "tanjiro_ds", voiceLabel: "Tanjiro DS", aliases: ["tanjiro", "tanjiro ds", "tanjirods"] },
  { voiceKey: "shinobu_ds", voiceLabel: "Shinobu DS", aliases: ["shinobu", "shinobu ds", "shinobuds"] },
  { voiceKey: "nagi_seishiro", voiceLabel: "Nagi Seishiro", aliases: ["nagi", "nagi seishiro", "seishiro"] },
  { voiceKey: "eren_yeager", voiceLabel: "Eren Yeager", aliases: ["eren", "eren yeager", "eren jaeger", "yeager", "jaeger"] },
  { voiceKey: "thanos", voiceLabel: "Thanos", aliases: ["thanos"] },
  { voiceKey: "mikasa", voiceLabel: "Mikasa", aliases: ["mikasa", "mikasa ackerman", "ackerman"] },
  { voiceKey: "inosuke_ds", voiceLabel: "Inosuke DS", aliases: ["inosuke", "inosuke ds", "inozu", "inosuke demon slayer", "inosuke kimetsu"] },
  { voiceKey: "tom_spiderman", voiceLabel: "Tom Spiderman", aliases: ["tom spiderman", "tomspiderman"] },
  { voiceKey: "meliodas", voiceLabel: "Meliodas", aliases: ["meliodas"] },
  { voiceKey: "escanor", voiceLabel: "Escanor", aliases: ["escanor"] },
  { voiceKey: "zenitsu_ds", voiceLabel: "Zenitsu DS", aliases: ["zenitsu", "zenitsu ds"] },
  { voiceKey: "mitsuri_ds", voiceLabel: "Mitsuri DS", aliases: ["mitsuri", "mitsuri ds"] },
  { voiceKey: "giyuu_tomioka_ds", voiceLabel: "Giyuu Tomioka DS", aliases: ["giyuu", "giyu", "giyuu tomioka", "giyuu tomioka ds", "tomioka"] },
  { voiceKey: "sanemi_ds", voiceLabel: "Sanemi DS", aliases: ["sanemi", "sanemi ds"] },
  { voiceKey: "muichiro_tokito", voiceLabel: "Muichiro Tokito", aliases: ["muichiro", "muichiro tokito", "tokito"] },
  { voiceKey: "kyojuro_rengoku", voiceLabel: "Kyojuro Rengoku", aliases: ["kyojuro", "kyojuro rengoku", "rengoku"] },
  { voiceKey: "megumi_fushiguro", voiceLabel: "Megumi Fushiguro", aliases: ["megumi", "megumi fushiguro", "fushiguro", "megumi jjk", "megumi jujutsu"] },
  { voiceKey: "nobara_kugisaki", voiceLabel: "Nobara Kugisaki", aliases: ["nobara", "nobara kugisaki", "kugisaki", "nobara jjk", "nobara jujutsu"] },
  { voiceKey: "venom", voiceLabel: "Venom", aliases: ["venom", "symbiote", "el simbionte"] },
  { voiceKey: "anuel", voiceLabel: "Anuel", aliases: ["anuel", "anuel aa", "anuelaa"] },
  { voiceKey: "bad_bunny", voiceLabel: "Bad Bunny", aliases: ["bad bunny", "badbunny", "bunny"] },
  { voiceKey: "marge_simpson", voiceLabel: "Marge Simpson", aliases: ["marge", "marge simpson", "simpson"] },
  { voiceKey: "ellis_l4d2", voiceLabel: "Ellis L4D2", aliases: ["ellis", "ellis l4d2", "l4d2 ellis", "left 4 dead ellis", "left4dead ellis"] },
  { voiceKey: "bills_dbz", voiceLabel: "Bills DBZ", aliases: ["bills", "beerus", "bills dbz", "bills dragon ball", "bills dragon ball z"] },
  { voiceKey: "nick_l4d2", voiceLabel: "Nick L4D2", aliases: ["nick", "nick l4d2", "l4d2 nick", "left 4 dead nick", "left4dead nick"] },
  { voiceKey: "coach_l4d2", voiceLabel: "Coach L4D2", aliases: ["coach", "coach l4d2", "l4d2 coach", "left 4 dead coach", "left4dead coach"] },
  { voiceKey: "bill_l4d2", voiceLabel: "Bill L4D2", aliases: ["bill", "bill l4d2", "l4d2 bill", "left 4 dead bill", "left4dead bill"] },
  { voiceKey: "francis_l4d2", voiceLabel: "Francis L4D2", aliases: ["francis", "francis l4d2", "l4d2 francis", "left 4 dead francis", "left4dead francis"] },
  { voiceKey: "gru", voiceLabel: "Gru", aliases: ["gru"] },
  { voiceKey: "don_cangrejo", voiceLabel: "Don Cangrejo", aliases: ["doncangrejo", "don cangrejo", "don", "cangrejo"] },
  { voiceKey: "plankton", voiceLabel: "Plankton", aliases: ["plankton"] },
  { voiceKey: "ken_kaneki", voiceLabel: "Ken Kaneki", aliases: ["kaneki", "ken", "kenkaneki", "ken kaneki"] },
  { voiceKey: "chavo_real", voiceLabel: "Chavo Real", aliases: ["chavo", "chavo8", "chav", "elchavo", "chavoreal", "real", "chavito", "chavo real", "chabo"] },
  { voiceKey: "chavo_animado", voiceLabel: "Chavo Animado", aliases: ["chavo", "chavo a", "chavo animado", "animado", "chavoanimado", "chavo anim"] },
  { voiceKey: "kiko_real", voiceLabel: "Kiko Real", aliases: ["kiko real", "kiko", "real", "kikoreal"] },
  { voiceKey: "kiko_animado", voiceLabel: "Kiko Animado", aliases: ["kiko", "kikoanimado", "animado", "kiko animado"] },
  { voiceKey: "don_ramon_r", voiceLabel: "Don Ramon R", aliases: ["donramonr", "don", "ramon", "don ramon r"] },
  { voiceKey: "don_ramon_a", voiceLabel: "Don Ramon A", aliases: ["donramona", "don ramon a", "ramon", "don"] },
  { voiceKey: "michael_jackson", voiceLabel: "Michael Jackson", aliases: ["michaeljackson", "michael jackson", "jackson", "michael"] },
  { voiceKey: "milk_dbz", voiceLabel: "Milk DBZ", aliases: ["milk dbz", "milk", "dbz", "milkdbz"] },
  { voiceKey: "bulma_joven", voiceLabel: "Bulma Joven", aliases: ["bulmajoven", "joven", "bulma joven", "bulma"] },
  { voiceKey: "ragatha_dc", voiceLabel: "Ragatha DC", aliases: ["ragathadc", "ragatha", "ragatha dc"] },
  { voiceKey: "kinger_cuerdo_dc", voiceLabel: "Kinger Cuerdo DC", aliases: ["cuerdo", "kinger cuerdo dc", "kinger", "kingercuerdodc"] },
  { voiceKey: "kinger_dc", voiceLabel: "Kinger DC", aliases: ["kinger dc", "kinger", "kingerdc"] },
  { voiceKey: "pinkie_pie", voiceLabel: "Pinki Pie", aliases: ["pie", "pinkipie", "pinki pie", "pinki"] },
  { voiceKey: "sonic", voiceLabel: "Sonic", aliases: ["sonic"] },
  { voiceKey: "yuji_itadori", voiceLabel: "Yuji Itadori", aliases: ["yujiitadori", "itadori", "yuji itadori", "yuji"] },
  { voiceKey: "gojo_satoru", voiceLabel: "Gojo Satoru", aliases: ["satoru", "gojosatoru", "gojo", "gojo satoru"] },
  { voiceKey: "makanaki", voiceLabel: "Makanaki", aliases: ["makanaki"] },
  { voiceKey: "gaspi", voiceLabel: "Gaspi", aliases: ["gaspi"] },
  { voiceKey: "duki", voiceLabel: "Duki", aliases: ["duki"] },
  { voiceKey: "lit_killah", voiceLabel: "Lit Killah", aliases: ["litkillah", "lit killah", "killah", "lit"] },
  { voiceKey: "scooby_doo", voiceLabel: "Scooby Doo", aliases: ["scooby doo", "scoobydoo", "doo", "scooby"] },
  { voiceKey: "shaggy", voiceLabel: "Shaggy", aliases: ["shagy", "chaggy", "shagi", "shaggi", "shagui", "shaggy"] },
  { voiceKey: "po", voiceLabel: "PO", aliases: [] },
  { voiceKey: "bob_esponja", voiceLabel: "Bob Esponja", aliases: ["esponja", "bobesponja", "bob", "bob esponja"] },
  { voiceKey: "calamardo", voiceLabel: "Calamardo", aliases: ["calamardo"] },
  { voiceKey: "patricio_estrella", voiceLabel: "Patricio Estrella", aliases: ["patricioestrella", "patricio estrella", "patricio", "estrella"] },
  { voiceKey: "narrador_esqueleto", voiceLabel: "Narrador Esqueleto", aliases: ["esqueleto", "narrador esqueleto", "narrador", "narradoresqueleto"] },
  { voiceKey: "l_death_note", voiceLabel: "L (Death Note)", aliases: ["ldeathnote", "note", "death", "l death note"] },
  { voiceKey: "light_death_note", voiceLabel: "Light (Death Note)", aliases: ["death", "light", "light death note", "lightdeathnote", "note"] },
  { voiceKey: "ryuk_death_note", voiceLabel: "Ryuk (Death Note)", aliases: ["death", "ryuk", "ryukdeathnote", "ryuk death note", "note"] },
  { voiceKey: "darwin_gumball", voiceLabel: "Darwin de Gumball", aliases: ["darwingumball", "darwin", "darwin gumball", "gumball", "darwindegumball", "darwin de gumball"] },
  { voiceKey: "caine_circo_digital", voiceLabel: "Caine (Circo Digital)", aliases: ["circo", "caine", "digital", "cainecircodigital", "caine circo digital"] },
  { voiceKey: "jax_circo_digital", voiceLabel: "Jax (Circo Digital)", aliases: ["jax circo digital", "circo", "jax", "digital", "jaxcircodigital"] },
  { voiceKey: "kratos_gow3", voiceLabel: "Kratos (GOW 3)", aliases: ["kratos gow 3", "kratos", "kratosgow3"] },
  { voiceKey: "spiderman_ultimate", voiceLabel: "Spiderman Ultimate", aliases: ["spiderman", "spiderman ultimate", "spidermanultimate", "ultimate"] },
  { voiceKey: "capitan_america", voiceLabel: "Capit\u00e1n Am\u00e9rica", aliases: ["capitanamerica", "america", "capitan", "capitan america"] },
  { voiceKey: "loquendo", voiceLabel: "Loquendo", aliases: ["loquendo"] },
  { voiceKey: "locutor", voiceLabel: "Locutor", aliases: ["locutor"] },
  { voiceKey: "el_dui_malcolm", voiceLabel: "El Dui de Malcolm", aliases: ["el dui de malcolm", "elduidemalcolm", "duimalcolm", "malcolm", "dui malcolm"] },
  { voiceKey: "ponmi_dc", voiceLabel: "Ponmi DC", aliases: ["ponmidc", "ponmi", "ponmy", "pornii", "ponmee", "ponmi dc", "porni", "ponni", "pommi", "ponm", "poni", "ponmii"] },
  { voiceKey: "falsity", voiceLabel: "Falsity", aliases: ["falsity"] },
  { voiceKey: "alastor", voiceLabel: "Alastor", aliases: ["alastor"] },
  { voiceKey: "denji", voiceLabel: "Denji", aliases: ["denji"] },
  { voiceKey: "reze", voiceLabel: "Reze", aliases: ["reze"] },
  { voiceKey: "morty_smith", voiceLabel: "Morty Smith", aliases: ["morty smith", "smith", "mortysmith", "morty"] },
  { voiceKey: "rick_sanchez", voiceLabel: "Rick Sanchez", aliases: ["ricksanchez", "sanchez", "rick sanchez", "rick"] },
  { voiceKey: "shrek", voiceLabel: "Shrek", aliases: ["shrek"] },
  { voiceKey: "mario_bros", voiceLabel: "Mario Bros", aliases: ["mariobros", "mario", "mario bros", "bros"] },
  { voiceKey: "gato_con_botas", voiceLabel: "Gato con botas", aliases: ["gatoconbotas", "botas", "gato con botas", "gato"] },
  { voiceKey: "jake_el_perro", voiceLabel: "Jake el perro", aliases: ["jake perro", "jakeperro", "jake el perro", "perro", "jake", "jakeelperro"] },
  { voiceKey: "fin_el_humano", voiceLabel: "Fin el humano", aliases: ["finhumano", "fin", "humano", "fin el humano", "fin humano", "finelhumano"] },
  { voiceKey: "rey_helado", voiceLabel: "Rey Helado", aliases: ["rey", "reyhelado", "rey helado", "helado"] },
  { voiceKey: "mickey_mouse", voiceLabel: "Mickey Mouse", aliases: ["mickey mouse", "mickeymouse", "mouse", "mickey"] },
  { voiceKey: "kasane_teto", voiceLabel: "Kasane Teto", aliases: ["kasane teto", "teto", "kasane", "kasaneteto"] },
  { voiceKey: "miku_hatsune", voiceLabel: "Miku Hatsune", aliases: ["miku", "mikuhatsune", "miku hatsune", "hatsune"] },
  { voiceKey: "phineas", voiceLabel: "Phineas", aliases: ["phineas"] },
  { voiceKey: "dr_doofenshmirtz", voiceLabel: "Dr Doofenshmirtz", aliases: ["doofenshmirtz", "dr doofenshmirtz", "drdoofenshmirtz"] },
  { voiceKey: "krilin_dbz", voiceLabel: "Krilin DBZ", aliases: ["krilindbz", "krilin dbz", "dbz", "krilin"] },
  { voiceKey: "piccoro_dbz", voiceLabel: "Piccoro DBZ", aliases: ["piccoro dbz", "piccoro", "piccorodbz", "dbz"] },
  { voiceKey: "peppa_pig", voiceLabel: "Peppa Pig", aliases: ["peppa pig", "peppa", "peppapig"] },
  { voiceKey: "george_pig", voiceLabel: "George Pig", aliases: ["george pig", "george", "georgepig"] },
  { voiceKey: "missa_death_note", voiceLabel: "Misa amane", aliases: ["misa amane", "misa", "amane", "missa death note", "death note", "missa"] },
  { voiceKey: "batman", voiceLabel: "Batman", aliases: ["batman", "bat man"] },
  { voiceKey: "joker", voiceLabel: "Joker", aliases: ["joker", "the joker"] },
  { voiceKey: "invincible", voiceLabel: "Invincible", aliases: ["invincible"] },
  { voiceKey: "omni_man", voiceLabel: "Omni-Man", aliases: ["omni man", "omni-man", "omniman", "omni"] },
  { voiceKey: "el_mariana", voiceLabel: "El Mariana", aliases: ["el mariana", "mariana", "elmariana"] },
  { voiceKey: "deadpool", voiceLabel: "Deadpool", aliases: ["deadpool", "dead pool"] },
  { voiceKey: "fede_vigevani", voiceLabel: "Fede Vigevani", aliases: ["fede vigevani", "fede", "vigevani"] },
  { voiceKey: "missasinfonia_yt", voiceLabel: "Missasinfonia YT", aliases: ["missasinfonia", "missasinfonia yt", "missasinfoniayt"] },
  { voiceKey: "tony_stark", voiceLabel: "Tony Stark", aliases: ["tony", "stark", "tonystark", "tony stark"] },
  { voiceKey: "adam_sandler", voiceLabel: "Adam Sandler", aliases: ["adam", "adam sandler", "sandler", "adamsandler"] },
  { voiceKey: "abrahaham_yt", voiceLabel: "Abrahaham YT", aliases: ["abrahaham", "abrahahamyt", "abrahaham yt"] },
  { voiceKey: "farid_dieck_yt", voiceLabel: "Farid Dieck YT", aliases: ["dieck", "fariddieckyt", "farid dieck yt", "farid"] },
  { voiceKey: "german_garmendia", voiceLabel: "German Garmendia", aliases: ["german garmendia", "germangarmendia", "garmendia", "german"] },
  { voiceKey: "auronplay", voiceLabel: "Auronplay", aliases: ["auronplay"] },
  { voiceKey: "elrubius", voiceLabel: "ElRubius", aliases: ["elrubius"] },
  { voiceKey: "fernanfloo", voiceLabel: "Fernanfloo", aliases: ["fernanfloo"] },
  { voiceKey: "ibai", voiceLabel: "Ibai", aliases: ["ibai"] },
  { voiceKey: "messi", voiceLabel: "Messi", aliases: ["messi"] },
  { voiceKey: "cr7", voiceLabel: "CR7", aliases: ["cr7"] },
  { voiceKey: "paisana_jacinta", voiceLabel: "Paisana Jacinta", aliases: ["paisana", "jacinta", "paisanajacinta", "paisana jacinta"] },
  { voiceKey: "pible", voiceLabel: "Pible", aliases: ["pible"] },
  { voiceKey: "town", voiceLabel: "Town", aliases: ["town"] },
  { voiceKey: "aldeano_minecraft", voiceLabel: "Aldeano Minecraft", aliases: ["aldeanominecraft", "aldeano minecraft", "aldeano", "minecraft"] },
  { voiceKey: "woody", voiceLabel: "Woody", aliases: ["woody"] },
  { voiceKey: "buzz_lightyear", voiceLabel: "Buzz Lightyear", aliases: ["buzz", "buzzlightyear", "buzz lightyear", "lightyear"] },
  { voiceKey: "homero_simpson", voiceLabel: "Homero Simpson", aliases: ["homerosimpson", "simpson", "homero", "homero simpson"] },
  { voiceKey: "bart_simpson", voiceLabel: "Bart Simpson", aliases: ["bart simpson", "bartsimpson", "simpson", "bart"] },
  { voiceKey: "milo_j", voiceLabel: "Milo J", aliases: ["milo j", "milo", "miloj"] },
  { voiceKey: "roro", voiceLabel: "Roro", aliases: ["rorrro", "roro", "roroo"] },
  { voiceKey: "lamine_yamal", voiceLabel: "Lamine Yamal", aliases: ["lamin yamal", "lamine", "lamyne", "lamine yamal", "lamineyamal", "yamal", "lamin"] },
  { voiceKey: "homero_chino", voiceLabel: "Homero Chino", aliases: ["homerochino", "omero", "homero", "chino", "homero chino"] },
  { voiceKey: "chilindrina", voiceLabel: "Chilindrina", aliases: ["chilindrina", "chindrina", "chilindra", "chilindrinaa"] },
  { voiceKey: "jh_de_la_cruz", voiceLabel: "JH de la cruz", aliases: ["jh", "jh cruz", "de la cruz", "delacruz", "cruz", "jhcruz", "jhdelacruz", "j h de la cruz", "jh de la cruz"] },
  { voiceKey: "pitbull", voiceLabel: "Pitbull", aliases: ["pitbull", "pit bull", "pitbulls", "pit bul", "pitbul"] },
  { voiceKey: "dra_polo", voiceLabel: "Dra Polo", aliases: ["dra polo", "dr polo", "polo", "drapolo", "dra", "doctora polo"] },
  { voiceKey: "burro", voiceLabel: "Burro", aliases: ["el burro", "burroo", "burro"] },
  { voiceKey: "bowser", voiceLabel: "Bowser", aliases: ["browser", "bauser", "bouser", "bowser"] },
  { voiceKey: "mono_oaxaco", voiceLabel: "MonoOaxaco", aliases: ["oaxaco", "monooaxaco", "mono oaxaco", "monoaaxaco", "mono"] },
  { voiceKey: "holman", voiceLabel: "Holman", aliases: ["holmann", "holman", "olman"] },
  { voiceKey: "arigameplays", voiceLabel: "Arigameplays", aliases: ["ari gameplays", "arigameplayss", "arigameplay", "ari", "arigame", "arigameplays"] },
];

export const VOICE_RULE_MATCHERS = VOICE_RULE_SPECS.map((spec) => ({
  voiceKey: spec.voiceKey,
  voiceLabel: spec.voiceLabel,
  aliases: uniqueNormalizedAliases([spec.voiceLabel, ...(spec.aliases || [])]),
}));

export function findVoiceRuleFromComment(message, ownerId = "") {
  const normalized = normalizeVoiceQuery(message);
  if (!normalized) return null;
  const candidates = Array.from(new Set([normalized, normalized.replace(/\s+/g, "")]));
  let best = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    for (const spec of [...(CUSTOM_VOICE_RULES_BY_OWNER.get(String(ownerId || "").trim()) || []), ...VOICE_RULE_MATCHERS]) {
      for (const alias of spec.aliases) {
        if (candidate === alias) {
          return spec;
        }
        if (alias.length >= 4 && (candidate.includes(alias) || alias.includes(candidate))) {
          return spec;
        }
        const distance = levenshteinDistance(candidate, alias);
        const threshold = Math.max(1, Math.min(DEFAULT_MAX_DISTANCE, Math.ceil(Math.max(candidate.length, alias.length) / 4)));
        if (distance <= threshold && distance < bestScore) {
          best = spec;
          bestScore = distance;
        }
      }
    }
  }

  return bestScore <= DEFAULT_MAX_DISTANCE ? best : null;
}

export function getVoiceRuleOptions(ownerId = "") {
  const custom = CUSTOM_VOICE_RULES_BY_OWNER.get(String(ownerId || "").trim()) || [];
  return [...custom, ...VOICE_RULE_MATCHERS].map((rule) => ({
    voiceKey: String(rule.voiceKey || "").trim(),
    voiceLabel: String(rule.voiceLabel || rule.voiceKey || "Voz").trim(),
    aliases: [...(rule.aliases || [])],
  }));
}

export function findVoiceRuleByAlias(ownerId = "", value = "") {
  const normalized = normalizeVoiceQuery(value);
  if (!normalized) return null;
  const list = [...(CUSTOM_VOICE_RULES_BY_OWNER.get(String(ownerId || "").trim()) || []), ...VOICE_RULE_MATCHERS];
  for (const rule of list) {
    if ((rule.aliases || []).some((alias) => alias === normalized)) return rule;
  }
  return null;
}
