import type { TicketStatus, TicketPriority, TicketCategory } from "./constants";

export type ClosedReason = "client_confirmed" | "client_unresolved" | "auto_closed";

export interface Ticket {
  id: string;
  title: string;
  requester: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  description: string;
  createdAt: string;
  tenantId: string;
  assignedTo: string | null;
  disconnectedAt: string | null;
  feedbackDeadline: string | null;
  relatedTicketId: string | null;
  closedReason: ClosedReason | null;
}
