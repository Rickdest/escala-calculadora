import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("FETCH-TRENDS");

// Pool de User-Agents reais (rotacionados a cada chamada)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Cache de cookies em memória do isolate (vive enquanto a function estiver "quente")
let cachedCookies: { value: string; expiresAt: number } | null = null;
const COOKIE_TTL_MS = 30 * 60 * 1000; // 30 min

// ============================================================
// EXTRAÇÃO INTELIGENTE DE KEYWORD
// ============================================================

// Stop-words gerais + ruído de marketing de e-commerce BR
const STOP_WORDS = new Set([
  // conectores
  "com", "e", "para", "de", "do", "da", "dos", "das", "sem", "em", "no", "na",
  "ou", "a", "o", "os", "as", "que", "por", "ao", "à",
  // marketing genérico
  "elegancia", "elegância", "conforto", "premium", "original", "oficial",
  "novo", "nova", "novidade", "luxo", "top", "qualidade", "importado",
  "lancamento", "lançamento", "exclusivo", "exclusiva", "perfeito", "perfeita",
  "ideal", "melhor", "super", "ultra", "mega", "promocao", "promoção",
  "barato", "barata", "oferta", "frete", "gratis", "grátis", "envio",
  "rapido", "rápido", "entrega", "garantia", "garantido",
  // unidades / quantidade
  "kit", "pacote", "combo", "unid", "un", "pç", "pcs", "peças", "peca", "peça", "pc",
  "par", "pares", "pares",
  // outros ruídos
  "tipo", "estilo", "modelo", "linha", "colecao", "coleção",
]);

// Frases promocionais de moda / casa / beleza (multi-palavra)
const MARKETING_PHRASES = [
  "empina bumbum", "levanta bumbum", "modela corpo", "modela cintura",
  "costas abertas", "decote profundo", "decote v", "cintura alta", "cintura baixa",
  "push up", "push-up", "anti celulite", "anti-celulite",
  "nao marca", "não marca", "nao transparente", "não transparente",
  "secagem rapida", "secagem rápida", "alta performance",
  "uso diario", "uso diário", "dia a dia",
  "longa duracao", "longa duração",
];

// Núcleos de produto (categorias) — ~250 itens dos verticais mais comuns no BR
const PRODUCT_CATEGORIES = new Set([
  // moda feminina/masculina
  "vestido", "calça", "calca", "legging", "short", "shorts", "saia", "blusa",
  "camisa", "camiseta", "regata", "top", "cropped", "body", "macacao", "macacão",
  "macaquinho", "conjunto", "jaqueta", "casaco", "blazer", "moletom", "sueter",
  "suéter", "cardigan", "colete", "jeans", "bermuda", "kimono", "robe", "pijama",
  "camisola", "lingerie", "calcinha", "sutiã", "sutia", "biquini", "biquíni",
  "maio", "maiô", "saida", "saída",
  // calçados / acessórios
  "tenis", "tênis", "sapato", "sandalia", "sandália", "chinelo", "bota", "botina",
  "rasteirinha", "scarpin", "salto", "mocassim", "papete", "sapatilha",
  "bolsa", "mochila", "carteira", "necessaire", "necessaire", "pochete",
  "cinto", "relogio", "relógio", "oculos", "óculos", "boné", "bone", "chapéu", "chapeu",
  "lenço", "lenco", "echarpe", "cachecol", "luva", "meia", "gravata",
  "brinco", "colar", "anel", "pulseira", "tornozeleira", "piercing",
  // beleza / cosméticos
  "shampoo", "condicionador", "mascara", "máscara", "creme", "hidratante",
  "perfume", "colonia", "colônia", "batom", "gloss", "rímel", "rimel",
  "delineador", "lapis", "lápis", "base", "po", "pó", "blush", "iluminador",
  "esmalte", "removedor", "sabonete", "protetor", "bronzeador", "leave",
  "umectacao", "umectação", "progressiva", "tonalizante", "tintura", "henna",
  "escova", "secador", "chapinha", "babyliss",
  // casa
  "sofa", "sofá", "cadeira", "mesa", "poltrona", "rack", "estante", "guarda",
  "cama", "cabeceira", "colchao", "colchão", "travesseiro", "lençol", "lencol",
  "fronha", "edredom", "manta", "cobertor", "cortina", "tapete", "almofada",
  "puff", "luminaria", "luminária", "abajur", "ventilador", "umidificador",
  "panela", "frigideira", "talher", "prato", "copo", "taça", "taca", "xicara",
  "xícara", "garrafa", "squeeze", "marmita", "lancheira", "tupperware",
  "organizador", "cesto", "balde", "vassoura", "rodo", "esfregão", "esfregao",
  // eletrônicos / tech
  "fone", "headphone", "earphone", "caixinha", "caixa", "som", "speaker",
  "smartwatch", "smartband", "celular", "smartphone", "tablet", "notebook",
  "carregador", "cabo", "adaptador", "suporte", "case", "capa", "pelicula",
  "película", "teclado", "mouse", "webcam", "microfone", "controle", "joystick",
  "ssd", "hd", "pendrive", "memoria", "memória",
  // infantil
  "fralda", "mamadeira", "chupeta", "carrinho", "bebe", "bebê", "berço", "berco",
  "brinquedo", "boneca", "boneco", "carrinho", "pelucia", "pelúcia",
  // pet
  "racao", "ração", "petisco", "coleira", "guia", "casinha", "comedouro", "bebedouro",
  // fitness / esportes
  "halter", "anilha", "esteira", "bicicleta", "patinete", "skate", "bola",
  "corda", "elastico", "elástico", "tapete", "colchonete", "luvas", "joelheira",
  // ferramentas / automotivo
  "furadeira", "parafusadeira", "serra", "martelo", "chave", "alicate",
  "pneu", "calota", "tapete", "capa",
]);

// Modificadores genéricos comuns (qualidades buscáveis)
const GENERIC_MODIFIERS = new Set([
  "longo", "longa", "curto", "curta", "medio", "médio", "media", "média",
  "social", "casual", "esportivo", "esportiva", "fitness", "academia",
  "infantil", "adulto", "juvenil",
  "canelada", "canelado", "suplex", "lycra", "elastano", "algodao", "algodão",
  "couro", "jeans", "linho", "seda", "veludo", "renda",
  "estampada", "estampado", "lisa", "liso", "listrada", "listrado", "floral",
  "manga", "curta", "longa",
  "intimo", "íntimo", "noite", "festa", "praia", "verao", "verão", "inverno",
  "termico", "térmico", "termica", "térmica",
  "redondo", "redonda", "quadrado", "quadrada", "oval",
  "grande", "pequeno", "pequena", "medio", "mini", "maxi",
  "classico", "clássico", "moderno", "vintage", "retro", "retrô",
  "sem fio", "bluetooth", "wireless", "gamer", "profissional",
]);

