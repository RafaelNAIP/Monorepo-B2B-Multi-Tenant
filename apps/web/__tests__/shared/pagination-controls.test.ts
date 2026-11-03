import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { PaginationControls } from "../../components/shared/pagination-controls";

const PATHNAME = "/demo/dashboard";

function render(props: Partial<Parameters<typeof PaginationControls>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PaginationControls, {
      pathname: PATHNAME,
      query: {},
      page: 1,
      totalPages: 3,
      total: 25,
      ...props,
    })
  );
}

describe("PaginationControls", () => {
  it("mostra a página atual, o total de páginas e o total de chamados", () => {
    const html = render({ page: 2, totalPages: 3, total: 25 });
    expect(html).toContain("Página 2 de 3");
    expect(html).toContain("25 chamado(s)");
  });

  it("na primeira página, o link anterior fica desabilitado", () => {
    const html = render({ page: 1 });
    expect(html).toMatch(/aria-disabled="true"[^>]*>Anterior/);
  });

  it("na última página, o link próxima fica desabilitado", () => {
    const html = render({ page: 3, totalPages: 3 });
    expect(html).toMatch(/aria-disabled="true"[^>]*>Próxima/);
  });

  it("o link da próxima página aponta para a página seguinte e preserva os filtros", () => {
    const html = render({ page: 1, query: { status: "open", search: "erro" } });
    expect(html).toContain(`href="${PATHNAME}?status=open&amp;search=erro&amp;page=2"`);
  });

  it("voltar para a página 1 remove o parâmetro page da URL", () => {
    const html = render({ page: 2, query: { status: "open" } });
    expect(html).toContain(`href="${PATHNAME}?status=open"`);
  });

  it("com uma única página não renderiza navegação, mas mantém o total", () => {
    const html = render({ page: 1, totalPages: 1, total: 4 });
    expect(html).not.toContain("<nav");
    expect(html).toContain("4 chamado(s)");
  });
});
