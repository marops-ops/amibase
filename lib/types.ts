export interface Enhet {
  orgnr: string;
  navn: string;
  form: string;
  ansatte: number | string;
  adresse: string;
  postnummer: string;
  poststed: string;
  fylke: string;
  fylkekode: string;
  nace: string;
  kategori: string;
  regnskap?: { lonnsomhet?: string; inntekter?: number; driftsresultat?: number; aarsresultat?: number; aar?: string; } | null;
}

export type SegmentKey = "ENK" | "SMB" | "MID" | "STOR";

export interface Segment {
  key: SegmentKey;
  label: string;
  desc: string;
  orgformer: string[];
  ansatteFra?: number;
  ansatteTil?: number;
  color: string;
  badge: string;
}
