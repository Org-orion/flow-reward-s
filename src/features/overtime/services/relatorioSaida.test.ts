import { describe, it, expect, vi, afterEach } from 'vitest';
import { imprimirHtml, type AbrirJanela } from './relatorioSaida';

/** Janela falsa com o mínimo que a impressão usa. */
function janelaFalsa() {
  const escrito: string[] = [];
  const janela = {
    document: {
      open: vi.fn(),
      write: vi.fn((s: string) => escrito.push(s)),
      close: vi.fn(),
      fonts: undefined as unknown as FontFaceSet,
    },
    addEventListener: vi.fn(),
    focus: vi.fn(),
    print: vi.fn(),
  };
  return { janela, escrito };
}

afterEach(() => vi.useRealTimers());

describe('impressão do relatório', () => {
  it('escreve o documento na janela aberta e confirma a impressão', () => {
    const { janela, escrito } = janelaFalsa();
    const abrir = (() => janela as unknown as Window) as AbrirJanela;

    expect(imprimirHtml('<!doctype html><html><body>oi</body></html>', abrir)).toBe('ok');
    expect(janela.document.open).toHaveBeenCalled();
    expect(escrito.join('')).toContain('<body>oi</body>');
    expect(janela.document.close).toHaveBeenCalled();
  });

  it('chama print depois que o layout assenta', () => {
    vi.useFakeTimers();
    const { janela } = janelaFalsa();
    imprimirHtml('<html></html>', (() => janela as unknown as Window) as AbrirJanela);

    expect(janela.print).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(janela.focus).toHaveBeenCalled();
    expect(janela.print).toHaveBeenCalled();
  });

  it('avisa quando o navegador realmente barra a janela', () => {
    expect(imprimirHtml('<html></html>', () => null)).toBe('bloqueado');
  });

  // Com `noopener`/`noreferrer` nas opções, `window.open` devolve null POR
  // ESPECIFICAÇÃO: a janela abre em branco e o sistema conclui que foi
  // bloqueada. Foi o defeito real — este teste existe para não voltar.
  it('não pede noopener nem noreferrer ao abrir a janela', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    imprimirHtml('<html></html>');

    const opcoes = String(open.mock.calls[0]?.[2] ?? '');
    expect(opcoes).not.toContain('noopener');
    expect(opcoes).not.toContain('noreferrer');
    open.mockRestore();
  });
});
