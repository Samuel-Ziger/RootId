import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { CandidateDataInput, AnalysisResult, GroundingSource, AIProvider } from "../types";
import { buildEnrichedContext } from "../utils/candidateMapper";

const NUM_RESULTS_PER_QUERY = 30;
const MAX_SOURCES_PASSED_TO_AI = 50; // mais fontes = mais contexto para a IA

// Chave Serper.dev — use SERPER_API_KEY no .env para produção
const getSerperApiKey = () =>
  process.env.SERPER_API_KEY ||
  process.env.NEXT_PUBLIC_SERPER_API_KEY ||
  "16072a196b96f529e251ae46bfd2e0241ee24e76";

// SerpApi (serpapi.com) — Google Search API. Params: api_key, q, engine=google, gl, hl, num
const getSerpApiKey = () =>
  process.env.SERPAPI_KEY ||
  process.env.SERPAPI_API_KEY ||
  process.env.NEXT_PUBLIC_SERPAPI_KEY ||
  process.env.VITE_SERPAPI_KEY ||
  "";

const SERPAPI_BASE = "https://serpapi.com/search";

async function searchWithSerpApi(query: string): Promise<{ organic?: SearchItem[] } | null> {
  const apiKey = getSerpApiKey();
  if (!apiKey || !apiKey.trim()) return null;
  try {
    const params = new URLSearchParams({
      engine: "google",
      q: query.trim().slice(0, 200),
      api_key: apiKey.trim(),
      gl: "br",
      hl: "pt-br",
      num: String(Math.min(NUM_RESULTS_PER_QUERY, 30)),
    });
    const response = await fetch(`${SERPAPI_BASE}?${params.toString()}`);

    if (!response.ok) {
      const text = await response.text();
      let msg = `SerpApi ${response.status}`;
      if (response.status === 401) msg = "SerpApi: api_key inválida ou ausente. Adicione SERPAPI_KEY no .env";
      else if (response.status === 429) msg = "SerpApi: limite de buscas atingido. Verifique plano em serpapi.com";
      else if (text) {
        try {
          const json = JSON.parse(text);
          msg += `: ${json.error || text.slice(0, 120)}`;
        } catch {
          msg += `: ${text.slice(0, 120)}`;
        }
      }
      console.warn("SerpApi Search:", msg);
      return null;
    }

    const data = await response.json();
    const organicResults = data?.organic_results ?? [];
    const organic: SearchItem[] = organicResults
      .filter((r: { link?: string }) => r.link && String(r.link).trim())
      .map((r: { link: string; title?: string; snippet?: string }) => ({
        link: String(r.link).trim(),
        title: (r.title ?? "").trim() || undefined,
        snippet: (r.snippet ?? "").trim() || undefined,
      }));
    return organic.length ? { organic } : null;
  } catch (error) {
    console.error("SerpApi Search Error:", error);
    return null;
  }
}

// Chave Infosimples (Buscador Google) — use INFOSIMPLES_API_KEY no .env
const getInfosimplesApiKey = () =>
  process.env.INFOSIMPLES_API_KEY ||
  process.env.NEXT_PUBLIC_INFOSIMPLES_API_KEY ||
  process.env.VITE_INFOSIMPLES_API_KEY ||
  "";

const INFOSIMPLES_BUSCADOR_URL = "https://api.infosimples.com/api/v2/consultas/buscador/google";

/** Resposta da API Infosimples Buscador Google: resultados com url, titulo, descricao */
type InfosimplesResultado = { url?: string; titulo?: string; descricao?: string };

async function searchWithInfosimples(query: string): Promise<{ organic?: SearchItem[] } | null> {
  const token = getInfosimplesApiKey();
  if (!token || !token.trim()) {
    return null;
  }
  try {
    const response = await fetch(INFOSIMPLES_BUSCADOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        query: query.trim().slice(0, 200),
        safe: "off",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let msg = `Infosimples API ${response.status}`;
      if (response.status === 401) msg = "Infosimples: token inválido ou ausente. Adicione INFOSIMPLES_API_KEY no .env";
      else if (response.status === 429) msg = "Infosimples: limite de consultas atingido. Verifique créditos em api.infosimples.com";
      else if (text) {
        try {
          const json = JSON.parse(text);
          msg += `: ${json.message || json.error || text.slice(0, 150)}`;
        } catch {
          msg += `: ${text.slice(0, 150)}`;
        }
      }
      console.warn("Infosimples Search:", msg);
      return null;
    }

    const data = await response.json();
    const resultados: InfosimplesResultado[] = data?.resultados ?? data?.data?.resultados ?? [];
    const organic: SearchItem[] = resultados
      .filter((r: InfosimplesResultado) => r.url && r.url.trim())
      .map((r: InfosimplesResultado) => ({
        link: r.url!.trim(),
        title: (r.titulo ?? "").trim() || undefined,
        snippet: (r.descricao ?? "").trim() || undefined,
      }));
    return organic.length ? { organic } : null;
  } catch (error) {
    console.error("Infosimples Search Error:", error);
    return null;
  }
}

async function searchWithSerper(query: string, endpoint: "search" | "news" = "search") {
  const apiKey = getSerperApiKey();
  try {
    const url = endpoint === "news"
      ? "https://google.serper.dev/news"
      : "https://google.serper.dev/search";
    const body = endpoint === "news"
      ? { q: query, gl: "br", hl: "pt-br", num: 20 }
      : { q: query, gl: "br", hl: "pt-br", num: NUM_RESULTS_PER_QUERY };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let msg = `Serper API ${response.status}`;
      if (response.status === 401) msg = "Serper: chave API inválida ou ausente. Adicione SERPER_API_KEY no .env";
      else if (response.status === 429) msg = "Serper: limite de buscas atingido. Aguarde ou atualize o plano em serper.dev";
      else if (response.status === 403) msg = "Serper: acesso negado. Verifique a chave em serper.dev";
      else if (text) {
        try {
          const json = JSON.parse(text);
          msg += `: ${json.message || json.error || text.slice(0, 150)}`;
        } catch {
          msg += `: ${text.slice(0, 150)}`;
        }
      }
      console.warn("Serper Search:", msg);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Serper Search Error:", error);
    return null;
  }
}

// Datajud (CNJ) — API Pública: metadados de processos judiciais. Auth: Authorization: APIKey [Chave]
const getDatajudApiKey = () =>
  process.env.DATAJUD_API_KEY ||
  process.env.NEXT_PUBLIC_DATAJUD_API_KEY ||
  process.env.VITE_DATAJUD_API_KEY ||
  "";

const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";
// Processos trabalhistas: TST + TRTs (principais regiões)
const DATAJUD_ALIASES_TRABALHISTA = [
  "api_publica_tst",
  "api_publica_trt1", "api_publica_trt2", "api_publica_trt3",
  "api_publica_trt4", "api_publica_trt5", "api_publica_trt6",
];
// Outros tipos: STJ, TJSP, TRF1 (estadual, federal)
const DATAJUD_ALIASES_OUTROS = ["api_publica_stj", "api_publica_tjsp", "api_publica_trf1"];

/** Hit Elasticsearch do Datajud: _source com metadados do processo */
type DatajudSource = {
  numeroProcesso?: string;
  classeProcessual?: string;
  orgaoJulgador?: string;
  tribunal?: string;
  assuntos?: string[] | string;
  pessoa?: string | string[];
  nomeParte?: string;
  partes?: Array<{ nome?: string; polo?: string }>;
  [key: string]: unknown;
};

/** Executa uma rodada de buscas Datajud nos tribunais indicados e adiciona em results */
async function datajudSearchRound(
  apiKey: string,
  body: { size: number; query: { query_string: { query: string; default_operator?: string } } },
  results: SearchItem[],
  aliases: string[]
): Promise<void> {
  const authHeader = `APIKey ${apiKey.trim()}`;
  await Promise.all(
    aliases.map(async (alias) => {
      try {
        const url = `${DATAJUD_BASE}/${alias}/_search`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          if (response.status === 401) console.warn("Datajud: API Key inválida ou ausente. Use DATAJUD_API_KEY no .env");
          else console.warn("Datajud", alias, response.status);
          return;
        }

        const data = await response.json();
        const hits = data?.hits?.hits ?? [];
        const tribunalLabel = alias.replace("api_publica_", "").toUpperCase();

        for (const hit of hits) {
          const src: DatajudSource = hit._source ?? {};
          const num = src.numeroProcesso ?? "";
          const classe = src.classeProcessual ?? "";
          const orgao = src.orgaoJulgador ?? "";
          const assuntos = Array.isArray(src.assuntos) ? src.assuntos.join(", ") : String(src.assuntos ?? "");
          const title = num ? `Processo ${num} (${tribunalLabel})` : `Datajud ${tribunalLabel}`;
          const snippet = [classe, orgao, assuntos].filter(Boolean).join(" — ") || "Metadado processual CNJ.";
          const uri = `https://www.cnj.jus.br/sistemas/datajud/api-publica/?processo=${encodeURIComponent(num)}`;
          if (num) results.push({ link: uri, title, snippet });
        }
      } catch (err) {
        console.error("Datajud Search Error", alias, err);
      }
    })
  );
}

