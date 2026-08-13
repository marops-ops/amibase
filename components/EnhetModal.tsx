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

function gauge(val: number, label: string, color: string, theme: any) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{pct(val)}</div>
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
  const lonnsomhet = siste?.inntekter ? (siste.driftsresultat / siste.inntekter) * 100 : 0;
  const soliditet = siste?.sumEiendeler ? (siste.sumEgenkapital / siste.sumEiendeler) * 100 : 0;
  const likviditet = siste?.kortsiktigGjeld ? (siste.omlopsmidler / siste.kortsiktigGjeld) * 100 : 0;

  const lonnsomhetFarge = lonnsomhet > 10 ? "#059669" : lonnsomhet >= 0 ? "#d97706" : "#dc2626";
  const soliditetFarge = soliditet > 30 ? "#059669" : soliditet >= 15 ? "#d97706" : "#dc2626";
  const likviditetFarge = likviditet > 150 ? "#059669" : likviditet >= 100 ? "#d97706" : "#dc2626";

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
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textMuted }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{enhet.navn}</h2>
          <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.orgnr} · {enhet.form} · {enhet.kategori}</p>
          <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.adresse}, {enhet.postnummer} {enhet.poststed}</p>
        </div>

        {/* Nøkkelinfo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Etablert", val: stiftelsesdato ? stiftelsesdato.slice(0, 4) : "—" },
            { label: "Ansatte", val: enhet.ansatte !== "" ? String(enhet.ansatte) : "—" },
            { label: "Daglig leder", val: roller[0] ?? "—" },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: theme.bg, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{m.val}</div>
            </div>
          ))}
        </div>

        {loading && <p style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", padding: "24px 0" }}>Henter regnskapstall...</p>}

        {!loading && siste && (
          <>
            {/* Siste år nøkkeltall */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Regnskap {siste.aar}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Driftsinntekter", val: fmt(siste.inntekter) },
                  { label: "Driftsresultat", val: fmt(siste.driftsresultat) },
                  { label: "EBITDA", val: fmt(ebitda) },
                  { label: "Årsresultat", val: fmt(siste.aarsresultat) },
                ].map(m => (
                  <div key={m.label} style={{ backgroundColor: theme.bg, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nøkkeltall */}
            <div style={{ backgroundColor: theme.bg, borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", gap: 16 }}>
              {gauge(lonnsomhet, "Lønnsomhet", lonnsomhetFarge, theme)}
              <div style={{ width: 1, backgroundColor: theme.border }} />
              {gauge(soliditet, "Soliditet", soliditetFarge, theme)}
              <div style={{ width: 1, backgroundColor: theme.border }} />
              {gauge(likviditet, "Likviditet", likviditetFarge, theme)}
            </div>

            {/* Graf */}
            {grafData.length > 1 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Utvikling (beløp i 1000 kr)
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={grafData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis dataKey="aar" tick={{ fontSize: 11, fill: theme.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: theme.textMuted }} width={60} />
                    <Tooltip
                      contentStyle={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: theme.text }}
                    />
                    <Line type="monotone" dataKey="Inntekter" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Driftsresultat" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {!loading && !siste && (
          <p style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", padding: "24px 0" }}>Ingen regnskapstall tilgjengelig</p>
        )}
      </div>
    </div>
  );
}
