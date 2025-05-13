export default function bradleyTerry(w: number[][], maxIter: number = 10): number[] {
  const n = w.length;
  const p = Array.from({ length: n }, () => 1);
  let lastNorm = 0;
  for (let _ = 0; _ < maxIter; ++_) {
    let normLog = 0;
    for (let i = 0; i < n; ++i) {
      let num = 0,
        den = 0;
      for (let j = 0; j < n; ++j) {
        if (i === j) continue;
        const sum = p[i] + p[j];
        num += (w[i][j] * p[j]) / sum;
        den += w[j][i] / sum;
      }
      normLog += Math.log((p[i] = num / den));
    }
    normLog = Math.exp(normLog / n);
    for (let i = 0; i < n; ++i) p[i] /= normLog;
    if (Math.abs(lastNorm - normLog) < 1e-3) break;
    lastNorm = normLog;
  }
  return p;
}
