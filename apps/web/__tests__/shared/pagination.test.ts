import { describe, it, expect } from "vitest";

import {
  PAGE_SIZE,
  parsePage,
  totalPagesFor,
  clampPage,
  pageWindow,
} from "../../lib/shared/pagination";

describe("PAGE_SIZE", () => {
  it("é fixo em 10 itens por página", () => {
    expect(PAGE_SIZE).toBe(10);
  });
});

describe("parsePage", () => {
  it("usa a página 1 quando o parâmetro não existe", () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it("lê um número inteiro válido", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("usa a página 1 para zero", () => {
    expect(parsePage("0")).toBe(1);
  });

  it("usa a página 1 para número negativo", () => {
    expect(parsePage("-2")).toBe(1);
  });

  it("usa a página 1 para texto não numérico", () => {
    expect(parsePage("abc")).toBe(1);
  });

  it("usa a página 1 para número fracionário", () => {
    expect(parsePage("2.5")).toBe(1);
  });

  it("usa o primeiro valor quando o parâmetro se repete", () => {
    expect(parsePage(["4", "9"])).toBe(4);
  });
});

describe("totalPagesFor", () => {
  it("retorna 1 quando não há itens (a tela sempre tem uma página)", () => {
    expect(totalPagesFor(0, PAGE_SIZE)).toBe(1);
  });

  it("retorna 1 quando o total cabe exatamente em uma página", () => {
    expect(totalPagesFor(10, PAGE_SIZE)).toBe(1);
  });

  it("arredonda para cima quando sobra um item", () => {
    expect(totalPagesFor(11, PAGE_SIZE)).toBe(2);
  });

  it("calcula corretamente para múltiplas páginas", () => {
    expect(totalPagesFor(25, PAGE_SIZE)).toBe(3);
  });
});

describe("clampPage", () => {
  it("mantém a página quando está dentro do intervalo", () => {
    expect(clampPage(2, 3)).toBe(2);
  });

  it("leva para a última página quando a página pedida não existe", () => {
    expect(clampPage(9, 2)).toBe(2);
  });

  it("nunca retorna menos que 1", () => {
    expect(clampPage(0, 3)).toBe(1);
  });
});

describe("pageWindow", () => {
  it("a primeira página começa no item 0", () => {
    expect(pageWindow(1, PAGE_SIZE)).toEqual({ skip: 0, take: 10 });
  });

  it("a terceira página pula dois blocos de itens", () => {
    expect(pageWindow(3, PAGE_SIZE)).toEqual({ skip: 20, take: 10 });
  });
});
