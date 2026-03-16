import type { ReactNode } from "react";

/**
 * Simplified form components for tests. Use when you need to isolate component behavior.
 *
 * @example
 * ```ts
 * vi.mock('@/components/form', () => ({
 *   ...createFormMocks(),
 * }));
 * ```
 */
export function createFormMocks(): Record<string, (props: Record<string, unknown>) => ReactNode> {
  return {
    TextField: (props: Record<string, unknown>) => (
      <div>
        <label>{String(props.label ?? "")}</label>
        <input
          data-testid={`field-${String(props.label ?? "").toLowerCase().replace(/\s/g, "-")}`}
          value={String(props.value ?? "")}
          onChange={(e) => (props.onChange as (v: string) => void)?.((e.target as HTMLInputElement).value)}
          onBlur={() => (props.onBlur as () => void)?.()}
        />
      </div>
    ),
    TextAreaField: (props: Record<string, unknown>) => (
      <div>
        <label>{String(props.label ?? "")}</label>
        <textarea
          data-testid="field-description"
          value={String(props.value ?? "")}
          onChange={(e) => (props.onChange as (v: string) => void)?.((e.target as HTMLTextAreaElement).value)}
          onBlur={() => (props.onBlur as () => void)?.()}
        />
      </div>
    ),
    SelectField: (props: Record<string, unknown>) => (
      <div>
        <label>{String(props.label ?? "")}</label>
        <select
          value={String(props.value ?? "")}
          onChange={(e) => (props.onChange as (v: string) => void)?.((e.target as HTMLSelectElement).value)}
          onBlur={() => (props.onBlur as () => void)?.()}
        >
          {(props.options as { value: string; label: string }[])?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ),
  };
}