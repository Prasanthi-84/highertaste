import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";

/* ─── Status → dot color ─────────────────────────────────────────────── */
const STATUS_DOT: Record<string, string> = {
  Confirmed: "#3b82f6",
  "In-Preparation": "#f59e0b",
  Ready: "#10b981",
  Draft: "#9ca3af",
};

/* ─── Types ───────────────────────────────────────────────────────────── */
interface Order {
  _id: string;
  eventDate: string;
  status: string;
}

interface MiniCalendarProps {
  selected: Date;
  onSelect: (date: Date) => void;
  orders?: Order[];
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ─── Styles (extracted for SSR-safe inline CSS) ──────────────────────── */
const styles = {
  /* card wrapper — consumer owns the card chrome, this just provides padding */
  root: {
    padding: 24,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,

  /* header row */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  } as React.CSSProperties,

  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    transition: "background 0.18s ease, color 0.18s ease",
    padding: 0,
    outline: "none",
  } as React.CSSProperties,

  monthLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.02em",
    userSelect: "none",
  } as React.CSSProperties,

  /* day-of-week row */
  weekdayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: 6,
    paddingBottom: 8,
  } as React.CSSProperties,

  weekdayCell: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: 500,
    color: "#9ca3af",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    userSelect: "none",
    lineHeight: 1,
  } as React.CSSProperties,

  /* date grid */
  dateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 2,
  } as React.CSSProperties,
} as const;

/* ─── MiniCalendar ────────────────────────────────────────────────────── */
export function MiniCalendar({ selected, onSelect, orders = [] }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(new Date(selected));
  const today = useMemo(() => new Date(), []);

  /* 6-week grid */
  const cells = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  /* date → dot colors (max 3 unique per day) */
  const dotsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const order of orders) {
      try {
        const d = parseISO(order.eventDate);
        const key = format(d, "yyyy-MM-dd");
        const clr = STATUS_DOT[order.status];
        if (clr && !map[key]?.includes(clr)) {
          map[key] = [...(map[key] || []), clr];
        }
      } catch { /* skip bad dates */ }
    }
    return map;
  }, [orders]);

  const goToPrev = useCallback(() => setViewMonth((m) => subMonths(m, 1)), []);
  const goToNext = useCallback(() => setViewMonth((m) => addMonths(m, 1)), []);

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <NavButton direction="prev" onClick={goToPrev} />
        <span style={styles.monthLabel}>{format(viewMonth, "MMMM yyyy")}</span>
        <NavButton direction="next" onClick={goToNext} />
      </div>

      {/* ── Weekday labels ── */}
      <div style={styles.weekdayGrid}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={styles.weekdayCell as React.CSSProperties}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Date grid ── */}
      <div style={styles.dateGrid}>
        {cells.map((day) => {
          const isThisMonth = isSameMonth(day, viewMonth);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selected);
          const dateKey = format(day, "yyyy-MM-dd");
          const dots = dotsByDate[dateKey] || [];

          return (
            <DayCell
              key={dateKey}
              day={day}
              isThisMonth={isThisMonth}
              isToday={isToday}
              isSelected={isSelected}
              dots={dots}
              onClick={() => onSelect(day)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─── NavButton (pill-hover icon button) ──────────────────────────────── */
function NavButton({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    ...styles.navBtn,
    background: hovered ? "#f3f4f6" : "transparent",
    color: hovered ? "#374151" : "#9ca3af",
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={direction === "prev" ? "Previous month" : "Next month"}
      style={style}
    >
      {direction === "prev" ? (
        <ChevronLeft size={15} strokeWidth={2.5} />
      ) : (
        <ChevronRight size={15} strokeWidth={2.5} />
      )}
    </button>
  );
}

/* ─── DayCell ─────────────────────────────────────────────────────────── */
interface DayCellProps {
  day: Date;
  isThisMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  dots: string[];
  onClick: () => void;
}

function DayCell({ day, isThisMonth, isToday, isSelected, dots, onClick }: DayCellProps) {
  const [hovered, setHovered] = useState(false);

  const label = format(day, "d");

  /* text color */
  const textColor = isToday
    ? "#ffffff"
    : isThisMonth
      ? "#111827"
      : "#d1d5db";

  /* background */
  const circleBg = isToday
    ? "#6B2A4E"
    : isSelected && !isToday
      ? "#f9f0f4"
      : hovered && isThisMonth
        ? "#f3f4f6"
        : "transparent";

  /* outer cell — square via aspect-ratio */
  const cellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: "1",
    cursor: "pointer",
    padding: 0,
    border: "none",
    background: "none",
    outline: "none",
    position: "relative",
    fontFamily: "inherit",
  };

  /* inner circle / pill */
  const circleSize = 34;
  const circleStyle: React.CSSProperties = {
    width: circleSize,
    height: circleSize,
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: circleBg,
    transition: "background 0.15s ease, transform 0.15s ease",
    transform: isToday && hovered ? "scale(1.08)" : "scale(1)",
    position: "relative",
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={format(day, "MMMM d, yyyy")}
      style={cellStyle}
    >
      <div style={circleStyle}>
        {/* Date number */}
        <span
          style={{
            fontSize: 13,
            fontWeight: isToday ? 700 : isThisMonth ? 500 : 400,
            color: textColor,
            lineHeight: 1,
            marginTop: dots.length > 0 ? -1 : 0,
            transition: "color 0.12s ease",
          }}
        >
          {label}
        </span>

        {/* Event dots — inside circle, below number */}
        {dots.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 3,
              height: 5,
            }}
          >
            {dots.slice(0, 3).map((color, i) => (
              <span
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: isToday ? "rgba(255,255,255,0.8)" : color,
                  flexShrink: 0,
                  transition: "background 0.12s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/* ─── Legend ───────────────────────────────────────────────────────────── */
export function CalendarLegend() {
  const items = [
    { color: "#3b82f6", label: "Confirmed" },
    { color: "#f59e0b", label: "In Preparation" },
    { color: "#10b981", label: "Ready for Dispatch" },
    { color: "#9ca3af", label: "Draft" },
  ];

  return (
    <div
      style={{
        borderTop: "1px solid #f1f5f9",
        padding: "14px 24px 18px",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 10,
          margin: "0 0 10px 0",
          lineHeight: 1,
        }}
      >
        Legend
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(({ color, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              lineHeight: 1,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: "#374151",
                fontWeight: 400,
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
