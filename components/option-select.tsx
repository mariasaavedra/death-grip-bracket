'use client';

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Option {
  value: string;
  label: string;
  group?: string;
}

/** shadcn Select over a flat option list; options sharing a `group` are shown under one heading. */
export function OptionSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const groups = new Map<string | undefined, Option[]>();
  for (const o of options) groups.set(o.group, [...(groups.get(o.group) ?? []), o]);
  return (
    <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {[...groups].map(([group, items]) => {
          const rows = items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ));
          return group ? (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {rows}
            </SelectGroup>
          ) : (
            rows
          );
        })}
      </SelectContent>
    </Select>
  );
}
