// Tipos do banco Supabase.
//
// REGENERAR a partir do projeto novo (requer Docker/podman para o supabase CLI):
//   npx supabase gen types typescript --project-id ewfebwljhmcvuopopqpb > src/integrations/supabase/types.ts
//   # ou, via conexão direta (requer a senha do banco):
//   npx supabase gen types typescript --db-url "postgresql://postgres.<ref>:<senha>@<pooler-host>:5432/postgres" > src/integrations/supabase/types.ts
//
// NOTA (Etapa 7 da Reforma V2, 2026-07-07): como o ambiente atual não tem
// Docker, o drift conhecido foi fechado manualmente e de forma fiel ao schema
// real (schema_atual.sql): +7 colunas em concremrh_formulas_calculo
// (peso_faturamento/itens_nc/tratamento_nc/hora_maquina/operacao_segura/limpeza
// + multiplicador_kits), tabela concremrh_configuracoes_kits (com max_faixas) e
// concremrh_usuarios.senha_hash/secoes. Ao ter Docker, rodar o comando acima para
// uma regeneração completa (relationships/functions) e substituir estas edições.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      concremrh_avaliacoes_desempenho: {
        Row: {
          avaliador_id: string | null
          comentarios: string | null
          competencias_avaliadas: Json | null
          created_at: string
          data_avaliacao: string
          elegivel_promocao: boolean | null
          funcionario_id: string
          id: string
          nota_geral: number | null
          objetivos_alcancados: string[] | null
          periodo_fim: string
          periodo_inicio: string
          pontos_fortes: string[] | null
          pontos_melhoria: string[] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          avaliador_id?: string | null
          comentarios?: string | null
          competencias_avaliadas?: Json | null
          created_at?: string
          data_avaliacao: string
          elegivel_promocao?: boolean | null
          funcionario_id: string
          id?: string
          nota_geral?: number | null
          objetivos_alcancados?: string[] | null
          periodo_fim: string
          periodo_inicio: string
          pontos_fortes?: string[] | null
          pontos_melhoria?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          avaliador_id?: string | null
          comentarios?: string | null
          competencias_avaliadas?: Json | null
          created_at?: string
          data_avaliacao?: string
          elegivel_promocao?: boolean | null
          funcionario_id?: string
          id?: string
          nota_geral?: number | null
          objetivos_alcancados?: string[] | null
          periodo_fim?: string
          periodo_inicio?: string
          pontos_fortes?: string[] | null
          pontos_melhoria?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_avaliacoes_desempenho_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_avaliacoes_desempenho_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_base_premiacao: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string | null
          updated_at: string
          valor_base: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string
          valor_base: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string
          valor_base?: number
        }
        Relationships: []
      }
      concremrh_cargos: {
        Row: {
          atividades: string[] | null
          ativo: boolean
          competencias: string[] | null
          created_at: string
          id: string
          missao: string | null
          nivel_hierarquico: number | null
          nome: string
          observacoes: string | null
          requisitos: string | null
          responsabilidades: string[] | null
          salario_maximo: number | null
          salario_minimo: number | null
          setor_id: string | null
          updated_at: string
        }
        Insert: {
          atividades?: string[] | null
          ativo?: boolean
          competencias?: string[] | null
          created_at?: string
          id?: string
          missao?: string | null
          nivel_hierarquico?: number | null
          nome: string
          observacoes?: string | null
          requisitos?: string | null
          responsabilidades?: string[] | null
          salario_maximo?: number | null
          salario_minimo?: number | null
          setor_id?: string | null
          updated_at?: string
        }
        Update: {
          atividades?: string[] | null
          ativo?: boolean
          competencias?: string[] | null
          created_at?: string
          id?: string
          missao?: string | null
          nivel_hierarquico?: number | null
          nome?: string
          observacoes?: string | null
          requisitos?: string | null
          responsabilidades?: string[] | null
          salario_maximo?: number | null
          salario_minimo?: number | null
          setor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_cargos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "concremrh_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_configuracoes_kits: {
        Row: {
          ativo: boolean | null
          bonus_base: number | null
          bonus_por_faixa: number | null
          created_at: string | null
          id: string
          incremento_faixa: number | null
          max_faixas: number | null
          minimo_kits: number | null
          updated_at: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          bonus_base?: number | null
          bonus_por_faixa?: number | null
          created_at?: string | null
          id?: string
          incremento_faixa?: number | null
          max_faixas?: number | null
          minimo_kits?: number | null
          updated_at?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          bonus_base?: number | null
          bonus_por_faixa?: number | null
          created_at?: string | null
          id?: string
          incremento_faixa?: number | null
          max_faixas?: number | null
          minimo_kits?: number | null
          updated_at?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      concremrh_dss: {
        Row: {
          created_at: string
          data_realizacao: string
          descricao: string | null
          id: string
          local_dss_id: string | null
          observacoes: string | null
          participantes_ids: string[] | null
          responsavel_id: string | null
          setor_id: string | null
          titulo: string
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_realizacao: string
          descricao?: string | null
          id?: string
          local_dss_id?: string | null
          observacoes?: string | null
          participantes_ids?: string[] | null
          responsavel_id?: string | null
          setor_id?: string | null
          titulo: string
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_realizacao?: string
          descricao?: string | null
          id?: string
          local_dss_id?: string | null
          observacoes?: string | null
          participantes_ids?: string[] | null
          responsavel_id?: string | null
          setor_id?: string | null
          titulo?: string
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_dss_local_dss_id_fkey"
            columns: ["local_dss_id"]
            isOneToOne: false
            referencedRelation: "concremrh_locais_dss"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_dss_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_dss_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "concremrh_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_funcionario_setores: {
        Row: {
          funcionario_id: string
          setor_id: string
          created_at: string
        }
        Insert: {
          funcionario_id: string
          setor_id: string
          created_at?: string
        }
        Update: {
          funcionario_id?: string
          setor_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_funcionario_setores_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_funcionario_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "concremrh_setores"
            referencedColumns: ["id"]
          }
        ]
      }
      concremrh_epi: {
        Row: {
          created_at: string
          data_entrega: string
          data_vencimento: string | null
          descricao: string | null
          funcionario_id: string | null
          id: string
          numero_ca: string | null
          observacoes: string | null
          status: string | null
          tipo_epi: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_entrega: string
          data_vencimento?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          id?: string
          numero_ca?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_epi: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_entrega?: string
          data_vencimento?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          id?: string
          numero_ca?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_epi?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_epi_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_estrutura_hierarquica: {
        Row: {
          ativo: boolean
          cargo_id: string
          cargo_superior_id: string | null
          created_at: string
          id: string
          nivel_hierarquico: number
          pode_aprovar_mudancas: boolean | null
          quantidade_subordinados_diretos: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo_id: string
          cargo_superior_id?: string | null
          created_at?: string
          id?: string
          nivel_hierarquico?: number
          pode_aprovar_mudancas?: boolean | null
          quantidade_subordinados_diretos?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo_id?: string
          cargo_superior_id?: string | null
          created_at?: string
          id?: string
          nivel_hierarquico?: number
          pode_aprovar_mudancas?: boolean | null
          quantidade_subordinados_diretos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_estrutura_hierarquica_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: true
            referencedRelation: "concremrh_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_estrutura_hierarquica_cargo_superior_id_fkey"
            columns: ["cargo_superior_id"]
            isOneToOne: false
            referencedRelation: "concremrh_cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_faixas: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_faixas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "concremrh_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_faltas_advertencias: {
        Row: {
          aplicado_por: string | null
          created_at: string
          data_ocorrencia: string
          descricao: string | null
          funcionario_id: string | null
          gravidade: string | null
          id: string
          motivo: string
          observacoes: string | null
          quantidade: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          aplicado_por?: string | null
          created_at?: string
          data_ocorrencia: string
          descricao?: string | null
          funcionario_id?: string | null
          gravidade?: string | null
          id?: string
          motivo: string
          observacoes?: string | null
          quantidade?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          aplicado_por?: string | null
          created_at?: string
          data_ocorrencia?: string
          descricao?: string | null
          funcionario_id?: string | null
          gravidade?: string | null
          id?: string
          motivo?: string
          observacoes?: string | null
          quantidade?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_faltas_advertencias_aplicado_por_fkey"
            columns: ["aplicado_por"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_faltas_advertencias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_formulas_calculo: {
        Row: {
          ativo: boolean
          base_premiacao_id: string | null
          categoria_id: string | null
          created_at: string
          descricao: string | null
          id: string
          multiplicador_kits: number | null
          nome: string
          peso_advertencias: number | null
          peso_dss: number | null
          peso_epi: number | null
          peso_faltas: number | null
          peso_faturamento: number | null
          peso_hora_maquina: number | null
          peso_itens_nc: number | null
          peso_limpeza: number | null
          peso_operacao_segura: number | null
          peso_producao_setor: number | null
          peso_tratamento_nc: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          multiplicador_kits?: number | null
          nome: string
          peso_advertencias?: number | null
          peso_dss?: number | null
          peso_epi?: number | null
          peso_faltas?: number | null
          peso_faturamento?: number | null
          peso_hora_maquina?: number | null
          peso_itens_nc?: number | null
          peso_limpeza?: number | null
          peso_operacao_segura?: number | null
          peso_producao_setor?: number | null
          peso_tratamento_nc?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          multiplicador_kits?: number | null
          nome?: string
          peso_advertencias?: number | null
          peso_dss?: number | null
          peso_epi?: number | null
          peso_faltas?: number | null
          peso_faturamento?: number | null
          peso_hora_maquina?: number | null
          peso_itens_nc?: number | null
          peso_limpeza?: number | null
          peso_operacao_segura?: number | null
          peso_producao_setor?: number | null
          peso_tratamento_nc?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_formulas_calculo_base_premiacao_id_fkey"
            columns: ["base_premiacao_id"]
            isOneToOne: false
            referencedRelation: "concremrh_base_premiacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_formulas_calculo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "concremrh_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_funcionarios: {
        Row: {
          ativo: boolean
          base_premiacao_id: string | null
          categoria_id: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          faixa_id: string | null
          funcao_id: string | null
          id: string
          local_dss_id: string | null
          nome: string
          salario: number | null
          setor_id: string | null
          status: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
          valor_fixo: number | null
        }
        Insert: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          faixa_id?: string | null
          funcao_id?: string | null
          id?: string
          local_dss_id?: string | null
          nome: string
          salario?: number | null
          setor_id?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          valor_fixo?: number | null
        }
        Update: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          faixa_id?: string | null
          funcao_id?: string | null
          id?: string
          local_dss_id?: string | null
          nome?: string
          salario?: number | null
          setor_id?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_funcionarios_base_premiacao_id_fkey"
            columns: ["base_premiacao_id"]
            isOneToOne: false
            referencedRelation: "concremrh_base_premiacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_funcionarios_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "concremrh_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "concremrh_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_funcionarios_faixa_id_fkey"
            columns: ["faixa_id"]
            isOneToOne: false
            referencedRelation: "concremrh_faixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_funcionarios_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_funcionarios_local_dss_id_fkey"
            columns: ["local_dss_id"]
            isOneToOne: false
            referencedRelation: "concremrh_locais_dss"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_funcionarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "concremrh_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_funcoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nivel_hierarquico: number | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nivel_hierarquico?: number | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nivel_hierarquico?: number | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_historico_cargos: {
        Row: {
          aprovado_por: string | null
          cargo_anterior_id: string | null
          cargo_id: string | null
          created_at: string
          data_mudanca: string
          funcionario_id: string
          id: string
          motivo: string | null
          observacoes: string | null
          salario_anterior: number | null
          salario_novo: number | null
          tipo_mudanca: string
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          cargo_anterior_id?: string | null
          cargo_id?: string | null
          created_at?: string
          data_mudanca: string
          funcionario_id: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          salario_anterior?: number | null
          salario_novo?: number | null
          tipo_mudanca: string
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          cargo_anterior_id?: string | null
          cargo_id?: string | null
          created_at?: string
          data_mudanca?: string
          funcionario_id?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          salario_anterior?: number | null
          salario_novo?: number | null
          tipo_mudanca?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_historico_cargos_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_historico_cargos_cargo_anterior_id_fkey"
            columns: ["cargo_anterior_id"]
            isOneToOne: false
            referencedRelation: "concremrh_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_historico_cargos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "concremrh_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_historico_cargos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_hr_applications: {
        Row: {
          code: string
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          route: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          route: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_indicadores_gerais: {
        Row: {
          competencia: string
          created_at: string
          id: string
          meta: number
          percentual: number
          realizado: number
          tipo_indicador_id: string
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          meta: number
          percentual: number
          realizado: number
          tipo_indicador_id: string
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          meta?: number
          percentual?: number
          realizado?: number
          tipo_indicador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_indicadores_gerais_tipo_indicador_id_fkey"
            columns: ["tipo_indicador_id"]
            isOneToOne: false
            referencedRelation: "concremrh_tipos_indicadores_gerais"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_indicadores_setor: {
        Row: {
          competencia: string
          created_at: string
          hora_maquina_meta: number | null
          hora_maquina_percentual: number | null
          hora_maquina_realizado: number | null
          id: string
          identificacao_nc_meta: number | null
          identificacao_nc_percentual: number | null
          identificacao_nc_realizado: number | null
          limpeza_meta: number | null
          limpeza_percentual: number | null
          limpeza_realizado: number | null
          operacao_segura_meta: number | null
          operacao_segura_percentual: number | null
          operacao_segura_realizado: number | null
          setor_id: string | null
          tratamento_nc_meta: number | null
          tratamento_nc_percentual: number | null
          tratamento_nc_realizado: number | null
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          hora_maquina_meta?: number | null
          hora_maquina_percentual?: number | null
          hora_maquina_realizado?: number | null
          id?: string
          identificacao_nc_meta?: number | null
          identificacao_nc_percentual?: number | null
          identificacao_nc_realizado?: number | null
          limpeza_meta?: number | null
          limpeza_percentual?: number | null
          limpeza_realizado?: number | null
          operacao_segura_meta?: number | null
          operacao_segura_percentual?: number | null
          operacao_segura_realizado?: number | null
          setor_id?: string | null
          tratamento_nc_meta?: number | null
          tratamento_nc_percentual?: number | null
          tratamento_nc_realizado?: number | null
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          hora_maquina_meta?: number | null
          hora_maquina_percentual?: number | null
          hora_maquina_realizado?: number | null
          id?: string
          identificacao_nc_meta?: number | null
          identificacao_nc_percentual?: number | null
          identificacao_nc_realizado?: number | null
          limpeza_meta?: number | null
          limpeza_percentual?: number | null
          limpeza_realizado?: number | null
          operacao_segura_meta?: number | null
          operacao_segura_percentual?: number | null
          operacao_segura_realizado?: number | null
          setor_id?: string | null
          tratamento_nc_meta?: number | null
          tratamento_nc_percentual?: number | null
          tratamento_nc_realizado?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_indicadores_setor_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "concremrh_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_locais_dss: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_plano_carreira: {
        Row: {
          ativo: boolean
          cargo_destino_id: string
          cargo_origem_id: string
          competencias_necessarias: string[] | null
          created_at: string
          descricao: string | null
          id: string
          requisitos: string[] | null
          tempo_minimo_meses: number | null
          tipo_progressao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo_destino_id: string
          cargo_origem_id: string
          competencias_necessarias?: string[] | null
          created_at?: string
          descricao?: string | null
          id?: string
          requisitos?: string[] | null
          tempo_minimo_meses?: number | null
          tipo_progressao: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo_destino_id?: string
          cargo_origem_id?: string
          competencias_necessarias?: string[] | null
          created_at?: string
          descricao?: string | null
          id?: string
          requisitos?: string[] | null
          tempo_minimo_meses?: number | null
          tipo_progressao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_plano_carreira_cargo_destino_id_fkey"
            columns: ["cargo_destino_id"]
            isOneToOne: false
            referencedRelation: "concremrh_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_plano_carreira_cargo_origem_id_fkey"
            columns: ["cargo_origem_id"]
            isOneToOne: false
            referencedRelation: "concremrh_cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_producao_setor: {
        Row: {
          created_at: string
          data_producao: string
          id: string
          meta_diaria: number | null
          observacoes: string | null
          producao_realizada: number | null
          setor_id: string | null
          unidade_medida: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_producao: string
          id?: string
          meta_diaria?: number | null
          observacoes?: string | null
          producao_realizada?: number | null
          setor_id?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_producao?: string
          id?: string
          meta_diaria?: number | null
          observacoes?: string | null
          producao_realizada?: number | null
          setor_id?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_producao_setor_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "concremrh_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_resultados_premiacao: {
        Row: {
          base_premiacao_id: string | null
          bonus_alcancado: number
          bonus_possivel: number
          categoria: string | null
          cod_funcionario: string | null
          created_at: string
          faixa: string | null
          funcao: string | null
          funcionario_id: string | null
          id: string
          mes_competencia: string
          nome: string
          nota_advertencias: number
          nota_dss: number
          nota_epi: number
          nota_faltas: number
          nota_faturamento: number | null
          nota_geral: number
          nota_hora_maquina: number | null
          nota_itens_nc: number | null
          nota_limpeza: number | null
          nota_operacao_segura: number | null
          nota_producao: number | null
          nota_tratamento_nc: number | null
          observacao_ajuste: string | null
          percentual_producao: number | null
          setor: string | null
          updated_at: string
          valor_ajustado: number | null
          valor_faixa: number | null
          valor_fixo: number | null
          valor_kits: number | null
        }
        Insert: {
          base_premiacao_id?: string | null
          bonus_alcancado: number
          bonus_possivel: number
          categoria?: string | null
          cod_funcionario?: string | null
          created_at?: string
          faixa?: string | null
          funcao?: string | null
          funcionario_id?: string | null
          id?: string
          mes_competencia: string
          nome: string
          nota_advertencias?: number
          nota_dss?: number
          nota_epi?: number
          nota_faltas?: number
          nota_faturamento?: number | null
          nota_geral: number
          nota_hora_maquina?: number | null
          nota_itens_nc?: number | null
          nota_limpeza?: number | null
          nota_operacao_segura?: number | null
          nota_producao?: number | null
          nota_tratamento_nc?: number | null
          observacao_ajuste?: string | null
          percentual_producao?: number | null
          setor?: string | null
          updated_at?: string
          valor_ajustado?: number | null
          valor_faixa?: number | null
          valor_fixo?: number | null
          valor_kits?: number | null
        }
        Update: {
          base_premiacao_id?: string | null
          bonus_alcancado?: number
          bonus_possivel?: number
          categoria?: string | null
          cod_funcionario?: string | null
          created_at?: string
          faixa?: string | null
          funcao?: string | null
          funcionario_id?: string | null
          id?: string
          mes_competencia?: string
          nome?: string
          nota_advertencias?: number
          nota_dss?: number
          nota_epi?: number
          nota_faltas?: number
          nota_faturamento?: number | null
          nota_geral?: number
          nota_hora_maquina?: number | null
          nota_itens_nc?: number | null
          nota_limpeza?: number | null
          nota_operacao_segura?: number | null
          nota_producao?: number | null
          nota_tratamento_nc?: number | null
          observacao_ajuste?: string | null
          percentual_producao?: number | null
          setor?: string | null
          updated_at?: string
          valor_ajustado?: number | null
          valor_faixa?: number | null
          valor_fixo?: number | null
          valor_kits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_resultados_premiacao_base_premiacao_id_fkey"
            columns: ["base_premiacao_id"]
            isOneToOne: false
            referencedRelation: "concremrh_base_premiacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_resultados_premiacao_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string | null
          encarregado_id: string | null
          id: string
          nome: string
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          encarregado_id?: string | null
          id?: string
          nome: string
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          encarregado_id?: string | null
          id?: string
          nome?: string
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_setores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "concremrh_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_setores_encarregado_id_fkey"
            columns: ["encarregado_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concremrh_setores_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "concremrh_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_tipos_indicadores: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_tipos_indicadores_gerais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_user_application_permissions: {
        Row: {
          application_id: string
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_user_application_permissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "concremrh_hr_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      concremrh_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      concremrh_perfis_acesso: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          permissoes: Json
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          permissoes?: Json
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          permissoes?: Json
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      concremrh_usuarios: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string
          nome: string | null
          perfil: Database["public"]["Enums"]["user_perfil"]
          ativo: boolean
          created_at: string
          updated_at: string
          senha_hash: string | null
          secoes: Json | null
          perfil_acesso_id: string | null
          permissoes: Json | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email: string
          nome?: string | null
          perfil: Database["public"]["Enums"]["user_perfil"]
          ativo?: boolean
          created_at?: string
          updated_at?: string
          senha_hash?: string | null
          secoes?: Json | null
          perfil_acesso_id?: string | null
          permissoes?: Json | null
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          email?: string
          nome?: string | null
          perfil?: Database["public"]["Enums"]["user_perfil"]
          ativo?: boolean
          created_at?: string
          updated_at?: string
          senha_hash?: string | null
          secoes?: Json | null
          perfil_acesso_id?: string | null
          permissoes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "concremrh_usuarios_perfil_acesso_fk"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "concremrh_perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      remuneracaoconrem_base_premiacao: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string | null
          updated_at: string
          valor_base: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string
          valor_base: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string
          valor_base?: number
        }
        Relationships: []
      }
      remuneracaoconrem_categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_dss: {
        Row: {
          created_at: string
          data_realizacao: string
          descricao: string | null
          id: string
          observacoes: string | null
          participantes_ids: string[] | null
          responsavel_id: string | null
          setor_id: string | null
          titulo: string
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_realizacao: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          participantes_ids?: string[] | null
          responsavel_id?: string | null
          setor_id?: string | null
          titulo: string
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_realizacao?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          participantes_ids?: string[] | null
          responsavel_id?: string | null
          setor_id?: string | null
          titulo?: string
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_epi: {
        Row: {
          created_at: string
          data_entrega: string
          data_vencimento: string | null
          descricao: string | null
          funcionario_id: string | null
          id: string
          numero_ca: string | null
          observacoes: string | null
          status: string | null
          tipo_epi: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_entrega: string
          data_vencimento?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          id?: string
          numero_ca?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_epi: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_entrega?: string
          data_vencimento?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          id?: string
          numero_ca?: string | null
          observacoes?: string | null
          status?: string | null
          tipo_epi?: string
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_faixas: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: []
      }
      remuneracaoconrem_faltas_advertencias: {
        Row: {
          aplicado_por: string | null
          created_at: string
          data_ocorrencia: string
          descricao: string | null
          funcionario_id: string | null
          gravidade: string | null
          id: string
          motivo: string
          observacoes: string | null
          quantidade: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          aplicado_por?: string | null
          created_at?: string
          data_ocorrencia: string
          descricao?: string | null
          funcionario_id?: string | null
          gravidade?: string | null
          id?: string
          motivo: string
          observacoes?: string | null
          quantidade?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          aplicado_por?: string | null
          created_at?: string
          data_ocorrencia?: string
          descricao?: string | null
          funcionario_id?: string | null
          gravidade?: string | null
          id?: string
          motivo?: string
          observacoes?: string | null
          quantidade?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_formulas_calculo: {
        Row: {
          ativo: boolean
          base_premiacao_id: string | null
          categoria_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          peso_advertencias: number | null
          peso_dss: number | null
          peso_epi: number | null
          peso_faltas: number | null
          peso_producao_setor: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          peso_advertencias?: number | null
          peso_dss?: number | null
          peso_epi?: number | null
          peso_faltas?: number | null
          peso_producao_setor?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          peso_advertencias?: number | null
          peso_dss?: number | null
          peso_epi?: number | null
          peso_faltas?: number | null
          peso_producao_setor?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_funcionarios: {
        Row: {
          ativo: boolean
          base_premiacao_id: string | null
          categoria_id: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          funcao_id: string | null
          id: string
          nome: string
          salario: number | null
          setor_id: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          funcao_id?: string | null
          id?: string
          nome: string
          salario?: number | null
          setor_id?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          base_premiacao_id?: string | null
          categoria_id?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          funcao_id?: string | null
          id?: string
          nome?: string
          salario?: number | null
          setor_id?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      remuneracaoconrem_funcoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nivel_hierarquico: number | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nivel_hierarquico?: number | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nivel_hierarquico?: number | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_indicadores_gerais: {
        Row: {
          competencia: string
          created_at: string
          id: string
          meta: number
          percentual: number
          realizado: number
          tipo_indicador_id: string
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          meta: number
          percentual: number
          realizado: number
          tipo_indicador_id: string
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          meta?: number
          percentual?: number
          realizado?: number
          tipo_indicador_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_producao_setor: {
        Row: {
          created_at: string
          data_producao: string
          id: string
          meta_diaria: number | null
          observacoes: string | null
          producao_realizada: number | null
          setor_id: string | null
          unidade_medida: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_producao: string
          id?: string
          meta_diaria?: number | null
          observacoes?: string | null
          producao_realizada?: number | null
          setor_id?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_producao?: string
          id?: string
          meta_diaria?: number | null
          observacoes?: string | null
          producao_realizada?: number | null
          setor_id?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_resultados_premiacao: {
        Row: {
          base_premiacao_id: string | null
          bonus_alcancado: number
          bonus_possivel: number
          categoria: string | null
          cod_funcionario: string | null
          created_at: string
          faixa: string | null
          funcao: string | null
          funcionario_id: string | null
          id: string
          mes_competencia: string
          nome: string
          nota_advertencias: number
          nota_dss: number
          nota_epi: number
          nota_faltas: number
          nota_geral: number
          nota_producao: number | null
          setor: string | null
          updated_at: string
          valor_faixa: number | null
          valor_kits: number | null
        }
        Insert: {
          base_premiacao_id?: string | null
          bonus_alcancado: number
          bonus_possivel: number
          categoria?: string | null
          cod_funcionario?: string | null
          created_at?: string
          faixa?: string | null
          funcao?: string | null
          funcionario_id?: string | null
          id?: string
          mes_competencia: string
          nome: string
          nota_advertencias?: number
          nota_dss?: number
          nota_epi?: number
          nota_faltas?: number
          nota_geral: number
          nota_producao?: number | null
          setor?: string | null
          updated_at?: string
          valor_faixa?: number | null
          valor_kits?: number | null
        }
        Update: {
          base_premiacao_id?: string | null
          bonus_alcancado?: number
          bonus_possivel?: number
          categoria?: string | null
          cod_funcionario?: string | null
          created_at?: string
          faixa?: string | null
          funcao?: string | null
          funcionario_id?: string | null
          id?: string
          mes_competencia?: string
          nome?: string
          nota_advertencias?: number
          nota_dss?: number
          nota_epi?: number
          nota_faltas?: number
          nota_geral?: number
          nota_producao?: number | null
          setor?: string | null
          updated_at?: string
          valor_faixa?: number | null
          valor_kits?: number | null
        }
        Relationships: []
      }
      remuneracaoconrem_setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_tipos_indicadores: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      remuneracaoconrem_tipos_indicadores_gerais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_app_permission: {
        Args: { _app_code: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_funcionario_setor_ids: {
        Args: { p_id: string; p_setor_ids: string }
        Returns: void
      }
      get_all_funcionario_setor_ids: {
        Args: Record<string, never>
        Returns: { funcionario_id: string; setor_ids: string }[]
      }
    }
    Enums: {
      app_role: "admin" | "rh_manager" | "user"
      user_perfil: "admin" | "rh" | "sesmt" | "producao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "rh_manager", "user"],
    },
  },
} as const
