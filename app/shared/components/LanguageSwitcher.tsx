import { useState, useRef, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { getLocale, setLocale, getAvailableLocales, type Locale } from "@shared/lib/i18n";

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Locale>(getLocale());
  const ref = useRef<HTMLDivElement>(null);

  const locales = getAvailableLocales();
  const currentLocale = locales.find((l) => l.code === current) ?? locales[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: Locale) => {
    setLocale(code);
    setCurrent(code);
    setOpen(false);
    window.location.reload();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          border: `1px solid rgba(255,255,255,0.12)`,
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.6)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: T.sans,
        }}
      >
        <span style={{ fontSize: 14 }}>{currentLocale.flag}</span>
        <span>{currentLocale.code.toUpperCase()}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: 4,
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            overflow: "hidden",
            zIndex: 100,
            minWidth: 140,
          }}
        >
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                border: "none",
                background: l.code === current ? "rgba(255,255,255,0.1)" : "transparent",
                color: l.code === current ? "#fff" : "rgba(255,255,255,0.6)",
                fontSize: 12.5,
                fontWeight: l.code === current ? 600 : 400,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              <span style={{ fontSize: 14 }}>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
