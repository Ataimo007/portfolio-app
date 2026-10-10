"use client";
import { useId, useState } from "react";
import type { DurationUnit } from "@/lib/consultation-duration";
export default function DurationFields({
  value,
  unit,
  onChange,
}: {
  value?: number;
  unit?: DurationUnit;
  onChange?: (value: number, unit: DurationUnit) => void;
}) {
  const id = useId();
  const [custom, setCustom] = useState(false);
  const [localValue, setLocalValue] = useState(30);
  const [localUnit, setLocalUnit] = useState<DurationUnit>("minutes");
  const amount = value ?? localValue,
    scale = unit ?? localUnit;
  const update = (next: number, nextUnit: DurationUnit) => {
    setLocalValue(next);
    setLocalUnit(nextUnit);
    onChange?.(next, nextUnit);
  };
  return (
    <fieldset className="consultation-duration">
      <legend>Duration</legend>
      <label htmlFor={id + "-preset"}>Preset</label>
      <select
        id={id + "-preset"}
        value={
          [
            [30, "minutes"],
            [1, "hours"],
            [2, "hours"],
            [1, "days"],
            [1, "weeks"],
            [1, "months"],
          ].some(([v, u]) => v === amount && u === scale) && !custom
            ? amount + ":" + scale
            : "custom"
        }
        onChange={(event) => {
          setCustom(event.target.value === "custom");
          if (event.target.value === "custom") return;
          const [v, u] = event.target.value.split(":");
          update(Number(v), u as DurationUnit);
        }}
      >
        <option value="30:minutes">30 minutes</option>
        <option value="1:hours">1 hour</option>
        <option value="2:hours">2 hours</option>
        <option value="1:days">1 day</option>
        <option value="1:weeks">1 week</option>
        <option value="1:months">1 month</option>
        <option value="custom">Custom duration</option>
      </select>
      <div className="duration-inputs">
        <div>
          <label htmlFor={id + "-amount"}>Amount</label>
          <input
            id={id + "-amount"}
            name="duration"
            type="number"
            min="1"
            max="525600"
            required
            value={amount}
            onChange={(event) => update(Number(event.target.value), scale)}
          />
        </div>
        <div>
          <label htmlFor={id + "-unit"}>Unit</label>
          <select
            id={id + "-unit"}
            name="durationUnit"
            value={scale}
            onChange={(event) =>
              update(amount, event.target.value as DurationUnit)
            }
          >
            {["minutes", "hours", "days", "weeks", "months"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
