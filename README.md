
# RootID: Autonomous OSINT Validator

**RootID** é uma ferramenta de OSINT que combina o poder de busca do **Serper.dev** com o raciocínio analítico do **Google Gemini 3 Flash**.

## 🚀 Arquitetura de Alta Performance
Para evitar os limites severos da busca nativa do Gemini Free, o RootID agora utiliza uma arquitetura híbrida:
1. **Serper.dev API**: Realiza a varredura em tempo real no Google Search (Brasil).
2. **Gemini 3 Flash**: Analista de elite que processa os resultados brutos e gera o relatório.

## ⚙️ Configuração
O projeto utiliza duas chaves:
- `API_KEY`: Sua chave do Gemini (obtida no Google AI Studio).
- `SERPER_API_KEY`: Sua chave do Serper.dev (configurada no `geminiService.ts`).

## 🛠️ Execução
```bash
npx vite
```
Acesse `http://localhost:5173`.
