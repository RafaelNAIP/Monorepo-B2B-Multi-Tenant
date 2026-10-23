import type { TicketStatus, TicketPriority, TicketCategory } from "./constants";

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
}
