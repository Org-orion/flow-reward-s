import { useEffect, useState } from 'react';
import { Loader2, Save, Settings } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { AccessDenied } from '@/components/AccessDenied';
import { useOvertime } from '../components/OvertimeContext';
import { formatMin, parseHoraMin } from '../domain/tempo';
import { departamentoConhecido } from '../domain/departamentos';

export function ConfiguracoesView() {
  const acesso = useResourceAccess('he_configuracoes');
  const c = useOvertime();

  const [verde, setVerde] = useState('02:00');
  const [amarelo, setAmarelo] = useState('02:30');
  const [logo, setLogo] = useState('');
  const [rodape, setRodape] = useState('');
  const [emails, setEmails] = useState('');
  const [rotulos, setRotulos] = useState<Record<string, string>>({});

  // Os campos espelham a configuração assim que ela chega; sem isso a tela
  // mostraria os padrões e o usuário salvaria por cima do que já estava.
  useEffect(() => {
    if (!c.config) return;
    setVerde(formatMin(c.config.faixa_verde_max_min));
    setAmarelo(formatMin(c.config.faixa_amarela_max_min));
    setLogo(c.config.logo_url ?? '');
    setRodape(c.config.rodape ?? '');
    setEmails((c.config.destinatarios_email ?? []).join(', '));
  }, [c.config]);

  if (acesso.granular && !acesso.podeEditar) {
    return <AccessDenied area="Configurações de horas extras" />;
  }

  const verdeMin = parseHoraMin(verde);
  const amareloMin = parseHoraMin(amarelo);
  const faixasValidas = verdeMin !== null && amareloMin !== null && amareloMin > verdeMin && verdeMin > 0;

  if (c.carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando configurações…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeader
        icon={Settings}
        title="Configurações"
        description="Faixas do semáforo, rótulos de departamento e identidade dos relatórios."
      />

      <SectionCard
        title="Faixas do semáforo"
        description="Aplicadas sobre a coluna EXTRAS do dia. O limite legal de hora extra diária é de 2h."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="he-verde">Topo do verde</Label>
            <Input
              id="he-verde" value={verde} onChange={(e) => setVerde(e.target.value)}
              placeholder="02:00" className="font-mono tabular-nums"
            />
            <p className="text-xs text-muted-foreground">Até este valor, o extra está dentro do limite de referência.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="he-amarelo">Topo do amarelo</Label>
            <Input
              id="he-amarelo" value={amarelo} onChange={(e) => setAmarelo(e.target.value)}
              placeholder="02:30" className="font-mono tabular-nums"
            />
            <p className="text-xs text-muted-foreground">Acima deste valor, a ocorrência entra na faixa vermelha.</p>
          </div>
        </div>

        {!faixasValidas && (
          <p className="mt-3 text-sm text-destructive">
            Use o formato hh:mm, com o topo do amarelo maior que o do verde.
          </p>
        )}

        <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          A faixa é gravada junto com o lançamento na importação. Mudar os limites vale para as
          <b> próximas</b> importações; para reclassificar um período já gravado, reimporte o arquivo daquele dia.
        </p>

        <Button
          className="mt-4 gap-2"
          disabled={!faixasValidas || c.salvando}
          onClick={() => void c.salvarLimites({ verdeMaxMin: verdeMin!, amareloMaxMin: amareloMin! })}
        >
          {c.salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar faixas
        </Button>
      </SectionCard>

      <SectionCard
        title="Jornada de referência"
        description="Texto informativo impresso na nota metodológica do relatório. Não entra em nenhum cálculo."
      >
        <dl className="space-y-2 text-sm">
          {Object.entries(c.config?.jornadas ?? {}).map(([chave, valor]) => (
            <div key={chave} className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0">
              <dt className="capitalize text-muted-foreground">{chave}</dt>
              <dd className="font-medium">{valor}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard
        title="Rótulos de departamento"
        description="O código vem do arquivo e nunca muda; o rótulo é o que aparece nas telas e no relatório."
        noBodyPadding
      >
        {c.departamentos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Os departamentos aparecem aqui depois da primeira importação.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código no arquivo</TableHead>
                  <TableHead>Rótulo de exibição</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.departamentos.map((d) => {
                  const valor = rotulos[d.id] ?? d.nome_exibicao;
                  const mudou = valor.trim() !== d.nome_exibicao && valor.trim() !== '';
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">
                        {d.codigo_origem}
                        {!departamentoConhecido(d.codigo_origem) && (
                          <Badge variant="secondary" className="ml-2">novo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={valor}
                          className="h-9"
                          onChange={(e) => setRotulos((r) => ({ ...r, [d.id]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!mudou}
                          onClick={() => void c.renomear(d.id, valor)}
                        >
                          Salvar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Identidade do relatório"
        description="Logo oficial e rodapé impressos no cabeçalho e no pé do documento."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="he-logo">Endereço do logo</Label>
            <Input
              id="he-logo" value={logo} onChange={(e) => setLogo(e.target.value)}
              placeholder="/logos/concrem.png"
            />
            <p className="text-xs text-muted-foreground">
              Sem logo, o cabeçalho usa a marca em texto. O arquivo oficial é fornecido pelo marketing.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="he-rodape">Texto do rodapé</Label>
            <Textarea
              id="he-rodape" value={rodape} onChange={(e) => setRodape(e.target.value)}
              rows={2} placeholder="Documento interno — uso restrito."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="he-emails">Destinatários de e-mail</Label>
            <Textarea
              id="he-emails" value={emails} onChange={(e) => setEmails(e.target.value)}
              rows={2} placeholder="diretoria@concrem.com.br, rh@concrem.com.br"
            />
            <p className="text-xs text-muted-foreground">
              Separe por vírgula. A lista fica guardada, mas o envio automático ainda não está ligado.
            </p>
          </div>

          <Button
            className="gap-2"
            disabled={c.salvando}
            onClick={() => void c.salvarCampos({
              logo_url: logo.trim() || null,
              rodape: rodape.trim() || null,
              destinatarios_email: emails.split(',').map((e) => e.trim()).filter(Boolean),
            }, 'Identidade do relatório atualizada')}
          >
            {c.salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar identidade
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