/** Monta a lista de tribunais Datajud conforme opções (trabalhista e/ou outros). Se ambos false, usa outros. */
function getDatajudAliases(opcoes: { trabalhista?: boolean; outros?: boolean }): string[] {
  const trabalhista = opcoes.trabalhista !== false;
  const outros = opcoes.outros !== false;
  if (!trabalhista && !outros) return DATAJUD_ALIASES_OUTROS;
  const list: string[] = [];
  if (trabalhista) list.push(...DATAJUD_ALIASES_TRABALHISTA);
  if (outros) list.push(...DATAJUD_ALIASES_OUTROS);
  return list;
}

/** Busca no Datajud por lista de nomes e, opcionalmente, por CPF. Tribunais conforme opções (trabalhista / outros). */
async function searchWithDatajud(
  nomes: string[],
  cpf?: string,
  opcoes?: { trabalhista?: boolean; outros?: boolean }
): Promise<{ organic?: SearchItem[] } | null> {
  const apiKey = getDatajudApiKey();
  if (!apiKey || !apiKey.trim()) return null;

  const aliases = getDatajudAliases(opcoes ?? {});
  if (aliases.length === 0) return null;

  const results: SearchItem[] = [];

  for (const nome of nomes) {
    const query = nome.trim().replace(/\s+/g, " ").slice(0, 120);
    if (!query || query.length < 3) continue;
    const bodyName = {
      size: 15,
      query: {
        query_string: {
          query: `*${query.split(" ").join("* *")}*`,
          default_operator: "or",
        },
      },
    };
    await datajudSearchRound(apiKey, bodyName, results, aliases);
  }

  const cpfDigits = cpf && /^\d{11}$/.test(String(cpf).replace(/\D/g, "")) ? String(cpf).replace(/\D/g, "") : null;
  if (cpfDigits) {
    const bodyCpf = {
      size: 15,
      query: { query_string: { query: cpfDigits } },
    };
    await datajudSearchRound(apiKey, bodyCpf, results, aliases);
  }

  return results.length ? { organic: results } : null;
}

type SearchItem = { title?: string; link?: string; snippet?: string };

/** Combina e deduplica resultados de múltiplas buscas (organic + news) por URL */
function mergeSearchResults(
  resultsArrays: Array<{ organic?: SearchItem[]; news?: SearchItem[] } | null>
): SearchItem[] {
  const seen = new Set<string>();
  const merged: SearchItem[] = [];
  for (const data of resultsArrays) {
    if (!data) continue;
    const items = [...(data.organic || []), ...(data.news || [])];
    for (const item of items) {
      const url = (item.link || "").toLowerCase();
      if (url && !seen.has(url)) {
        seen.add(url);
        merged.push(item);
      }
    }
  }
  return merged;
}

// --- GitHub REST API (perfil e repositórios públicos) — opcional: GITHUB_TOKEN no .env ---
const GITHUB_API_BASE = "https://api.github.com";

const getGithubToken = () =>
  (process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN || "").trim();

const GITHUB_PATH_RESERVED = new Set(
  [
    "settings", "login", "signup", "explore", "topics", "sponsors", "features",
    "enterprise", "team", "marketplace", "pricing", "support", "about", "security",
    "resources", "collections", "events", "desktop", "mobile", "pulls", "issues",
    "notifications", "orgs", "users", "discussions",
  ].map((s) => s.toLowerCase())
);

function extractGithubLoginFromUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u || !/github\.com/i.test(u)) return null;
  try {
    const href = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    const parsed = new URL(href);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "github.com") return null;
    const seg = parsed.pathname.split("/").filter(Boolean)[0];
    if (!seg || GITHUB_PATH_RESERVED.has(seg.toLowerCase())) return null;
    return seg;
  } catch {
    return null;
  }
}

function collectGithubLogins(data: CandidateDataInput): string[] {
  const urls: string[] = [...(data.referenceUrls || []).map(String)].filter(Boolean);
  const c = data.candidato;
  if (c) {
    const socials = (c.redes_sociais || c.socials || {}) as { github?: string };
    if (socials.github) urls.push(String(socials.github));
  }
  const seen = new Set<string>();
  const logins: string[] = [];
  for (const url of urls) {
    const login = extractGithubLoginFromUrl(url);
    if (login && !seen.has(login.toLowerCase())) {
      seen.add(login.toLowerCase());
      logins.push(login);
      if (logins.length >= 3) break;
    }
  }
  return logins;
}

type GithubUserJson = {
  login: string;
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  blog?: string | null;
  location?: string | null;
  html_url: string;
  public_repos?: number;
  created_at?: string;
};

type GithubRepoJson = {
  name: string;
  description?: string | null;
  html_url: string;
  language?: string | null;
  stargazers_count?: number;
  pushed_at?: string | null;
  fork?: boolean;
};

async function githubApiGet(path: string, token: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RootID-OSINT/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${GITHUB_API_BASE}${path}`, { headers });
}

function formatGithubProfile(login: string, user: GithubUserJson, repos: GithubRepoJson[]): string {
  const lines: string[] = [];
  lines.push(`### @${login} (${user.html_url})`);
  if (user.name) lines.push(`- Nome no perfil: ${user.name}`);
  if (user.bio) lines.push(`- Bio: ${user.bio.replace(/\s+/g, " ").trim()}`);
  if (user.company) lines.push(`- Empresa: ${user.company}`);
  if (user.blog) lines.push(`- Site/blog: ${user.blog}`);
  if (user.location) lines.push(`- Local: ${user.location}`);
  if (user.public_repos != null) lines.push(`- Repositórios públicos (total): ${user.public_repos}`);
  if (user.created_at) lines.push(`- Conta criada: ${user.created_at.slice(0, 10)}`);
  const ownRepos = repos.filter((r) => !r.fork).slice(0, 8);
  if (ownRepos.length > 0) {
    lines.push("- Repositórios públicos recentes (não-fork):");
    for (const r of ownRepos) {
      const desc = r.description
        ? `${r.description.replace(/\s+/g, " ").trim().slice(0, 120)}${(r.description.length > 120 ? "…" : "")}`
        : "";
      const parts = [
        r.name,
        desc && `— ${desc}`,
        `[${r.html_url}]`,
        r.language && `lang: ${r.language}`,
        r.stargazers_count != null && r.stargazers_count > 0 ? `★${r.stargazers_count}` : "",
        r.pushed_at && `atualizado: ${r.pushed_at.slice(0, 10)}`,
      ].filter(Boolean);
      lines.push(`  - ${parts.join(" | ")}`);
    }
  }
  return lines.join("\n");
}

/** Busca perfil + repos na API oficial quando houver link github.com/... nos dados. */
async function fetchGithubEnrichmentMarkdown(data: CandidateDataInput): Promise<string> {
  const logins = collectGithubLogins(data);
  if (logins.length === 0) return "";
  const token = getGithubToken();
  const sections: string[] = [];
  for (const login of logins) {
    try {
      const uRes = await githubApiGet(`/users/${encodeURIComponent(login)}`, token);
      if (uRes.status === 401) {
        console.warn("GitHub API: token inválido. Gere um PAT em github.com/settings/tokens e coloque GITHUB_TOKEN no .env");
        break;
      }
      if (uRes.status === 403) {
        console.warn(
          "GitHub API: limite anônimo excedido ou bloqueio. Adicione GITHUB_TOKEN no .env (até ~5000 req/h autenticado)."
        );
        continue;
      }
      if (!uRes.ok) continue;
      const user = (await uRes.json()) as GithubUserJson;
      const rRes = await githubApiGet(
        `/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=10&type=owner`,
        token
      );
      let repos: GithubRepoJson[] = [];
      if (rRes.ok) repos = (await rRes.json()) as GithubRepoJson[];
      let orgLine = "";
      const orgsRes = await githubApiGet(`/users/${encodeURIComponent(login)}/orgs?per_page=6`, token);
      if (orgsRes.ok) {
        const orgs = (await orgsRes.json()) as Array<{ login?: string }>;
        const names = orgs.map((o) => o.login).filter(Boolean) as string[];
        if (names.length) orgLine = `- Organizações públicas (membro): ${names.join(", ")}`;
      }
      let eventsLine = "";
      const evRes = await githubApiGet(`/users/${encodeURIComponent(login)}/events/public?per_page=10`, token);
      if (evRes.ok) {
        const events = (await evRes.json()) as Array<{ type?: string; repo?: { name?: string }; created_at?: string }>;
        const bits = events.slice(0, 8).map((e) => {
          const repo = e.repo?.name ?? "?";
          const type = (e.type ?? "").replace("Event", "") || "?";
          const day = e.created_at?.slice(0, 10) ?? "";
          return `${day} ${type}→${repo}`;
        });
        if (bits.length) eventsLine = `- Eventos públicos recentes (amostra): ${bits.join("; ")}`;
      }
      sections.push([formatGithubProfile(login, user, repos), orgLine, eventsLine].filter(Boolean).join("\n"));
    } catch (e) {
      console.warn("GitHub API:", e);
    }
  }
  if (sections.length === 0) return "";
  return (
    `\nDADOS DO GITHUB (API REST oficial — trate como evidência **Alta** para este perfil e repositórios listados):\n` +
    `${sections.join("\n\n")}\n`
  );
}

