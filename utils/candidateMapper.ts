import { CandidateData, AcheUmVeteranoCandidato } from "../types";

/**
 * Extrai links de referência do candidato (LinkedIn, portfolio, GitHub, etc.)
 */
function extractReferenceUrls(candidato: AcheUmVeteranoCandidato): string[] {
  const urls: string[] = [];
  const socials = candidato.redes_sociais || candidato.socials || {};

  const addIfValid = (url: string | undefined) => {
    if (url && typeof url === "string" && url.trim().length > 0 && url !== "-") {
      urls.push(url.trim());
    }
  };

  addIfValid(socials.linkedin);
  addIfValid(socials.github);
  addIfValid(socials.portfolio);
  addIfValid(candidato.linkedin);
  addIfValid(candidato.portfolio);

  // Outros links do perfil (website, blog, etc.)
  const linksPerfil = candidato.links_perfil;
  if (Array.isArray(linksPerfil)) {
    linksPerfil.forEach((u) => addIfValid(typeof u === "string" ? u : undefined));
  } else if (linksPerfil && typeof linksPerfil === "object") {
    Object.values(linksPerfil).forEach(addIfValid);
  }

  return [...new Set(urls)];
}

/**
 * Converte candidato do Ache Um Veterano para o formato CandidateData do RootID.
 * Mantém retrocompatibilidade: se já houver name/role/referenceUrls, eles são priorizados.
 */
export function mapCandidatoToRootID(
  candidato: AcheUmVeteranoCandidato,
  overrides?: Partial<CandidateData>
): CandidateData {
  const nome =
    candidato.nome ||
    (candidato.firstname && candidato.lastname
      ? `${candidato.firstname} ${candidato.lastname}`
      : "Candidato");

  const targetArea = Array.isArray(candidato.targetArea)
    ? candidato.targetArea[0]
    : candidato.targetArea;
  const role =
    typeof targetArea === "object" && targetArea?.area
      ? targetArea.area
      : candidato.area_interesse && typeof candidato.area_interesse === "string"
        ? candidato.area_interesse
        : candidato.nivel_senioridade || "Não especificado";

  const referenceUrls = extractReferenceUrls(candidato);

  const cpf = overrides?.cpf ?? candidato.cpf;
  const stateRaw = overrides?.state ?? candidato.state;
  const state =
    stateRaw && typeof stateRaw === "string" ? stateRaw.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) : "";
  return {
    name: overrides?.name ?? nome,
    role: overrides?.role ?? role,
    referenceUrls:
      overrides?.referenceUrls?.length
        ? overrides.referenceUrls
        : referenceUrls.length > 0
          ? referenceUrls
          : [""],
    ...(cpf && { cpf: typeof cpf === "string" ? cpf.trim() : String(cpf) }),
    ...(state.length === 2 && { state }),
  };
}

/**
 * Monta o bloco de contexto enriquecido para o prompt do Gemini.
 * Usa todos os dados disponíveis do candidato para tornar a análise mais precisa.
 */
