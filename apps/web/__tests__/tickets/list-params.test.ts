import { describe, it, expect } from "vitest";

import { parseTicketListParams } from "../../lib/tickets/list-params";

describe("parseTicketListParams", () => {
  it("lê página, status e busca da URL", () => {
    expect(
      parseTicketListParams({ page: "3", status: "pending_feedback", search: "erro" })
    ).toEqual({ page: 3, status: "pending_feedback", search: "erro" });
  });

  it("sem parâmetros usa a página 1 e nenhum filtro", () => {
    const params = parseTicketListParams({});
    expect(params.page).toBe(1);
    expect(params.status).toBeUndefined();
    expect(params.search).toBeUndefined();
  });

  it("ignora status inválido vindo da URL (não quebra a página)", () => {
    const params = parseTicketListParams({ status: "todos", search: "erro" });
    expect(params.status).toBeUndefined();
    expect(params.search).toBe("erro");
  });

  it("usa a primeira ocorrência quando um parâmetro se repete", () => {
    const params = parseTicketListParams({ status: ["open", "closed"], page: ["2", "5"] });
    expect(params.status).toBe("open");
    expect(params.page).toBe(2);
  });
});