/** Normaliza nome para busca */
function normalizeNameForSearch(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

/**
 * Gera VÁRIAS HIPÓTESES de nome para busca.
 * O nome completo (Samuel Henryk de Souza Ziger) mal existe na web.
 * Mas "Samuel Ziger" ou "samuel-ziger" (do link linkedin.com/in/samuel-ziger-237524357) SIM.
 * Prioridade: hipóteses vindas dos LINKS (slug sem traço = nome que a pessoa usa online).
 */
function getNameVariations(
  fullName: string,
  slugsFromUrls: string[],
  namesFromSlugs: string[]
): string[] {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const variations: string[] = [];

  // —— PRIORIDADE MÁXIMA: do link (samuel-ziger → samuel ziger = Samuel Ziger)
  for (const namePart of namesFromSlugs) {
    if (!namePart || namePart.length < 3) continue;
    variations.push(namePart); // samuel-ziger
    const withSpaces = namePart.replace(/-/g, " ");
    variations.push(withSpaces); // samuel ziger
    variations.push(capitalizeWords(withSpaces)); // Samuel Ziger
  }

  // —— Slugs completos (ex: samuel-ziger-237524357 para site:linkedin)
  for (const slug of slugsFromUrls) {
    if (slug && slug.length > 4 && !variations.includes(slug)) {
      variations.push(slug);
    }
  }

  // —— Destrinchar o nome: várias combinações
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const firstLast = `${first} ${last}`;
    const firstLastHyphen = `${first}-${last}`.toLowerCase();
    if (!variations.includes(firstLast)) variations.push(firstLast);
    if (!variations.includes(firstLastHyphen)) variations.push(firstLastHyphen);

    // Nome do meio + último (Samuel Henryk Ziger, Samuel Souza Ziger)
    for (let i = 1; i < parts.length - 1; i++) {
      const mid = parts[i];
      if (mid.toLowerCase() === "de" || mid.toLowerCase() === "da") continue;
      const combo = `${first} ${mid} ${last}`;
      if (!variations.includes(combo)) variations.push(combo);
    }
  }

  // Nome completo (prioridade baixa — mal existe na web)
  variations.push(fullName);

  return [...new Set(variations)];
}

function capitalizeWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Extrai domínios e slugs dos links (linkedin.com/in/samuel-ziger-237524357 → slug completo + parte nome) */
function extractSearchableDomains(urls: string[]): { domain: string; slug?: string; nameFromSlug?: string }[] {
  const seen = new Set<string>();
  const result: { domain: string; slug?: string; nameFromSlug?: string }[] = [];
  const priorityDomains = [
    "linkedin.com",
    "github.com",
    "lattes.cnpq.br",
    "reclameaqui.com.br",
    "reclameaqui.com",
    "jusbrasil.com.br",
    "behance.net",
    "medium.com",
  ];

  for (const u of urls) {
    if (!u || !u.trim()) continue;
    try {
      const url = u.startsWith("http") ? u : `https://${u}`;
      const parsed = new URL(url);
      const host = parsed.hostname.replace("www.", "").toLowerCase();
      if (seen.has(host)) continue;
      seen.add(host);

      const path = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
      const nameFromSlug = path ? extractNamePartFromSlug(path) : undefined;

      result.push({
        domain: host,
        slug: path && path.length > 2 ? path : undefined,
        nameFromSlug,
      });
    } catch {
      // ignora URL inválida
    }
  }
  return result.sort((a, b) => {
    const aPri = priorityDomains.indexOf(a.domain);
    const bPri = priorityDomains.indexOf(b.domain);
    if (aPri >= 0 && bPri >= 0) return aPri - bPri;
    if (aPri >= 0) return -1;
    if (bPri >= 0) return 1;
    return 0;
  });
}

/**
 * Extrai a parte "nome" do slug, removendo sufixos numéricos.
 * Ex: samuel-ziger-237524357 → samuel-ziger (o número é ID do LinkedIn, não é nome)
 * Ex: joao-silva-123 → joao-silva
 */
function extractNamePartFromSlug(slug: string): string | undefined {
  const parts = slug.split("-").filter(Boolean);
  const nameParts: string[] = [];
  for (const p of parts) {
    if (/^\d+$/.test(p)) break; // para ao encontrar parte só numérica (ID)
    if (p.length >= 2) nameParts.push(p);
  }
  return nameParts.length >= 2 ? nameParts.join("-") : undefined;
}

/** Extrai strings de um objeto (ex.: curriculum) para usar em buscas; limita quantidade para não estourar API */
function extractSearchableTextFromObject(obj: unknown, maxWords = 12): string[] {
  const words: string[] = [];
  if (obj == null) return words;
  const visit = (v: unknown): void => {
    if (words.join(" ").split(/\s+/).length >= maxWords) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 2 && t.length < 80) words.push(t);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item);
      return;
    }
    if (typeof v === "object") {
      for (const key of Object.keys(v)) visit((v as Record<string, unknown>)[key]);
    }
  };
  visit(obj);
  return words;
}

const MAX_QUERIES_PER_CATEGORY = 12; // limite por categoria para não estourar cota Serper

/** UF → nome do estado para enriquecer queries (Google Brasil) */
const BR_UF_NOME: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe",
  TO: "Tocantins",
};

function resolveUfForSearch(data: CandidateDataInput): { uf?: string; nomeEstado?: string } {
  const raw = (data.state ?? data.candidato?.state ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  const uf = raw.length >= 2 ? raw.slice(0, 2) : "";
  if (!uf) return {};
  const nomeEstado = BR_UF_NOME[uf];
  return { uf, nomeEstado };
}

/** Cidade unificada: formulário manual (data.city) ou JSON do candidato */
function resolveCityDeclared(data: CandidateDataInput): string {
  const fromData = data.city?.trim();
  if (fromData) return fromData.slice(0, 120);
  const c = data.candidato;
  if (!c) return "";
  const raw = c.cidade || c.city;
  return raw != null && String(raw).trim().length > 0 ? String(raw).trim().slice(0, 120) : "";
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "proton.me",
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
  "ig.com.br",
]);

function isLikelyCorporateEmail(email: string): boolean {
  const t = email.trim().toLowerCase();
  const at = t.indexOf("@");
  if (at < 1) return false;
  const domain = t.slice(at + 1).replace(/>\s*$/, "").trim();
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return false;
  return true;
}

/** Slug do perfil em linkedin.com/in/{slug}/… */
function extractLinkedinInSlug(raw: string): string | null {
  const u = raw.trim();
  if (!u || !/linkedin\.com/i.test(u)) return null;
  try {
    const href = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    const parsed = new URL(href);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "linkedin.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("in");
    if (i >= 0 && parts[i + 1]) {
      return parts[i + 1].split("?")[0].split("#")[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function collectLinkedinInSlugs(data: CandidateDataInput): string[] {
  const urls: string[] = [...(data.referenceUrls || []).map(String)].filter(Boolean);
  const c = data.candidato;
  if (c?.linkedin) urls.push(String(c.linkedin));
  const socials = (c?.redes_sociais || c?.socials || {}) as { linkedin?: string };
  if (socials.linkedin) urls.push(String(socials.linkedin));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const slug = extractLinkedinInSlug(url);
    if (slug && !seen.has(slug.toLowerCase())) {
      seen.add(slug.toLowerCase());
      out.push(slug);
      if (out.length >= 5) break;
    }
  }
  return out;
}

/** URL canônica do perfil para collect Coresignal (um perfil por análise — créditos API). */
function normalizeLinkedinProfileUrlFromAny(raw: string): string | null {
  const slug = extractLinkedinInSlug(raw);
  if (!slug) return null;
  return `https://www.linkedin.com/in/${slug}`;
}

function collectLinkedinProfileUrls(data: CandidateDataInput): string[] {
  const urls: string[] = [...(data.referenceUrls || []).map(String)].filter(Boolean);
  const c = data.candidato;
  if (c?.linkedin) urls.push(String(c.linkedin));
  const socials = (c?.redes_sociais || c?.socials || {}) as { linkedin?: string };
  if (socials.linkedin) urls.push(String(socials.linkedin));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const n = normalizeLinkedinProfileUrlFromAny(u);
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n);
    }
  }
  return out.slice(0, 1);
}

// --- Coresignal Multi-source Employee API (collect por URL do LinkedIn) ---
const CORESIGNAL_CDAPI_BASE = "https://api.coresignal.com/cdapi/v2";

