import { describe, it, expect } from "vitest";

import { buildQueryString } from "../../lib/shared/search-params";

describe("buildQueryString", () => {
  it("monta a query string com os parâmetros informados", () => {
    expect(buildQueryString({ status: "open", search: "erro" })).toBe(
      "status=open&search=erro"
    );
  });

  it("omite parâmetros undefined", () => {
    expect(buildQueryString({ status: undefined, page: "2" })).toBe("page=2");
  });

  it("omite parâmetros vazios e com espaços", () => {
    expect(buildQueryString({ search: "", status: "   " })).toBe("");
  });

  it("retorna string vazia quando não há parâmetros", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("codifica caracteres especiais da busca", () => {
    expect(buildQueryString({ search: "erro & falha" })).toBe(
      "search=erro+%26+falha"
    );
  });
});
