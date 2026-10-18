# CRM para rede de 4 lojas de móveis

Sistema web em português, seguindo os 9 documentos enviados (v0.7). Construção em etapas, cada uma utilizável ao final.

## Etapa 1 — Base e acesso
- Ativar Lovable Cloud (banco, login, regras de acesso no servidor).
- Login com usuário e senha (sem autocadastro). Contas de teste sintéticas: 4 lojas, 1 gerente e 2 vendedores por loja, 1 supervisor, 1 diretor, 1 marketing.
- Menu e telas adaptados ao perfil; toda permissão revalidada no banco (ID fora do escopo = "não encontrado").
- Visual: ferramenta de trabalho sóbria, tons madeira/areia com acento terracota, funciona em celular.

## Etapa 2 — Clientes e oportunidades
- Cadastro rápido (nome, telefone, origem, produto de interesse com porte). Telefone já existente reaproveita o cliente mostrando só dados básicos.
- Retorno padrão automático em 2 dias úteis (seg–sáb, mesma hora, fuso São Paulo) quando não houver ação explícita.
- Carteira com filtros por status e responsável; distribuição e transferência com histórico de atribuições.
- Detalhe do lead com linha do tempo (transições, atribuições, interações, ações).

## Etapa 3 — Atendimento e agenda
- Registrar interação (canal, resultado Falou / Não atendeu / Remarcou com confirmação de acordo) com avanço automático do funil.
- Uma próxima ação pendente por lead: criar, substituir, cancelar (com motivo), concluir por interação.
- Agenda: retornos de hoje, atrasados e sem data.

## Etapa 4 — Encerramento e arquivo
- Venda (itens, quantidade, preço em centavos) somente pelo responsável atual, junto com status Ganho.
- Perda com motivo (Outro exige explicação); reabertura volta ao status anterior.
- Arquivar/desarquivar com justificativa opcional (até 500 caracteres) e histórico imutável visível só à gestão.

## Etapa 5 — Painéis e relatórios
- Vendedor: rotina e números próprios. Gerente: loja. Supervisor: 4 lojas. Diretor: consolidado sem abrir registros. Marketing: apenas volume e origens.
- Gráficos de oportunidades criadas, ganhas, perdidas, em andamento, conversão por coorte, vendas, produtos e motivos de perda, por período.

## Detalhes técnicos
- Tabelas: lojas, perfis/papéis (tabela de papéis separada), clientes, leads, produtos_interesse, atribuicoes, interacoes, proximas_acoes, transicoes, vendas, itens_venda, motivos_perda, ocorrencias_arquivamento.
- Operações atômicas via funções SQL (security definer com checagem de escopo) chamadas por server functions; RLS em todas as tabelas; relatórios por funções agregadas que nunca retornam IDs a Diretor/Marketing.
- Testes automáticos para regras-chave: prazo de 2 dias úteis, total de venda, normalização de telefone.