const getCoresignalApiKey = () =>
  (process.env.CORESIGNAL_API_KEY || process.env.VITE_CORESIGNAL_API_KEY || "").trim();

/** Collect employee_multi_source; tenta URL codificada e, em seguida, só o slug. */
async function fetchCoresignalEmployeeForLinkedin(
  data: CandidateDataInput
): Promise<Record<string, unknown> | null> {
  const apikey = getCoresignalApiKey();
  if (!apikey) return null;
  const profileUrls = collectLinkedinProfileUrls(data);
  if (profileUrls.length === 0) return null;
  const linkedinUrl = profileUrls[0];
  const slug = extractLinkedinInSlug(linkedinUrl);
  const segments = [encodeURIComponent(linkedinUrl)];
  if (slug) segments.push(encodeURIComponent(slug));

  for (const segment of segments) {
    const url = `${CORESIGNAL_CDAPI_BASE}/employee_multi_source/collect/${segment}`;
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          apikey,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json && typeof json === "object") return json as Record<string, unknown>;
        return null;
      }
      if (res.status === 401) {
        console.warn(
          "Coresignal: chave inválida ou sem permissão. Defina CORESIGNAL_API_KEY no .env (header apikey)."
        );
        return null;
      }
      if (res.status === 402 || res.status === 403) {
        const t = await res.text().catch(() => "");
        console.warn("Coresignal:", res.status, t.slice(0, 160));
        return null;
      }
    } catch (e) {
      console.warn("Coresignal collect:", e);
      return null;
    }
  }
  return null;
}

/** Texto para o prompt; omite salários e projeções financeiras. */
function formatCoresignalEmployeeMarkdown(record: Record<string, unknown>): string {
  const lines: string[] = [];
  const s = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : "");

  lines.push("### Coresignal (Multi-source Employee — collect por URL do LinkedIn)");
  if (s(record.professional_network_url)) lines.push(`- URL perfil (rede profissional): ${s(record.professional_network_url)}`);
  if (s(record.full_name)) lines.push(`- Nome: ${s(record.full_name)}`);
  if (s(record.headline)) lines.push(`- Headline: ${s(record.headline)}`);
  if (s(record.summary)) {
    const sum = s(record.summary);
    lines.push(`- Resumo: ${sum.slice(0, 1500)}${sum.length > 1500 ? "…" : ""}`);
  }
  if (s(record.location_full)) lines.push(`- Localização: ${s(record.location_full)}`);
  else if (s(record.location_city) || s(record.location_country)) {
    lines.push(`- Localização: ${[s(record.location_city), s(record.location_state), s(record.location_country)].filter(Boolean).join(", ")}`);
  }
  if (s(record.website)) lines.push(`- Website: ${s(record.website)}`);
  if (s(record.services)) {
    const sv = s(record.services);
    lines.push(`- Serviços declarados: ${sv.slice(0, 500)}${sv.length > 500 ? "…" : ""}`);
  }
  const pc = record.connections_count;
  const fc = record.followers_count;
  if (typeof pc === "number" || typeof fc === "number") {
    lines.push(`- Conexões / seguidores: ${typeof pc === "number" ? pc : "?"} / ${typeof fc === "number" ? fc : "?"}`);
  }

  const interests = record.interests;
  if (Array.isArray(interests) && interests.length > 0) {
    lines.push(`- Interesses: ${interests.slice(0, 25).map((x) => String(x)).join(", ")}`);
  }
  const skills = record.inferred_skills;
  if (Array.isArray(skills) && skills.length > 0) {
    lines.push(`- Habilidades inferidas: ${skills.slice(0, 45).map((x) => String(x)).join(", ")}`);
  }

  const pemail = record.primary_professional_email;
  if (s(pemail)) lines.push(`- E-mail profissional (campo do fornecedor): ${s(pemail)}`);

  const exp = record.experience;
  if (Array.isArray(exp) && exp.length > 0) {
    lines.push("### Experiências (Coresignal)");
    for (const item of exp.slice(0, 22)) {
      const e = item as Record<string, unknown>;
      const title = s(e.position_title);
      const comp = s(e.company_name);
      const from = s(e.date_from);
      const to = s(e.date_to);
      const loc = s(e.location);
      lines.push(`  - ${title || "?"} @ ${comp || "?"} (${from || "?"} – ${to || "?"})${loc ? ` — ${loc}` : ""}`);
    }
  }

  const edu = record.education;
  if (Array.isArray(edu) && edu.length > 0) {
    lines.push("### Formação (Coresignal)");
    for (const item of edu.slice(0, 12)) {
      const e = item as Record<string, unknown>;
      const period =
        s(e.date_from) && s(e.date_to)
          ? `${s(e.date_from)} – ${s(e.date_to)}`
          : [e.date_from_year, e.date_to_year].filter((y) => y != null).join(" – ");
      lines.push(
        `  - ${s(e.degree) || s(e.field_of_study) || "Formação"} — ${s(e.institution_name) || "?"} (${period || "?"})`
      );
    }
  }

  const langs = record.languages;
  if (Array.isArray(langs) && langs.length > 0) {
    lines.push(
      `### Idiomas (Coresignal)\n${langs.slice(0, 15).map((x) => `  - ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n")}`
    );
  }

  let body = lines.join("\n");
  const max = 14000;
  if (body.length > max) body = `${body.slice(0, max)}\n… (truncado para limite do prompt)`;
  return `\nDADOS DO LINKEDIN / REDE PROFISSIONAL (API Coresignal \`employee_multi_source/collect\` — evidência **Alta** para o que está listado aqui; **não** trate como resultado web [n]):\n${body}\n`;
}

