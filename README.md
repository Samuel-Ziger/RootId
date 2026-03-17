
# RootID: Autonomous OSINT Validator

**RootID** é uma ferramenta de OSINT que combina o poder de busca do **Serper.dev** com o raciocínio analítico do **Google Gemini 3 Flash**.

## 🚀 Arquitetura de Alta Performance
Para evitar os limites severos da busca nativa do Gemini Free, o RootID utiliza uma arquitetura híbrida:
1. **Serper.dev API**: Varredura em tempo real no Google Search (Brasil).
2. **SerpApi** ([serpapi.com](https://serpapi.com/)): Google Search API — buscas adicionais nas primeiras queries (gl=br, hl=pt-br).
3. **Infosimples (Buscador Google)**: Busca adicional nas primeiras queries para enriquecer resultados.
4. **Datajud (CNJ)**: Consulta à API Pública do Datajud por nome (STJ, TST, TJSP, TRF1) para processos judiciais.
5. **Gemini 3 Flash**: Analista que processa os resultados combinados e gera o relatório.

## ⚙️ Configuração
O projeto utiliza as seguintes chaves no `.env`:
- `GEMINI_API_KEY` ou `API_KEY`: Chave do Gemini (Google AI Studio).
- `SERPER_API_KEY`: Chave do Serper.dev.
- `SERPAPI_KEY`: Chave do SerpApi (Google Search API). Opcional.
- `INFOSIMPLES_API_KEY`: Chave da Infosimples (Buscador Google). Opcional.
- `DATAJUD_API_KEY`: Chave pública da API Datajud (CNJ). Formato no header: `Authorization: APIKey [Chave]`. Opcional; chave vigente na [Wiki Datajud](https://datajud-wiki.cnj.jus.br/api-publica/acesso/).

## 🛠️ Execução
```bash
npx vite
```
Acesse `http://localhost:5173`.
