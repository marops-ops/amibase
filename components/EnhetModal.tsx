"use client";
import { useEffect, useState } from "react";
import { Enhet } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface RegnskapAar {
  aar: string;
  inntekter: number;
  driftsresultat: number;
  aarsresultat: number;
  sumEiendeler: number;
  sumEgenkapital: number;
  omlopsmidler: number;
  kortsiktigGjeld: number;
  avskrivninger: number;
}

interface Props {
  enhet: Enhet | null;
  onClose: () => void;
  darkMode: boolean;
}

function fmt(n: number) {
  if (!n) return "—";
  if (Math.abs(n) >= 1000000) return (n / 1000000).toLocaleString("nb-NO", { maximumFractionDigits: 1 }) + " M";
  return (n / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 0 }) + " k";
}

function pct(n: number) {
  return n.toLocaleString("nb-NO", { maximumFractionDigits: 1 }) + " %";
}

function GaugeMeter({ value, label, color, description, theme }: {
  value: number; label: string; color: string; description: string; theme: any;
}) {
  // Clamp value mellom -100 og 100 for visning
  const clamped = Math.max(-50, Math.min(150, value));
  const normalized = (clamped + 50) / 200; // 0 til 1
  const angle = -90 + normalized * 180; // -90 til 90 grader

  const cx = 60, cy = 55, r = 45;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x = cx + r * Math.cos(toRad(angle));
  const y = cy + r * Math.sin(toRad(angle));

  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <svg width="120" height="65" viewBox="0 0 120 65">
        {/* Bakgrunn rødt til grønt */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#dc2626" strokeWidth="10" strokeDasharray="30 200" strokeDashoffset="-0" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#d97706" strokeWidth="10" strokeDasharray="40 200" strokeDashoffset="-30" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#059669" strokeWidth="10" strokeDasharray="70 200" strokeDashoffset="-70" />
        {/* Pil */}
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} />
      </svg>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: -8 }}>{pct(value)}</div>
      <div style={{ fontSize: 12, color, fontWeight: 500, marginTop: 2 }}>{description}</div>
    </div>
  );
}

function lonnsomhetLabel(pct: number) {
  if (pct > 20) return { label: "Meget god", color: "#059669" };
  if (pct > 10) return { label: "God", color: "#059669" };
  if (pct > 0) return { label: "Ok", color: "#d97706" };
  return { label: "Lav", color: "#dc2626" };
}

function soliditetLabel(pct: number) {
  if (pct > 40) return { label: "Meget god", color: "#059669" };
  if (pct > 25) return { label: "God", color: "#059669" };
  if (pct > 10) return { label: "Tilfredsstillende", color: "#d97706" };
  return { label: "Svak", color: "#dc2626" };
}

function likviditetLabel(ratio: number) {
  if (ratio > 200) return { label: "Meget god", color: "#059669" };
  if (ratio > 150) return { label: "God", color: "#059669" };
  if (ratio > 100) return { label: "Tilfredsstillende", color: "#d97706" };
  return { label: "Svak", color: "#dc2626" };
}

