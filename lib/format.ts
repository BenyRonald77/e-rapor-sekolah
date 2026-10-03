export const fmtTanggal = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};
export const nowIso = () => new Date().toISOString();
export const bulatkan1 = (n: number) => Math.round(n * 10) / 10;
