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

function Gauge({ value, max, label, color, description, theme }: {
  value: number; max: number; label: string; color: string; description: string; theme: any;
}) {
  const W = 160, H = 90;
  const cx = W / 2, cy = H - 10, r = 60;

  function arcPoint(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arc(startDeg: number, endDeg: number) {
    const s = arcPoint(startDeg);
    const e = arcPoint(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  // Halvsirkel fra 180° (venstre) til 0° (høyre)
  // Rød: 180→120, Gul: 120→60, Grønn: 60→0
  const clamped = Math.max(0, Math.min(max, value));
  const normalized = clamped / max; // 0 til 1
  const needleDeg = 180 - normalized * 180; // 180=venstre, 0=høyre
  const needle = arcPoint(needleDeg);

  return (
    <div style={{ flex: 1, textAlign: "center", padding: "0 8px" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={arc(180, 120)} fill="none" stroke="#dc2626" strokeWidth="14" strokeLinecap="butt" />
        <path d={arc(120, 60)}  fill="none" stroke="#d97706" strokeWidth="14" strokeLinecap="butt" />
        <path d={arc(60, 0)}    fill="none" stroke="#059669" strokeWidth="14" strokeLinecap="butt" />
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
      </svg>
      <div style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{pct(value)}</div>
      <div style={{ fontSize: 13, color, fontWeight: 600, marginTop: 2 }}>{description}</div>
    </div>
  );
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
    setRegnskap([]); setRoller([]); setStiftelsesdato(""); setLoading(true);

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
          const parsed: RegnskapAar[] = items.map((r: any) => ({
            aar: (r.regnskapsperiode?.fraDato ?? "").slice(0, 4),
            inntekter: r.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter ?? 0,
            driftsresultat: r.resultatregnskapResultat?.driftsresultat?.driftsresultat ?? 0,
            aarsresultat: r.resultatregnskapResultat?.aarsresultat ?? 0,
            sumEiendeler: r.eiendeler?.sumEiendeler ?? 0,
            sumEgenkapital: r.egenkapitalGjeld?.egenkapital?.sumEgenkapital ?? 0,
            omlopsmidler: r.eiendeler?.omlopsmidler?.sumOmlopsmidler ?? 0,
            kortsiktigGjeld: r.egenkapitalGjeld?.gjeldOversikt?.kortsiktigGjeld?.sumKortsiktigGjeld ?? 0,
            avskrivninger: r.resultatregnskapResultat?.driftsresultat?.driftsresultatFoerAvskrivninger?.avskrivninger ?? 0,
          })).filter(r => r.aar).sort((a, b) => a.aar.localeCompare(b.aar)).slice(-5);
          setRegnskap(parsed);
        }

        if (rolleRes.ok) {
          const data = await rolleRes.json();
          const ledere: string[] = [];
          for (const g of data.rollegrupper ?? []) {
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
  const lPct = siste?.inntekter ? (siste.driftsresultat / siste.inntekter) * 100 : 0;
  const sPct = siste?.sumEiendeler ? (siste.sumEgenkapital / siste.sumEiendeler) * 100 : 0;
  const liPct = siste?.kortsiktigGjeld ? (siste.omlopsmidler / siste.kortsiktigGjeld) * 100 : 0;

  const lL = lonnsomhetLabel(lPct);
  const sL = soliditetLabel(sPct);
  const liL = likviditetLabel(liPct);

  const grafData = regnskap.map(r => ({
    aar: r.aar,
    Inntekter: Math.round(r.inntekter / 1000),
    Driftsresultat: Math.round(r.driftsresultat / 1000),
  }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
      <div style={{
        position: "relative", zIndex: 10, backgroundColor: theme.card, border: `1px solid ${theme.border}`,
        borderRadius: 20, padding: 32, width: "100%", maxWidth: 900, maxHeight: "92vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: theme.textMuted }}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{enhet.navn}</h2>
            <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.orgnr} · {enhet.form} · {enhet.kategori}</p>
            <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.adresse}, {enhet.postnummer} {enhet.poststed}</p>
          </div>
          {siste && (
            <div style={{ backgroundColor: lL.color + "22", border: `1px solid ${lL.color}`, borderRadius: 20, padding: "8px 16px", fontSize: 14, fontWeight: 600, color: lL.color }}>
              {lL.label} lønnsomhet
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Etablert", val: stiftelsesdato ? stiftelsesdato.slice(0, 4) : "—" },
            { label: "Ansatte", val: enhet.ansatte !== "" ? String(enhet.ansatte) : "—" },
            { label: "Daglig leder", val: roller[0] ?? "—" },
            { label: "Fylke", val: enhet.fylke || "—" },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: theme.bg, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>{m.val}</div>
            </div>
          ))}
        </div>

        {loading && <p style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", padding: "32px 0" }}>Henter regnskapstall...</p>}

        {!loading && siste && (
          <>
            {/* Regnskap scorecards */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Regnskap {siste.aar}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Driftsinntekter", val: fmt(siste.inntekter) },
                  { label: "Driftsresultat", val: fmt(siste.driftsresultat) },
                  { label: "EBITDA", val: fmt(ebitda) },
                  { label: "Årsresultat", val: fmt(siste.aarsresultat) },
                ].map(m => (
                  <div key={m.label} style={{ backgroundColor: theme.bg, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Graf — full bredde */}
            {grafData.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Utvikling (1 000 kr)
                </p>
                <div style={{ backgroundColor: theme.bg, borderRadius: 12, padding: "16px 8px 8px" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={grafData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                      <XAxis dataKey="aar" tick={{ fontSize: 12, fill: theme.textMuted }} />
                      <YAxis tick={{ fontSize: 11, fill: theme.textMuted }} width={65} />
                      <Tooltip contentStyle={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, color: theme.text }} />
                      <Line type="monotone" dataKey="Inntekter" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: "#059669" }} />
                      <Line type="monotone" dataKey="Driftsresultat" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Nøkkeltall — full bredde */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Nøkkeltall
              </p>
              <div style={{ backgroundColor: theme.bg, borderRadius: 12, padding: "20px 16px", display: "flex", justifyContent: "space-around" }}>
                <Gauge value={lPct} max={40} label="Lønnsomhet" color={lL.color} description={lL.label} theme={theme} />
                <div style={{ width: 1, backgroundColor: theme.border }} />
                <Gauge value={sPct} max={60} label="Soliditet" color={sL.color} description={sL.label} theme={theme} />
                <div style={{ width: 1, backgroundColor: theme.border }} />
                <Gauge value={liPct} max={300} label="Likviditet" color={liL.color} description={liL.label} theme={theme} />
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
