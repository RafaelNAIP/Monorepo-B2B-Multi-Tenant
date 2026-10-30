import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatBubble } from "@/components/thread/chat-bubble";
import type { Message } from "@/lib/messages/types";

const base: Message = {
  id: "m1",
  ticketId: "tk1",
  tenantId: "t1",
  senderRole: "client",
  senderName: "Maria",
  content: "Segue o print do erro",
  createdAt: "2026-10-30T12:00:00.000Z",
};

const image = { id: "a1", fileName: "erro.png", fileKey: "t1/tk1/a.png", fileSize: 2048, mimeType: "image/png" };
const pdf = { id: "a2", fileName: "nota fiscal.pdf", fileKey: "t1/tk1/b.pdf", fileSize: 1536, mimeType: "application/pdf" };

const render = (message: Message, threadToken?: string) =>
  renderToStaticMarkup(createElement(ChatBubble, { message, isOwnMessage: false, threadToken }));

describe("ChatBubble — anexos", () => {
  it("não renderiza área de anexos quando a mensagem não tem anexos", () => {
    const html = render(base);
    expect(html).not.toContain("/api/upload/download");
    expect(html).not.toContain('data-testid="message-attachments"');
  });

  it("renderiza imagem com miniatura apontando para a rota de download", () => {
    const html = render({ ...base, attachments: [image] });
    expect(html).toContain('src="/api/upload/download/t1/tk1/a.png"');
    expect(html).toContain('alt="erro.png"');
  });

  it("renderiza a imagem dentro de um link que abre em nova aba com rel seguro", () => {
    const html = render({ ...base, attachments: [image] });
    expect(html).toMatch(/<a [^>]*href="\/api\/upload\/download\/t1\/tk1\/a\.png"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  });

  it("renderiza documento como link com nome e tamanho, sem <img>", () => {
    const html = render({ ...base, attachments: [pdf] });
    expect(html).toContain("nota fiscal.pdf");
    expect(html).toContain("1,5 KB");
    expect(html).toContain('href="/api/upload/download/t1/tk1/b.pdf"');
    expect(html).not.toContain("<img");
  });

  it("inclui o token da thread nos links quando informado (cliente sem sessão)", () => {
    const html = render({ ...base, attachments: [image, pdf] }, "tok123");
    expect(html).toContain('src="/api/upload/download/t1/tk1/a.png?token=tok123"');
    expect(html).toContain('href="/api/upload/download/t1/tk1/b.pdf?token=tok123"');
  });

  it("escapa nomes de arquivo com HTML", () => {
    const html = render({ ...base, attachments: [{ ...pdf, fileName: '<script>alert(1)</script>.pdf' }] });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