/** Monta queries usando TODOS os dados fornecidos: todos os links, experiências, educações, habilidades e currículo */
function buildSearchQueries(
  data: CandidateDataInput,
  opts?: { skipLinkedinSerpQueries?: boolean }
): {
  web: string[];
  site: string[];
  news: string[];
} {
  const skipLi = opts?.skipLinkedinSerpQueries === true;
  const { name, role, referenceUrls = [], candidato } = data;
  const { uf, nomeEstado } = resolveUfForSearch(data);
  const cityDeclared = resolveCityDeclared(data);
  const nome = normalizeNameForSearch(name);
  const urls = referenceUrls.filter((u) => u && u.trim());
  const domains = extractSearchableDomains(urls);
  const slugs = domains.map((d) => d.slug).filter(Boolean) as string[];
  const namesFromSlugs = domains.map((d) => d.nameFromSlug).filter(Boolean) as string[];

  const nameVariations = getNameVariations(name, slugs, namesFromSlugs);
  const priorityNames = nameVariations.slice(0, 8);

  const web: string[] = [];
  const site: string[] = [];
  const news: string[] = [];

  const q = (n: string) => (n.includes(" ") ? `"${n}"` : n);

  // —— Nome e nome + cargo (várias variações de nome) ——
  for (const n of priorityNames) {
    if (!n || n.length < 3) continue;
    web.push(q(n));
    if (role) web.push(`${q(n)} ${role}`);
  }

  const emailDeclared = data.email?.trim();
  if (emailDeclared && isLikelyCorporateEmail(emailDeclared) && priorityNames[0]) {
    const dom = emailDeclared.split("@")[1]?.toLowerCase().trim();
    if (dom) {
      web.push(`${q(priorityNames[0])} ${dom}`);
      web.push(`"${dom}" ${q(priorityNames[0])}`);
      if (!skipLi) web.push(`site:linkedin.com ${q(priorityNames[0])} ${dom}`);
    }
  }

  // —— Nome + plataformas e emprego ——
  for (const n of priorityNames.slice(0, 3)) {
    if (skipLi) {
      web.push(`${q(n)} github OR portfolio`);
      web.push(`${q(n)} trabalhou OR "works at" OR "working at"`);
    } else {
      web.push(`${q(n)} linkedin OR github OR portfolio`);
      web.push(`${q(n)} trabalhou OR "works at" OR "working at"`);
    }
  }

  // —— TODAS as experiências: nome + empresa e nome + cargo/título ——
  if (candidato && priorityNames.length > 0) {
    const exp = candidato.experiences || candidato.experiencia;
    if (exp && Array.isArray(exp)) {
      const companies = exp
        .map((e: { company?: string; empresa?: string }) => e.company || e.empresa)
        .filter((c): c is string => !!c && c.trim().length > 0);
      const uniqCompanies = [...new Set(companies)].slice(0, MAX_QUERIES_PER_CATEGORY);
      for (const company of uniqCompanies) {
        web.push(`${q(priorityNames[0])} ${company.trim()}`);
        if (priorityNames[1] && priorityNames[1] !== priorityNames[0]) {
          web.push(`${q(priorityNames[1])} ${company.trim()}`);
        }
      }
      // Cargo/título de cada experiência (ajuda a achar menções específicas)
      for (const e of exp.slice(0, 8)) {
        const title = (e as { role?: string; title?: string; cargo?: string }).role
          || (e as { title?: string }).title
          || (e as { cargo?: string }).cargo;
        if (title && String(title).trim().length > 2) {
          web.push(`${q(priorityNames[0])} "${String(title).trim()}"`);
        }
      }
    }
  }

  // —— TODAS as educações: nome + instituição e nome + curso/formação ——
  if (candidato && priorityNames.length > 0) {
    const edu = candidato.educacao || (candidato as { education?: { institution?: string; instituicao?: string; degree?: string; field?: string; curso?: string }[] }).education;
    if (edu && Array.isArray(edu)) {
      const institutions = edu
        .map((e: { institution?: string; instituicao?: string }) => e.institution || e.instituicao)
        .filter((i): i is string => !!i && i.trim().length > 0);
      const uniqInstitutions = [...new Set(institutions)].slice(0, MAX_QUERIES_PER_CATEGORY);
      for (const inst of uniqInstitutions) {
        web.push(`${q(priorityNames[0])} ${inst.trim()}`);
      }
      for (const e of edu.slice(0, 6)) {
        const degree = (e as { degree?: string }).degree || (e as { field?: string }).field || (e as { curso?: string }).curso;
        if (degree && String(degree).trim().length > 2) {
          web.push(`${q(priorityNames[0])} "${String(degree).trim()}"`);
        }
      }
    }
  }

  // —— TODAS as habilidades: nome + skills em lotes ——
  if (candidato && priorityNames.length > 0) {
    const extractSkillNames = (s: unknown): string[] => {
      if (!s || !Array.isArray(s)) return [];
      return s.map((x) => (typeof x === "string" ? x : (x as { nome?: string })?.nome)).filter(Boolean) as string[];
    };
    const hard = extractSkillNames(candidato.hardSkills || candidato.habilidades);
    const soft = extractSkillNames(candidato.soft_skills || candidato.softSkills);
    const allSkills = [...new Set([...hard, ...soft])];
    const n = priorityNames[0];
    for (let i = 0; i < allSkills.length && i < MAX_QUERIES_PER_CATEGORY; i += 5) {
      const chunk = allSkills.slice(i, i + 5);
      if (chunk.length) web.push(`${q(n)} ${chunk.join(" ")}`);
    }
  }

  // —— Currículo: termos extraídos do objeto curriculum ——
  if (candidato?.curriculum && priorityNames.length > 0 && typeof candidato.curriculum === "object") {
    const curriculumWords = extractSearchableTextFromObject(candidato.curriculum, 10);
    if (curriculumWords.length > 0) {
      web.push(`${q(priorityNames[0])} ${curriculumWords.slice(0, 6).join(" ")}`);
    }
  }

  // —— Área de interesse: nome + área/cargo/interesse declarados ——
  if (candidato && priorityNames.length > 0) {
    const targetArea = candidato.targetArea;
    if (targetArea && Array.isArray(targetArea)) {
      const areaTerms = targetArea
        .flatMap((a: { area?: string; cargo?: string; interesse?: string }) => [
          a.area,
          a.cargo,
          a.interesse,
        ])
        .filter((t): t is string => !!t && String(t).trim().length > 0);
      const uniqArea = [...new Set(areaTerms)].slice(0, MAX_QUERIES_PER_CATEGORY);
      for (const term of uniqArea) {
        web.push(`${q(priorityNames[0])} ${String(term).trim()}`);
      }
    }
    if (candidato.area_interesse && typeof candidato.area_interesse === "string" && candidato.area_interesse.trim()) {
      web.push(`${q(priorityNames[0])} ${candidato.area_interesse.trim()}`);
    }
  }

  // —— LinkedIn: busca detalhada (omitida se já houver collect Coresignal por URL) ——
  if (!skipLi && priorityNames.length > 0) {
    const n = priorityNames[0];
    web.push(`${q(n)} linkedin profile`);
    web.push(`${q(n)} linkedin experience`);
    web.push(`${q(n)} linkedin experiences job title`);
    web.push(`${q(n)} linkedin projects`);
    web.push(`${q(n)} linkedin project link`);
    web.push(`${q(n)} linkedin highlights`);
    web.push(`${q(n)} linkedin recommendations`);
    web.push(`${q(n)} linkedin idiomas languages`);
    web.push(`${q(n)} linkedin website link`);
    web.push(`${q(n)} linkedin contact`);
  }
  // Por empresa/instituição do candidato + LinkedIn (para achar experiências específicas)
  if (!skipLi && candidato && priorityNames.length > 0) {
    const exp = candidato.experiences || candidato.experiencia;
    if (exp && Array.isArray(exp)) {
      const companies = exp
        .map((e: { company?: string; empresa?: string }) => e.company || e.empresa)
        .filter((c): c is string => !!c && c.trim().length > 0);
      for (const company of [...new Set(companies)].slice(0, 5)) {
        web.push(`${q(priorityNames[0])} linkedin ${company.trim()}`);
      }
    }
  }
  // Por projeto (se tiver título) para achar link do projeto
  if (!skipLi && candidato?.projects && Array.isArray(candidato.projects) && priorityNames.length > 0) {
    const n = priorityNames[0];
    for (const proj of candidato.projects.slice(0, 5)) {
      const title = (proj as { title?: string }).title;
      if (title && String(title).trim().length > 2) {
        web.push(`${q(n)} linkedin project "${String(title).trim()}"`);
      }
    }
  }

  // —— TODOS os links: buscas site: para cada domínio (e 2ª variação de nome quando houver) ——
  for (const { domain, slug } of domains) {
    if (skipLi && domain === "linkedin.com") continue;
    if (slug) {
      site.push(`site:${domain} ${slug}`);
      if (priorityNames[1] && priorityNames[1] !== priorityNames[0]) {
        site.push(`site:${domain} "${priorityNames[1].replace(/\s+/g, " ")}"`);
      }
    } else if (priorityNames[0]) {
      site.push(`"${priorityNames[0]}" site:${domain}`);
    }
  }

  // —— Rodada fechada: slug LinkedIn e login GitHub dos próprios links (menos homônimos) ——
  if (!skipLi) {
    for (const slug of collectLinkedinInSlugs(data)) {
      site.push(`site:linkedin.com/in/${slug}`);
      site.push(`site:linkedin.com/in "${slug}"`);
      if (priorityNames[0]) site.push(`site:linkedin.com/in ${q(priorityNames[0])}`);
    }
  }
  for (const ghLogin of collectGithubLogins(data)) {
    site.push(`site:github.com/${ghLogin}`);
    site.push(`site:github.com "${ghLogin}"`);
    if (priorityNames[0]) site.push(`site:github.com ${q(priorityNames[0])}`);
  }

  // —— Nome + cidade (cadastro manual ou candidato) ——
  if (priorityNames.length > 0 && cityDeclared.length > 2) {
    web.push(`${q(priorityNames[0])} ${cityDeclared}`);
    if (nomeEstado) web.push(`${q(priorityNames[0])} ${cityDeclared} ${nomeEstado}`);
    if (uf) web.push(`${q(priorityNames[0])} ${cityDeclared} ${uf}`);
    if (role) web.push(`${q(priorityNames[0])} ${role} ${cityDeclared}`);
  }

  // —— Pistas em agregadores/diretórios BR (cobertura não garantida; apenas hints de busca) ——
  for (const n of priorityNames.slice(0, 2)) {
    if (!n || n.length < 3) continue;
    web.push(`${q(n)} site:lattes.cnpq.br`);
    web.push(`${q(n)} site:jusbrasil.com.br`);
    web.push(`${q(n)} (site:reclameaqui.com.br OR site:reclameaqui.com)`);
  }

  // —— Estado / UF (formulário ou candidato): nome + estado para precisão regional ——
  if (priorityNames.length > 0 && (nomeEstado || uf)) {
    for (const n of priorityNames.slice(0, 4)) {
      if (!n || n.length < 3) continue;
      if (nomeEstado) {
        web.push(`${q(n)} ${nomeEstado}`);
        if (role) web.push(`${q(n)} ${role} ${nomeEstado}`);
        if (!skipLi) web.push(`${q(n)} linkedin ${nomeEstado}`);
      }
      if (uf) {
        web.push(`${q(n)} ${uf}`);
        if (role) web.push(`${q(n)} ${role} ${uf}`);
        if (!skipLi) web.push(`${q(n)} linkedin ${uf}`);
      }
    }
  }

  // —— Notícias (e nome + área para notícias) ——
  for (const n of priorityNames.slice(0, 4)) {
    news.push(q(n));
    if (role) news.push(`${q(n)} ${role}`);
    if (nomeEstado) news.push(`${q(n)} ${nomeEstado}`);
    if (uf) news.push(`${q(n)} ${uf}`);
  }

  const dedupe = (arr: string[]) => [...new Set(arr)];
  return {
    web: dedupe(web),
    site: dedupe(site),
    news: dedupe(news),
  };
}

