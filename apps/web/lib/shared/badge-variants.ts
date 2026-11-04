/**
 * Mapeamento de valores de domínio para variantes semânticas do Badge.
 *
 * O componente Badge em packages/ui expõe variantes agnósticas de domínio
 * (info, warning, success, danger, neutral, etc.). Este módulo faz a ponte
 * entre os valores de negócio (status de chamado, prioridade, assinatura)
 * e essas variantes visuais.
 */

type BadgeVariant =
  | "default"
  | "info"
  | "warning"
  | "success"
  | "danger"
  | "neutral"
  | "purple"
  | "violet"
  | "yellow"
  | "slate"
  | "emerald";

// ─── Ticket Status ──────────────────────────────────────────────

const ticketStatusMap: Record<string, BadgeVariant> = {
  open: "info",
  in_progress: "warning",
  resolved: "success",
  pending_feedback: "purple",
  closed: "neutral",
};

export function ticketStatusVariant(status: string): BadgeVariant {
  return ticketStatusMap[status] ?? "default";
}

// ─── Priority ───────────────────────────────────────────────────

const priorityMap: Record<string, BadgeVariant> = {
  high: "danger",
  medium: "yellow",
  low: "slate",
};

export function priorityVariant(priority: string): BadgeVariant {
  return priorityMap[priority] ?? "default";
}

// ─── Subscription Status ────────────────────────────────────────

const subscriptionMap: Record<string, BadgeVariant> = {
  active: "emerald",
  inactive: "neutral",
  trial: "violet",
};

export function subscriptionVariant(status: string): BadgeVariant {
  return subscriptionMap[status] ?? "default";
}
