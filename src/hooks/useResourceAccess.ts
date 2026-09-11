import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { FieldAction, PermissionAction } from '@/config/permissions';

/**
 * Permissões de UMA tela, prontas para a interface. Evita repetir
 * `can('producao_setor', 'editar')` em cada botão e componente.
 *
 * Uso: `const acesso = useResourceAccess('producao_setor');`
 *      `<Button disabled={!acesso.podeCriar}>` / `readOnly={!acesso.podeEditarCampo('meta')}`
 */
export function useResourceAccess(resource: string) {
  const { can, canField, canEditAnyField, isGranular } = useAuth();

  return useMemo(() => ({
    /** Ação arbitrária no recurso. */
    pode: (action: PermissionAction) => can(resource, action),
    /** Ação arbitrária em um campo controlado. */
    podeCampo: (field: string, action: FieldAction) => canField(resource, field, action),
    podeVer: can(resource, 'ver'),
    podeCriar: can(resource, 'criar'),
    podeEditar: can(resource, 'editar'),
    podeExcluir: can(resource, 'excluir'),
    podeImportar: can(resource, 'importar'),
    podeExportar: can(resource, 'exportar'),
    /** Há pelo menos um campo editável — habilita rascunho/salvamento. */
    podeEditarAlgumCampo: canEditAnyField(resource),
    podeVerCampo: (field: string) => canField(resource, field, 'ver'),
    podeEditarCampo: (field: string) => canField(resource, field, 'editar'),
    /** O usuário está sob o modelo granular. */
    granular: isGranular,
  }), [resource, can, canField, canEditAnyField, isGranular]);
}

export type ResourceAccess = ReturnType<typeof useResourceAccess>;
