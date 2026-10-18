
create extension if not exists pgcrypto;

create type public.app_role as enum ('VENDEDOR','GERENTE','SUPERVISOR','DIRETOR','MARKETING');
create type public.lead_status as enum ('NOVO','DISTRIBUIDO','NEGOCIACAO','GANHO','PERDIDO');

create table public.lojas (id smallint primary key, nome text not null, ativa boolean not null default true);
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null, login text not null unique,
  loja_id smallint references public.lojas(id), ativo boolean not null default true);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null, unique(user_id));

create table public.clientes (
  id uuid primary key default gen_random_uuid(), nome text not null,
  telefone_original text not null, telefone_normalizado text not null unique,
  instagram text, criado_em timestamptz not null default now());

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  responsavel_id uuid not null references public.usuarios(id),
  loja_id smallint not null references public.lojas(id),
  status public.lead_status not null,
  status_antes_perda public.lead_status,
  origem text not null check (origem in ('Instagram','WhatsApp','Loja física','Site','Indicação','Decorador')),
  motivo_perda text, observacao_perda text,
  arquivado_em timestamptz, versao_arquivamento int not null default 0,
  criado_por uuid not null references public.usuarios(id),
  request_id uuid unique,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now());

create table public.produtos_interesse (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id),
  categoria text not null, porte text not null check (porte in ('Pequeno','Médio','Grande')),
  observacao text, responsavel_id uuid not null, loja_id smallint not null,
  criado_em timestamptz not null default now());

create table public.atribuicoes (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id),
  responsavel_id uuid not null references public.usuarios(id), loja_id smallint not null,
  inicio_em timestamptz not null default now(), fim_em timestamptz, atribuido_por uuid not null);
create unique index atribuicao_atual_unica on public.atribuicoes(lead_id) where fim_em is null;

create table public.interacoes (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id),
  autor_id uuid not null, loja_id smallint not null,
  canal text not null check (canal in ('Telefone','WhatsApp','Presencial','Instagram','Outro')),
  resultado text not null check (resultado in ('FALOU','NAO_ATENDEU','REMARCOU')),
  resumo text not null, acordo_remarcacao_confirmado boolean not null default false,
  contato_efetivo boolean not null, ocorreu_em timestamptz not null default now());

create table public.proximas_acoes (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id),
  descricao text not null, prevista_para timestamptz, criada_por uuid not null,
  criada_em timestamptz not null default now(), concluida_em timestamptz, encerrada_em timestamptz,
  encerramento text check (encerramento in ('CONCLUIDA_POR_INTERACAO','SUBSTITUIDA','CANCELADA')),
  encerrada_por uuid, motivo_encerramento text, interacao_id uuid references public.interacoes(id));
create unique index acao_pendente_unica on public.proximas_acoes(lead_id) where encerrada_em is null;

create table public.transicoes (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id),
  status_anterior public.lead_status, status_novo public.lead_status not null,
  autor_id uuid not null, ocorreu_em timestamptz not null default now(),
  origem_fato text not null check (origem_fato in ('criação','distribuição','interação','venda','perda','reabertura')),
  motivo_perda text, observacao_perda text, responsavel_id uuid not null, loja_id smallint not null);

create table public.vendas (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null unique references public.leads(id),
  registrada_por uuid not null, responsavel_id uuid not null, loja_id smallint not null,
  vendida_em timestamptz not null default now(), valor_total_centavos bigint not null check (valor_total_centavos > 0));
create table public.itens_venda (
  id uuid primary key default gen_random_uuid(), venda_id uuid not null references public.vendas(id),
  descricao text not null, quantidade int not null check (quantidade > 0),
  valor_unitario_centavos bigint not null check (valor_unitario_centavos > 0));

create table public.ocorrencias_arquivamento (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id),
  operacao text not null check (operacao in ('ARQUIVAR','DESARQUIVAR')),
  autor_id uuid not null, ocorreu_em timestamptz not null default now(), versao int not null,
  justificativa text check (char_length(justificativa) <= 500));

-- Tables are accessed only through scoped security-definer functions.
do $$ declare t text; begin
  foreach t in array array['lojas','usuarios','user_roles','clientes','leads','produtos_interesse','atribuicoes','interacoes','proximas_acoes','transicoes','vendas','itens_venda','ocorrencias_arquivamento'] loop
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;
grant select on public.user_roles to authenticated;
create policy "own role" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Immutability of history
create or replace function public.tg_imutavel() returns trigger language plpgsql as $$
begin raise exception 'Registro histórico imutável'; end $$;
create trigger imut_transicoes before update or delete on public.transicoes for each row execute function public.tg_imutavel();
create trigger imut_interacoes before update or delete on public.interacoes for each row execute function public.tg_imutavel();
create trigger imut_arquiv before update or delete on public.ocorrencias_arquivamento for each row execute function public.tg_imutavel();