export default function EnhetModal({ enhet, onClose, darkMode }: Props) {
  const theme = darkMode
    ? { bg: "#0a0a0a", card: "#111111", border: "#1f2937", text: "#f3f4f6", textMuted: "#9ca3af" }
    : { bg: "#F1EFE9", card: "#E8E6DF", border: "#C6C6B7", text: "#31353d", textMuted: "#6b7280" };

  const [regnskap, setRegnskap] = useState<RegnskapAar[]>([]);
  const [roller, setRoller] = useState<string[]>([]);
  const [stiftelsesdato, setStiftelsesdato] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enhet) return;
    setRegnskap([]);
    setRoller([]);
    setStiftelsesdato("");
    setLoading(true);

    async function hent() {
      try {
        const [regRes, rolleRes, enhetRes] = await Promise.all([
          fetch(`/api/regnskap/${enhet!.orgnr}`),
          fetch(`/api/roller/${enhet!.orgnr}`),
          fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${enhet!.orgnr}`),
        ]);

        if (regRes.ok) {
          const data = await regRes.json();
          const items = Array.isArray(data) ? data : [data];
          const parsed: RegnskapAar[] = items
            .map((r: any) => ({
              aar: (r.regnskapsperiode?.fraDato ?? "").slice(0, 4),
              inntekter: r.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter ?? 0,
              driftsresultat: r.resultatregnskapResultat?.driftsresultat?.driftsresultat ?? 0,
              aarsresultat: r.resultatregnskapResultat?.aarsresultat ?? 0,
              sumEiendeler: r.eiendeler?.sumEiendeler ?? 0,
              sumEgenkapital: r.egenkapitalGjeld?.egenkapital?.sumEgenkapital ?? 0,
              omlopsmidler: r.eiendeler?.omlopsmidler?.sumOmlopsmidler ?? 0,
              kortsiktigGjeld: r.egenkapitalGjeld?.gjeldOversikt?.kortsiktigGjeld?.sumKortsiktigGjeld ?? 0,
              avskrivninger: r.resultatregnskapResultat?.driftsresultat?.driftsresultatFoerAvskrivninger?.avskrivninger ?? 0,
            }))
            .filter(r => r.aar)
            .sort((a, b) => a.aar.localeCompare(b.aar))
            .slice(-5);
          setRegnskap(parsed);
        }

        if (rolleRes.ok) {
          const data = await rolleRes.json();
          const grupper = data.rollegrupper ?? [];
          const ledere: string[] = [];
          for (const g of grupper) {
            for (const r of g.roller ?? []) {
              if (r.type?.kode === "DAGL") {
                const p = r.person?.navn;
                if (p) ledere.push(`${p.fornavn ?? ""} ${p.etternavn ?? ""}`.trim());
              }
            }
          }
          setRoller(ledere);
        }

        if (enhetRes.ok) {
          const data = await enhetRes.json();
          setStiftelsesdato(data.stiftelsesdato ?? "");
        }
      } catch {}
      setLoading(false);
    }

    hent();
  }, [enhet]);

  if (!enhet) return null;

  const siste = regnskap[regnskap.length - 1];
  const ebitda = siste ? siste.driftsresultat + siste.avskrivninger : 0;
  const lonnsomhetPct = siste?.inntekter ? (siste.driftsresultat / siste.inntekter) * 100 : 0;
  const soliditetPct = siste?.sumEiendeler ? (siste.sumEgenkapital / siste.sumEiendeler) * 100 : 0;
  const likviditetPct = siste?.kortsiktigGjeld ? (siste.omlopsmidler / siste.kortsiktigGjeld) * 100 : 0;

  const lLabel = lonnsomhetLabel(lonnsomhetPct);
  const sLabel = soliditetLabel(soliditetPct);
  const liLabel = likviditetLabel(likviditetPct);

  const grafData = regnskap.map(r => ({
    aar: r.aar,
    Inntekter: Math.round(r.inntekter / 1000),
    Driftsresultat: Math.round(r.driftsresultat / 1000),
  }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />
      <div style={{
        position: "relative", zIndex: 10, backgroundColor: theme.card, border: `1px solid ${theme.border}`,
        borderRadius: 20, padding: 32, width: "100%", maxWidth: 860,
        maxHeight: "92vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: theme.textMuted }}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{enhet.navn}</h2>
            <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.orgnr} · {enhet.form} · {enhet.kategori}</p>
            <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.adresse}, {enhet.postnummer} {enhet.poststed}</p>
          </div>
          {siste && (
            <div style={{ backgroundColor: lLabel.color + "22", border: `1px solid ${lLabel.color}`, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: lLabel.color, whiteSpace: "nowrap" }}>
              {lLabel.label} lønnsomhet
            </div>
          )}
        </div>

        {/* Nøkkelinfo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Etablert", val: stiftelsesdato ? stiftelsesdato.slice(0, 4) : "—" },
            { label: "Ansatte", val: enhet.ansatte !== "" ? String(enhet.ansatte) : "—" },
            { label: "Daglig leder", val: roller[0] ?? "—" },
            { label: "Fylke", val: enhet.fylke || "—" },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: theme.bg, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{m.val}</div>
            </div>
          ))}
        </div>

        {loading && <p style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", padding: "32px 0" }}>Henter regnskapstall...</p>}

        {!loading && siste && (
          <>
            {/* Regnskap */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Regnskap {siste.aar} — beløp i NOK
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Driftsinntekter", val: fmt(siste.inntekter) },
                  { label: "Driftsresultat", val: fmt(siste.driftsresultat) },
                  { label: "EBITDA", val: fmt(ebitda) },
                  { label: "Årsresultat", val: fmt(siste.aarsresultat) },
                ].map(m => (
                  <div key={m.label} style={{ backgroundColor: theme.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Graf + Nøkkeltall side om side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
              {/* Graf */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Utvikling (1 000 kr)
                </p>
                <div style={{ backgroundColor: theme.bg, borderRadius: 12, padding: "16px 8px 8px" }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={grafData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                      <XAxis dataKey="aar" tick={{ fontSize: 11, fill: theme.textMuted }} />
                      <YAxis tick={{ fontSize: 10, fill: theme.textMuted }} width={55} />
                      <Tooltip contentStyle={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12, color: theme.text }} />
                      <Line type="monotone" dataKey="Inntekter" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, fill: "#059669" }} />
                      <Line type="monotone" dataKey="Driftsresultat" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Nøkkeltall */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Nøkkeltall
                </p>
                <div style={{ backgroundColor: theme.bg, borderRadius: 12, padding: "16px 8px", display: "flex", gap: 8, justifyContent: "space-around" }}>
                  <GaugeMeter value={lonnsomhetPct} label="Lønnsomhet" color={lLabel.color} description={lLabel.label} theme={theme} />
                  <div style={{ width: 1, backgroundColor: theme.border }} />
                  <GaugeMeter value={soliditetPct} label="Soliditet" color={sLabel.color} description={sLabel.label} theme={theme} />
                  <div style={{ width: 1, backgroundColor: theme.border }} />
                  <GaugeMeter value={likviditetPct} label="Likviditet" color={liLabel.color} description={liLabel.label} theme={theme} />
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && !siste && (
          <p style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", padding: "32px 0" }}>Ingen regnskapstall tilgjengelig</p>
        )}
      </div>
    </div>
  );
}
