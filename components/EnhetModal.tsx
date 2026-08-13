"use client";
import { useEffect, useState } from "react";
import { Enhet } from "@/lib/types";

interface Regnskap {
  aar: number;
  sumDriftsinntekter?: number;
  driftsresultat?: number;
  aarsresultat?: number;
  sumEiendeler?: number;
}

interface Props {
  enhet: Enhet | null;
  onClose: () => void;
}

function lonnsomhet(r: Regnskap): { label: string; color: string } {
  if (!r.sumDriftsinntekter || r.sumDriftsinntekter === 0) return { label: "Ingen data", color: "text-gray-400" };
  const margin = (r.driftsresultat ?? 0) / r.sumDriftsinntekter;
  if (margin > 0.1) return { label: "God lønnsomhet", color: "text-emerald-600" };
  if (margin >= 0) return { label: "Ok lønnsomhet", color: "text-amber-500" };
  return { label: "Lav lønnsomhet", color: "text-red-500" };
}

function fmt(n?: number) {
  if (n == null) return "—";
  return (n / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 0 }) + " k";
}

export default function EnhetModal({ enhet, onClose }: Props) {
  const [regnskap, setRegnskap] = useState<Regnskap[]>([]);
  const [roller, setRoller] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enhet) return;
    setRegnskap([]);
    setRoller([]);
    setLoading(true);

    async function hent() {
      try {
        const [regRes, rolleRes] = await Promise.all([
          fetch(`/api/regnskap/${enhet!.orgnr}`),
          fetch(`/api/roller/${enhet!.orgnr}`),
        ]);

        if (regRes.ok) {
          const data = await regRes.json();
          const items = Array.isArray(data) ? data : [data];
          const parsed: Regnskap[] = items.map((r: any) => ({
            aar: r.regnskapsperiode?.fraDato?.slice(0, 4),
            sumDriftsinntekter: r.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter,
            driftsresultat: r.resultatregnskapResultat?.driftsresultat?.driftsresultat,
            aarsresultat: r.resultatregnskapResultat?.aarsresultat,
            sumEiendeler: r.eiendeler?.sumEiendeler,
          })).sort((a: Regnskap, b: Regnskap) => b.aar - a.aar).slice(0, 3);
          setRegnskap(parsed);
        }

        if (rolleRes.ok) {
          const data = await rolleRes.json();
          const grupper = data.rollegrupper ?? [];
          const dagligLedere: string[] = [];
          for (const g of grupper) {
            for (const r of g.roller ?? []) {
              if (r.type?.kode === "DAGL") {
                const p = r.person?.navn;
                if (p) dagligLedere.push(`${p.fornavn ?? ""} ${p.etternavn ?? ""}`.trim());
              }
            }
          }
          setRoller(dagligLedere);
        }
      } catch {}
      setLoading(false);
    }

    hent();
  }, [enhet]);

  if (!enhet) return null;

  const sisteRegnskap = regnskap[0];
  const lstat = sisteRegnskap ? lonnsomhet(sisteRegnskap) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, position: "relative", zIndex: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textMuted }}>✕</button>

        <div className="mb-4">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: theme.text, marginBottom: 4 }}>{enhet.navn}</h2>
          <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.orgnr} · {enhet.form} · {enhet.kategori}</p>
          <p style={{ fontSize: 13, color: theme.textMuted }}>{enhet.adresse}, {enhet.postnummer} {enhet.poststed}</p>
        </div>

        {roller.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: theme.bg }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Daglig leder</p>
            {roller.map((r, i) => <p key={i} style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{r}</p>)}
          </div>
        )}

        {loading && <p style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", padding: "16px 0" }}>Henter regnskapstall...</p>}

        {!loading && sisteRegnskap && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Regnskap {sisteRegnskap.aar}</p>
              {lstat && <span className={`text-sm font-medium ${lstat.color}`}>{lstat.label}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Driftsinntekter", val: fmt(sisteRegnskap.sumDriftsinntekter) },
                { label: "Driftsresultat", val: fmt(sisteRegnskap.driftsresultat) },
                { label: "Årsresultat", val: fmt(sisteRegnskap.aarsresultat) },
                { label: "Sum eiendeler", val: fmt(sisteRegnskap.sumEiendeler) },
              ].map((m) => (
                <div key={m.label} style={{ backgroundColor: theme.bg, borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 500, color: theme.text }}>{m.val}</p>
                </div>
              ))}
            </div>
            {regnskap.length > 1 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Historikk</p>
                <div className="space-y-1">
                  {regnskap.slice(1).map((r) => (
                    <div key={r.aar} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.aar}</span>
                      <span className="text-gray-700 dark:text-gray-300">Inntekter: {fmt(r.sumDriftsinntekter)}</span>
                      <span className={lonnsomhet(r).color}>{lonnsomhet(r).label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !sisteRegnskap && (
          <p style={{ fontSize: 14, color: theme.textMuted, textAlign: "center", padding: "16px 0" }}>Ingen regnskapstall tilgjengelig</p>
        )}
      </div>
    </div>
  );
}