const SYSTEM_INSTRUCTION =
  "Você é o analista OSINT Ache um Veterano IA. Dimensões: (1) Consistência — cruze nome, variações e links com a web. (2) Aderência à área de interesse — avalie se o que foi encontrado CONDIZ com a área/cargo declarado pelo candidato. (3) Risco — avalie perigo para a empresa: discurso agressivo, fraude relatada, comportamento incompatível. (4) Atentado/má conduta na internet — relate explicitamente se há indícios de fraude, golpe, assédio, crimes cibernéticos ou atentado à honra; se não houver, diga claramente. SEMPRE classifique evidências: Alta (fonte primária), Média (agregador), Baixa (inferência). Nunca invente — só cite o que está nos resultados da busca. Separe claramente fatos vindos da API GitHub do que vem só da lista de resultados web [n].";

/** Heurísticas baratas pós-agregação (não substituem análise humana). */
function buildLightValidationHints(
  data: CandidateDataInput,
  githubApiMarkdown: string,
  items: SearchItem[],
  linkedinFromCoresignal = false
): string {
  const hints: string[] = [];
  const linkBlob = items.map((i) => (i.link || "").toLowerCase()).join(" ");

  const ghExpected = collectGithubLogins(data);
  for (const login of ghExpected) {
    const inApi =
      githubApiMarkdown.includes(`@${login}`) || githubApiMarkdown.toLowerCase().includes(`github.com/${login.toLowerCase()}`);
    if (inApi) hints.push(`GitHub: o login "${login}" dos links confere com o perfil retornado pela API oficial.`);
    else if (!githubApiMarkdown.trim())
      hints.push(`GitHub: havia link para "${login}" mas não houve bloco da API (token, limite ou indisponibilidade).`);
  }

  if (linkedinFromCoresignal) {
    hints.push(
      `LinkedIn: perfil carregado via Coresignal (collect por URL); use esse bloco como fonte principal de carreira — buscas Serper focadas em LinkedIn foram omitidas.`
    );
  } else {
    for (const slug of collectLinkedinInSlugs(data)) {
      const needle = `linkedin.com/in/${slug.toLowerCase()}`;
      if (linkBlob.includes(needle))
        hints.push(`LinkedIn: o slug /in/${slug} aparece em pelo menos um link entre os resultados agregados.`);
      else
        hints.push(
          `LinkedIn: o slug /in/${slug} não aparece literalmente nos links listados nos resultados — pode constar em outras páginas não capturadas.`
        );
    }
  }

  if (hints.length === 0) return "";
  return `CHECAGENS AUTOMÁTICAS (metadados — use como apoio, não como prova sozinha):\n${hints.map((h) => `- ${h}`).join("\n")}\n`;
}