-- ===== helpers =====
create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.normalizar_telefone(t text) returns text language sql immutable as $$
  select case when length(d) in (12,13) and left(d,2)='55' then substr(d,3) else d end
  from (select regexp_replace(coalesce(t,''),'\D','','g') d) x $$;

create or replace function public.add_dias_uteis(base timestamptz, n int default 2) returns timestamptz
language plpgsql immutable as $$
declare l timestamp := base at time zone 'America/Sao_Paulo'; c int := 0;
begin
  while c < n loop l := l + interval '1 day'; if extract(dow from l) <> 0 then c := c + 1; end if; end loop;
  return l at time zone 'America/Sao_Paulo';
end $$;

create or replace function public.ctx(out uid uuid, out perfil public.app_role, out loja smallint)
language plpgsql stable security definer set search_path = public as $$
begin
  select u.id, r.role, u.loja_id into uid, perfil, loja
  from usuarios u join user_roles r on r.user_id=u.id where u.id=auth.uid() and u.ativo;
  if uid is null then raise exception 'Acesso negado'; end if;
end $$;

create or replace function public.pode_ver_lead(_lead uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c record; l record;
begin
  select * into c from ctx(); select * into l from leads where id=_lead;
  if l.id is null then return false; end if;
  return case c.perfil when 'VENDEDOR' then l.responsavel_id=c.uid
    when 'GERENTE' then l.loja_id=c.loja when 'SUPERVISOR' then true else false end;
end $$;

create or replace function public.e_gestor_do_lead(_lead uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c record; l record;
begin
  select * into c from ctx(); select * into l from leads where id=_lead;
  return l.id is not null and (c.perfil='SUPERVISOR' or (c.perfil='GERENTE' and l.loja_id=c.loja));
end $$;

create or replace function public.lead_visivel_ou_erro(_lead uuid) returns public.leads
language plpgsql security definer set search_path = public as $$
declare l leads;
begin
  if not pode_ver_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update; return l;
end $$;

-- ===== me / catálogos =====
create or replace function public.me() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record;
begin select * into c from ctx();
  return (select jsonb_build_object('id',u.id,'nome',u.nome,'login',u.login,'perfil',c.perfil,'loja_id',u.loja_id,
    'loja_nome',(select nome from lojas where id=u.loja_id)) from usuarios u where u.id=c.uid);
end $$;

create or replace function public.listar_lojas() returns table(id smallint, nome text)
language plpgsql stable security definer set search_path = public as $$
declare c record; begin select * into c from ctx();
  if c.perfil in ('VENDEDOR','GERENTE') then return query select l.id,l.nome from lojas l where l.id=c.loja;
  else return query select l.id,l.nome from lojas l order by l.id; end if; end $$;

create or replace function public.listar_equipe(_loja smallint default null)
returns table(id uuid, nome text, perfil public.app_role, loja_id smallint, loja_nome text)
language plpgsql stable security definer set search_path = public as $$
declare c record; begin select * into c from ctx();
  if c.perfil in ('VENDEDOR','MARKETING') then return; end if;
  return query select u.id,u.nome,r.role,u.loja_id,lj.nome from usuarios u join user_roles r on r.user_id=u.id
    join lojas lj on lj.id=u.loja_id
    where u.ativo and r.role in ('VENDEDOR','GERENTE')
      and (c.perfil in ('SUPERVISOR','DIRETOR') or u.loja_id=c.loja)
      and (_loja is null or u.loja_id=_loja)
    order by u.loja_id, r.role desc, u.nome;
end $$;

create or replace function public.consultar_cliente(_telefone text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record; cl record; begin select * into c from ctx();
  if c.perfil not in ('VENDEDOR','GERENTE','SUPERVISOR') then raise exception 'Acesso negado'; end if;
  select id,nome,instagram into cl from clientes where telefone_normalizado=normalizar_telefone(_telefone);
  if cl.id is null then return null; end if;
  return jsonb_build_object('nome',cl.nome,'instagram',cl.instagram);
end $$;

-- ===== criar lead =====
create or replace function public.criar_lead(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare c record; v_resp uuid; v_loja smallint; v_status lead_status; v_cli uuid; v_lead uuid;
  v_tel text := normalizar_telefone(p->>'telefone'); pr jsonb; v_req uuid := nullif(p->>'request_id','')::uuid;
begin
  select * into c from ctx();
  if v_req is not null then select id into v_lead from leads where request_id=v_req and criado_por=c.uid;
    if v_lead is not null then return v_lead; end if; end if;
  if length(v_tel) < 10 or length(v_tel) > 11 then raise exception 'Telefone inválido'; end if;
  if coalesce(trim(p->>'nome'),'')='' then raise exception 'Nome obrigatório'; end if;
  if jsonb_array_length(coalesce(p->'produtos','[]')) = 0 then raise exception 'Informe ao menos um produto de interesse'; end if;
  if c.perfil='VENDEDOR' then v_resp:=c.uid; v_loja:=c.loja; v_status:='DISTRIBUIDO';
  elsif c.perfil='GERENTE' then v_resp:=c.uid; v_loja:=c.loja; v_status:='NOVO';
  elsif c.perfil='SUPERVISOR' then
    v_loja := (p->>'loja_id')::smallint;
    select u.id into v_resp from usuarios u join user_roles r on r.user_id=u.id
      where r.role='GERENTE' and u.ativo and u.loja_id=v_loja order by u.nome limit 1;
    if v_resp is null then raise exception 'A loja selecionada não possui gerente ativo'; end if;
    v_status:='NOVO';
  else raise exception 'Acesso negado'; end if;

  select id into v_cli from clientes where telefone_normalizado=v_tel;
  if v_cli is null then
    insert into clientes(nome,telefone_original,telefone_normalizado,instagram)
    values (trim(p->>'nome'), p->>'telefone', v_tel, nullif(trim(p->>'instagram'),'')) returning id into v_cli;
  end if;
  insert into leads(cliente_id,responsavel_id,loja_id,status,origem,criado_por,request_id)
    values (v_cli,v_resp,v_loja,v_status,p->>'origem',c.uid,v_req) returning id into v_lead;
  insert into atribuicoes(lead_id,responsavel_id,loja_id,atribuido_por) values (v_lead,v_resp,v_loja,c.uid);
  insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,responsavel_id,loja_id)
    values (v_lead,null,v_status,c.uid,'criação',v_resp,v_loja);
  for pr in select * from jsonb_array_elements(p->'produtos') loop
    if coalesce(trim(pr->>'categoria'),'')='' then raise exception 'Produto sem categoria'; end if;
    insert into produtos_interesse(lead_id,categoria,porte,observacao,responsavel_id,loja_id)
      values (v_lead,trim(pr->>'categoria'),pr->>'porte',nullif(trim(pr->>'observacao'),''),v_resp,v_loja);
  end loop;
  if p ? 'acao' and jsonb_typeof(p->'acao')='object' then
    insert into proximas_acoes(lead_id,descricao,prevista_para,criada_por)
      values (v_lead, coalesce(nullif(trim(p->'acao'->>'descricao'),''),'Retomar contato com o cliente'),
              nullif(p->'acao'->>'prevista_para','')::timestamptz, c.uid);
  else
    insert into proximas_acoes(lead_id,descricao,prevista_para,criada_por)
      values (v_lead,'Retomar contato com o cliente', add_dias_uteis(now(),2), c.uid);
  end if;
  return v_lead;
end $$;

-- ===== listar =====
create or replace function public.listar_leads(_status text default null, _responsavel uuid default null,
  _arquivados boolean default false, _fila text default null)
returns table(id uuid, cliente_nome text, telefone text, status lead_status, origem text, responsavel_id uuid,
  responsavel_nome text, loja_nome text, arquivado boolean, acao_descricao text, acao_prevista timestamptz,
  tem_acao boolean, criado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare c record; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin select * into c from ctx();
  if c.perfil not in ('VENDEDOR','GERENTE','SUPERVISOR') then raise exception 'Acesso negado'; end if;
  return query
  select l.id, cl.nome, cl.telefone_original, l.status, l.origem, l.responsavel_id, u.nome, lj.nome,
    l.arquivado_em is not null, a.descricao, a.prevista_para, a.id is not null, l.criado_em
  from leads l join clientes cl on cl.id=l.cliente_id join usuarios u on u.id=l.responsavel_id
    join lojas lj on lj.id=l.loja_id
    left join proximas_acoes a on a.lead_id=l.id and a.encerrada_em is null
  where (case c.perfil when 'VENDEDOR' then l.responsavel_id=c.uid when 'GERENTE' then l.loja_id=c.loja else true end)
    and ((_arquivados and l.arquivado_em is not null) or (not _arquivados and l.arquivado_em is null))
    and (_status is null or l.status::text=_status)
    and (_responsavel is null or l.responsavel_id=_responsavel)
    and (_fila is null
      or (_fila='hoje' and l.status not in ('GANHO','PERDIDO') and (a.prevista_para at time zone 'America/Sao_Paulo')::date = hoje)
      or (_fila='atrasados' and l.status not in ('GANHO','PERDIDO') and (a.prevista_para at time zone 'America/Sao_Paulo')::date < hoje)
      or (_fila='sem_acao' and l.status not in ('GANHO','PERDIDO') and a.prevista_para is null))
  order by a.prevista_para asc nulls last, l.criado_em desc;
end $$;

-- ===== detalhe =====
create or replace function public.obter_lead(_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record; l leads; gestor boolean; r jsonb;
begin select * into c from ctx();
  if not pode_ver_lead(_id) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_id; gestor := e_gestor_do_lead(_id);
  r := jsonb_build_object(
    'lead', to_jsonb(l) - 'request_id',
    'cliente', (select jsonb_build_object('nome',nome,'telefone',telefone_original,'instagram',instagram) from clientes where id=l.cliente_id),
    'responsavel_nome', (select nome from usuarios where id=l.responsavel_id),
    'loja_nome', (select nome from lojas where id=l.loja_id),
    'produtos', coalesce((select jsonb_agg(to_jsonb(p) order by p.criado_em) from produtos_interesse p where p.lead_id=_id),'[]'),
    'atribuicoes', coalesce((select jsonb_agg(jsonb_build_object('responsavel',u.nome,'loja',lj.nome,'inicio_em',a.inicio_em,'fim_em',a.fim_em,'por',ub.nome) order by a.inicio_em)
        from atribuicoes a join usuarios u on u.id=a.responsavel_id join lojas lj on lj.id=a.loja_id left join usuarios ub on ub.id=a.atribuido_por where a.lead_id=_id),'[]'),
    'interacoes', coalesce((select jsonb_agg(to_jsonb(i) || jsonb_build_object('autor',u.nome) order by i.ocorreu_em desc)
        from interacoes i join usuarios u on u.id=i.autor_id where i.lead_id=_id),'[]'),
    'acoes', coalesce((select jsonb_agg(to_jsonb(a) || jsonb_build_object('autor',u.nome,'encerrada_por_nome',ue.nome) order by a.criada_em desc)
        from proximas_acoes a join usuarios u on u.id=a.criada_por left join usuarios ue on ue.id=a.encerrada_por where a.lead_id=_id),'[]'),
    'transicoes', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('autor',u.nome) order by t.ocorreu_em)
        from transicoes t join usuarios u on u.id=t.autor_id where t.lead_id=_id),'[]'),
    'venda', (select to_jsonb(v) || jsonb_build_object('itens',(select jsonb_agg(to_jsonb(it)) from itens_venda it where it.venda_id=v.id)) from vendas v where v.lead_id=_id),
    'pode', jsonb_build_object(
      'operar', l.responsavel_id=c.uid and l.status not in ('GANHO','PERDIDO'),
      'planejar', (l.responsavel_id=c.uid or gestor) and l.status not in ('GANHO','PERDIDO'),
      'gerir', gestor, 'reabrir', gestor and l.status='PERDIDO'));
  if gestor then
    r := r || jsonb_build_object('arquivamentos', coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object('autor',u.nome) order by o.versao)
      from ocorrencias_arquivamento o join usuarios u on u.id=o.autor_id where o.lead_id=_id),'[]'));
  end if;
  return r;
