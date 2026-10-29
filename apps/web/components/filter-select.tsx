interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Texto lido por leitores de tela, ex.: "Filtrar por status" */
  ariaLabel: string;
  /** Valor da opção "sem filtro" (ex.: "todos") */
  allValue: string;
  /** Rótulo da opção "sem filtro" (ex.: "Todos os status") */
  allLabel: string;
  options: ReadonlyArray<readonly [value: string, label: string]>;
}

/**
 * Select de filtro das tabelas/listas: opção "todos" + opções específicas.
 */
export function FilterSelect({
  value,
  onChange,
  ariaLabel,
  allValue,
  allLabel,
  options,
}: FilterSelectProps) {
  return (
    <div className="w-full sm:w-48">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="flex h-10 w-full items-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
      >
        <option value={allValue}>{allLabel}</option>
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
