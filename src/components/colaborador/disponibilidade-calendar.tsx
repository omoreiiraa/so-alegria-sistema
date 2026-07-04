"use client";

import { useState, useTransition } from "react";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { addAvailability, removeAvailability } from "@/actions/disponibilidade";
import { fromISODate, toISODateLocal } from "@/lib/utils/date";

export function DisponibilidadeCalendar({ initial }: { initial: string[] }) {
  const [dates, setDates] = useState<Date[]>(() => initial.map(fromISODate));
  const [, startTransition] = useTransition();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function handleDay(day: Date) {
    const iso = toISODateLocal(day);
    const marcado = dates.some((d) => toISODateLocal(d) === iso);

    // atualização otimista
    setDates((prev) =>
      marcado
        ? prev.filter((d) => toISODateLocal(d) !== iso)
        : [...prev, day],
    );

    startTransition(async () => {
      const res = marcado
        ? await removeAvailability(iso)
        : await addAvailability(iso);
      if (res?.error) {
        toast.error(res.error);
        setDates((prev) =>
          marcado ? [...prev, day] : prev.filter((d) => toISODateLocal(d) !== iso),
        );
      }
    });
  }

  return (
    <Calendar
      mode="multiple"
      selected={dates}
      onSelect={(_selected, day) => handleDay(day)}
      locale={ptBR}
      disabled={{ before: today }}
      showOutsideDays={false}
      className="mx-auto w-full rounded-xl border border-border bg-card"
    />
  );
}
