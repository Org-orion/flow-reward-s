// Saída do relatório: download do .html e impressão em PDF.
//
// O PDF é a impressão do MESMO HTML da prévia (ver domain/relatorioHtml). Não
// existe um segundo gerador — é a regra que garante que o PDF e o HTML nunca
// divirjam. Em um SPA não há Chromium headless no servidor; a alternativa
// (jsPDF) seria justamente o segundo gerador que a política proíbe.

/** Dispara o download de um arquivo de texto gerado no navegador. */
export function baixarTexto(conteudo: string, nomeArquivo: string, mime = 'text/html;charset=utf-8'): void {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revogar na hora cancelaria o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type ResultadoImpressao = 'ok' | 'bloqueado';

/**
 * Abre o relatório em uma janela nova e chama a impressão do navegador, onde o
 * usuário escolhe "Salvar como PDF". O nome sugerido do arquivo vem do
 * <title> do documento, por isso o título já é montado com período e recorte.
 *
 * Devolve 'bloqueado' quando o navegador barra a janela — nesse caso a tela
 * oferece o download do .html, que imprime igual.
 */
export function imprimirHtml(html: string): ResultadoImpressao {
  const janela = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');
  if (!janela) return 'bloqueado';

  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  // A impressão espera as fontes e o layout; sem isso a primeira página sai
  // com a métrica errada e a tabela quebra em lugar diferente do da prévia.
  const imprimir = () => {
    try {
      janela.focus();
      janela.print();
    } catch {
      /* usuário pode imprimir manualmente pela janela aberta */
    }
  };

  if (janela.document.fonts?.ready) {
    janela.document.fonts.ready.then(() => setTimeout(imprimir, 150)).catch(() => setTimeout(imprimir, 600));
  } else {
    janela.addEventListener('load', () => setTimeout(imprimir, 300));
    setTimeout(imprimir, 900);
  }
  return 'ok';
}

/** Documento pronto para a prévia dentro de um <iframe> (srcDoc). */
export function paraPrevia(html: string): string {
  return html;
}
