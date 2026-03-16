/**
 * RootID - Módulo para integração no Ache Um Veterano
 *
 * Uso standalone (formulário manual):
 *   <App />
 *
 * Uso integrado (com candidato do Ache Um Veterano):
 *   <App candidato={candidatoFromAPI} />
 *
 * O candidato deve ser o JSON retornado por /api/candidatos/[id] ou /api/v2/candidatos/[id]
 */

export { default as RootIDApp } from "./App";
export { AnalysisForm } from "./components/AnalysisForm";
export { ReportView } from "./components/ReportView";
export { mapCandidatoToRootID, buildEnrichedContext } from "./utils/candidateMapper";
export {
  type CandidateData,
  type CandidateDataInput,
  type AcheUmVeteranoCandidato,
  type AnalysisResult,
} from "./types";
