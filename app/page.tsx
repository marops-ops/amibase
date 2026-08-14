"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { SEGMENTS, FYLKER } from "@/lib/segments";
import { toCSV, toLinkedInCSV, downloadCSV } from "@/lib/fetcher";
import { Enhet, SegmentKey } from "@/lib/types";
import EnhetModal from "@/components/EnhetModal";
import RegionList from "@/components/RegionList";
import BransjeFilter from "@/components/BransjeFilter";
import { BRANSJE_GRUPPER } from "@/lib/bransjer";

type LoadState = "idle" | "loading" | "done" | "error";

interface SegmentCount {
  antall: number;
  state: LoadState;
}

const LIGHT = { bg: "#F1EFE9", card: "#E8E6DF", border: "#C6C6B7", text: "#31353d", textMuted: "#6b7280" };
const DARK  = { bg: "#0a0a0a", card: "#111111", border: "#1f2937", text: "#f3f4f6", textMuted: "#9ca3af" };

const LONNSOMHET_OPTIONS = [
  { key: "god", label: "God", color: "#059669" },
  { key: "ok",  label: "Ok",  color: "#d97706" },
  { key: "lav", label: "Lav", color: "#dc2626" },
];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? DARK : LIGHT;

  const [counts, setCounts] = useState<Record<SegmentKey, SegmentCount>>({
    ENK:  { antall: 0, state: "idle" },
    SMB:  { antall: 0, state: "idle" },
    MID:  { antall: 0, state: "idle" },
    STOR: { antall: 0, state: "idle" },
  });

  const [aktiveSegmenter, setAktiveSegmenter] = useState<Set<SegmentKey>>(new Set(["SMB", "MID", "STOR"]));
  const [search, setSearch] = useState("");
  const [fylkeFilter, setFylkeFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [lonnsomhetFilter, setLonnsomhetFilter] = useState<Set<string>>(new Set());
  const alleKategorier = new Set(BRANSJE_GRUPPER.flatMap(g => g.kategorier));
  const [valgteBransjer, setValgteBransjer] = useState<Set<string>>(alleKategorier);

  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [totalAntall, setTotalAntall] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [valgtEnhet, setValgtEnhet] = useState<Enhet | null>(null);


  const PAGE_SIZE = 100;

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  // Hent antall per segment
  useEffect(() => {
    for (const seg of SEGMENTS) {
      setCounts(prev => ({ ...prev, [seg.key]: { ...prev[seg.key], state: "loading" } }));
      fetch(`/api/data/${seg.key}?countOnly=true`)
        .then(r => r.json())
        .then(d => setCounts(prev => ({ ...prev, [seg.key]: { antall: d.antall ?? 0, state: "done" } })))
        .catch(() => setCounts(prev => ({ ...prev, [seg.key]: { ...prev[seg.key], state: "error" } })));
    }
  }, []);

  // Hent data ved filter-endring
  const hentData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const segmenter = [...aktiveSegmenter];
      const alleEnheter: Enhet[] = [];
      let totalt = 0;

      for (const seg of segmenter) {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(Math.ceil(PAGE_SIZE / segmenter.length)),
          ...(search && { search }),
          ...(fylkeFilter && { fylke: fylkeFilter }),
          ...(kategoriFilter && { kategori: kategoriFilter }),
        });

        if (lonnsomhetFilter.size > 0 && lonnsomhetFilter.size < 3) {
          params.set("lonnsomhet", [...lonnsomhetFilter].join(","));
        }

        const res = await fetch(`/api/data/${seg}?${params}`);
        const json = await res.json();
        alleEnheter.push(...(json.enheter ?? []));
        totalt += json.antall ?? 0;
      }

      setEnheter(alleEnheter);
      setTotalAntall(totalt);
    } catch {}
    setLoading(false);
  }, [aktiveSegmenter, search, fylkeFilter, kategoriFilter, lonnsomhetFilter]);

  useEffect(() => {
    setPage(0);
    hentData(0);
  }, [hentData]);

  function toggleSegment(key: SegmentKey) {
    setAktiveSegmenter(prev => {
      const next = new Set(prev);
      const keys = key === "STOR" ? ["STOR", "MID"] as SegmentKey[] : [key] as SegmentKey[];
      const alleAktive = keys.every(k => next.has(k));
      if (alleAktive) { if (next.size <= keys.length) return next; keys.forEach(k => next.delete(k)); }
      else keys.forEach(k => next.add(k));
      return next;
    });
  }

  async function exportAll() {
    const alle: Enhet[] = [];
    const segmenter = [...aktiveSegmenter];
    for (const seg of segmenter) {
      let p = 0;
      while (true) {
        const params = new URLSearchParams({
          page: String(p), pageSize: "1000",
          ...(search && { search }),
          ...(fylkeFilter && { fylke: fylkeFilter }),
          ...(kategoriFilter && { kategori: kategoriFilter }),
        });
        const res = await fetch(`/api/data/${seg}?${params}`);
        const json = await res.json();
        alle.push(...(json.enheter ?? []));
        if (p + 1 >= (json.totalPages ?? 1)) break;
        p++;
      }
    }
    const date = new Date().toISOString().slice(0,10).replace(/-/g,"");
    downloadCSV(toCSV(alle), `${date}_utvalg.csv`);
  }

  async function exportMeta() {
    const alle: Enhet[] = [];
    const segmenter = [...aktiveSegmenter];
    for (const seg of segmenter) {
      let p = 0;
      while (true) {
        const params = new URLSearchParams({ page: String(p), pageSize: "1000", ...(fylkeFilter && { fylke: fylkeFilter }) });
        const res = await fetch(`/api/data/${seg}?${params}`);
        const json = await res.json();
        alle.push(...(json.enheter ?? []));
        if (p + 1 >= (json.totalPages ?? 1)) break;
        p++;
      }
    }
    const date = new Date().toISOString().slice(0,10).replace(/-/g,"");
    downloadCSV(toCSV(alle, true), `${date}_utvalg_meta.csv`);
  }

  const totalCount = Object.values(counts).reduce((s, c) => s + c.antall, 0);
  const allFylker = useMemo(() => [...new Set(Object.values(FYLKER))].sort(), []);

  const s = {
    card: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "1rem" },
    input: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 12px", color: theme.text, fontSize: 14, outline: "none" },
    btnGray: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 12px", color: theme.text, fontSize: 14, cursor: "pointer" },
    th: { backgroundColor: theme.bg, color: theme.textMuted, fontSize: 11, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.05em", padding: "10px 16px", textAlign: "left" as const, position: "sticky" as const, top: 0 },
    td: { padding: "10px 16px", color: theme.text, fontSize: 14, borderTop: `1px solid ${theme.border}` },
  };

  const totalPages = Math.ceil(totalAntall / PAGE_SIZE);
  const date = new Date().toISOString().slice(0,10).replace(/-/g,"");

  return (
    <main style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh" }}>
      <div style={{ padding: "32px 10%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={darkMode ? "/logo_dark.png" : "/logo_light.png"} alt="AmiBase" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.text }}>AmiBase</div>
              <div style={{ fontSize: 13, color: theme.textMuted }}>Bedriftstargeting gjort enkelt</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ ...s.btnGray, width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Scorecards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          <div style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>Totalt</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>{totalCount.toLocaleString("nb-NO")}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>aktive enheter</div>
          </div>
          <div onClick={() => toggleSegment("ENK")} style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", border: aktiveSegmenter.has("ENK") ? "2px solid #059669" : `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ef9f27" }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>Enkeltmannsforetak</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>{counts.ENK.antall.toLocaleString("nb-NO")}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>ENK</div>
          </div>
          <div onClick={() => toggleSegment("SMB")} style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", border: aktiveSegmenter.has("SMB") ? "2px solid #059669" : `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#1d9e75" }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>Mellomstore bedrifter</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>{counts.SMB.antall.toLocaleString("nb-NO")}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>AS/ANS — 1–49 ansatte</div>
          </div>
          <div onClick={() => toggleSegment("STOR")} style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", border: (aktiveSegmenter.has("STOR") || aktiveSegmenter.has("MID")) ? "2px solid #059669" : `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#7f77dd" }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>Store bedrifter</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>{(counts.MID.antall + counts.STOR.antall).toLocaleString("nb-NO")}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>AS/ANS — 50–200+ ansatte</div>
          </div>
        </div>

        {/* Bransjefilter */}
        <BransjeFilter
          tilgjengelige={new Set(BRANSJE_GRUPPER.flatMap(g => g.kategorier))}
          valgte={valgteBransjer}
          onChange={next => {
            setValgteBransjer(next);
            // Ikke sett kategoriFilter direkte — bransjefilter håndterer det
          }}
          theme={theme}
        />

        {/* Søk + filter + eksport */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>⌕</span>
            <input type="text" placeholder="Søk navn, poststed, postnr..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...s.input, width: "100%", paddingLeft: 32 }} />
          </div>
          <select value={fylkeFilter} onChange={e => setFylkeFilter(e.target.value)} style={s.input}>
            <option value="">Alle fylker</option>
            {allFylker.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {LONNSOMHET_OPTIONS.map(l => (
            <label key={l.key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: l.color, fontWeight: 500 }}>
              <input type="checkbox" checked={lonnsomhetFilter.size === 0 || lonnsomhetFilter.has(l.key)}
                onChange={() => {
                  setLonnsomhetFilter(prev => {
                    const next = new Set(prev.size === 0 ? ["god","ok","lav"] : prev);
                    if (next.has(l.key)) next.delete(l.key); else next.add(l.key);
                    if (next.size === 3) return new Set();
                    return next;
                  });
                }}
                style={{ accentColor: l.color }} />
              {l.label}
            </label>
          ))}
          <button onClick={exportAll} style={{ backgroundColor: "#059669", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ CSV</button>
          <button onClick={exportMeta} style={{ backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ Meta</button>
          <button onClick={() => { const alle = enheter; downloadCSV(toLinkedInCSV(alle), `${date}_linkedin.csv`); }} style={{ backgroundColor: "#0a66c2", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ LinkedIn</button>
        </div>

        {/* Tabell */}
        <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr>
                {[["Navn","25%"],["Form","8%"],["Ansatte","7%"],["Poststed","17%"],["Fylke","14%"],["Bransje","17%"],["Lønnsomhet","12%"]].map(([h,w]) => (
                  <th key={h} style={{ ...s.th, width: w }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", padding: "32px" }}>Laster...</td></tr>
              ) : enheter.map((e, i) => (
                <tr key={i} onClick={() => setValgtEnhet(e)} style={{ cursor: "pointer" }}
                  onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = theme.bg)}
                  onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ ...s.td, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.navn}>{e.navn}</td>
                  <td style={s.td}>
                    <span style={{ backgroundColor: e.form === "ENK" ? "#fef3c7" : "#d1fae5", color: e.form === "ENK" ? "#92400e" : "#065f46", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{e.form}</span>
                  </td>
                  <td style={{ ...s.td, color: theme.textMuted }}>{e.ansatte !== "" ? e.ansatte : "—"}</td>
                  <td style={{ ...s.td, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.postnummer} {e.poststed}</td>
                  <td style={{ ...s.td, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.fylke || "—"}</td>
                  <td style={{ ...s.td, color: theme.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.kategori || "—"}</td>
                  <td style={s.td}>
                    {e.regnskap?.lonnsomhet === "god" && <span style={{ color: "#059669", fontSize: 12, fontWeight: 500 }}>● God</span>}
                    {e.regnskap?.lonnsomhet === "ok" && <span style={{ color: "#d97706", fontSize: 12, fontWeight: 500 }}>● Ok</span>}
                    {e.regnskap?.lonnsomhet === "lav" && <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 500 }}>● Lav</span>}
                    {!e.regnskap?.lonnsomhet && <span style={{ color: theme.textMuted, fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginering */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setPage(p => Math.max(0, p-1)); hentData(Math.max(0, page-1)); }} disabled={page === 0}
              style={{ ...s.btnGray, opacity: page === 0 ? 0.4 : 1 }}>← Forrige</button>
            <span style={{ fontSize: 14, color: theme.textMuted }}>
              Side {page+1} av {Math.max(1, totalPages)} · {totalAntall.toLocaleString("nb-NO")} bedrifter
            </span>
            <button onClick={() => { setPage(p => Math.min(totalPages-1, p+1)); hentData(Math.min(totalPages-1, page+1)); }} disabled={page >= totalPages-1}
              style={{ ...s.btnGray, opacity: page >= totalPages-1 ? 0.4 : 1 }}>Neste →</button>
          </div>
        </div>

        {/* Per region */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Per region</div>
          <RegionList enheter={enheter} segmentKey={[...aktiveSegmenter].join("+")} theme={theme} />
        </div>
      </div>

      <EnhetModal enhet={valgtEnhet} onClose={() => setValgtEnhet(null)} darkMode={darkMode} />
    </main>
  );
}
