import { GoogleGenAI } from "@google/genai";
import { CandidateData, AnalysisResult, GroundingSource } from "../types";

// Chave Serper.dev para buscas profissionais externas
const SERPER_API_KEY = "16072a196b96f529e251ae46bfd2e0241ee24e76";

async function searchWithSerper(query: string) {
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "br", hl: "pt-br" }),
    });
    
    if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Serper Search Error:", error);
    return null;
  }
}

export const performOSINTAnalysis = async (data: CandidateData): Promise<AnalysisResult> => {
  // A chave deve ser obtida exclusivamente de process.env.API_KEY
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Chave da API Gemini não encontrada. Verifique as configurações de ambiente.");
  }

  // 1. Executa a busca via Serper primeiro para obter dados brutos atualizados
  const searchQuery = `${data.name} ${data.role} perfil profissional linkedin github portfolio expertise`;
  const searchData = await searchWithSerper(searchQuery);
  
  // 2. Prepara o contexto dos resultados de busca para a IA
  const organicResults = searchData?.organic || [];
  const searchResultsContext = organicResults.map((res: any, i: number) => (
    `Fonte [${i+1}]: ${res.title}\nLink: ${res.link}\nResumo: ${res.snippet}`
  )).join('\n\n') || "Nenhum resultado de busca encontrado na web para este perfil.";

  // Inicialização do cliente Gemini utilizando a chave injetada
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Analise os seguintes dados de pesquisa OSINT para o candidato:
    Nome: ${data.name}
    Cargo/Especialidade: ${data.role}
    
    RESULTADOS DA WEB ENCONTRADOS:
    ${searchResultsContext}

    TAREFA:
    Sintetize um relatório profissional de validação em Português (Brasil) seguindo rigorosamente estas seções:
    1. **Pontuação de Consistência**: Uma porcentagem de 0-100% comparando os dados encontrados com o cargo pretendido.
    2. **Evidências Confirmadas**: Liste os perfis e projetos validados com base nos links encontrados.
    3. **Divergências ou Lacunas**: Identifique informações contraditórias ou falta de presença digital esperada (ex: ausência de GitHub para cargos técnicos).
    4. **Análise de Senioridade**: Estime o nível (Júnior, Pleno, Sênior, Specialist) baseando-se no histórico digital.
    5. **Veredito Final**: Conclusão concisa sobre a confiabilidade do perfil.

    Importante: Seja extremamente rigoroso e imparcial. Use Markdown limpo.
    NÃO inclua cabeçalho com título do relatório, analista, data da análise, alvo ou área de atuação. Comece diretamente pela seção 1 (Pontuação de Consistência).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é o analista OSINT RootID. Seu objetivo é cruzar dados da web para validar perfis profissionais de forma imparcial e técnica.",
        temperature: 0.1,
      },
    });

    const report = response.text || "Falha ao sintetizar relatório.";
    
    const sources: GroundingSource[] = organicResults.map((res: any) => ({
      title: res.title,
      uri: res.link
    })) || [];

    return {
      report,
      sources: sources.slice(0, 10),
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    const errorMessage = error.message || "";
    if (errorMessage.includes("429") || error.status === 429) {
      throw new Error("Limite de requisições atingido. Por favor, aguarde 60 segundos antes da próxima análise.");
    }

    throw new Error(`Erro na análise da IA: ${errorMessage || "Erro desconhecido"}`);
  }
};