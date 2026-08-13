"use client";
import { useState } from "react";
import { BRANSJE_GRUPPER } from "@/lib/bransjer";
import {
  HardHat, ShoppingCart, UtensilsCrossed, Truck, Monitor,
  Megaphone, BarChart2, Users, HeartPulse, GraduationCap,
  Factory, Zap, Wheat, Scissors, Shield, Landmark, FlaskConical
} from "lucide-react";

const GRUPPE_IKONER: Record<string, React.ReactNode> = {
  "Bygg, eiendom & anlegg":         <HardHat size={16} />,
  "Handel & detaljhandel":           <ShoppingCart size={16} />,
  "Mat, drikke & overnatting":       <UtensilsCrossed size={16} />,
  "Transport & logistikk":           <Truck size={16} />,
  "Teknologi & digitale tjenester":  <Monitor size={16} />,
  "Markedsføring & kommunikasjon":   <Megaphone size={16} />,
  "Økonomi, regnskap & juss":        <BarChart2 size={16} />,
  "Konsulent & rådgivning":          <Users size={16} />,
  "Helse & omsorg":                  <HeartPulse size={16} />,
  "Utdanning & opplæring":           <GraduationCap size={16} />,
  "Industri & produksjon":           <Factory size={16} />,
  "Energi, miljø & ressurser":       <Zap size={16} />,
  "Primærnæring":                    <Wheat size={16} />,
  "Personlige tjenester & fritid":   <Scissors size={16} />,
  "Renhold, vakt & facility":        <Shield size={16} />,
  "Offentlig, ideell & org":         <Landmark size={16} />,
  "Forskning & utvikling":           <FlaskConical size={16} />,
};

interface Props {
  tilgjengelige: Set<string>;
  valgte: Set<string>;
  onChange: (valgte: Set<string>) => void;
  theme: {
    bg: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
  };
}

export default function BransjeFilter({ tilgjengelige, valgte, onChange, theme }: Props) {
  const [hoverGruppe, setHoverGruppe] = useState<string | null>(null);

  const aktiveGrupper = BRANSJE_GRUPPER.filter(g =>
    g.kategorier.some(k => tilgjengelige.has(k))
  );

  function toggleKategori(k: string) {
    const next = new Set(valgte);
    if (next.has(k)) next.delete(k); else next.add(k);
    onChange(next);
  }

  function toggleGruppe(gruppe: typeof BRANSJE_GRUPPER[0]) {
    const aktiveIGruppe = gruppe.kategorier.filter(k => tilgjengelige.has(k));
    const alleValgt = aktiveIGruppe.every(k => valgte.has(k));
    const next = new Set(valgte);
    for (const k of aktiveIGruppe) {
      if (alleValgt) next.delete(k); else next.add(k);
    }
    onChange(next);
  }

  function kunDenne(gruppe: typeof BRANSJE_GRUPPER[0]) {
    onChange(new Set(gruppe.kategorier.filter(k => tilgjengelige.has(k))));
  }

  function toggleAlle() {
    const alleValgt = [...tilgjengelige].every(k => valgte.has(k));
    if (alleValgt) onChange(new Set());
    else onChange(new Set([...tilgjengelige]));
  }

  const alleValgt = [...tilgjengelige].every(k => valgte.has(k));
  const antallValgt = [...tilgjengelige].filter(k => valgte.has(k)).length;

  return (
    <div style={{
      backgroundColor: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 14,
      padding: "20px 24px",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
          Bransjer{" "}
          <span style={{ color: theme.textMuted, fontWeight: 400, fontSize: 13 }}>
            ({antallValgt} av {tilgjengelige.size} valgt)
          </span>
        </span>
        <button onClick={toggleAlle} style={{
          fontSize: 13, color: "#059669", background: "none", border: "none",
          cursor: "pointer", fontWeight: 500,
        }}>
          {alleValgt ? "Fjern alle" : "Velg alle"}
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "24px 36px",
      }}>
        {aktiveGrupper.map(gruppe => {
          const aktiveKat = gruppe.kategorier.filter(k => tilgjengelige.has(k));
          if (!aktiveKat.length) return null;
          const alleIGruppeValgt = aktiveKat.every(k => valgte.has(k));
          const noenIGruppeValgt = aktiveKat.some(k => valgte.has(k));
          const erHover = hoverGruppe === gruppe.label;

          return (
            <div key={gruppe.label}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}
                onMouseEnter={() => setHoverGruppe(gruppe.label)}
                onMouseLeave={() => setHoverGruppe(null)}
              >
                <div onClick={() => toggleGruppe(gruppe)} style={{
                  width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${noenIGruppeValgt ? "#059669" : theme.border}`,
                  backgroundColor: alleIGruppeValgt ? "#059669" : noenIGruppeValgt ? "#d1fae5" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {alleIGruppeValgt && <span style={{ color: "white", fontSize: 9, lineHeight: 1 }}>✓</span>}
                  {noenIGruppeValgt && !alleIGruppeValgt && <span style={{ color: "#059669", fontSize: 9, lineHeight: 1 }}>–</span>}
                </div>
                <span style={{ color: theme.textMuted, display: "flex", alignItems: "center" }}>
                  {GRUPPE_IKONER[gruppe.label]}
                </span>
                <span onClick={() => toggleGruppe(gruppe)} style={{
                  fontSize: 12, fontWeight: 700, color: theme.text,
                  textTransform: "uppercase", letterSpacing: "0.05em", flex: 1,
                }}>
                  {gruppe.label}
                </span>
                {erHover && (
                  <button
                    onClick={e => { e.stopPropagation(); kunDenne(gruppe); }}
                    style={{
                      fontSize: 11, color: "#059669", background: "none", border: "none",
                      cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
                    }}
                  >
                    kun denne
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>
                {aktiveKat.map(k => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                    onClick={() => toggleKategori(k)}>
                    <div style={{
                      width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${valgte.has(k) ? "#059669" : theme.border}`,
                      backgroundColor: valgte.has(k) ? "#059669" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {valgte.has(k) && <span style={{ color: "white", fontSize: 8, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: valgte.has(k) ? theme.text : theme.textMuted, lineHeight: 1.4 }}>
                      {k}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
