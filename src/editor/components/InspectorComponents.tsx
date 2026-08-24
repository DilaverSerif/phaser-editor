import type { ReactNode } from "react";
import type { GameObjectNode } from "../model/types";
import {
  ARCADE_FIELDS,
  HIT_AREA_FIELDS,
  filterFields,
  type ComponentField,
  type PhaserFilter,
} from "../model/phaserComponents";

export function InspectorFold({
  title,
  open,
  onToggle,
  onRemove,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="u-comp">
      <div className="u-comp-head-row">
        <button type="button" className="u-comp-head" onClick={onToggle}>
          <span className="u-comp-caret">{open ? "▾" : "▸"}</span>
          <span className="u-comp-title">{title}</span>
        </button>
        {onRemove && (
          <button
            type="button"
            className="u-comp-remove"
            title="Component'i kaldir"
            onClick={onRemove}
          >
            ×
          </button>
        )}
      </div>
      {open && <div className="u-comp-body">{children}</div>}
    </section>
  );
}

function InspectorField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="u-row">
      <span className="u-label">{label}</span>
      <div className="u-value">{children}</div>
    </label>
  );
}

export function ComponentFields({
  fields,
  values,
  onChange,
}: {
  fields: ComponentField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <>
      {fields.map((field) => {
        const value = values[field.key];
        if (field.kind === "boolean") {
          return (
            <InspectorField key={field.key} label={field.label}>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(event) => onChange(field.key, event.target.checked)}
              />
            </InspectorField>
          );
        }
        if (field.kind === "select") {
          return (
            <InspectorField key={field.key} label={field.label}>
              <select
                value={value == null ? "" : String(value)}
                onChange={(event) => {
                  const raw = event.target.value;
                  const option = field.options?.find((item) => String(item.value) === raw);
                  onChange(field.key, option ? option.value : raw);
                }}
              >
                {field.options?.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </InspectorField>
          );
        }
        if (field.kind === "color") {
          const color = typeof value === "string" ? value : "#ffffff";
          return (
            <InspectorField key={field.key} label={field.label}>
              <input
                type="color"
                value={color}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            </InspectorField>
          );
        }
        if (field.kind === "number") {
          return (
            <InspectorField key={field.key} label={field.label}>
              <input
                type="number"
                step={field.step ?? "any"}
                value={Number(value) || 0}
                onChange={(event) => onChange(field.key, parseFloat(event.target.value) || 0)}
              />
            </InspectorField>
          );
        }
        return (
          <InspectorField key={field.key} label={field.label}>
            <input
              type="text"
              value={value == null ? "" : String(value)}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </InspectorField>
        );
      })}
    </>
  );
}

export function ArcadeSection({
  node,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  node: GameObjectNode;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<GameObjectNode>) => void;
  onRemove: () => void;
}) {
  return (
    <InspectorFold title="Arcade Physics" open={open} onToggle={onToggle} onRemove={onRemove}>
      <ComponentFields
        fields={ARCADE_FIELDS}
        values={node}
        onChange={(key, value) => onChange({ [key]: value })}
      />
    </InspectorFold>
  );
}

export function HitAreaSection({
  node,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  node: GameObjectNode;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<GameObjectNode>) => void;
  onRemove: () => void;
}) {
  return (
    <InspectorFold title="Hit Area" open={open} onToggle={onToggle} onRemove={onRemove}>
      <ComponentFields
        fields={HIT_AREA_FIELDS}
        values={node}
        onChange={(key, value) => onChange({ [key]: value })}
      />
    </InspectorFold>
  );
}

export function FilterSection({
  filter,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  filter: PhaserFilter;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  return (
    <InspectorFold
      title={`Filter: ${filter.type}`}
      open={open}
      onToggle={onToggle}
      onRemove={onRemove}
    >
      <ComponentFields
        fields={[
          {
            key: "list",
            label: "List",
            kind: "select",
            options: [
              { value: "external", label: "External" },
              { value: "internal", label: "Internal" },
            ],
          },
          ...filterFields(filter.type),
        ]}
        values={filter}
        onChange={(key, value) => onChange({ [key]: value })}
      />
    </InspectorFold>
  );
}
