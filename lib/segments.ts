import { Segment } from "./types";

export const SEGMENTS: Segment[] = [
  {
    key: "ENK",
    label: "Enkeltmannsforetak",
    desc: "ENK — én person, én bedrift",
    orgformer: ["ENK"],
    color: "#ef9f27",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    key: "SMB",
    label: "Mellomstore bedrifter",
    desc: "AS/ANS — 1–49 ansatte",
    orgformer: ["AS", "ANS", "DA", "NUF"],
    ansatteFra: 1,
    ansatteTil: 49,
    color: "#1d9e75",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    key: "MID",
    label: "Litt større bedrifter",
    desc: "AS/ANS — 50–200 ansatte",
    orgformer: ["AS", "ANS", "NUF"],
    ansatteFra: 50,
    ansatteTil: 200,
    color: "#378add",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    key: "STOR",
    label: "Store bedrifter",
    desc: "AS/ANS — 50–200+ ansatte",
    orgformer: ["AS", "ANS", "NUF"],
    ansatteFra: 201,
    color: "#7f77dd",
    badge: "bg-purple-100 text-purple-800",
  },
];

export const FYLKER: Record<string, string> = {
  "03": "Oslo",
  "11": "Rogaland",
  "15": "Møre og Romsdal",
  "18": "Nordland",
  "31": "Østfold",
  "32": "Akershus",
  "33": "Buskerud",
  "34": "Innlandet",
  "39": "Vestfold",
  "40": "Telemark",
  "42": "Agder",
  "46": "Vestland",
  "50": "Trøndelag",
  "55": "Troms",
  "56": "Finnmark",
};