export function buildEnrichedContext(candidato: AcheUmVeteranoCandidato): string {
  const sections: string[] = [];

  const addSection = (title: string, content: string | undefined) => {
    if (content && content.trim().length > 0) {
      sections.push(`### ${title}\n${content.trim()}`);
    }
  };

  const bio = candidato.bio || candidato.about;
  addSection("Biografia", bio);

  // Currículo (objeto ou texto) para contexto da análise
  const curriculum = candidato.curriculum;
  if (curriculum != null) {
    if (typeof curriculum === "string" && curriculum.trim()) {
      addSection("Currículo (resumo)", curriculum.trim().slice(0, 2000));
    } else if (typeof curriculum === "object" && Object.keys(curriculum).length > 0) {
      const flat = JSON.stringify(curriculum).slice(0, 2000);
      if (flat.length > 20) addSection("Currículo (dados)", flat);
    }
  }

  const experiences = candidato.experiences || candidato.experiencia;
  if (experiences && experiences.length > 0) {
    const expText = experiences
      .map(
        (e: { role?: string; title?: string; cargo?: string; company?: string; empresa?: string; startDate?: string; endDate?: string; current?: boolean; description?: string; resumo?: string }) =>
          `- ${e.role || e.title || e.cargo || "?"}${(e.company || e.empresa) ? ` em ${e.company || e.empresa}` : ""}${e.startDate || e.endDate ? ` (${e.startDate || "?"} - ${e.endDate || (e.current ? "Atual" : "?")})` : ""}${(e.description || e.resumo) ? `: ${(e.description || e.resumo || "").slice(0, 200)}${(e.description || e.resumo || "").length > 200 ? "..." : ""}` : ""}`
      )
      .join("\n");
    addSection("Experiências Profissionais", expText);
  }

  const education = candidato.educacao || candidato.education;
  if (education && Array.isArray(education) && education.length > 0) {
    const eduText = education
      .map(
        (e: { degree?: string; field?: string; curso?: string; institution?: string; instituicao?: string; startDate?: string; endDate?: string; current?: boolean; cursando?: boolean }) =>
          `- ${e.degree || e.field || e.curso || "?"}${(e.institution || e.instituicao) ? ` em ${e.institution || e.instituicao}` : ""}${e.startDate || e.endDate ? ` (${e.startDate || "?"} - ${e.endDate || (e.current || e.cursando ? "Em andamento" : "?")})` : ""}`
      )
      .join("\n");
    addSection("Formação Acadêmica", eduText);
  }

  const extractSkillNames = (skills: unknown): string[] => {
    if (!skills) return [];
    if (Array.isArray(skills)) {
      return skills
        .map((s) => (typeof s === "string" ? s : (s as { nome?: string })?.nome))
        .filter(Boolean) as string[];
    }
    return [];
  };

  const hardSkills = extractSkillNames(candidato.hardSkills || candidato.habilidades);
  const softSkills = extractSkillNames(candidato.soft_skills || candidato.softSkills);
  const allSkills = [...new Set([...hardSkills, ...softSkills])];
  if (allSkills.length > 0) {
    addSection("Habilidades", allSkills.join(", "));
  }

  const military = candidato.experiencia_militar;
  if (military && Array.isArray(military) && military.length > 0) {
    const militaryText = military
      .map(
        (m) =>
          `- ${m.postoGraduacao || "?"}${m.unidade ? ` (${m.unidade})` : ""}${m.especialidade ? ` - ${m.especialidade}` : ""}`
      )
      .join("\n");
    addSection("Experiência Militar", militaryText);
  }

  const targetArea = candidato.targetArea;
  if (targetArea && Array.isArray(targetArea) && targetArea.length > 0) {
    const areaText = targetArea
      .map(
        (a) =>
          `- Área: ${a.area || "?"}, Cargo: ${a.cargo || "?"}, Interesse: ${a.interesse || "?"}`
      )
      .join("\n");
    addSection("Área de Interesse / Cargo Pretendido", areaText);
  }

  // Projetos (LinkedIn ou outras fontes)
  const projects = candidato.projects;
  if (projects && Array.isArray(projects) && projects.length > 0) {
    const projText = projects
      .map(
        (p: { title?: string; description?: string; url?: string }) =>
          `- ${p.title || "Projeto"}${p.description ? `: ${String(p.description).slice(0, 150)}` : ""}${p.url ? ` | ${p.url}` : ""}`
      )
      .join("\n");
    addSection("Projetos (perfil)", projText);
  }

  // Destaques do perfil (LinkedIn)
  const destaques = candidato.destaques;
  if (destaques && Array.isArray(destaques) && destaques.length > 0) {
    const destText = destaques
      .map((d) => (typeof d === "string" ? d : (d as { title?: string; description?: string }).title || (d as { description?: string }).description || ""))
      .filter(Boolean)
      .join("\n- ");
    if (destText) addSection("Destaques (perfil)", "- " + destText);
  }

  // Idiomas
  const idiomas = candidato.idiomas;
  if (idiomas && Array.isArray(idiomas) && idiomas.length > 0) {
    const idiomasText = idiomas
      .map((i) => (typeof i === "string" ? i : `${(i as { name?: string }).name || "?"}${(i as { level?: string }).level ? ` (${(i as { level?: string }).level})` : ""}`))
      .filter(Boolean)
      .join(", ");
    if (idiomasText) addSection("Idiomas", idiomasText);
  }

  // Recomendações (LinkedIn ou outras) — OBRIGATÓRIO aparecer no relatório quando existir
  const rawRec = candidato.recomendacoes ?? (candidato as { recommendations?: unknown[] }).recommendations;
  const recomendacoes = Array.isArray(rawRec) ? rawRec : [];
  if (recomendacoes.length > 0) {
    const recText = recomendacoes
      .map(
        (r: Record<string, unknown>) => {
          const author = (r.author ?? r.recommender ?? r.nome ?? r.name ?? "Autor") as string;
          const text = (r.text ?? r.content ?? r.message ?? r.recommendation ?? r.descricao ?? "") as string;
          const role = (r.role ?? r.position ?? r.cargo ?? r.title) as string | undefined;
          const part = role ? ` (${role})` : "";
          const excerpt = String(text || "").trim().slice(0, 500);
          return `- ${author}${part}: ${excerpt}${excerpt.length >= 500 ? "..." : ""}`;
        }
      )
      .join("\n");
    addSection("Recomendações recebidas (ex.: LinkedIn) — INCLUIR NO RELATÓRIO na seção Dados coletados do LinkedIn, item (h)", recText);
  }

  if (candidato.cidade || candidato.city) {
    addSection("Localização", `${candidato.cidade || candidato.city}${candidato.state ? `, ${candidato.state}` : ""}`);
  }

  if (candidato.score !== undefined && candidato.score !== null) {
    addSection("Score na Plataforma", String(candidato.score));
  }

  return sections.length > 0
    ? `DADOS ADICIONAIS DO CANDIDATO (fornecidos pela plataforma):\n\n${sections.join("\n\n")}`
    : "";
}