function buildOSINTPrompt(
  data: CandidateDataInput,
  searchResultsContext: string,
  githubApiContext = "",
  validationHints = "",
  coresignalContext = ""
): string {
  const urls = data.referenceUrls?.filter(Boolean) || [];
  const linksBlock =
    urls.length > 0
      ? `\nLINKS INFORMADOS PELO CANDIDATO:\n${urls.map((u) => `- ${u}`).join("\n")}`
      : "";
  const domainsForPrompt = extractSearchableDomains(urls);
  const slugsForPrompt = domainsForPrompt.map((d) => d.slug).filter(Boolean) as string[];
  const namesFromSlugsForPrompt = domainsForPrompt.map((d) => d.nameFromSlug).filter(Boolean) as string[];
  const nameVars = getNameVariations(data.name, slugsForPrompt, namesFromSlugsForPrompt);
  const nameVariationsBlock =
    nameVars.length > 1
      ? `\nVARIAÇÕES DE NOME (a pessoa pode usar formatos diferentes online):\n${nameVars.map((v) => `- ${v}`).join("\n")}\nEx.: no LinkedIn pode estar como "samuel-ziger" em vez do nome completo. Considere todas as variações ao validar.`
      : "";
  const enrichedContext = data.candidato ? buildEnrichedContext(data.candidato) : "";
  const cpfDisplay =
    data.cpf && /^\d{11}$/.test(String(data.cpf).replace(/\D/g, ""))
      ? String(data.cpf).replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
      : "";
  const cpfBlock = cpfDisplay ? `\n- CPF (informado pelo candidato): ${cpfDisplay}. Use para cruzar com processos no Datajud e com menções em fontes quando relevante.` : "";
  const { uf: ufPrompt, nomeEstado: nomeEstadoPrompt } = resolveUfForSearch(data);
  const stateBlock =
    ufPrompt && nomeEstadoPrompt
      ? `\n- Estado (UF) para refinamento regional: ${ufPrompt} (${nomeEstadoPrompt}). Priorize achados e perfis coerentes com essa localização quando fizer sentido.`
      : ufPrompt
      ? `\n- Estado (UF) para refinamento regional: ${ufPrompt}. Priorize achados coerentes com essa UF quando fizer sentido.`
        : "";

  const cityLine = data.city?.trim();
  const emailLine = data.email?.trim();
  const cityEmailBlock =
    cityLine || emailLine
      ? `\n- Cidade declarada: ${cityLine || "—"}\n- E-mail declarado: ${emailLine || "—"}`
      : "";

  return `Você é um analista OSINT rigoroso. Sua tarefa é CRUZAR todos os dados fornecidos com os resultados da web.

DADOS DO CANDIDATO:
- Nome completo: ${data.name}
- Cargo/Área: ${data.role}${cpfBlock}${stateBlock}${cityEmailBlock}
${linksBlock}
${coresignalContext}
${githubApiContext}
${validationHints ? `${validationHints}\n` : ""}
${nameVariationsBlock}

ORIGEM DOS DADOS — NÃO MISTURE SEM ROTULAR:
- Bloco "DADOS DO LINKEDIN / REDE PROFISSIONAL (API Coresignal)" = fatos do **collect** Coresignal (\`employee_multi_source\`) pela URL do LinkedIn. Evidência **Alta** para carreira/experiências neste bloco; **não** cite como [n] da lista web.
- Bloco "DADOS DO GITHUB (API REST oficial)" = **somente** fatos retornados pela API GitHub (perfil, repos, orgs, eventos públicos). Não extrapole além desse bloco para GitHub.
- "DADOS ADICIONAIS DO CANDIDATO" = cadastro/plataforma (inclui e-mail e telefone quando fornecidos).
- "RESULTADOS DA WEB" abaixo = trechos da busca web; ao citar, use **[n]** conforme a lista.
- Para GitHub: prefira o bloco da API; use [n] só para o que vier explicitamente dos resultados web.

IMPORTANTE: Se existir o bloco Coresignal acima, use-o como fonte **principal** para headline, resumo, experiências e formação profissional do LinkedIn; use "DADOS ADICIONAIS" para recomendações/outros itens que a API não liste. Se existir o bloco "DADOS DO GITHUB (API REST oficial)" acima, use-o como fonte primária para GitHub (bio, local, repos públicos, linguagens). O nome completo (ex: "Samuel Henryk de Souza Ziger") MAL EXISTE na web. A pessoa aparece como "Samuel Ziger" ou "samuel-ziger". O LINK contém a pista: linkedin.com/in/samuel-ziger-237524357 → "samuel-ziger" (antes do número) = "Samuel Ziger" com espaço. É a MESMA PESSOA. Valide cruzando todas as variações.

${enrichedContext}

REGRAS PARA RECOMENDAÇÕES LINKEDIN: Se nos "DADOS ADICIONAIS DO CANDIDATO" acima existir a seção "Recomendações recebidas (ex.: LinkedIn)" ou qualquer lista de recomendações, você DEVE reproduzir TODAS essas recomendações na seção "Dados coletados do LinkedIn", no item (h) Recomendações, listando cada uma com autor (e cargo do recomendador quando houver) e trecho. NUNCA escreva "Nenhuma recomendação encontrada" se houver recomendações nos DADOS ADICIONAIS — use-as obrigatoriamente.

RESULTADOS DA WEB (trechos indexados — cite com [n]; não confunda com a API GitHub):
${searchResultsContext}

CONTEXTO LINKEDIN/PERFIL: A seção "Dados coletados do LinkedIn" deve ser detalhada. Ordem de prioridade: (1) bloco **Coresignal** se existir; (2) "DADOS ADICIONAIS" (recomendações, projetos, destaques que o fornecedor não cobriu); (3) "RESULTADOS DA WEB" [n]. Para o item (h) Recomendações: se houver nos DADOS ADICIONAIS, liste TODAS; senão, use os resultados da busca; só escreva "nenhuma recomendação encontrada" se não houver em nenhuma fonte.

TAREFA – Cruzamento obrigatório:
1. Cruze NOME (e variações: primeiro+último, slug do link como "samuel-ziger") com cada LINK. O username na URL (ex: /in/samuel-ziger) é o perfil real — valide se os resultados da busca correspondem a essa pessoa.
2. Cruze as EXPERIÊNCIAS declaradas com o que a web retornou (empresas, cargos, datas).
3. Cruze a FORMAÇÃO com instituições e cursos encontrados.
4. Cruze as HABILIDADES com repositórios, projetos e perfis técnicos.
5. Identifique divergências: dados que não batem entre o declarado e o encontrado.
6. AVALIE RISCO REPUTACIONAL: discurso agressivo, fraude/golpe relatado, comportamento incompatível com o cargo pretendido. Empresas precisam medir "perigo", não só "verdade".
7. CLASSIFIQUE a confiança de cada evidência citada (Anti-alucinação): só cite evidências com classificação explícita.
8. LINKEDIN: Na seção "Dados coletados do LinkedIn" liste (a) link do perfil; (b) experiências; (c) formação; (d) projetos com URL se houver em Coresignal, DADOS ADICIONAIS ou [n]; (e) destaques; (f) idiomas; (g) habilidades; (h) recomendações; (i) outros links do perfil. Se houver Coresignal, baseie (b)(c)(f)(g) principalmente nele. Se não houver link LinkedIn nem Coresignal nem dados identificáveis, indique "Nenhum dado de perfil LinkedIn informado ou encontrado nas fontes."
9. ÁREA DE INTERESSE: O candidato declarou área/cargo de interesse (veja em "DADOS ADICIONAIS"). Avalie se o que foi encontrado na web CONDIZ com essa área (mesma área técnica, cargos compatíveis, projetos ou formação alinhados). O relatório DEVE ter uma seção dedicada dizendo se o perfil digital encontrado está alinhado ou não à área de interesse declarada.
10. PROCESSOS JUDICIAIS: Nos RESULTADOS DA WEB podem constar entradas do Datajud (CNJ) com título no formato "Processo [número] (TRIBUNAL)" e link para o CNJ. Liste TODOS esses processos na seção "Processos judiciais" do relatório: número do processo, tribunal (ex.: STJ, TST, TRT1, TJSP, TRF1), classe/órgão/assuntos quando disponíveis no resumo, e link da fonte [n]. Se não houver nenhum processo nas fontes, escreva: "Nenhum processo judicial encontrado nas bases consultadas (Datajud)."

Relatório em Português (Brasil), seguindo EXATAMENTE estas seções:

1. **Scores (0-100%)** — mantenha os dois juntos:
   - **Pontuação de Consistência**: quão bem nome, links, experiências e formação batem com a web.
   - **Score de Risco** (quanto maior, pior): avaliação de perigo para a empresa — risco reputacional, discurso agressivo, fraude/golpe relatado, comportamento incompatível com o cargo. Indique "Nenhum sinal de risco encontrado" se não houver evidências; caso contrário, liste cada achado com classificação de confiança.
2. **Evidências Confirmadas** — para CADA evidência, indique a **Confiança**:
   - **Alta (Fonte primária)**: encontrada diretamente em perfil oficial, site da empresa, publicação do próprio candidato.
   - **Média (Agregador)**: encontrada em sites de notícias, agregadores, perfis de terceiros.
   - **Baixa (Inferência)**: dedução ou associação sem confirmação direta — use com cautela.
   Imediatamente abaixo, inclua uma **Tabela Declarado vs encontrado** (Markdown) com colunas: | Campo | Declarado | Encontrado nas fontes | Origem (Coresignal / API GitHub / DADOS ADICIONAIS / [n] / —) | Confiança |. Use **—** quando não houver dado declarado ou nenhum achado. Inclua linhas para: nome, cidade, UF, e-mail ou domínio, slug LinkedIn, login GitHub, CPF (só se declarado), e pelo menos uma linha de experiência ou cargo se houver nos DADOS ADICIONAIS.
3. **Dados coletados do LinkedIn** (busca detalhada): Priorize o bloco **Coresignal** quando existir; depois DADOS ADICIONAIS e RESULTADOS DA WEB [n]. Detalhe: (a) link do perfil; (b) experiências profissionais; (c) formação; (d) projetos com URL quando houver; (e) destaques; (f) idiomas; (g) habilidades; (h) recomendações — primeiro DADOS ADICIONAIS, depois [n]; (i) outros links do perfil. Se não houver link de LinkedIn nem Coresignal nem dados identificáveis, escreva: "Nenhum dado de perfil LinkedIn informado ou encontrado nas fontes consultadas."
4. **Processos judiciais**: Liste TODOS os processos encontrados nos RESULTADOS DA WEB que tenham formato "Processo [número] (TRIBUNAL)" ou que sejam claramente metadados do Datajud/CNJ. Para cada processo: número, tribunal (TST, TRT, STJ, TJSP, TRF etc.), classe processual/órgão/assuntos quando aparecer no resumo, e cite a fonte [n]. Se não houver nenhum processo nas fontes consultadas, escreva: "Nenhum processo judicial encontrado nas bases consultadas (Datajud)."
5. **Aderência à Área de Interesse**: Com base na área/cargo de interesse declarada pelo candidato e no que foi encontrado na web, informe de forma explícita: (a) se o perfil digital encontrado CONDIZ com a área de interesse declarada; (b) evidências que sustentam ou contradizem (cargos, projetos, formação, habilidades). Se não houver área de interesse informada, escreva "Não informada".
6. **Sinais de Atentado ou Má Conduta na Internet**: Pesquise nos resultados se há QUALQUER indício relacionado a: fraude, estelionato, golpe, assédio, discurso de ódio, conduta maliciosa, processos ou denúncias judiciais envolvendo uso da internet, tentativas de atentado à honra ou à imagem de terceiros, envolvimento em esquemas ou crimes cibernéticos. Liste cada achado com fonte e classificação de confiança (Alta/Média/Baixa). Se NÃO houver nenhum achado nesse sentido nas fontes consultadas, escreva explicitamente: "Nenhum indício de atentado ou má conduta na internet foi encontrado nas fontes consultadas."
7. **Divergências ou Lacunas**: Contradições, ausência esperada (ex: sem GitHub para dev), links do perfil sem correspondência.
8. **Análise de Senioridade**: Júnior, Pleno, Sênior ou Specialist com base no histórico digital.
9. **Veredito Final**: Conclusão sobre a confiabilidade do perfil e nível de risco para contratação.

Regras: Seja rigoroso e imparcial. Use Markdown limpo. NÃO inclua cabeçalho, analista ou data. SEMPRE classifique a confiança de evidências (Alta/Média/Baixa). Não invente achados — se não encontrou, diga "Não encontrado nas fontes disponíveis". Comece pela seção 1.

CITAÇÃO DE FONTES: Sempre que citar uma fonte da lista "RESULTADOS DA WEB" acima, use UM ÚNICO número entre colchetes: [1] para a primeira fonte, [2] para a segunda, etc. (a lista inclui fontes do Serper e da busca do Gemini — use apenas números [1], [2], etc. que existam na lista). Exemplos corretos: "conforme a fonte [1]", "segundo [2] e [3]". ERRADO: [1, 145], [1, 2] ou qualquer número dentro do mesmo colchete. Use sempre um par de colchetes por número: [1], [2]. Assim o leitor poderá clicar no link da fonte.`;
}

function resolveProvider(data: CandidateDataInput): AIProvider {
  const fromData = data.aiProvider;
  const fromEnv = process.env.NEXT_PUBLIC_ROOTID_AI_PROVIDER as AIProvider | undefined;
  if (fromData === "chatgpt" || fromData === "gemini") return fromData;
  if (fromEnv === "chatgpt" || fromEnv === "gemini") return fromEnv;
  return "gemini";
}

