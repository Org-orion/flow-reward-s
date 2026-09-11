import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { sanitizeQuantity } from '@/features/occurrences/domain/occurrenceValidation';

interface Props {
  count: number;
  busy: boolean;
  onSetFaltas: (value: number) => void;
  onSetAdvertencias: (value: number) => void;
  onAdd: (faltasDelta: number, advertenciasDelta: number) => void;
  onZerar: () => void;
  onClear: () => void;
  /** Permissão no campo `faltas` (ver src/config/permissions.ts). */
  podeFaltas?: boolean;
  /** Permissão no campo `advertencias`. */
  podeAdvertencias?: boolean;
}

/** Barra contextual de seleção em massa. Operações que sobrescrevem exigem confirmação. */
export function OccurrencesBulkBar({
  count, busy, onSetFaltas, onSetAdvertencias, onAdd, onZerar, onClear,
  podeFaltas = true, podeAdvertencias = true,
}: Props) {
  const [confirmZerar, setConfirmZerar] = useState(false);
  if (count === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3">
      <span className="text-sm font-semibold text-foreground">{count} selecionado(s)</span>
      {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {podeFaltas && <SetPopover label="Definir faltas" onConfirm={onSetFaltas} count={count} disabled={busy} />}
        {podeAdvertencias && <SetPopover label="Definir advertências" onConfirm={onSetAdvertencias} count={count} disabled={busy} />}
        {podeFaltas && podeAdvertencias && <AddPopover onConfirm={onAdd} disabled={busy} />}

        {podeFaltas && podeAdvertencias && (
          <Button variant="outline" size="sm" className="h-8" onClick={() => setConfirmZerar(true)} disabled={busy}>Zerar valores</Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear} aria-label="Cancelar seleção"><X className="h-4 w-4" /></Button>
      </div>

      <AlertDialog open={confirmZerar} onOpenChange={setConfirmZerar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zerar valores de {count} funcionário(s)?</AlertDialogTitle>
            <AlertDialogDescription>Faltas e advertências dos selecionados serão definidas como 0 no rascunho. Isso só é persistido ao salvar a apuração.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onZerar(); setConfirmZerar(false); }}>Zerar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SetPopover({ label, count, disabled, onConfirm }: { label: string; count: number; disabled?: boolean; onConfirm: (v: number) => void }) {
  const [value, setValue] = useState('0');
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8" disabled={disabled}>{label}</Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 space-y-2" align="end">
          <label className="text-xs font-medium text-muted-foreground">Novo valor para todos os selecionados</label>
          <Input type="text" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))} />
          <Button size="sm" className="w-full" onClick={() => { setOpen(false); setConfirming(true); }}>Aplicar</Button>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sobrescrever {count} funcionário(s)?</AlertDialogTitle>
            <AlertDialogDescription>"{label}" definirá o valor como {sanitizeQuantity(value)} para todos os selecionados, substituindo o que estiver no rascunho.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onConfirm(sanitizeQuantity(value)); setConfirming(false); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddPopover({ disabled, onConfirm }: { disabled?: boolean; onConfirm: (faltasDelta: number, advertenciasDelta: number) => void }) {
  const [faltas, setFaltas] = useState('0');
  const [adv, setAdv] = useState('0');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" disabled={disabled}>Adicionar quantidade</Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-3" align="end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">+ Faltas</label>
          <Input type="text" inputMode="numeric" value={faltas} onChange={(e) => setFaltas(e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">+ Advertências</label>
          <Input type="text" inputMode="numeric" value={adv} onChange={(e) => setAdv(e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
        <Button size="sm" className="w-full" onClick={() => { onConfirm(sanitizeQuantity(faltas), sanitizeQuantity(adv)); setOpen(false); setFaltas('0'); setAdv('0'); }}>
          Adicionar aos selecionados
        </Button>
      </PopoverContent>
    </Popover>
  );
}