end $$;

-- ===== distribuir/transferir =====
create or replace function public.distribuir_lead(_lead uuid, _destino uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads; d record;
begin select * into c from ctx();
  if not e_gestor_do_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if l.status in ('GANHO','PERDIDO') then raise exception 'Lead encerrado não pode ser distribuído'; end if;
  select u.id,u.loja_id,r.role into d from usuarios u join user_roles r on r.user_id=u.id
    where u.id=_destino and u.ativo and r.role in ('VENDEDOR','GERENTE');
  if d.id is null then raise exception 'Destinatário inválido'; end if;
  if c.perfil='GERENTE' and d.loja_id<>c.loja then raise exception 'Destinatário fora da sua loja'; end if;
  if d.id=l.responsavel_id then raise exception 'Lead já está com este responsável'; end if;
  update atribuicoes set fim_em=now() where lead_id=_lead and fim_em is null;
  insert into atribuicoes(lead_id,responsavel_id,loja_id,atribuido_por) values (_lead,d.id,d.loja_id,c.uid);
  update leads set responsavel_id=d.id, loja_id=d.loja_id, atualizado_em=now(),
    status = case when status='NOVO' and d.role='VENDEDOR' then 'DISTRIBUIDO' else status end where id=_lead;
  if l.status='NOVO' and d.role='VENDEDOR' then
    insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,responsavel_id,loja_id)
      values (_lead,'NOVO','DISTRIBUIDO',c.uid,'distribuição',d.id,d.loja_id);
  end if;
