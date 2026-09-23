# Módulo Horas Extras

Importa o ponto diário exportado do **Secullum**, acumula uma base histórica e
gera os relatórios gerenciais de horas extras em HTML e PDF.

Rota base: `/horas-extras` · Seção de acesso: `horas_extras` · Tabelas: `concremrh_ponto_*`

---

## Princípios que o código precisa preservar

1. **Fidelidade à fonte.** `extras_min` é a coluna `EXTRAS` do Secullum convertida
   para minutos inteiros. O sistema **nunca** recalcula hora extra a partir das
   batidas, nunca arredonda e nunca infere valor ausente.
2. **Conciliação obrigatória.** Toda importação é conferida contra as linhas
   `SUBTOTAL` e `TOTAL GERAL` **do próprio arquivo**. Divergência bloqueia; só
   administrador libera, e a liberação fica gravada em `importacoes.forcada`.
3. **Sem dado inventado.** Nenhum percentual, média, projeção ou meta — só
   contagem e soma dos valores da planilha. Há teste que falha se um `%` aparecer
   no relatório.
4. **Idempotência.** Reimportar um dia substitui os lançamentos daquele dia, em
   uma transação (`concremrh_ponto_importar`), sem duplicar.
5. **Tudo em português do Brasil.**

## Organização

```
domain/        puro e testado — é onde vive a regra
  tempo.ts         hh:mm ↔ minutos inteiros (nunca float)
  faixas.ts        semáforo verde/amarelo/vermelho/sem extra
  afastamentos.ts  códigos do Secullum → rótulos do RH
  departamentos.ts código de origem → rótulo de exibição
  pontoParser.ts   leitura dos dois layouts (colunas aprendidas do cabeçalho)
  conciliacao.ts   conferência contra os totais do arquivo
  agregacoes.ts    as seções 1 a 8 do relatório e os blocos do painel
  alertas.ts       limite legal, aprendiz, reincidência, conciliação
  filtros.ts       o MESMO recorte usado no painel e no relatório
  relatorioHtml.ts gerador ÚNICO do documento (HTML = PDF)
  nomeArquivo.ts   convenção de nome dos arquivos gerados
services/      acesso a dados e saída de arquivo (efeitos colaterais)
hooks/         estado das telas
components/    apresentação compartilhada
pages/         as cinco telas
```

## Por que o PDF sai da impressão do navegador

A especificação exige que **o PDF e o HTML saiam do mesmo template**. Este é um
SPA (Vite), sem Chromium headless no servidor; usar jsPDF criaria um segundo
gerador, que é exatamente o que a regra proíbe. Então o PDF é a impressão do
próprio HTML, com as regras `@page` declaradas em `relatorioHtml.ts`.

**Consequência operacional:** o usuário escolhe "Salvar como PDF" na janela de
impressão. A tela sugere o nome do arquivo na convenção do RH.

## Tipografia

IBM Plex Sans/Mono vêm do Google Fonts com pilha de fallback declarada, em vez de
embutidas em base64. Embutir os `woff2` somaria centenas de KB a **cada** arquivo
gerado; sem a fonte, o documento continua legível e com números alinhados
(`tabular-nums`). Se o requisito de funcionamento 100% offline voltar à mesa, é
aqui que se mexe.

## Verificação contra o arquivo real

Os testes do repositório usam planilhas **sintéticas** (`domain/__fixtures__/`)
que reproduzem a estrutura real: posição das colunas, cabeçalho repetido a cada
quebra de página, departamento não repetido, rodapés e linhas de total. Ponto é
dado pessoal de trabalhador (LGPD) e **não entra no versionamento**.

A conferência contra o arquivo de produção foi feita fora do repositório, com
`Ponto Diário (11).xlsx` (22/09/2026), e reproduziu o relatório oficial:

| Conferência | Relatório oficial | Apurado pelo parser |
|---|---|---|
| Lançamentos | 484 | 484 |
| Departamentos | 16 | 16 |
| Horas extras | 504:43 | 504:43 |
| Ocorrências acima de 2h | 112 · 252:07 | 112 · 252:07 |
| Funcionários acima de 2h | 112 | 112 |
| Faixa amarela / vermelha | 109 / 3 | 109 / 3 |
| Verde / sem extra | 186 / 186 | 186 / 186 |
| Maior extra | 03:12 — Alex Da Silva Ferreira (Fábrica 1) | idem |
| Conciliação | — | **OK**, 85 comparações, zero divergência |

Os 16 subtotais por departamento também bateram um a um (Fábrica 1 `265:50`/175,
Fábrica 2 `144:57`/86, Móveis `34:16`/22, Viveiro `09:48`/54, e assim por diante).

**Não verificado:** o layout A ("Ponto por período", uma aba por departamento)
foi implementado a partir da especificação; não houve arquivo real dele para
conferir. Os valores de regressão da especificação para esse layout
(1.806 lançamentos, `2579:20`) continuam pendentes de conferência.

## O que ainda não está ligado

- **Envio por e-mail e agendamento diário** (fase 4 da especificação): depende de
  SMTP corporativo ou de um fluxo no n8n. A lista de destinatários já é guardada
  em `concremrh_ponto_config.destinatarios_email`; a tela diz claramente que o
  envio não ocorre.
- **Comparativos entre períodos e exportação em Excel dos dados filtrados**
  (fase 5).