export const performOSINTAnalysis = async (data: CandidateDataInput): Promise<AnalysisResult> => {
  const provider = resolveProvider(data);

  const geminiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY;
  const openaiKey =
    process.env.OPENAI_API_KEY ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  let effectiveProvider = provider;
  if (provider === "chatgpt" && !openaiKey) {
    if (geminiKey) {
      effectiveProvider = "gemini";
      console.warn("ChatGPT selecionado mas chave OpenAI não configurada. Usando Gemini.");
    } else {
      throw new Error(
        "Chave da API OpenAI não encontrada. Adicione OPENAI_API_KEY ou NEXT_PUBLIC_OPENAI_API_KEY no .env.local — ou use Gemini."
      );
    }
  } else if (provider === "gemini" && !geminiKey) {
    if (openaiKey) {
      effectiveProvider = "chatgpt";
      console.warn("Gemini selecionado mas chave não configurada. Usando ChatGPT.");
    } else {
      throw new Error(
        "Chave da API Gemini não encontrada. Adicione NEXT_PUBLIC_GEMINI_API_KEY no .env.local"
      );
    }
  }

  // 0) Coresignal por URL do LinkedIn (se chave + URL): evita buscas web redundantes focadas em LinkedIn
  const coresignalRecord = await fetchCoresignalEmployeeForLinkedin(data);
  const coresignalContext = coresignalRecord ? formatCoresignalEmployeeMarkdown(coresignalRecord) : "";

  // 1) Busca em estágios: nome/web -> Datajud CPF -> web focada em CPF
  const { web, site, news } = buildSearchQueries(data, {
    skipLinkedinSerpQueries: Boolean(coresignalRecord),
  });
  const numInfosimplesQueries = 6;
  const numSerpApiQueries = 6;
  const webForInfosimples = web.slice(0, numInfosimplesQueries);
  const webForSerpApi = web.slice(0, numSerpApiQueries);

  const nameForDatajud = data.name.trim().replace(/\s+/g, " ").slice(0, 80);
  const parts = nameForDatajud.split(/\s+/).filter(Boolean);
  const datajudNames = parts.length >= 2
    ? [nameForDatajud, `${parts[0]} ${parts[parts.length - 1]}`]
    : [nameForDatajud];
  const datajudCpf = data.cpf && /^\d{11}$/.test(String(data.cpf).replace(/\D/g, "")) ? String(data.cpf).replace(/\D/g, "") : undefined;
  const datajudOpcoes = {
    trabalhista: data.searchProcessoTrabalhista !== false,
    outros: data.searchOutrosTiposProcesso !== false,
  };

  const githubEnrichmentPromise = fetchGithubEnrichmentMarkdown(data);

  // Estágio A — nome e contexto geral (ordem: Serper -> SerpApi -> Infosimples)
  const webResults = await Promise.all(web.map((q) => searchWithSerper(q, "search")));
  const siteResults = await Promise.all(site.map((q) => searchWithSerper(q, "search")));
  const newsResults = await Promise.all(news.map((q) => searchWithSerper(q, "news")));
  const serpApiResults = await Promise.all(webForSerpApi.map((q) => searchWithSerpApi(q)));
  const infosimplesResults = await Promise.all(webForInfosimples.map((q) => searchWithInfosimples(q)));

  // Estágio B — Datajud (CPF + nomes)
  const datajudResults = await searchWithDatajud(datajudNames, datajudCpf, datajudOpcoes);

  // Estágio C — repetir web com foco em CPF (ordem: Serper -> SerpApi -> Infosimples)
  const cpfQueries: string[] = [];
  if (datajudCpf) {
    const cpfFormatado = datajudCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    const { uf: ufCpf, nomeEstado: nomeCpf } = resolveUfForSearch(data);
    cpfQueries.push(`"${datajudCpf}"`);
    cpfQueries.push(`"${cpfFormatado}"`);
    cpfQueries.push(`"${data.name}" "${datajudCpf}"`);
    cpfQueries.push(`"${data.name}" "${cpfFormatado}"`);
    if (nomeCpf) {
      cpfQueries.push(`"${data.name}" "${datajudCpf}" ${nomeCpf}`);
      cpfQueries.push(`"${data.name}" "${cpfFormatado}" ${nomeCpf}`);
    }
    if (ufCpf) {
      cpfQueries.push(`"${datajudCpf}" ${ufCpf}`);
      cpfQueries.push(`"${data.name}" "${datajudCpf}" ${ufCpf}`);
    }
  }

  const cpfSerperResults = cpfQueries.length
    ? await Promise.all(cpfQueries.map((q) => searchWithSerper(q, "search")))
    : [];
  const cpfSerpApiResults = cpfQueries.length
    ? await Promise.all(cpfQueries.map((q) => searchWithSerpApi(q)))
    : [];
  const cpfInfosimplesResults = cpfQueries.length
    ? await Promise.all(cpfQueries.map((q) => searchWithInfosimples(q)))
    : [];

  const organicResults = mergeSearchResults([
    ...webResults,
    ...siteResults,
    ...newsResults,
    ...serpApiResults,
    ...infosimplesResults,
    datajudResults,
    ...cpfSerperResults,
    ...cpfSerpApiResults,
    ...cpfInfosimplesResults,
  ]);

  const searchResultsContext =
    organicResults
      .map(
        (res: { title?: string; link?: string; snippet?: string }, i: number) =>
          `Fonte [${i + 1}]: ${res.title || "Sem título"}\nLink: ${res.link || "N/A"}\nResumo: ${res.snippet || "—"}`
      )
      .join("\n\n") || "Nenhum resultado de busca encontrado na web para este perfil.";

  const githubApiContext = await githubEnrichmentPromise;
  const validationHints = buildLightValidationHints(
    data,
    githubApiContext,
    organicResults,
    Boolean(coresignalRecord)
  );
  const prompt = buildOSINTPrompt(
    data,
    searchResultsContext,
    githubApiContext,
    validationHints,
    coresignalContext
  );
  const serperSources: GroundingSource[] = organicResults
    .filter((r) => r.link)
    .map((r) => ({ title: r.title || "Fonte", uri: r.link! }))
    .slice(0, MAX_SOURCES_PASSED_TO_AI);

  try {
    let report: string;
    let sources: GroundingSource[] = serperSources;

    if (effectiveProvider === "chatgpt") {
      report = await generateWithChatGPT(openaiKey!, prompt);
    } else {
      const geminiResult = await generateWithGemini(geminiKey!, prompt);
      report = geminiResult.report;
      if (geminiResult.geminiSources.length > 0) {
        const seen = new Set(serperSources.map((s) => s.uri.toLowerCase()));
        for (const g of geminiResult.geminiSources) {
          if (seen.has(g.uri.toLowerCase())) continue;
          seen.add(g.uri.toLowerCase());
          sources.push(g);
        }
        sources = sources.slice(0, 80);
      }
    }

    return {
      report,
      sources,
      timestamp: new Date().toISOString(),
      aiProviderUsed: effectiveProvider,
    };
  } catch (error: any) {
    console.error(`${effectiveProvider === "chatgpt" ? "ChatGPT" : "Gemini"} Analysis Error:`, error);
    const rawMessage = error.message || "";
    let errorMessage = rawMessage;

    let errorCode: number | string | undefined;
    try {
      const parsed = JSON.parse(rawMessage);
      const err = parsed?.error;
      if (err?.message) errorMessage = err.message;
      if (err?.code !== undefined) errorCode = err.code;
      if (err?.code) errorMessage = `[${err.code}] ${errorMessage}`;
    } catch {
      // mantém errorMessage como está
    }

    const is503 =
      errorMessage.includes("503") ||
      errorMessage.includes("UNAVAILABLE") ||
      errorMessage.includes("high demand") ||
      errorMessage.includes("alta demanda");

    if (is503) {
      throw new Error(
        "O modelo de IA está sob alta demanda no momento. Isso costuma ser temporário. Aguarde 1–2 minutos e tente novamente."
      );
    }

    const isQuotaExhausted =
      errorCode === 429 ||
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("exceeded your current quota");

    if (effectiveProvider === "chatgpt") {
      if (isQuotaExhausted || errorMessage.includes("rate_limit")) {
        throw new Error("Limite da API OpenAI atingido. Aguarde e tente novamente.");
      }
    } else if (isQuotaExhausted) {
      throw new Error(
        "Cota da API Gemini excedida. Aguarde alguns minutos ou verifique seu plano e uso em ai.google.dev (rate limits). Para reduzir o uso, desative a busca do Gemini com NEXT_PUBLIC_GEMINI_GOOGLE_SEARCH=false no .env."
      );
    }

    throw new Error(`Erro na análise da IA: ${errorMessage || "Erro desconhecido"}`);
  }
};

/** Extrai fontes do grounding (Google Search) da resposta do Gemini */
function extractGeminiGroundingSources(response: { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> }): GroundingSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks || !Array.isArray(chunks)) return [];
  const sources: GroundingSource[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const web = chunk.web;
    if (!web?.uri) continue;
    const uri = web.uri.trim();
    const key = uri.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ title: web.title?.trim() || "Fonte (busca Gemini)", uri });
  }
  return sources;
}

function useGeminiGoogleSearch(): boolean {
  const v = (process.env.NEXT_PUBLIC_GEMINI_GOOGLE_SEARCH ?? process.env.GEMINI_GOOGLE_SEARCH ?? "").toLowerCase();
  return v === "true" || v === "1"; // só ativa se explicitamente true/1; padrão: só Serper faz busca
}

async function generateWithGemini(
  apiKey: string,
  prompt: string
): Promise<{ report: string; geminiSources: GroundingSource[] }> {
  const ai = new GoogleGenAI({ apiKey });
  const useGoogleSearch = useGeminiGoogleSearch();
  const config: { systemInstruction: string; temperature: number; tools?: { googleSearch: {} }[] } = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.1,
  };
  if (useGoogleSearch) config.tools = [{ googleSearch: {} }];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config,
  });
  const report = response.text || "Falha ao sintetizar relatório.";
  const geminiSources = useGoogleSearch ? extractGeminiGroundingSources(response as any) : [];
  return { report, geminiSources };
}

async function generateWithChatGPT(apiKey: string, prompt: string): Promise<string> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // RootID roda no client; a chave já é exposta via NEXT_PUBLIC_OPENAI_API_KEY
  });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
  });
  const text = completion.choices[0]?.message?.content;
  return text || "Falha ao sintetizar relatório.";
}
