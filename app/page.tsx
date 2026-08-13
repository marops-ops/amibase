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
const PAGE_SIZE = 30;

const LIGHT = { bg: "#F1EFE9", card: "#E8E6DF", border: "#C6C6B7", text: "#31353d", textMuted: "#6b7280" };
const DARK  = { bg: "#0a0a0a", card: "#111111", border: "#1f2937", text: "#f3f4f6", textMuted: "#9ca3af" };

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? DARK : LIGHT;

  const [segments, setSegments] = useState<Record<SegmentKey, SegmentState>>({
    ENK: { ...EMPTY }, SMB: { ...EMPTY }, MID: { ...EMPTY }, STOR: { ...EMPTY },
  });
  const [aktiveSegmenter, setAktiveSegmenter] = useState<Set<SegmentKey>>(new Set(["SMB"]));
  const [activeTab, setActiveTab] = useState<"liste" | "region" | "lonnsomhet">("liste");
  const [search, setSearch] = useState("");
  const [fylkeFilter, setFylkeFilter] = useState("");
  const [valgteBransjer, setValgteBransjer] = useState<Set<string>>(new Set());
  const [bransjerInitialisert, setBransjerInitialisert] = useState(false);
  const [page, setPage] = useState(0);
  const [valgtEnhet, setValgtEnhet] = useState<Enhet | null>(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const loadSegment = useCallback(async (key: SegmentKey) => {
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
      setSegments(prev => ({
        ...prev,
        [key]: { data: alle, state: "done", antall: alle.length, oppdatert: new Date().toISOString() },
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
      if (next.has(key)) { if (next.size === 1) return next; next.delete(key); } else next.add(key);
      setPage(0);
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
    const s = new Set(kombinertData.map(e => e.kategori).filter(Boolean));
    return s;
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const allFylker = useMemo(() => [...new Set(Object.values(FYLKER))].sort(), []);
  const totalCount = Object.values(segments).reduce((sum, s) => sum + s.data.length, 0);
  const oppdatert = segments.SMB.oppdatert ? new Date(segments.SMB.oppdatert).toLocaleDateString("nb-NO") : null;

  const s = {
    card: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "1rem" },
    input: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 12px", color: theme.text, fontSize: 14, outline: "none" },
    btnGray: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 12px", color: theme.text, fontSize: 14, cursor: "pointer" },
    table: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" },
    th: { backgroundColor: theme.bg, color: theme.textMuted, fontSize: 11, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.05em", padding: "10px 16px", textAlign: "left" as const },
    td: { padding: "10px 16px", color: theme.text, fontSize: 14, borderTop: `1px solid ${theme.border}` },
  };

  return (
    <main style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 24px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Totalt", val: totalCount, sub: "aktive enheter" },
            { label: "ENK", val: segments.ENK.data.length, sub: "enkeltmannsforetak" },
            { label: "Mellomstore", val: segments.SMB.data.length, sub: "1–49 ansatte" },
            { label: "Store", val: segments.MID.data.length + segments.STOR.data.length, sub: "50+ ansatte" },
          ].map(m => (
            <div key={m.label} style={s.card}>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: theme.text }}>
                {segments.SMB.state === "loading" ? "…" : m.val.toLocaleString("nb-NO")}
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 500, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Velg segment — klikk for å toggle, kombiner flere
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {SEGMENTS.map(seg => (
            <div key={seg.key} onClick={() => toggleSegment(seg.key)} style={{
              ...s.card, cursor: "pointer",
              border: aktiveSegmenter.has(seg.key) ? `2px solid #059669` : `1px solid ${theme.border}`,
              transition: "border-color 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: seg.color, flexShrink: 0 }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{seg.label}</div>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>{seg.desc}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: theme.text }}>
                {segments[seg.key].state === "loading" ? "…" :
                 segments[seg.key].state === "done" ? segments[seg.key].data.length.toLocaleString("nb-NO") : "—"}
              </div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>aktive enheter</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${theme.border}`, marginBottom: 20 }}>
          {([{ key: "liste", label: "Bedriftsliste" }, { key: "region", label: "Per region" }, { key: "lonnsomhet", label: "Lønnsomhet" }] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "8px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer",
              background: "none", border: "none", borderBottom: activeTab === tab.key ? "2px solid #059669" : "2px solid transparent",
              color: activeTab === tab.key ? "#059669" : theme.textMuted, marginBottom: -1,
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "liste" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>⌕</span>
                <input type="text" placeholder="Søk navn, poststed, postnr..." value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  style={{ ...s.input, width: "100%", paddingLeft: 32 }} />
              </div>
              <select value={fylkeFilter} onChange={e => { setFylkeFilter(e.target.value); setPage(0); }} style={s.input}>
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

            {bransjerInitialisert && (
              <BransjeFilter
                tilgjengelige={tilgjengeligeBransjer}
                valgte={valgteBransjer}
                onChange={next => { setValgteBransjer(next); setPage(0); }}
                theme={theme}
              />
            )}

            <div style={s.table}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {[["Navn","28%"],["Form","8%"],["Ansatte","7%"],["Poststed","18%"],["Fylke","15%"],["Bransje","24%"]].map(([h,w]) => (
                      <th key={h} style={{ ...s.th, width: w }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((e, i) => (
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...s.btnGray, opacity: page === 0 ? 0.4 : 1 }}>← Forrige</button>
                <span style={{ fontSize: 14, color: theme.textMuted }}>Side {page + 1} av {Math.max(1, totalPages)} · {filtered.length.toLocaleString("nb-NO")} bedrifter</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ ...s.btnGray, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Neste →</button>
              </div>
            </div>
          </>
        )}

        {activeTab === "region" && <RegionList enheter={kombinertData} segmentKey={[...aktiveSegmenter].join("+")} theme={theme} />}
        {activeTab === "lonnsomhet" && <LonnsomhetTab enheter={filtered} theme={theme} />}
      </div>

      <EnhetModal enhet={valgtEnhet} onClose={() => setValgtEnhet(null)} />
    </main>
  );
}