end $$;

-- ===== próxima ação =====
create or replace function public.definir_acao(_lead uuid, _descricao text, _prevista timestamptz, _motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads; pend uuid;
begin select * into c from ctx();
  if not pode_ver_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if not (l.responsavel_id=c.uid or e_gestor_do_lead(_lead)) then raise exception 'Lead não encontrado'; end if;
  if l.status in ('GANHO','PERDIDO') then raise exception 'Lead encerrado'; end if;
  if coalesce(trim(_descricao),'')='' then raise exception 'Descrição obrigatória'; end if;
  select id into pend from proximas_acoes where lead_id=_lead and encerrada_em is null;
  if pend is not null then
    if coalesce(trim(_motivo),'')='' then raise exception 'Informe o motivo da substituição'; end if;
    update proximas_acoes set encerrada_em=now(), encerramento='SUBSTITUIDA', encerrada_por=c.uid, motivo_encerramento=trim(_motivo) where id=pend;
  end if;
  insert into proximas_acoes(lead_id,descricao,prevista_para,criada_por) values (_lead,trim(_descricao),_prevista,c.uid);
end $$;

create or replace function public.cancelar_acao(_lead uuid, _motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads;
begin select * into c from ctx();
  if not pode_ver_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if not (l.responsavel_id=c.uid or e_gestor_do_lead(_lead)) then raise exception 'Lead não encontrado'; end if;
  if coalesce(trim(_motivo),'')='' then raise exception 'Informe o motivo do cancelamento'; end if;
  update proximas_acoes set encerrada_em=now(), encerramento='CANCELADA', encerrada_por=c.uid, motivo_encerramento=trim(_motivo)
    where lead_id=_lead and encerrada_em is null;
  if not found then raise exception 'Não há ação pendente'; end if;
end $$;

-- ===== interação =====
create or replace function public.registrar_interacao(_lead uuid, _canal text, _resultado text, _resumo text,
  _acordo boolean default false, _nova_descricao text default null, _nova_prevista timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads; efet boolean; v_int uuid;
begin select * into c from ctx();
  if not pode_ver_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if l.responsavel_id<>c.uid then raise exception 'Somente o responsável atual registra interações'; end if;
  if l.status in ('GANHO','PERDIDO') then raise exception 'Lead encerrado'; end if;
  if coalesce(trim(_resumo),'')='' then raise exception 'Resumo obrigatório'; end if;
  efet := _resultado='FALOU' or (_resultado='REMARCOU' and coalesce(_acordo,false));
  insert into interacoes(lead_id,autor_id,loja_id,canal,resultado,resumo,acordo_remarcacao_confirmado,contato_efetivo)
    values (_lead,c.uid,l.loja_id,_canal,_resultado,trim(_resumo),_resultado='REMARCOU' and coalesce(_acordo,false),efet) returning id into v_int;
  update proximas_acoes set encerrada_em=now(), concluida_em=now(), encerramento='CONCLUIDA_POR_INTERACAO', encerrada_por=c.uid, interacao_id=v_int
    where lead_id=_lead and encerrada_em is null;
  if efet and l.status='NOVO' then
    insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,responsavel_id,loja_id) values
      (_lead,'NOVO','DISTRIBUIDO',c.uid,'interação',c.uid,l.loja_id);
    insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,responsavel_id,loja_id) values
      (_lead,'DISTRIBUIDO','NEGOCIACAO',c.uid,'interação',c.uid,l.loja_id);
    update leads set status='NEGOCIACAO' where id=_lead;
  elsif efet and l.status='DISTRIBUIDO' then
    insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,responsavel_id,loja_id) values
      (_lead,'DISTRIBUIDO','NEGOCIACAO',c.uid,'interação',c.uid,l.loja_id);
    update leads set status='NEGOCIACAO' where id=_lead;
  end if;
  if coalesce(trim(_nova_descricao),'')<>'' then
    insert into proximas_acoes(lead_id,descricao,prevista_para,criada_por) values (_lead,trim(_nova_descricao),_nova_prevista,c.uid);
  end if;
  update leads set atualizado_em=now() where id=_lead;
