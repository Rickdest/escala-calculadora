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

  // 3) Geo map (interesse por região / estado) — falha gracioso
  let regions: RegionEntry[] = [];
  try {
    if (geoWidget?.token && geoWidget?.request) {
      const url = new URL(
        "https://trends.google.com/trends/api/widgetdata/comparedgeo",
      );
      url.searchParams.set("hl", "pt-BR");
      url.searchParams.set("tz", "180");
      url.searchParams.set("req", JSON.stringify(geoWidget.request));
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
        logger.warn("geo_failed", { status: r.status });
      }
    }
  } catch (e) {
    logger.warn("geo_parse_error", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return { timeline, relatedTop, relatedRising, regions };
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

    // ============================================================
    // MODO KEYWORD-ONLY: busca avulsa (sem persistir, sem productId)
    // ============================================================
    if (keywordOnlyInput && keywordOnlyInput.length > 0) {
      const kw = keywordOnlyInput;
      logger.info("keyword_only_start", { userId, keyword: kw });

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
          trendsResult = await fetchGoogleTrends(kw);
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

      // Ciclo sazonal calculado inline
      const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
      for (const p of tl) {
        const month = new Date(p.period_date).getUTCMonth();
        if (p.interest_score > 0) monthBuckets[month].push(p.interest_score);
      }
      const seasonal_cycle = monthBuckets
        .map((vals, i) => {
          const avg = vals.length > 0
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : 0;
          return { month: i + 1, avg: Math.round(avg), samples: vals.length };
        })
        .filter((c) => c.samples > 0);

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
      });

      return new Response(
        JSON.stringify({
          keyword: kw,
          google_series: tl,
          related_top: trendsResult.relatedTop,
          related_rising: trendsResult.relatedRising,
          regions: trendsResult.regions,
          seasonal_cycle,
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
