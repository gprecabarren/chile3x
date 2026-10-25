"use client";
import { useId, useState } from "react";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
type DateFieldProps = {
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  readOnly?: boolean;
};

export function DateField({ name, label, defaultValue = "", value: controlledValue, onChange, min = "1900-01-01", max, required = false, readOnly = false }: DateFieldProps) {
  const id = useId();
  const [localValue, setLocalValue] = useState(defaultValue);
  const value = controlledValue ?? localValue;
  const [year = "", month = "", day = ""] = value.split("-");
  const maximum = max ?? `${new Date().getFullYear() + 10}-12-31`;
  const [minYear, minMonth, minDay] = min.split("-").map(Number);
  const [maxYear, maxMonth, maxDay] = maximum.split("-").map(Number);
  const yearInRange = Number(year) >= minYear && Number(year) <= maxYear;
  const firstMonth = Number(year) === minYear ? minMonth : 1;
  const lastMonth = Number(year) === maxYear ? maxMonth : 12;
  const monthInRange = yearInRange && Number(month) >= firstMonth && Number(month) <= lastMonth;
  const calendarDays = year && month ? new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate() : 31;
  const firstDay = Number(year) === minYear && Number(month) === minMonth ? minDay : 1;
  const lastDay = Number(year) === maxYear && Number(month) === maxMonth ? Math.min(calendarDays, maxDay) : calendarDays;
  const dayInRange = monthInRange && Number(day) >= firstDay && Number(day) <= lastDay;
  const complete = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

  function change(part: number, next: string) {
    const updated = [year, month, day];
    updated[part] = next;
    if (!updated[0]) { updated[1] = ""; updated[2] = ""; }
    if (!updated[1]) updated[2] = "";
    if (updated[0] && updated[1]) {
      const lowerMonth = Number(updated[0]) === minYear ? minMonth : 1;
      const upperMonth = Number(updated[0]) === maxYear ? maxMonth : 12;
      const nextMonth = Math.max(lowerMonth, Math.min(Number(updated[1]), upperMonth));
      updated[1] = String(nextMonth).padStart(2, "0");
      if (updated[2]) {
        const lowerDay = Number(updated[0]) === minYear && nextMonth === minMonth ? minDay : 1;
        const upperDay = Math.min(new Date(Date.UTC(Number(updated[0]), nextMonth, 0)).getUTCDate(), Number(updated[0]) === maxYear && nextMonth === maxMonth ? maxDay : 31);
        updated[2] = String(Math.max(lowerDay, Math.min(Number(updated[2]), upperDay))).padStart(2, "0");
      }
    }
    const nextValue = updated.join("-");
    setLocalValue(nextValue);
    onChange?.(nextValue);
  }

  if (readOnly) return <label className="date-readonly">{label}<input readOnly aria-readonly="true" value={complete ? `${day}/${month}/${year}` : ""} /><input type="hidden" name={name} value={complete} /></label>;
  return <fieldset className="date-parts-field"><legend>{label}</legend><input type="hidden" name={name} value={complete} /><div>
    <label htmlFor={`${id}-year`}>Año<select id={`${id}-year`} value={year} required={required} onChange={event => change(0, event.target.value)}><option value="">Año</option>{year && !yearInRange && <option value={year} disabled>{year}</option>}{Array.from({ length: Math.max(0, maxYear - minYear + 1) }, (_, index) => maxYear - index).map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <label htmlFor={`${id}-month`}>Mes<select id={`${id}-month`} value={month} required={required} disabled={!yearInRange} onChange={event => change(1, event.target.value)}><option value="">Mes</option>{month && !monthInRange && <option value={month} disabled>{MONTHS[Number(month) - 1]}</option>}{yearInRange && MONTHS.map((item, index) => ({ item, number: index + 1 })).filter(({ number }) => number >= firstMonth && number <= lastMonth).map(({ item, number }) => <option key={item} value={String(number).padStart(2, "0")}>{item}</option>)}</select></label>
    <label htmlFor={`${id}-day`}>Día<select id={`${id}-day`} value={day} required={required} disabled={!monthInRange} onChange={event => change(2, event.target.value)}><option value="">Día</option>{day && !dayInRange && <option value={day} disabled>{day}</option>}{monthInRange && Array.from({ length: Math.max(0, lastDay - firstDay + 1) }, (_, index) => firstDay + index).map(item => <option key={item} value={String(item).padStart(2, "0")}>{item}</option>)}</select></label>
  </div></fieldset>;
}