end $$;

-- ===== venda =====
create or replace function public.registrar_venda(_lead uuid, _itens jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads; v_id uuid; it jsonb; total bigint := 0; q int; vu bigint;
begin select * into c from ctx();
  if not pode_ver_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if l.responsavel_id<>c.uid then raise exception 'Somente o responsável atual registra a venda'; end if;
  if l.status in ('GANHO','PERDIDO') then raise exception 'Lead encerrado'; end if;
  if exists(select 1 from vendas where lead_id=_lead) then raise exception 'Lead já possui venda'; end if;
  if jsonb_array_length(coalesce(_itens,'[]'))=0 then raise exception 'Informe ao menos um item'; end if;
  insert into vendas(lead_id,registrada_por,responsavel_id,loja_id,valor_total_centavos) values (_lead,c.uid,c.uid,l.loja_id,1) returning id into v_id;
  for it in select * from jsonb_array_elements(_itens) loop
    q := (it->>'quantidade')::int; vu := (it->>'valor_unitario_centavos')::bigint;
    if coalesce(trim(it->>'descricao'),'')='' or q is null or q<=0 or vu is null or vu<=0 then raise exception 'Item de venda inválido'; end if;
    insert into itens_venda(venda_id,descricao,quantidade,valor_unitario_centavos) values (v_id,trim(it->>'descricao'),q,vu);
    total := total + q*vu;
  end loop;
  update vendas set valor_total_centavos=total where id=v_id;
  insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,responsavel_id,loja_id)
    values (_lead,l.status,'GANHO',c.uid,'venda',c.uid,l.loja_id);
  update leads set status='GANHO', atualizado_em=now() where id=_lead;
  update proximas_acoes set encerrada_em=now(), encerramento='CANCELADA', encerrada_por=c.uid, motivo_encerramento='Lead encerrado por venda'
    where lead_id=_lead and encerrada_em is null;
