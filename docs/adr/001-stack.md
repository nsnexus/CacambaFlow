# ADR 001: Definição da Stack Tecnológica Inicial

**Data:** 04/08/2026  
**Status:** Aceito

## Contexto
O projeto **CaçambaFlow** é um SaaS multi-empresa para gestão de caçambas. Ele requer um painel web para a base operacional e um aplicativo móvel para os motoristas. O aplicativo móvel precisa operar offline (com sincronização resiliente) e realizar rastreamento em segundo plano (com a tela desligada). As fotos e assinaturas serão coletadas obrigatoriamente nas operações de entrega e recolhimento.

Precisamos definir a stack base que garanta velocidade de desenvolvimento (time-to-market), facilidade de construção do MVP e suporte offline/realtime robusto, mantendo custos controlados inicialmente.

## Decisão
Foi decidido adotar a seguinte stack para a fundação do projeto:

1. **Arquitetura Geral:** Monorepo (para compartilhar tipos e esquemas de validação entre web e mobile).
2. **Painel Web:** Next.js (App Router) + React + Tailwind CSS (ou design system próprio a ser construído em CSS puro conforme restrições locais).
3. **App Mobile:** React Native + Expo (EAS). O Expo facilita o build, e usaremos pacotes do ecosistema Expo para SQLite (offline) e Location (rastreamento background).
4. **Backend e Banco de Dados (BaaS):** Supabase (PostgreSQL).
   - O Supabase fornecerá autenticação, Row Level Security (isolamento multi-empresa), Realtime (para o mapa operacional) e Storage (para as fotos e assinaturas).
5. **Persistência Offline:** SQLite no dispositivo móvel operando no padrão Outbox Transacional (sincronizando eventos com o Supabase quando online).

## Consequências
- **Vantagens:** O uso de Supabase e Expo acelera drasticamente a fase inicial e reduz a necessidade de gerenciar infraestrutura própria (DevOps). Compartilhar Typescript entre Web, Mobile e Backend (Edge Functions) reduzirá bugs de integração.
- **Desvantagens/Riscos:** Rastreamento background no Expo requer configuração cuidadosa de permissões (config plugins). Teremos que ser rigorosos com as políticas RLS no Supabase para garantir o isolamento absoluto dos dados das empresas.

## Alternativas Consideradas
- *Backend Próprio (NestJS/Node):* Rejeitado para o MVP inicial devido ao maior tempo de setup (precisaríamos construir do zero autenticação, realtime via websockets e infraestrutura).
- *Flutter para Mobile:* Rejeitado porque React Native permite maior reaproveitamento de código e conhecimento com o time web (Next.js/React).
