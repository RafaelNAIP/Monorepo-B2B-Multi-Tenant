# ADR 0001 — SSE vs WebSocket para realtime de threads

**Status:** Aceita  
**Data:** 2026-11-03  
**Autores:** Rafael Dias

## Contexto

A plataforma possui um canal de notificação em tempo real entre admin e cliente
via Server-Sent Events (SSE). O pub/sub era feito em memória
(`ThreadEventEmitter` via `globalThis`), o que funciona com uma única instância
de servidor, mas quebra silenciosamente com duas ou mais — o admin na instância
A não notifica o cliente na instância B.

O deploy é na **Vercel com Fluid Compute**, onde cada instância pode servir
múltiplas conexões concorrentes, mas cada conexão fica fixada à instância que a
aceitou durante toda a sua vida.

O canal SSE não transporta dados da mensagem — apenas emite tipo do evento,
`ticketId` e timestamp. O cliente busca o estado atualizado via Server Action
(`pollThreadMessages`).

## Decisão

**Manter SSE** e resolver o fan-out entre instâncias com **Redis pub/sub**
atrás de uma interface `ThreadEventChannel`.

### Por que não WebSocket

A Vercel passou a suportar WebSocket em beta público desde junho de 2026
(via `experimental_upgradeWebSocket` em Route Handlers). Mesmo assim:

1. **O problema era o fan-out, não o transporte.** WebSocket reproduziria
   exatamente o mesmo split-brain entre instâncias — o fix é o mesmo (Redis
   ou equivalente) independente do transporte.

2. **O caminho cliente→servidor já é Server Action.** `sendMessageAction` usa
   `requireSession`/`resolveThreadActor`, Zod, anexos em transação e
   `revalidatePath`. Mover o envio para o socket significaria reimplementar
   tudo sobre um payload não confiável — o oposto da regra de ouro do projeto
   (*identidade sempre vem de credencial*).

3. **`EventSource` reconecta sozinho.** O browser reabre a conexão com o
   `Last-Event-ID` sem código adicional. Com WebSocket seria preciso
   implementar heartbeat, detecção de morte e reconexão manual.

4. **API estável vs experimental.** `EventSource` é padrão há mais de uma
   década; `experimental_upgradeWebSocket` da Vercel ainda está em beta.

## Alternativas consideradas

| Alternativa | Por que descartada |
|---|---|
| WebSocket via `experimental_upgradeWebSocket` | Não resolve o fan-out; reimplementa auth; API experimental |
| Serviço gerenciado de realtime (Pusher, Ably) | Dependência externa para um caso simples; custo e latência |
| Long polling puro | Latência mais alta e maior carga no banco |

## Implementação

- **Interface:** `ThreadEventChannel` com `subscribe`, `publish`, `subscriberCount`
- **Adaptadores:** `InMemoryChannel` (dev/preview/testes) e `RedisChannel` (produção)
- **Factory:** singleton via `globalThis`, seleciona adaptador por presença de `REDIS_URL`
- **Autenticação:** `resolveThreadActor` na route SSE — sessão (cookie) ou token de thread (`?token=`)
- **Token de thread:** `expiresAt` e `revokedAt` em `ThreadAccess`
- **maxDuration:** 60s (Vercel Pro); `createThreadSync` reconecta automaticamente

## Consequências

### Positivas
- Reconexão automática do `EventSource` — zero código no cliente
- Rollback trivial: remover `REDIS_URL` volta ao adaptador in-memory
- Revalidação do ator a cada reconexão (efeito colateral do `maxDuration`)
- Testes de contrato rodando contra ambos os adaptadores

### Negativas / Limitações
- Limite de `maxDuration` da Vercel força reconexões periódicas
- Presença (quem está online) e typing indicator exigiriam reavaliação — SSE
  é unidirecional e não é o melhor transporte para mensagens frequentes do
  cliente para o servidor

## Revisão

Reavaliar se surgir demanda por presença, typing indicators ou read receipts.
Nesse cenário, WebSocket passa a fazer sentido porque o volume de mensagens
cliente→servidor justifica um canal bidirecional.