end $$;

-- ===== perda / reabertura =====
create or replace function public.registrar_perda(_lead uuid, _motivo text, _obs text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads;
begin select * into c from ctx();
  if not pode_ver_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if l.responsavel_id<>c.uid then raise exception 'Somente o responsável atual registra a perda'; end if;
  if l.status in ('GANHO','PERDIDO') then raise exception 'Lead encerrado'; end if;
  if _motivo not in ('Preço','Prazo de entrega','Desistiu da compra','Comprou com concorrente','Sem retorno','Produto indisponível','Outro') then raise exception 'Motivo inválido'; end if;
  if _motivo='Outro' and coalesce(trim(_obs),'')='' then raise exception 'Explique o motivo "Outro"'; end if;
  insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,motivo_perda,observacao_perda,responsavel_id,loja_id)
    values (_lead,l.status,'PERDIDO',c.uid,'perda',_motivo,nullif(trim(_obs),''),c.uid,l.loja_id);
  update leads set status='PERDIDO', status_antes_perda=l.status, motivo_perda=_motivo, observacao_perda=nullif(trim(_obs),''), atualizado_em=now() where id=_lead;
  update proximas_acoes set encerrada_em=now(), encerramento='CANCELADA', encerrada_por=c.uid, motivo_encerramento='Lead encerrado por perda'
    where lead_id=_lead and encerrada_em is null;
end $$;