// Públicos-alvo (geralmente vão pro fim da query)
const AUDIENCES = new Set([
  "feminino", "feminina", "masculino", "masculina",
  "infantil", "unissex", "bebe", "bebê", "kids",
]);

function normalizeWord(w: string): string {
  return w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\b\d+\s*(g|kg|ml|l|cm|mm|m|w|v)\b/gi, " ")
    .replace(/\b\d+\s*x\s*\d+\b/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Extração inteligente:
 * 1) Remove frases de marketing
 * 2) Tokeniza, remove números/medidas/pontuação
 * 3) Remove stop-words
 * 4) Detecta categoria (núcleo do produto)
 * 5) Pega 1-2 modificadores genéricos relevantes
 * 6) Adiciona público-alvo (se houver)
 * 7) Ignora palavras "estranhas" (provável nome de modelo) — só mantém se categoria/modifier/audience
 *
 * Fallback: se não achar categoria, usa as 3 primeiras palavras "limpas".
 */
function extractKeyword(productName: string): string {
  let cleaned = productName.toLowerCase();

  // Remove frases promocionais multi-palavra
  for (const phrase of MARKETING_PHRASES) {
    const norm = normalizeWord(phrase);
    cleaned = cleaned
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(new RegExp(`\\b${norm}\\b`, "gi"), " ");
    cleaned = cleaned.replace(new RegExp(`\\b${phrase}\\b`, "gi"), " ");
  }

  const tokens = tokenize(cleaned);
  const normTokens = tokens.map(normalizeWord);

  // Detecta categoria (primeira ocorrência)
  let category: string | null = null;
  let categoryIdx = -1;
  for (let i = 0; i < normTokens.length; i++) {
    if (PRODUCT_CATEGORIES.has(normTokens[i])) {
      category = tokens[i];
      categoryIdx = i;
      break;
    }
  }

  // Coleta modificadores genéricos (após a categoria, ou em qualquer lugar se não houver)
  const modifiers: string[] = [];
  for (let i = 0; i < normTokens.length; i++) {
    if (i === categoryIdx) continue;
    if (GENERIC_MODIFIERS.has(normTokens[i]) && modifiers.length < 2) {
      modifiers.push(tokens[i]);
    }
  }

  // Detecta público-alvo
  let audience: string | null = null;
  for (let i = 0; i < normTokens.length; i++) {
    if (AUDIENCES.has(normTokens[i])) {
      audience = tokens[i];
      break;
    }
  }

  if (category) {
    const parts = [category, ...modifiers];
    if (audience && !parts.some((p) => normalizeWord(p) === normalizeWord(audience!))) {
      parts.push(audience);
    }
    return parts.slice(0, 4).join(" ").trim();
  }

  // Fallback: limpa stop-words e pega 3 primeiras
  const cleanTokens = tokens.filter((t, i) => !STOP_WORDS.has(normTokens[i]));
  return cleanTokens.slice(0, 3).join(" ").trim();
}

/**
 * Sugere termos alternativos quando o resultado for ruim.
 * Estratégia: gera variações simplificando (categoria + audiência, categoria + modifier, só categoria).
 */
function suggestAlternatives(productName: string, currentKeyword: string): string[] {
  const tokens = tokenize(productName);
  const normTokens = tokens.map(normalizeWord);

  let category: string | null = null;
  for (let i = 0; i < normTokens.length; i++) {
    if (PRODUCT_CATEGORIES.has(normTokens[i])) {
      category = tokens[i];
      break;
    }
  }

  let audience: string | null = null;
  for (let i = 0; i < normTokens.length; i++) {
    if (AUDIENCES.has(normTokens[i])) {
      audience = tokens[i];
      break;
    }
  }

  const modifiers: string[] = [];
  for (let i = 0; i < normTokens.length; i++) {
    if (GENERIC_MODIFIERS.has(normTokens[i])) modifiers.push(tokens[i]);
  }

  const out = new Set<string>();
  if (category && audience) out.add(`${category} ${audience}`);
  if (category && modifiers[0]) out.add(`${category} ${modifiers[0]}`);
  if (category) out.add(category);
  if (modifiers[0] && audience) out.add(`${modifiers[0]} ${audience}`);

  // Remove a atual
  out.delete(currentKeyword.toLowerCase().trim());
  return Array.from(out).slice(0, 3);
}

/**
 * Constrói cascata de variações da keyword, do mais específico ao mais genérico.
 * Ex: "vestido longo suplex feminino" → ["vestido longo suplex feminino", "vestido longo feminino", "vestido feminino", "vestido"]
 *
 * Estratégia:
 * 1ª) keyword principal (categoria + 1-2 modifiers + audience)
 * 2ª) categoria + 1 modifier + audience (drop o modifier mais "raro" — o último coletado)
 * 3ª) categoria + audience
 * 4ª) só categoria
 */
function buildKeywordCascade(productName: string): string[] {
  const primary = extractKeyword(productName);
  const cascade: string[] = [primary];

  // Re-extrai partes pra montar variações
  let cleaned = productName.toLowerCase();
  for (const phrase of MARKETING_PHRASES) {
    const norm = normalizeWord(phrase);
    cleaned = cleaned
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(new RegExp(`\\b${norm}\\b`, "gi"), " ");
    cleaned = cleaned.replace(new RegExp(`\\b${phrase}\\b`, "gi"), " ");
  }
  const tokens = tokenize(cleaned);
  const normTokens = tokens.map(normalizeWord);

  let category: string | null = null;
  let categoryIdx = -1;
  for (let i = 0; i < normTokens.length; i++) {
    if (PRODUCT_CATEGORIES.has(normTokens[i])) {
      category = tokens[i];
      categoryIdx = i;
      break;
    }
  }

  const modifiers: string[] = [];
  for (let i = 0; i < normTokens.length; i++) {
    if (i === categoryIdx) continue;
    if (GENERIC_MODIFIERS.has(normTokens[i])) modifiers.push(tokens[i]);
  }

  let audience: string | null = null;
  for (let i = 0; i < normTokens.length; i++) {
    if (AUDIENCES.has(normTokens[i])) {
      audience = tokens[i];
      break;
    }
  }

  if (category) {
    // Variação intermediária: categoria + primeiro modifier + audience
    if (modifiers[0]) {
      const v = [category, modifiers[0], audience].filter(Boolean).join(" ").trim();
      if (v && !cascade.includes(v)) cascade.push(v);
    }
    // categoria + audience
    if (audience) {
      const v = `${category} ${audience}`.trim();
      if (!cascade.includes(v)) cascade.push(v);
    }
    // só categoria (última cartada)
    if (!cascade.includes(category)) cascade.push(category);
  }

  return cascade.slice(0, 4);
}

