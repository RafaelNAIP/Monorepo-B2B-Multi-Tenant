import type { ZodError } from "zod";

/**
 * Estado retornado pelas Server Actions que validam formulários com Zod
 * e são consumidas via `useActionState`.
 *
 * Este arquivo NÃO é "use server": arquivos "use server" só podem exportar
 * funções assíncronas, então o tipo e o estado inicial ficam aqui.
 */
export interface ActionState {
  success: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]>;
}

export const INITIAL_ACTION_STATE: ActionState = {
  success: false,
  error: null,
  fieldErrors: {},
};

/** Estado de falha para erros de validação Zod de um formulário. */
export function validationErrorState(error: ZodError): ActionState {
  return {
    success: false,
    error: "Verifique os campos e tente novamente.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}