create or replace function public.reabrir_lead(_lead uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads;
begin select * into c from ctx();
  if not e_gestor_do_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if l.status<>'PERDIDO' then raise exception 'Somente leads perdidos podem ser reabertos'; end if;
  insert into transicoes(lead_id,status_anterior,status_novo,autor_id,origem_fato,responsavel_id,loja_id)
    values (_lead,'PERDIDO',coalesce(l.status_antes_perda,'DISTRIBUIDO'),c.uid,'reabertura',l.responsavel_id,l.loja_id);
  update leads set status=coalesce(l.status_antes_perda,'DISTRIBUIDO'), status_antes_perda=null, motivo_perda=null, observacao_perda=null, atualizado_em=now() where id=_lead;
end $$;

-- ===== arquivamento =====
create or replace function public.arquivar_lead(_lead uuid, _arquivar boolean, _justificativa text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c record; l leads; j text := nullif(trim(coalesce(_justificativa,'')),'');
begin select * into c from ctx();
  if not e_gestor_do_lead(_lead) then raise exception 'Lead não encontrado'; end if;
  select * into l from leads where id=_lead for update;
  if char_length(j) > 500 then raise exception 'Justificativa acima de 500 caracteres'; end if;
  if _arquivar and l.arquivado_em is not null then raise exception 'Lead já arquivado'; end if;
  if not _arquivar and l.arquivado_em is null then raise exception 'Lead não está arquivado'; end if;
  update leads set arquivado_em = case when _arquivar then now() else null end, versao_arquivamento=versao_arquivamento+1 where id=_lead;
  insert into ocorrencias_arquivamento(lead_id,operacao,autor_id,versao,justificativa)
    values (_lead, case when _arquivar then 'ARQUIVAR' else 'DESARQUIVAR' end, c.uid, l.versao_arquivamento+1, j);
end $$;

-- ===== painel =====
create or replace function public.painel(_inicio date, _fim date, _loja smallint default null, _vendedor uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record; ini timestamptz := (_inicio::timestamp) at time zone 'America/Sao_Paulo';
  fim timestamptz := ((_fim + 1)::timestamp) at time zone 'America/Sao_Paulo'; r jsonb;
begin select * into c from ctx();
  create temp table if not exists _coorte(id uuid, loja_id smallint, resp uuid, origem text, status lead_status, arquivado boolean) on commit drop;
  truncate _coorte;
  insert into _coorte
    select l.id, t.loja_id, t.responsavel_id, l.origem, l.status, l.arquivado_em is not null
    from leads l join transicoes t on t.lead_id=l.id and t.origem_fato='criação'
    where l.criado_em >= ini and l.criado_em < fim
      and (case c.perfil when 'VENDEDOR' then t.responsavel_id=c.uid when 'GERENTE' then t.loja_id=c.loja else true end)
      and (_loja is null or t.loja_id=_loja)
      and (_vendedor is null or c.perfil='MARKETING' or t.responsavel_id=_vendedor);
  r := jsonb_build_object('perfil',c.perfil,'total',(select count(*) from _coorte),
    'por_origem',coalesce((select jsonb_agg(jsonb_build_object('origem',origem,'total',n) order by n desc) from (select origem,count(*) n from _coorte group by origem) x),'[]'),
    'origem_por_loja',coalesce((select jsonb_agg(jsonb_build_object('loja',lj.nome,'origem',x.origem,'total',x.n)) from (select loja_id,origem,count(*) n from _coorte group by 1,2) x join lojas lj on lj.id=x.loja_id),'[]'));
  if c.perfil='MARKETING' then return r; end if;
  r := r || jsonb_build_object(
    'ganhos',(select count(*) from _coorte where status='GANHO'),
    'perdidos',(select count(*) from _coorte where status='PERDIDO'),
    'andamento',(select count(*) from _coorte where status not in ('GANHO','PERDIDO')),
    'por_status',coalesce((select jsonb_agg(jsonb_build_object('status',status,'total',n)) from (select status,count(*) n from _coorte group by 1) x),'[]'),
    'conversao_origem',coalesce((select jsonb_agg(jsonb_build_object('origem',origem,'total',n,'ganhos',g)) from (select origem,count(*) n,count(*) filter (where status='GANHO') g from _coorte group by 1) x),'[]'),
    'vendas', (select jsonb_build_object('quantidade',count(*),'valor_centavos',coalesce(sum(valor_total_centavos),0)) from vendas v
       where v.vendida_em>=ini and v.vendida_em<fim and (case c.perfil when 'VENDEDOR' then v.responsavel_id=c.uid when 'GERENTE' then v.loja_id=c.loja else true end)
       and (_loja is null or v.loja_id=_loja) and (_vendedor is null or v.responsavel_id=_vendedor)),
    'perdas_motivo',coalesce((select jsonb_agg(jsonb_build_object('motivo',motivo_perda,'total',n) order by n desc) from (select t.motivo_perda,count(*) n from transicoes t
       where t.origem_fato='perda' and t.ocorreu_em>=ini and t.ocorreu_em<fim and (case c.perfil when 'VENDEDOR' then t.responsavel_id=c.uid when 'GERENTE' then t.loja_id=c.loja else true end)
       and (_loja is null or t.loja_id=_loja) and (_vendedor is null or t.responsavel_id=_vendedor) group by 1) x),'[]'),
    'produtos',coalesce((select jsonb_agg(jsonb_build_object('categoria',categoria,'total',n) order by n desc) from (select p.categoria,count(*) n from produtos_interesse p
       where p.criado_em>=ini and p.criado_em<fim and (case c.perfil when 'VENDEDOR' then p.responsavel_id=c.uid when 'GERENTE' then p.loja_id=c.loja else true end)
       and (_loja is null or p.loja_id=_loja) and (_vendedor is null or p.responsavel_id=_vendedor) group by 1 limit 10) x),'[]'),
    'por_loja',coalesce((select jsonb_agg(jsonb_build_object('loja',lj.nome,'total',x.n,'ganhos',x.g,'perdidos',x.p)) from (select loja_id,count(*) n,count(*) filter (where status='GANHO') g,count(*) filter (where status='PERDIDO') p from _coorte group by 1) x join lojas lj on lj.id=x.loja_id),'[]'),
    'por_vendedor',coalesce((select jsonb_agg(jsonb_build_object('nome',u.nome,'total',x.n,'ganhos',x.g)) from (select resp,count(*) n,count(*) filter (where status='GANHO') g from _coorte group by 1) x join usuarios u on u.id=x.resp),'[]'));
  if c.perfil in ('VENDEDOR','GERENTE','SUPERVISOR') then
    r := r || jsonb_build_object('filas', (select jsonb_build_object(
      'hoje', count(*) filter (where (a.prevista_para at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
      'atrasados', count(*) filter (where (a.prevista_para at time zone 'America/Sao_Paulo')::date < (now() at time zone 'America/Sao_Paulo')::date),
      'sem_acao', count(*) filter (where a.prevista_para is null))
      from leads l left join proximas_acoes a on a.lead_id=l.id and a.encerrada_em is null
      where l.arquivado_em is null and l.status not in ('GANHO','PERDIDO')
        and (case c.perfil when 'VENDEDOR' then l.responsavel_id=c.uid when 'GERENTE' then l.loja_id=c.loja else true end)));
  end if;
  return r;
end $$;

-- painel creates a temp table, so it must not be STABLE
alter function public.painel(date,date,smallint,uuid) volatile;

revoke all on all functions in schema public from public, anon;
grant execute on function public.me(), public.listar_lojas(), public.listar_equipe(smallint), public.consultar_cliente(text),
  public.criar_lead(jsonb), public.listar_leads(text,uuid,boolean,text), public.obter_lead(uuid), public.distribuir_lead(uuid,uuid),
  public.definir_acao(uuid,text,timestamptz,text), public.cancelar_acao(uuid,text),
  public.registrar_interacao(uuid,text,text,text,boolean,text,timestamptz), public.registrar_venda(uuid,jsonb),
  public.registrar_perda(uuid,text,text), public.reabrir_lead(uuid), public.arquivar_lead(uuid,boolean,text),
  public.painel(date,date,smallint,uuid), public.has_role(uuid,public.app_role) to authenticated;

-- ===== seed: lojas e contas sintéticas =====
insert into public.lojas(id,nome) values (1,'Loja Centro'),(2,'Loja Norte'),(3,'Loja Sul'),(4,'Loja Shopping');

do $$
declare rec record; uid uuid;
begin
  for rec in select * from (values
    ('supervisor','Sandra Supervisora','SUPERVISOR',null::smallint),
    ('diretor','Diego Diretor','DIRETOR',null),
    ('marketing','Marina Marketing','MARKETING',null),
    ('gerente1','Gustavo (Gerente Centro)','GERENTE',1),('vendedor1a','Ana Paula','VENDEDOR',1),('vendedor1b','Bruno Lima','VENDEDOR',1),
    ('gerente2','Helena (Gerente Norte)','GERENTE',2),('vendedor2a','Carla Souza','VENDEDOR',2),('vendedor2b','Daniel Rocha','VENDEDOR',2),
    ('gerente3','Igor (Gerente Sul)','GERENTE',3),('vendedor3a','Elisa Martins','VENDEDOR',3),('vendedor3b','Fábio Nunes','VENDEDOR',3),
    ('gerente4','Júlia (Gerente Shopping)','GERENTE',4),('vendedor4a','Gabriela Reis','VENDEDOR',4),('vendedor4b','Henrique Alves','VENDEDOR',4)
  ) as t(login,nome,perfil,loja) loop
    uid := gen_random_uuid();
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
      raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change_token_new,email_change)
    values ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',rec.login||'@crm.local',
      crypt('Moveis@2026',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}','','','','');
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',rec.login||'@crm.local','email_verified',true),'email',now(),now(),now());
    insert into public.usuarios(id,nome,login,loja_id) values (uid,rec.nome,rec.login,rec.loja);
    insert into public.user_roles(user_id,role) values (uid,rec.perfil::public.app_role);
  end loop;
end $$;