// ============================================================
// GOOGLE TRENDS (cookies + UAs rotativos)
// ============================================================

async function getCookies(ua: string): Promise<string> {
  if (cachedCookies && cachedCookies.expiresAt > Date.now()) {
    return cachedCookies.value;
  }

  const res = await fetch("https://trends.google.com/?geo=BR", {
    headers: {
      "User-Agent": ua,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const setCookies =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()
      : (res.headers.get("set-cookie") ?? "").split(/,(?=\s*\w+=)/);

  const cookieParts: string[] = [];
  for (const sc of setCookies) {
    const first = String(sc).split(";")[0].trim();
    if (first && first.includes("=")) {
      cookieParts.push(first);
    }
  }

  if (!cookieParts.some((c) => c.startsWith("CONSENT="))) {
    cookieParts.push("CONSENT=YES+cb.20210720-07-p0.pt-BR+FX+410");
  }
  if (!cookieParts.some((c) => c.startsWith("SOCS="))) {
    cookieParts.push("SOCS=CAESHAgBEhJnd3NfMjAyMzA5MTktMF9SQzIaAnB0IAEaBgiAhsymBg");
  }

  const cookieHeader = cookieParts.join("; ");
  cachedCookies = { value: cookieHeader, expiresAt: Date.now() + COOKIE_TTL_MS };
  logger.info("cookies_captured", { count: cookieParts.length });
  return cookieHeader;
}

function buildHeaders(ua: string, cookies: string) {
  return {
    "User-Agent": ua,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    Referer: "https://trends.google.com/trends/explore",
    Origin: "https://trends.google.com",
    Cookie: cookies,
    "X-Client-Data": "CIa2yQEIpbbJAQipncoBCJD3ygEIlqHLAQiFoM0BCKijzQEY54LOAQ==",
  };
}

type RelatedKeyword = {
  keyword: string;
  value: number; // top: 0-100; rising: % growth (9999 = Breakout)
  isBreakout: boolean;
  formattedValue: string; // ex: "+250%", "Em alta", "100"
};

type RegionEntry = {
  region: string;
  value: number;
};

type ComparisonSeriesPoint = { period_date: string; values: (number | null)[] };

type TrendsResult = {
  timeline: Array<{ period_date: string; interest_score: number }>;
  relatedTop: RelatedKeyword[];
  relatedRising: RelatedKeyword[];
  regions: RegionEntry[];
  comparisonSeries?: ComparisonSeriesPoint[]; // multi-keyword
};

async function fetchGoogleTrends(
  keyword: string,
  timeRange: string = "today 5-y",
  geoOverride?: string,
  extraKeywords: string[] = [],
  geoResolution: "REGION" | "CITY" | "COUNTRY" = "REGION",
): Promise<TrendsResult> {
  const geo = geoResolution === "COUNTRY" ? "" : (geoOverride ?? "BR");
  const ua = pickUA();
  const cookies = await getCookies(ua);
  const headers = buildHeaders(ua, cookies);

  const allKeywords = [keyword, ...extraKeywords.filter((k) => k && k.trim())].slice(0, 5);

  const exploreUrl = new URL("https://trends.google.com/trends/api/explore");
  exploreUrl.searchParams.set("hl", "pt-BR");
  exploreUrl.searchParams.set("tz", "180");
  exploreUrl.searchParams.set(
    "req",
    JSON.stringify({
      comparisonItem: allKeywords.map((kw) => ({ keyword: kw, geo, time: timeRange })),
      category: 0,
      property: "",
    }),
  );

  const exploreRes = await fetch(exploreUrl.toString(), { headers });

  if (exploreRes.status === 429) {
    cachedCookies = null;
    throw new Error("RATE_LIMITED");
  }
  if (!exploreRes.ok) {
    logger.warn("trends_explore_failed", { status: exploreRes.status });
    throw new Error(`Google Trends explore HTTP ${exploreRes.status}`);
  }

  const exploreText = await exploreRes.text();
  const cleanedExplore = exploreText.replace(/^\)\]\}'\,?\n?/, "");
  let exploreData: any;
  try {
    exploreData = JSON.parse(cleanedExplore);
  } catch {
    throw new Error("Google Trends explore returned non-JSON");
  }

  const widgets: any[] = exploreData.widgets ?? [];
  const timeWidget = widgets.find((w) => w.id === "TIMESERIES");
  if (!timeWidget?.token || !timeWidget?.request) {
    throw new Error("Google Trends widget missing");
  }

  // RELATED_QUERIES vem como array com 2 widgets (top, rising) — id "RELATED_QUERIES"
  const relatedWidgets = widgets.filter(
    (w) => w.id === "RELATED_QUERIES" || (typeof w.id === "string" && w.id.startsWith("RELATED_QUERIES")),
  );

  // GEO_MAP — interesse por região (estado)
  const geoWidget = widgets.find(
    (w) => w.id === "GEO_MAP" || (typeof w.id === "string" && w.id.startsWith("GEO_MAP")),
  );

  // 1) Timeline
  const multiUrl = new URL(
    "https://trends.google.com/trends/api/widgetdata/multiline",
  );
  multiUrl.searchParams.set("hl", "pt-BR");
  multiUrl.searchParams.set("tz", "180");
  multiUrl.searchParams.set("req", JSON.stringify(timeWidget.request));
  multiUrl.searchParams.set("token", timeWidget.token);

  const multiRes = await fetch(multiUrl.toString(), { headers });
  if (multiRes.status === 429) {
    cachedCookies = null;
    throw new Error("RATE_LIMITED");
  }
  if (!multiRes.ok) {
    throw new Error(`Google Trends multiline HTTP ${multiRes.status}`);
  }
  const multiText = await multiRes.text();
  const multiData = JSON.parse(multiText.replace(/^\)\]\}'\,?\n?/, ""));
  const timelineData = multiData.default?.timelineData ?? [];
  const timeline = timelineData.map((point: any) => ({
    period_date: new Date(parseInt(point.time) * 1000)
      .toISOString()
      .split("T")[0],
    interest_score: point.value?.[0] ?? 0,
  }));

  // Multi-keyword: extrai série completa por termo
  let comparisonSeries: ComparisonSeriesPoint[] | undefined;
  if (allKeywords.length > 1) {
    comparisonSeries = timelineData.map((point: any) => ({
      period_date: new Date(parseInt(point.time) * 1000).toISOString().split("T")[0],
      values: allKeywords.map((_, i) => {
        const v = point.value?.[i];
        return typeof v === "number" ? v : null;
      }),
    }));
  }

  // 2) Related queries (top + rising) — falha gracioso, não derruba a função
  let relatedTop: RelatedKeyword[] = [];
  let relatedRising: RelatedKeyword[] = [];

  try {
    for (const rw of relatedWidgets) {
      if (!rw.token || !rw.request) continue;
      const url = new URL(
        "https://trends.google.com/trends/api/widgetdata/relatedsearches",
      );
      url.searchParams.set("hl", "pt-BR");
      url.searchParams.set("tz", "180");
      url.searchParams.set("req", JSON.stringify(rw.request));
      url.searchParams.set("token", rw.token);

      const r = await fetch(url.toString(), { headers });
      if (!r.ok) {
        logger.warn("related_failed", { status: r.status });
        continue;
      }
      const txt = await r.text();
      const data = JSON.parse(txt.replace(/^\)\]\}'\,?\n?/, ""));
      const ranked: any[] = data.default?.rankedList ?? [];

      // rankedList[0] = top (mais buscadas), rankedList[1] = rising (em alta)
      // mas dependendo do widget vem só um deles
      const requestType = rw.request?.restriction?.complexKeywordsRestriction
        ? "rising"
        : null;

      for (let listIdx = 0; listIdx < ranked.length; listIdx++) {
        const items: any[] = ranked[listIdx]?.rankedKeyword ?? [];
        // heurística: se o primeiro item tem formattedValue tipo "+250%" ou "Em alta" → rising
        const firstFmt = String(items[0]?.formattedValue ?? "");
        const isRising =
          requestType === "rising" ||
          /\+\d|alta|breakout|aumento/i.test(firstFmt);

        const parsed: RelatedKeyword[] = items.slice(0, 10).map((it: any) => {
          const fmt = String(it.formattedValue ?? "");
          const isBreakout = /breakout|alta|aumento/i.test(fmt);
          return {
            keyword: String(it.query ?? "").slice(0, 200),
            value: isBreakout ? 9999 : Number(it.value ?? 0),
            isBreakout,
            formattedValue: fmt,
          };
        }).filter((k: RelatedKeyword) => k.keyword.length > 0);

        if (isRising) {
          if (relatedRising.length === 0) relatedRising = parsed;
        } else {
          if (relatedTop.length === 0) relatedTop = parsed;
        }
      }
    }
  } catch (e) {
    logger.warn("related_parse_error", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // 3) Geo map (interesse por região / cidade / país) — falha gracioso
  let regions: RegionEntry[] = [];
  try {
    if (geoWidget?.token && geoWidget?.request) {
      const geoReq = JSON.parse(JSON.stringify(geoWidget.request));
      if (geoReq.resolution) geoReq.resolution = geoResolution;
      if (geoResolution === "COUNTRY" && geoReq.geo) geoReq.geo = {};

      const url = new URL(
        "https://trends.google.com/trends/api/widgetdata/comparedgeo",
      );
      url.searchParams.set("hl", "pt-BR");
      url.searchParams.set("tz", "180");
      url.searchParams.set("req", JSON.stringify(geoReq));
      url.searchParams.set("token", geoWidget.token);

      const r = await fetch(url.toString(), { headers });
      if (r.ok) {
        const txt = await r.text();
        const data = JSON.parse(txt.replace(/^\)\]\}'\,?\n?/, ""));
        const geoData: any[] = data.default?.geoMapData ?? [];
        regions = geoData
          .map((g: any) => ({
            region: String(g.geoName ?? "").slice(0, 100),
            value: Number(g.value?.[0] ?? 0),
          }))
          .filter((g) => g.region.length > 0 && g.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
      } else {
        logger.warn("geo_failed", { status: r.status, resolution: geoResolution });
      }
    }
  } catch (e) {
    logger.warn("geo_parse_error", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return { timeline, relatedTop, relatedRising, regions, comparisonSeries };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error("Missing supabase env vars");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const productId = body?.productId as string | undefined;
    const force = Boolean(body?.force);
    const keywordOverrideInput =
      typeof body?.keywordOverride === "string"
        ? body.keywordOverride.trim().slice(0, 100)
        : null;
    const keywordOnlyInput =
      typeof body?.keywordOnly === "string"
        ? body.keywordOnly.trim().slice(0, 100)
        : null;

    // Novos parâmetros opcionais (modo keywordOnly)
    const compareKeywordsInput: string[] = Array.isArray(body?.compareKeywords)
      ? body.compareKeywords
          .map((k: unknown) => (typeof k === "string" ? k.trim().slice(0, 100) : ""))
          .filter((k: string) => k.length > 0)
          .slice(0, 4) // até 4 termos extras (5 total com o principal)
      : [];

    const VALID_TIMEFRAMES = new Set([
      "now 7-d",
      "today 1-m",
      "today 3-m",
      "today 12-m",
      "today 5-y",
    ]);
    const timeframeInput =
      typeof body?.timeframe === "string" && VALID_TIMEFRAMES.has(body.timeframe)
        ? (body.timeframe as string)
        : "today 5-y";

    const VALID_GEO_RES = new Set(["REGION", "CITY", "COUNTRY"]);
    const geoResolutionInput: "REGION" | "CITY" | "COUNTRY" =
      typeof body?.geoResolution === "string" && VALID_GEO_RES.has(body.geoResolution)
        ? (body.geoResolution as "REGION" | "CITY" | "COUNTRY")
        : "REGION";

    // ============================================================
    // MODO KEYWORD-ONLY: busca avulsa (sem persistir, sem productId)
    // ============================================================
    if (keywordOnlyInput && keywordOnlyInput.length > 0) {
      const kw = keywordOnlyInput;
      logger.info("keyword_only_start", {
        userId,
        keyword: kw,
        timeframe: timeframeInput,
        geo: geoResolutionInput,
        compare: compareKeywordsInput.length,
      });

      let trendsResult: TrendsResult = {
        timeline: [],
        relatedTop: [],
        relatedRising: [],
        regions: [],
      };
      let rateLimited = false;
      let googleError: string | null = null;

      const delays = [2000, 5000, 12000];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          trendsResult = await fetchGoogleTrends(
            kw,
            timeframeInput,
            undefined,
            compareKeywordsInput,
            geoResolutionInput,
          );
          googleError = null;
          break;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          googleError = msg;
          if (msg === "RATE_LIMITED") {
            rateLimited = true;
            break;
          }
          if (attempt < 2) await sleep(delays[attempt]);
        }
      }

      const tl = trendsResult.timeline;
      const zeros = tl.length === 0 ? 100 : (tl.filter((p) => p.interest_score === 0).length / tl.length) * 100;
      const lowQuality = tl.length < 8 || zeros > 80;

      // Ciclo sazonal calculado inline (só vale para janelas longas)
      const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
      for (const p of tl) {
        const month = new Date(p.period_date).getUTCMonth();
        if (p.interest_score > 0) monthBuckets[month].push(p.interest_score);
      }
      const seasonal_cycle = monthBuckets
        .map((vals, i) => {
          const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          return { month: i + 1, avg: Math.round(avg), samples: vals.length };
        })
        .filter((c) => c.samples > 0);

      // ============== INSIGHTS DERIVADOS ==============
      const values = tl.map((p) => p.interest_score);

      // Momentum: média dos últimos 30 pontos vs 30 anteriores
      let momentum30d: number | null = null;
      if (values.length >= 60) {
        const recent = values.slice(-30);
        const prev = values.slice(-60, -30);
        const avgR = recent.reduce((a, b) => a + b, 0) / recent.length;
        const avgP = prev.reduce((a, b) => a + b, 0) / prev.length;
        if (avgP > 0) momentum30d = Math.round(((avgR - avgP) / avgP) * 100);
      } else if (values.length >= 8) {
        const half = Math.floor(values.length / 2);
        const recent = values.slice(half);
        const prev = values.slice(0, half);
        const avgR = recent.reduce((a, b) => a + b, 0) / recent.length;
        const avgP = prev.reduce((a, b) => a + b, 0) / prev.length;
        if (avgP > 0) momentum30d = Math.round(((avgR - avgP) / avgP) * 100);
      }

      // Slope: regressão linear sobre toda a série (índice x → valor y)
      let slope = 0;
      let slopeLabel: "subindo_forte" | "subindo" | "estavel" | "caindo" | "caindo_forte" = "estavel";
      if (values.length >= 4) {
        const n = values.length;
        const xs = Array.from({ length: n }, (_, i) => i);
        const meanX = (n - 1) / 2;
        const meanY = values.reduce((a, b) => a + b, 0) / n;
        let num = 0;
        let den = 0;
        for (let i = 0; i < n; i++) {
          num += (xs[i] - meanX) * (values[i] - meanY);
          den += (xs[i] - meanX) ** 2;
        }
        slope = den > 0 ? num / den : 0;
        const normSlope = meanY > 0 ? (slope * n) / meanY : 0; // % crescimento total relativo
        if (normSlope > 0.5) slopeLabel = "subindo_forte";
        else if (normSlope > 0.1) slopeLabel = "subindo";
        else if (normSlope < -0.5) slopeLabel = "caindo_forte";
        else if (normSlope < -0.1) slopeLabel = "caindo";
        else slopeLabel = "estavel";
      }

      // Pico do ano + recomendação de estoque
      let peakMonth: number | null = null;
      let stockRecommendation: string | null = null;
      if (seasonal_cycle.length >= 6) {
        const sorted = [...seasonal_cycle].sort((a, b) => b.avg - a.avg);
        peakMonth = sorted[0]?.month ?? null;
        if (peakMonth) {
          const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
          const buyMonthIdx = (peakMonth - 1 - 2 + 12) % 12; // 2 meses antes
          stockRecommendation = `Pico em ${MONTHS_PT[peakMonth - 1]}. Estoque-se em ${MONTHS_PT[buyMonthIdx]}.`;
        }
      }

      // Forecast 3 meses (baseado no ciclo sazonal médio)
      const forecast_3m: Array<{ month: number; predicted: number; year: number }> = [];
      if (seasonal_cycle.length >= 6) {
        const cycleMap = new Map(seasonal_cycle.map((c) => [c.month, c.avg]));
        const now = new Date();
        for (let i = 1; i <= 3; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
          const m = d.getMonth() + 1;
          const predicted = cycleMap.get(m) ?? 0;
          forecast_3m.push({ month: m, predicted, year: d.getFullYear() });
        }
      }

      // ============== INSIGHTS EXTRAS ==============
      const meanY = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const maxY = values.length > 0 ? Math.max(...values) : 0;
      const latestY = values.length > 0 ? values[values.length - 1] : 0;

      // marketScore (0-100) — composto: nível médio (50%) + momentum normalizado (30%) + slope normalizado (20%)
      let market_score: number | null = null;
      if (values.length >= 8) {
        const avgComponent = Math.min(100, meanY); // já 0-100
        const momComponent = momentum30d !== null ? Math.max(0, Math.min(100, momentum30d + 50)) : 50;
        const slopeNormFinal = meanY > 0 ? (slope * values.length) / meanY : 0;
        const slopeComponent = Math.max(0, Math.min(100, (slopeNormFinal + 0.5) * 100));
        market_score = Math.round(avgComponent * 0.5 + momComponent * 0.3 + slopeComponent * 0.2);
      }

      // Volatilidade — coef. variação (desvio padrão / média)
      let volatility: number | null = null;
      let volatility_label: "estavel" | "volatil" | "muito_volatil" | null = null;
      if (values.length >= 8 && meanY > 0) {
        const variance = values.reduce((acc, v) => acc + (v - meanY) ** 2, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / meanY;
        volatility = Math.round(cv * 100);
        if (cv < 0.25) volatility_label = "estavel";
        else if (cv < 0.5) volatility_label = "volatil";
        else volatility_label = "muito_volatil";
      }

      // Status do mês atual vs ciclo sazonal
      let current_month_status: {
        status: "pico" | "alta" | "neutro" | "baixa";
        delta_pct: number;
      } | null = null;
      if (seasonal_cycle.length >= 6) {
        const currentMonth = new Date().getUTCMonth() + 1;
        const currentEntry = seasonal_cycle.find((c) => c.month === currentMonth);
        const cycleAvg = seasonal_cycle.reduce((a, c) => a + c.avg, 0) / seasonal_cycle.length;
        if (currentEntry && cycleAvg > 0) {
          const deltaPct = Math.round(((currentEntry.avg - cycleAvg) / cycleAvg) * 100);
          let status: "pico" | "alta" | "neutro" | "baixa";
          if (deltaPct >= 25) status = "pico";
          else if (deltaPct >= 8) status = "alta";
          else if (deltaPct <= -15) status = "baixa";
          else status = "neutro";
          current_month_status = { status, delta_pct: deltaPct };
        }
      }

      // Vs ano passado — só com 5y, pega ponto ~52 semanas atrás
      let vs_last_year: { delta_pct: number; value_now: number; value_past: number } | null = null;
      if (timeframeInput === "today 5-y" && values.length >= 60) {
        const idxNow = values.length - 1;
        const idxPast = Math.max(0, idxNow - 52);
        const valNow = values[idxNow];
        const valPast = values[idxPast];
        if (valPast > 0) {
          vs_last_year = {
            delta_pct: Math.round(((valNow - valPast) / valPast) * 100),
            value_now: valNow,
            value_past: valPast,
          };
        }
      }

      // Vs pico histórico
      let vs_all_time_peak: number | null = null;
      if (maxY > 0) vs_all_time_peak = Math.round((latestY / maxY) * 100);

      // Próximos 30 dias estimados — slope projetado relativo ao último valor
      let next_30d_estimate: { delta_pct: number; direction: "subir" | "cair" | "estavel" } | null = null;
      if (values.length >= 30 && latestY > 0) {
        const stepsAhead = Math.max(1, Math.round(values.length / 12)); // ~30 dias em pontos
        const projected = latestY + slope * stepsAhead;
        const deltaPct = Math.round(((projected - latestY) / latestY) * 100);
        const direction: "subir" | "cair" | "estavel" =
          deltaPct >= 5 ? "subir" : deltaPct <= -5 ? "cair" : "estavel";
        next_30d_estimate = { delta_pct: deltaPct, direction };
      }

      // Melhor mês pra começar a anunciar — maior crescimento mês-a-mês
      let best_growth_month: number | null = null;
      if (seasonal_cycle.length >= 6) {
        const sortedCycle = [...seasonal_cycle].sort((a, b) => a.month - b.month);
        let maxDelta = -Infinity;
        for (let i = 0; i < sortedCycle.length; i++) {
          const prev = sortedCycle[(i - 1 + sortedCycle.length) % sortedCycle.length];
          const curr = sortedCycle[i];
          const delta = curr.avg - prev.avg;
          if (delta > maxDelta) {
            maxDelta = delta;
            best_growth_month = curr.month;
          }
        }
      }

      // Saturação de mercado (proxy via quantidade de termos relacionados)
      const totalRelated = trendsResult.relatedTop.length + trendsResult.relatedRising.length;
      let market_saturation: "morno" | "ativo" | "quente" = "morno";
      if (totalRelated >= 20) market_saturation = "quente";
      else if (totalRelated >= 8) market_saturation = "ativo";

      // Categoria detectada (autocomplete leve, falha gracioso)
      let categoryHint: string | null = null;
      try {
        const acRes = await fetch(
          `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(kw)}?hl=pt-BR&tz=180`,
          { headers: { "User-Agent": pickUA(), "Accept-Language": "pt-BR" } },
        );
        if (acRes.ok) {
          const acTxt = await acRes.text();
          const acData = JSON.parse(acTxt.replace(/^\)\]\}'\,?\n?/, ""));
          const topics = acData?.default?.topics ?? [];
          const cat = topics[0]?.type;
          if (cat && typeof cat === "string") categoryHint = cat;
        }
      } catch {
        // ignora
      }

      // Sugestões a partir das related quando lowQuality
      const suggestions: string[] = lowQuality
        ? [
            ...trendsResult.relatedRising.slice(0, 2).map((r) => r.keyword),
            ...trendsResult.relatedTop.slice(0, 3).map((r) => r.keyword),
          ]
            .filter((s, i, arr) => s && arr.indexOf(s) === i && s.toLowerCase() !== kw.toLowerCase())
            .slice(0, 3)
        : [];

      logger.info("keyword_only_done", {
        keyword: kw,
        points: tl.length,
        zerosPct: Math.round(zeros),
        lowQuality,
        rateLimited,
        slopeLabel,
        momentum30d,
        peakMonth,
      });

      return new Response(
        JSON.stringify({
          keyword: kw,
          timeframe: timeframeInput,
          geo_resolution: geoResolutionInput,
          compare_keywords: compareKeywordsInput,
          google_series: tl,
          comparison_series: trendsResult.comparisonSeries ?? null,
          related_top: trendsResult.relatedTop,
          related_rising: trendsResult.relatedRising,
          regions: trendsResult.regions,
          seasonal_cycle,
          // Insights derivados
          momentum_30d: momentum30d,
          slope,
          slope_label: slopeLabel,
          peak_month: peakMonth,
          stock_recommendation: stockRecommendation,
          forecast_3m,
          category_hint: categoryHint,
          // Insights extras
          market_score,
          volatility,
          volatility_label,
          current_month_status,
          vs_last_year,
          vs_all_time_peak,
          next_30d_estimate,
          best_growth_month,
          market_saturation,
          // Qualidade / status
          low_quality: lowQuality,
          suggestions,
          rate_limited: rateLimited,
          google_error: googleError,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!productId || typeof productId !== "string") {
      return new Response(
        JSON.stringify({ error: "productId é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: product, error: productErr } = await admin
      .from("products")
      .select("id, name, user_id, shopee_item_id, trend_keyword_override")
      .eq("id", productId)
      .eq("user_id", userId)
      .maybeSingle();

    if (productErr || !product) {
      return new Response(
        JSON.stringify({ error: "Produto não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Se veio override no body, persistir antes (e usar para a busca)
    if (keywordOverrideInput !== null) {
      await admin
        .from("products")
        .update({ trend_keyword_override: keywordOverrideInput || null })
        .eq("id", productId)
        .eq("user_id", userId);
      product.trend_keyword_override = keywordOverrideInput || null;
    }

    // Cache de 7 dias (não invalida em erro — só conta sucesso anterior)
    if (!force) {
      const { data: recent } = await admin
        .from("product_trends")
        .select("captured_at")
        .eq("product_id", productId)
        .order("captured_at", { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        const lastCapture = new Date(recent[0].captured_at);
        const ageMs = Date.now() - lastCapture.getTime();
        if (ageMs < 7 * 24 * 60 * 60 * 1000) {
          return new Response(
            JSON.stringify({
              cached: true,
              captured_at: recent[0].captured_at,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // Se houver override manual, respeita 100% (sem cascata).
    // Caso contrário, monta cascata do mais específico ao mais genérico.
    const overrideKeyword = product.trend_keyword_override?.trim() || null;
    const cascadeKeywords: string[] = overrideKeyword
      ? [overrideKeyword]
      : buildKeywordCascade(product.name);

    if (cascadeKeywords.length === 0 || !cascadeKeywords[0]) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair palavra-chave" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // keyword "ativa" — começa com a primeira; muda se a cascata avançar
    let keyword = cascadeKeywords[0];
    const attemptedCascade: Array<{ keyword: string; zerosPct: number; pointsCount: number }> = [];
    let autoSimplified = false;

    logger.info("fetch_start", {
      productId,
      keyword,
      override: !!overrideKeyword,
      cascade: cascadeKeywords,
    });

    let googleSaved = 0;
    let relatedSaved = 0;
    let regionsSaved = 0;
    let cycleSaved = 0;
    let googleError: string | null = null;
    let rateLimited = false;
    let lowQuality = false;
    let zerosPct = 0;
    let relatedTopOut: RelatedKeyword[] = [];
    let relatedRisingOut: RelatedKeyword[] = [];
    let regionsOut: RegionEntry[] = [];
    let trendsData: Array<{ period_date: string; interest_score: number }> = [];

    // Google Trends: cascata + retry/backoff por variação
    try {
      const delays = [2000, 5000, 12000];
      let lastErr: unknown = null;

      for (let cIdx = 0; cIdx < cascadeKeywords.length; cIdx++) {
        const variant = cascadeKeywords[cIdx];
        let trendsResult: TrendsResult = {
          timeline: [],
          relatedTop: [],
          relatedRising: [],
          regions: [],
        };
        lastErr = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            trendsResult = await fetchGoogleTrends(variant);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn("attempt_failed", { variant, attempt: attempt + 1, error: msg });
            // Em caso de RATE_LIMITED, abandona variantes restantes (sem queimar quota)
            if (msg === "RATE_LIMITED") break;
            if (attempt < 2) await sleep(delays[attempt]);
          }
        }

        // Se a tentativa atual rate-limitou, propaga
        if (lastErr) {
          const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
          if (msg === "RATE_LIMITED") throw lastErr;
          // Erro genérico nessa variante: tenta a próxima
          attemptedCascade.push({ keyword: variant, zerosPct: 100, pointsCount: 0 });
          continue;
        }

        const tl = trendsResult.timeline;
        const zeros = tl.length === 0 ? 100 : (tl.filter((p) => p.interest_score === 0).length / tl.length) * 100;
        attemptedCascade.push({ keyword: variant, zerosPct: Math.round(zeros), pointsCount: tl.length });

        // Critério de "dados úteis": >30% não-zeros AND pelo menos 8 pontos
        const isUseful = tl.length >= 8 && zeros < 70;

        if (isUseful || cIdx === cascadeKeywords.length - 1) {
          // Aceita esta variante (útil, ou última cartada)
          keyword = variant;
          if (cIdx > 0) autoSimplified = true;
          trendsData = tl;
          relatedTopOut = trendsResult.relatedTop;
          relatedRisingOut = trendsResult.relatedRising;
          regionsOut = trendsResult.regions;
          zerosPct = zeros;
          lowQuality = !isUseful;
          break;
        }
        // Senão, tenta próxima variante
        logger.info("cascade_advance", { from: variant, zerosPct: Math.round(zeros), points: tl.length });
      }

      if (trendsData.length === 0 && !lowQuality) {
        lowQuality = true;
        zerosPct = 100;
      }

      if (trendsData.length > 0) {
        // Detecta baixa qualidade (>80% zeros)
        const zeros = trendsData.filter((p) => p.interest_score === 0).length;
        zerosPct = (zeros / trendsData.length) * 100;
        lowQuality = zerosPct > 80;

        await admin
          .from("product_trends")
          .delete()
          .eq("product_id", productId)
          .eq("source", "google_trends");

        const rows = trendsData.map((p) => ({
          user_id: userId,
          product_id: productId,
          source: "google_trends",
          keyword,
          period_date: p.period_date,
          interest_score: p.interest_score,
        }));

        const { error: insertErr } = await admin
          .from("product_trends")
          .insert(rows);

        if (insertErr) {
          logger.error("google_insert_failed", { error: insertErr.message });
          googleError = insertErr.message;
        } else {
          googleSaved = rows.length;
        }

        // Calcula CICLO SAZONAL — média histórica por mês (1-12)
        // Útil pra responder "esse produto vende mais em qual mês do ano?"
        const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
        for (const p of trendsData) {
          const month = new Date(p.period_date).getUTCMonth(); // 0-11
          if (p.interest_score > 0) monthBuckets[month].push(p.interest_score);
        }
        const cycle = monthBuckets.map((vals, i) => {
          const avg = vals.length > 0
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : 0;
          return { month: i + 1, avg: Math.round(avg), samples: vals.length };
        });

        await admin
          .from("product_trends")
          .delete()
          .eq("product_id", productId)
          .eq("source", "google_seasonal_cycle");

        const cycleRows = cycle
          .filter((c) => c.samples > 0)
          .map((c) => {
            // period_date sintético: dia 15 do mês no ano corrente (só pra satisfazer a coluna)
            const year = new Date().getUTCFullYear();
            const mm = String(c.month).padStart(2, "0");
            return {
              user_id: userId,
              product_id: productId,
              source: "google_seasonal_cycle",
              keyword,
              period_date: `${year}-${mm}-15`,
              interest_score: c.avg,
              metadata: { month: c.month, samples: c.samples },
            };
          });

        if (cycleRows.length > 0) {
          const { error: cycleErr } = await admin
            .from("product_trends")
            .insert(cycleRows);
          if (!cycleErr) cycleSaved = cycleRows.length;
          else logger.warn("cycle_insert_failed", { error: cycleErr.message });
        }
      }

      // Persiste related (top + rising) — sempre que tivermos algo
      if (relatedTopOut.length > 0 || relatedRisingOut.length > 0) {
        const today = new Date().toISOString().split("T")[0];

        await admin
          .from("product_trends")
          .delete()
          .eq("product_id", productId)
          .in("source", ["google_related_top", "google_related_rising"]);

        const relatedRows = [
          ...relatedTopOut.map((r) => ({
            user_id: userId,
            product_id: productId,
            source: "google_related_top",
            keyword: r.keyword,
            period_date: today,
            interest_score: r.value,
            metadata: {
              type: "top",
              formatted_value: r.formattedValue,
              parent_keyword: keyword,
            },
          })),
          ...relatedRisingOut.map((r) => ({
            user_id: userId,
            product_id: productId,
            source: "google_related_rising",
            keyword: r.keyword,
            period_date: today,
            interest_score: r.value,
            metadata: {
              type: "rising",
              is_breakout: r.isBreakout,
              formatted_value: r.formattedValue,
              parent_keyword: keyword,
            },
          })),
        ];

        if (relatedRows.length > 0) {
          const { error: relErr } = await admin
            .from("product_trends")
            .insert(relatedRows);
          if (!relErr) relatedSaved = relatedRows.length;
          else logger.warn("related_insert_failed", { error: relErr.message });
        }
      }

      // Persiste regiões (top estados)
      if (regionsOut.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        await admin
          .from("product_trends")
          .delete()
          .eq("product_id", productId)
          .eq("source", "google_geo");

        const regionRows = regionsOut.map((r) => ({
          user_id: userId,
          product_id: productId,
          source: "google_geo",
          keyword: r.region,
          period_date: today,
          interest_score: r.value,
          metadata: { region: r.region, parent_keyword: keyword },
        }));

        const { error: geoErr } = await admin
          .from("product_trends")
          .insert(regionRows);
        if (!geoErr) regionsSaved = regionRows.length;
        else logger.warn("geo_insert_failed", { error: geoErr.message });
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (raw === "RATE_LIMITED") {
        rateLimited = true;
        googleError =
          "O Google Trends está limitando requisições agora. Tente de novo em alguns minutos.";
      } else {
        googleError = raw;
      }
      logger.warn("google_trends_failed", { error: raw });
    }

    // Reaproveita keywords Shopee (já em shopee_ads_by_product)
    let shopeeSaved = 0;
    if (product.shopee_item_id) {
      const { data: adsRow } = await admin
        .from("shopee_ads_by_product")
        .select("keywords, period_end")
        .eq("user_id", userId)
        .eq("item_id", product.shopee_item_id)
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      const keywords = (adsRow?.keywords as any[]) ?? [];
      if (keywords.length > 0) {
        const today = new Date().toISOString().split("T")[0];

        await admin
          .from("product_trends")
          .delete()
          .eq("product_id", productId)
          .eq("source", "shopee_keywords");

        const rows = keywords.slice(0, 30).map((k: any) => ({
          user_id: userId,
          product_id: productId,
          source: "shopee_keywords",
          keyword: String(k.keyword ?? k.term ?? "").slice(0, 200),
          period_date: today,
          search_volume: Number(k.search_volume ?? k.volume ?? 0),
          suggested_bid: Number(k.suggested_bid ?? k.bid ?? 0),
          competition_level: k.competition_level ?? k.competition ?? null,
          metadata: { quality_score: k.quality_score ?? null },
        }));

        const validRows = rows.filter((r) => r.keyword.length > 0);
        if (validRows.length > 0) {
          const { error: shopeeErr } = await admin
            .from("product_trends")
            .insert(validRows);
          if (!shopeeErr) shopeeSaved = validRows.length;
        }
      }
    }

    // Sugestões: prioriza related top REAIS do Google (3 primeiros) > algoritmo
    // Mesmo se NÃO for low_quality podemos retornar sugestões do related (UI ignora se não for low)
    let suggestions: string[] = [];
    if (lowQuality) {
      const fromRelated = [
        ...relatedTopOut.slice(0, 3).map((r) => r.keyword),
        ...relatedRisingOut.slice(0, 2).map((r) => r.keyword),
      ].filter((k) => k && k.toLowerCase() !== keyword.toLowerCase());

      // Adiciona variações restantes da cascata como fallback (mais genéricas que a atual)
      const cascadeFallback = cascadeKeywords
        .filter((k) => k.toLowerCase() !== keyword.toLowerCase())
        .slice(0, 3);

      const merged = fromRelated.length > 0
        ? Array.from(new Set([...fromRelated, ...cascadeFallback])).slice(0, 4)
        : Array.from(new Set([...cascadeFallback, ...suggestAlternatives(product.name, keyword)])).slice(0, 4);

      suggestions = merged;
    }

    // Marker meta_no_data: garante hasData=true no front quando NADA foi salvo,
    // permitindo a UI mostrar aviso + sugestões em vez do estado vazio inicial.
    if (googleSaved === 0 && relatedSaved === 0 && regionsSaved === 0 && cycleSaved === 0) {
      const today = new Date().toISOString().split("T")[0];
      await admin
        .from("product_trends")
        .delete()
        .eq("product_id", productId)
        .eq("source", "meta_no_data");

      const { error: metaErr } = await admin.from("product_trends").insert({
        user_id: userId,
        product_id: productId,
        source: "meta_no_data",
        keyword,
        period_date: today,
        metadata: {
          suggestions,
          attempted_cascade: attemptedCascade,
          auto_simplified: autoSimplified,
          zeros_pct: Math.round(zerosPct),
          google_error: googleError,
          rate_limited: rateLimited,
        },
      });
      if (metaErr) logger.warn("meta_no_data_insert_failed", { error: metaErr.message });
    }

    logger.info("fetch_done", {
      productId,
      keyword,
      googleSaved,
      shopeeSaved,
      relatedSaved,
      regionsSaved,
      cycleSaved,
      googleError,
      rateLimited,
      lowQuality,
      autoSimplified,
      cascade: cascadeKeywords,
      zerosPct: Math.round(zerosPct),
    });

    return new Response(
      JSON.stringify({
        cached: false,
        keyword,
        keyword_override: product.trend_keyword_override ?? null,
        auto_simplified: autoSimplified,
        attempted_cascade: attemptedCascade,
        google_saved: googleSaved,
        shopee_saved: shopeeSaved,
        related_saved: relatedSaved,
        regions_saved: regionsSaved,
        cycle_saved: cycleSaved,
        google_error: googleError,
        rate_limited: rateLimited,
        low_quality: lowQuality,
        zeros_pct: Math.round(zerosPct),
        suggestions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("unhandled", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
