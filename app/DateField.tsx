"use client";
import { useId, useState } from "react";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export function DateField({ name, label, defaultValue = "", max, required = false, readOnly = false }: { name: string; label: string; defaultValue?: string; max?: string; required?: boolean; readOnly?: boolean }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const parts = value.split("-");
  const year = parts[0] || "", month = parts[1] || "", day = parts[2] || "";
  const maximum = max ?? `${new Date().getFullYear() + 10}-12-31`;
  const [maxYear, maxMonth, maxDay] = maximum.split("-").map(Number);
  const monthLimit = Number(year) === maxYear ? maxMonth : 12;
  const calendarDays = year && month ? new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate() : 31;
  const dayLimit = Number(year) === maxYear && Number(month) === maxMonth ? Math.min(calendarDays, maxDay) : calendarDays;
  const complete = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  function change(part: number, next: string) {
    const updated = [year, month, day]; updated[part] = next;
    if (!updated[0]) { updated[1] = ""; updated[2] = ""; }
    const limit = Number(updated[0]) === maxYear ? maxMonth : 12;
    if (Number(updated[1]) > limit) updated[1] = String(limit).padStart(2,"0");
    if (updated[0] && updated[1]) {
      const allowed = Math.min(new Date(Date.UTC(Number(updated[0]), Number(updated[1]), 0)).getUTCDate(), Number(updated[0]) === maxYear && Number(updated[1]) === maxMonth ? maxDay : 31);
      if (Number(updated[2]) > allowed) updated[2] = String(allowed).padStart(2,"0");
    }
    setValue(updated.join("-"));
  }
  if (readOnly) return <label className="date-readonly">{label}<input readOnly aria-readonly="true" value={complete ? `${day}/${month}/${year}` : ""} /><input type="hidden" name={name} value={complete} /></label>;
  return <fieldset className="date-parts-field"><legend>{label}</legend><input type="hidden" name={name} value={complete} /><div>
    <label htmlFor={`${id}-year`}>Año<select id={`${id}-year`} value={year} required={required} onChange={event => change(0,event.target.value)}><option value="">Año</option>{Array.from({length:maxYear-1899},(_,index)=>maxYear-index).map(item=><option key={item} value={item}>{item}</option>)}</select></label>
    <label htmlFor={`${id}-month`}>Mes<select id={`${id}-month`} value={month} required={required} disabled={!year} onChange={event => change(1,event.target.value)}><option value="">Mes</option>{MONTHS.slice(0,monthLimit).map((item,index)=><option key={item} value={String(index+1).padStart(2,"0")}>{item}</option>)}</select></label>
    <label htmlFor={`${id}-day`}>Día<select id={`${id}-day`} value={day} required={required} disabled={!year || !month} onChange={event => change(2,event.target.value)}><option value="">Día</option>{Array.from({length:dayLimit},(_,index)=>index+1).map(item=><option key={item} value={String(item).padStart(2,"0")}>{item}</option>)}</select></label>
  </div></fieldset>;
}
