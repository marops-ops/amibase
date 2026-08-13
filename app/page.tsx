"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { SEGMENTS, FYLKER } from "@/lib/segments";
import { toCSV, toLinkedInCSV, downloadCSV } from "@/lib/fetcher";
import { Enhet, SegmentKey } from "@/lib/types";
import EnhetModal from "@/components/EnhetModal";
import RegionList from "@/components/RegionList";
import LonnsomhetTab from "@/components/LonnsomhetTab";
import BransjeFilter from "@/components/BransjeFilter";

type LoadState = "idle" | "loading" | "done" | "error";

interface SegmentState {
  data: Enhet[];
  state: LoadState;
  antall: number;
  oppdatert: string;
}

const EMPTY: SegmentState = { data: [], state: "idle", antall: 0, oppdatert: "" };

const LIGHT = { bg: "#F1EFE9", card: "#E8E6DF", border: "#C6C6B7", text: "#31353d", textMuted: "#6b7280" };
const DARK  = { bg: "#0a0a0a", card: "#111111", border: "#1f2937", text: "#f3f4f6", textMuted: "#9ca3af" };

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? DARK : LIGHT;

  const [segments, setSegments] = useState<Record<SegmentKey, SegmentState>>({
    ENK: { ...EMPTY }, SMB: { ...EMPTY }, MID: { ...EMPTY }, STOR: { ...EMPTY },
  });
  const [aktiveSegmenter, setAktiveSegmenter] = useState<Set<SegmentKey>>(new Set(["ENK", "SMB", "MID", "STOR"]));
  const [activeTab, setActiveTab] = useState<"liste" | "region" | "lonnsomhet">("liste");
  const [search, setSearch] = useState("");
  const [fylkeFilter, setFylkeFilter] = useState("");
  const [valgteBransjer, setValgteBransjer] = useState<Set<string>>(new Set());
  const [bransjerInitialisert, setBransjerInitialisert] = useState(false);
  const [valgtEnhet, setValgtEnhet] = useState<Enhet | null>(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const loadSegment = useCallback(async (key: SegmentKey) => {
    const cacheKey = `amibase_${key}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      setSegments(prev => ({
        ...prev,
        [key]: { data: parsed.data, state: "done", antall: parsed.data.length, oppdatert: parsed.oppdatert },
      }));
      return;
    }
    setSegments(prev => ({ ...prev, [key]: { ...prev[key], state: "loading" } }));
    try {
      const alle: Enhet[] = [];
      let p = 0;
      while (true) {
        const res = await fetch(`/api/data/${key}?page=${p}`);
        const json = await res.json();
        alle.push(...(json.enheter ?? []));
        if (p + 1 >= (json.totalPages ?? 1)) break;
        p++;
      }
      const oppdatert = new Date().toISOString();
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: alle, oppdatert }));
      setSegments(prev => ({
        ...prev,
        [key]: { data: alle, state: "done", antall: alle.length, oppdatert },
      }));
    } catch {
      setSegments(prev => ({ ...prev, [key]: { ...prev[key], state: "error" } }));
    }
  }, []);

  useEffect(() => {
    for (const seg of SEGMENTS) loadSegment(seg.key);
  }, [loadSegment]);

  function toggleSegment(key: SegmentKey) {
    setAktiveSegmenter(prev => {
      const next = new Set(prev);
      const keys = key === "STOR" ? ["STOR", "MID"] as SegmentKey[] : [key] as SegmentKey[];
      const alleAktive = keys.every(k => next.has(k));
      if (alleAktive) {
        if (next.size <= keys.length) return next;
        keys.forEach(k => next.delete(k));
      } else {
        keys.forEach(k => next.add(k));
      }
      setBransjerInitialisert(false);
      return next;
    });
  }

  const kombinertData = useMemo(() => {
    const alle: Enhet[] = [];
    const seen = new Set<string>();
    for (const key of aktiveSegmenter) {
      for (const e of segments[key].data) {
        if (!seen.has(e.orgnr)) { seen.add(e.orgnr); alle.push(e); }
      }
    }
    return alle;
  }, [aktiveSegmenter, segments]);

  const tilgjengeligeBransjer = useMemo(() => {
    return new Set(kombinertData.map(e => e.kategori).filter(Boolean));
  }, [kombinertData]);

  useEffect(() => {
    if (!bransjerInitialisert && tilgjengeligeBransjer.size > 0) {
      setValgteBransjer(new Set(tilgjengeligeBransjer));
      setBransjerInitialisert(true);
    }
  }, [tilgjengeligeBransjer, bransjerInitialisert]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return kombinertData.filter(e => {
      const matchQ = !q || e.navn.toLowerCase().includes(q) || e.poststed.toLowerCase().includes(q) || e.postnummer.includes(q);
      const matchF = !fylkeFilter || e.fylke === fylkeFilter;
      const matchK = valgteBransjer.size === 0 || valgteBransjer.has(e.kategori);
      return matchQ && matchF && matchK;
    });
  }, [kombinertData, search, fylkeFilter, valgteBransjer]);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const allFylker = useMemo(() => [...new Set(Object.values(FYLKER))].sort(), []);
  const totalCount = Object.values(segments).reduce((sum, s) => sum + s.data.length, 0);
  const oppdatert = segments.SMB.oppdatert ? new Date(segments.SMB.oppdatert).toLocaleDateString("nb-NO") : null;

  const s = {
    card: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "1rem" },
    input: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 12px", color: theme.text, fontSize: 14, outline: "none" },
    btnGray: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 12px", color: theme.text, fontSize: 14, cursor: "pointer" },
    th: { backgroundColor: theme.bg, color: theme.textMuted, fontSize: 11, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.05em", padding: "10px 16px", textAlign: "left" as const, position: "sticky" as const, top: 0, zIndex: 1 },
    td: { padding: "10px 16px", color: theme.text, fontSize: 14, borderTop: `1px solid ${theme.border}` },
  };

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
            {oppdatert && <span style={{ fontSize: 12, color: theme.textMuted }}>Sist oppdatert {oppdatert}</span>}
            <button onClick={() => setDarkMode(!darkMode)} style={{ ...s.btnGray, width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>



        {/* Segment cards — 4 kort: Totalt, ENK, SMB, Store(MID+STOR) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {/* Totalt — ikke klikkbar */}
          <div style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: theme.textMuted, marginBottom: 8 }}>Totalt</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>
              {segments.SMB.state === "loading" ? "…" : totalCount.toLocaleString("nb-NO")}
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>aktive enheter</div>
          </div>
          {/* ENK */}
          <div onClick={() => toggleSegment("ENK")} style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", border: aktiveSegmenter.has("ENK") ? "2px solid #059669" : `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ef9f27" }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>Enkeltmannsforetak</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>
              {segments.ENK.state === "loading" ? "…" : segments.ENK.data.length.toLocaleString("nb-NO")}
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>ENK</div>
          </div>
          {/* SMB */}
          <div onClick={() => toggleSegment("SMB")} style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", border: aktiveSegmenter.has("SMB") ? "2px solid #059669" : `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#1d9e75" }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>Mellomstore bedrifter</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>
              {segments.SMB.state === "loading" ? "…" : segments.SMB.data.length.toLocaleString("nb-NO")}
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>AS/ANS — 1–49 ansatte</div>
          </div>
          {/* Store = MID + STOR */}
          <div onClick={() => toggleSegment("STOR")} style={{ ...s.card, padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", border: aktiveSegmenter.has("STOR") ? "2px solid #059669" : `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#7f77dd" }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>Store bedrifter</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>
              {segments.MID.state === "loading" ? "…" : (segments.MID.data.length + segments.STOR.data.length).toLocaleString("nb-NO")}
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>AS/ANS — 50–200+ ansatte</div>
          </div>
        </div>

        <div style={{ borderBottom: `1px solid ${theme.border}`, marginBottom: 20 }} />

        {(
          <>
            {/* Bransjefilter — full bredde */}
            {bransjerInitialisert && (
              <BransjeFilter
                tilgjengelige={tilgjengeligeBransjer}
                valgte={valgteBransjer}
                onChange={next => { setValgteBransjer(next); }}
                theme={theme}
              />
            )}

            {/* Søk + eksport */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>⌕</span>
                <input type="text" placeholder="Søk navn, poststed, postnr..." value={search}
                  onChange={e => { setSearch(e.target.value); }}
                  style={{ ...s.input, width: "100%", paddingLeft: 32 }} />
              </div>
              <select value={fylkeFilter} onChange={e => { setFylkeFilter(e.target.value); }} style={s.input}>
                <option value="">Alle fylker</option>
                {allFylker.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={() => downloadCSV(toCSV(filtered), `${date}_utvalg.csv`)}
                style={{ backgroundColor: "#059669", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ CSV</button>
              <button onClick={() => downloadCSV(toCSV(filtered, true), `${date}_utvalg_meta.csv`)}
                style={{ backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ Meta</button>
              <button onClick={() => downloadCSV(toLinkedInCSV(filtered), `${date}_utvalg_linkedin.csv`)}
                style={{ backgroundColor: "#0a66c2", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ LinkedIn</button>
            </div>

            {/* Tabell */}
                <div style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  maxHeight: "calc(100vh - 320px)",
                  overflowY: "auto",
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <thead>
                      <tr>
                        {[["Navn","30%"],["Form","9%"],["Ansatte","8%"],["Poststed","20%"],["Fylke","16%"],["Bransje","17%"]].map(([h,w]) => (
                          <th key={h} style={{ ...s.th, width: w }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, i) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: theme.textMuted }}>
                  {filtered.length.toLocaleString("nb-NO")} bedrifter
                </div>
          </>
        )}

        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Per region</div>
          <RegionList enheter={kombinertData} segmentKey={[...aktiveSegmenter].join("+")} theme={theme} />
        </div>

      </div>

      <EnhetModal enhet={valgtEnhet} onClose={() => setValgtEnhet(null)} darkMode={darkMode} />
    </main>
  );
}
