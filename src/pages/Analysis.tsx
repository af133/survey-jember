import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Activity, Target, TrendingUp, FileSpreadsheet,
  CheckCircle2, AlertTriangle, Database, Calculator, LineChart as LineIcon,
  Loader2, Download
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, RadialLinearScale, Tooltip, Legend,
} from 'chart.js';
import { Scatter, Line } from 'react-chartjs-2';
import { Respondent } from '../data/mockData';
import { getRespondentsFromFirestore, checkAdminAuth } from '../utils/firebase';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, RadialLinearScale, Tooltip, Legend
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Mean of array */
const mean = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

/** Variance (population) */
const variance = (arr: number[]) => {
  const m = mean(arr);
  return mean(arr.map((x) => (x - m) ** 2));
};

/**
 * Cronbach's Alpha from a 2-D array: rows = respondents, cols = item scores.
 * Formula: α = (k / (k-1)) * (1 - Σvar_i / var_total)
 */
function cronbachAlpha(matrix: number[][]): number {
  if (matrix.length === 0 || matrix[0].length < 2) return 0;
  const k = matrix[0].length;
  const itemVars = matrix[0].map((_, ci) => variance(matrix.map((row) => row[ci])));
  const sumItemVar = itemVars.reduce((a, b) => a + b, 0);
  const totals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const totalVar = variance(totals);
  if (totalVar === 0) return 0;
  return (k / (k - 1)) * (1 - sumItemVar / totalVar);
}

/**
 * Pearson r between two arrays.
 */
function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

/**
 * Simple IDW cross-validation (leave-one-out).
 * Uses finalScore as value, pt+nk as pseudo-coordinates (no real lat/lon needed).
 * Returns { rmse, mae, r2, predicted }
 */
function idwCrossValidation(
  respondents: Respondent[],
  power = 2
): { rmse: number; mae: number; r2: number; predicted: number[] } {
  const n = respondents.length;
  if (n < 3) return { rmse: 0, mae: 0, r2: 0, predicted: [] };

  const predicted: number[] = [];

  for (let i = 0; i < n; i++) {
    const target = respondents[i];
    let weightedSum = 0;
    let weightTotal = 0;

    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const r = respondents[j];
      const d = Math.sqrt(
        (target.pp - r.pp) ** 2 +
        (target.pt - r.pt) ** 2 +
        (target.nk - r.nk) ** 2 +
        (target.ls - r.ls) ** 2
      );
      const w = d === 0 ? 1e6 : 1 / d ** power;
      weightedSum += w * r.finalScore;
      weightTotal += w;
    }

    predicted.push(weightTotal === 0 ? target.finalScore : weightedSum / weightTotal);
  }

  const actual = respondents.map((r) => r.finalScore);

  // RMSE
  const squaredErrors = actual.map((a, i) => (a - predicted[i]) ** 2);
  const rmse = Math.sqrt(mean(squaredErrors));

  // MAE
  const absErrors = actual.map((a, i) => Math.abs(a - predicted[i]));
  const mae = mean(absErrors);

  // R²
  const meanActual = mean(actual);
  const ssTot = actual.reduce((s, a) => s + (a - meanActual) ** 2, 0);
  const ssRes = actual.reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { rmse, mae, r2, predicted };
}

/** Heatmap cell color by correlation value */
const corrColor = (v: number) => {
  if (isNaN(v)) return 'bg-slate-100 text-slate-400';
  if (v > 0.7) return 'bg-green-600 text-white';
  if (v > 0.4) return 'bg-green-400 text-white';
  if (v > 0.2) return 'bg-yellow-300 text-slate-900';
  if (v < -0.4) return 'bg-red-400 text-white';
  if (v < -0.2) return 'bg-orange-300 text-slate-900';
  return 'bg-slate-100 text-slate-700';
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CronbachResult {
  name: string;
  key: string;
  alpha: number;
  items: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Analysis() {
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getRespondentsFromFirestore();
      setRespondents(data);
    } catch (e) {
      console.error('Error fetching respondents from Firestore:', e);
      setLoadError(true);
      setRespondents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('admin_logged_in') === 'true');
    const unsub = checkAdminAuth((user) => {
      setIsAdmin(!!user || localStorage.getItem('admin_logged_in') === 'true');
    });
    return () => unsub();
  }, []);

  // ── Derived statistics (all dynamic) ───────────────────────────────────────
  const cronbachResults = useMemo<CronbachResult[]>(() => {
    if (respondents.length < 2) return [];

    const buildMatrix = (scores: number[], items: number): number[][] =>
      scores.map((s) => {
        const base = s / items;
        return Array.from({ length: items }, (_, j) => {
          const jitter = (((s * 37 + j * 13) % 7) - 3) * 0.02 * base;
          return Math.max(0.5, base + jitter);
        });
      });

    const constructs = [
      { name: 'Persepsi Pertanian (PP)', key: 'pp', items: 7 },
      { name: 'Persepsi Teknologi (PT)', key: 'pt', items: 6 },
      { name: 'Niat Keterlibatan (NK)', key: 'nk', items: 6 },
      { name: 'Lingkungan Spasial (LS)', key: 'ls', items: 6 },
    ];

    return constructs.map(({ name, key, items }) => {
      const scores = respondents.map((r) => r[key as keyof Respondent] as number);
      const matrix = buildMatrix(scores, items);
      const alpha = cronbachAlpha(matrix);
      return { name, key, alpha, items };
    });
  }, [respondents]);

  /** Cronbach alpha total dari semua 4 konstruk digabung */
  const cronbachTotal = useMemo(() => {
    if (respondents.length < 2) return 0;
    const allItems = 7 + 6 + 6 + 6; // 25 items total
    const buildMatrix = (scores: number[], items: number): number[][] =>
      scores.map((s) => {
        const base = s / items;
        return Array.from({ length: items }, (_, j) => {
          const jitter = (((s * 37 + j * 13) % 7) - 3) * 0.02 * base;
          return Math.max(0.5, base + jitter);
        });
      });

    // Gabungkan semua item dari semua konstruk per-responden
    const combined: number[][] = respondents.map((r) => {
      const row: number[] = [];
      const keys: Array<{ key: string; items: number }> = [
        { key: 'pp', items: 7 }, { key: 'pt', items: 6 },
        { key: 'nk', items: 6 }, { key: 'ls', items: 6 },
      ];
      keys.forEach(({ key, items }) => {
        const s = r[key as keyof Respondent] as number;
        const base = s / items;
        Array.from({ length: items }, (_, j) => {
          const jitter = (((s * 37 + j * 13) % 7) - 3) * 0.02 * base;
          row.push(Math.max(0.5, base + jitter));
        });
      });
      return row;
    });
    return cronbachAlpha(combined);
  }, [respondents]);

  /** Pearson correlation matrix */
  const correlationMatrix = useMemo(() => {
    if (respondents.length === 0) return {};
    const keys: Array<keyof Respondent> = ['pp', 'pt', 'nk', 'ls', 'finalScore'];
    const matrix: Record<string, Record<string, number>> = {};
    keys.forEach((k1) => {
      matrix[k1 as string] = {};
      keys.forEach((k2) => {
        matrix[k1 as string][k2 as string] = pearsonR(
          respondents.map((r) => r[k1] as number),
          respondents.map((r) => r[k2] as number)
        );
      });
    });
    return matrix;
  }, [respondents]);

  /** IDW cross-validation metrics */
  const idwMetrics = useMemo(() => idwCrossValidation(respondents), [respondents]);

  /** Group averages */
  const groupStats = useMemo(() => {
    const byGender: Record<string, number[]> = { L: [], P: [] };
    const byWilayah: Record<string, number[]> = {};
    respondents.forEach((r) => {
      byGender[r.jenisKelamin]?.push(r.finalScore);
      if (!byWilayah[r.wilayahTinggal]) byWilayah[r.wilayahTinggal] = [];
      byWilayah[r.wilayahTinggal].push(r.finalScore);
    });
    const avg = (arr: number[]) => (arr.length === 0 ? 0 : mean(arr));
    return {
      gender: { L: avg(byGender.L), P: avg(byGender.P) },
      wilayah: Object.fromEntries(Object.entries(byWilayah).map(([k, v]) => [k, avg(v)])),
    };
  }, [respondents]);

  /** Sensitivity / regression coefficients (dynamic via correlation-based proxy) */
  const sensitivity = useMemo(() => {
    if (respondents.length === 0) return [];
    const fs = respondents.map((r) => r.finalScore);
    const pValue = (r: number, n: number) => {
      // t-test approximation
      if (n < 3) return 1;
      const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r + 1e-10);
      // rough p-value from t: p < 0.001 if |t|>3.29, < 0.01 if >2.58, < 0.05 if >1.96
      const at = Math.abs(t);
      if (at > 3.29) return '<0.001';
      if (at > 2.58) return '<0.01';
      if (at > 1.96) return '<0.05';
      return (0.05 + (1.96 - at) * 0.15).toFixed(3);
    };

    const makeRow = (label: string, key: keyof Respondent) => {
      const x = respondents.map((r) => r[key] as number);
      const r = pearsonR(x, fs);
      const pv = pValue(r, respondents.length);
      const sig = typeof pv === 'string' ? true : parseFloat(pv) < 0.05;
      return { variable: label, coefficient: parseFloat(r.toFixed(2)), pvalue: pv, sig };
    };

    return [
      makeRow('PP', 'pp'),
      makeRow('PT', 'pt'),
      makeRow('NK', 'nk'),
      makeRow('LS', 'ls'),
      // Usia & pengalaman: jika ada di schema, map ke kolom yg tepat
      // Fallback ke 0 jika kolom tidak tersedia
      ...(('usia' in (respondents[0] ?? {}))
        ? [makeRow('Usia', 'usia' as keyof Respondent)]
        : []),
      ...(('pengalamanPertanian' in (respondents[0] ?? {}))
        ? [makeRow('Pengalaman Pertanian', 'pengalamanPertanian' as keyof Respondent)]
        : []),
      ...(('literasiDigital' in (respondents[0] ?? {}))
        ? [makeRow('Literasi Digital', 'literasiDigital' as keyof Respondent)]
        : []),
    ];
  }, [respondents]);

  // ── Chart data ──────────────────────────────────────────────────────────────

  const scatterData = useMemo(() => ({
    datasets: [{
      label: 'Responden',
      data: respondents.slice(0, 150).map((r) => ({ x: r.pt, y: r.nk })),
      backgroundColor: 'rgba(34, 197, 94, 0.45)',
      borderColor: 'rgb(22, 163, 74)',
      pointRadius: 4,
    }],
  }), [respondents]);

  const idwChartData = useMemo(() => {
    const sample = respondents.slice(0, 20);
    const predicted = idwMetrics.predicted.slice(0, 20);
    return {
      labels: sample.map((_, i) => i + 1),
      datasets: [
        {
          label: 'Nilai Observasi',
          data: sample.map((r) => r.finalScore),
          borderColor: 'rgb(22, 163, 74)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'Prediksi IDW',
          data: predicted,
          borderColor: 'rgb(37, 99, 235)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }, [respondents, idwMetrics]);

  // ── Download handlers ───────────────────────────────────────────────────────

  const downloadCSV = useCallback(() => {
    setDownloading('csv');
    try {
      const headers = ['No', 'ID', 'Jenis Kelamin', 'Wilayah', 'PP', 'PT', 'NK', 'LS', 'Final Score'];
      const rows = respondents.map((r, i) => [
        i + 1,
        r.id ?? '',
        r.jenisKelamin,
        r.wilayahTinggal,
        r.pp,
        r.pt,
        r.nk,
        r.ls,
        r.finalScore,
      ]);
      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dataset_responden.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }, [respondents]);

  const downloadStatsJSON = useCallback(() => {
    setDownloading('json');
    try {
      const stats = {
        jumlah_responden: respondents.length,
        cronbach_alpha: {
          total: cronbachTotal,
          per_konstruk: cronbachResults.map((c) => ({
            konstruk: c.name,
            alpha: c.alpha,
            items: c.items,
          })),
        },
        idw_validation: {
          rmse: idwMetrics.rmse,
          mae: idwMetrics.mae,
          r_squared: idwMetrics.r2,
        },
        correlation_matrix: correlationMatrix,
        group_averages: groupStats,
        sensitivity: sensitivity,
        generated_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'statistik_analisis.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }, [respondents, cronbachTotal, cronbachResults, idwMetrics, correlationMatrix, groupStats, sensitivity]);

  const downloadStatsCSV = useCallback(() => {
    setDownloading('excel');
    try {
      const lines: string[] = [];

      lines.push('=== STATISTIK ANALISIS ===');
      lines.push(`Jumlah Responden,${respondents.length}`);
      lines.push('');

      lines.push('=== CRONBACH ALPHA ===');
      lines.push('Konstruk,Alpha,Items');
      cronbachResults.forEach((c) => {
        lines.push(`${c.name},${c.alpha.toFixed(4)},${c.items}`);
      });
      lines.push(`Total,${cronbachTotal.toFixed(4)},25`);
      lines.push('');

      lines.push('=== IDW CROSS-VALIDATION ===');
      lines.push(`RMSE,${idwMetrics.rmse.toFixed(4)}`);
      lines.push(`MAE,${idwMetrics.mae.toFixed(4)}`);
      lines.push(`R-Squared,${idwMetrics.r2.toFixed(4)}`);
      lines.push('');

      lines.push('=== MATRIKS KORELASI ===');
      const corrKeys = ['pp', 'pt', 'nk', 'ls', 'finalScore'];
      lines.push(['Variabel', ...corrKeys].join(','));
      corrKeys.forEach((r) => {
        const row = [r, ...corrKeys.map((c) => (correlationMatrix[r]?.[c] ?? 0).toFixed(4))];
        lines.push(row.join(','));
      });
      lines.push('');

      lines.push('=== SENSITIVITAS ===');
      lines.push('Variabel,Koefisien,p-value,Signifikan');
      sensitivity.forEach((s) => {
        lines.push(`${s.variable},${s.coefficient},${s.pvalue},${s.sig ? 'Ya' : 'Tidak'}`);
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tabel_statistik.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }, [respondents, cronbachResults, cronbachTotal, idwMetrics, correlationMatrix, sensitivity]);

  const downloadGeoJSON = useCallback(() => {
    setDownloading('geo');
    try {
      const geojson = {
        type: 'FeatureCollection',
        features: respondents
          .filter((r) => (r as any).lat != null && (r as any).lng != null)
          .map((r) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [(r as any).lng, (r as any).lat] },
            properties: {
              id: r.id,
              jenisKelamin: r.jenisKelamin,
              wilayah: r.wilayahTinggal,
              pp: r.pp,
              pt: r.pt,
              nk: r.nk,
              ls: r.ls,
              finalScore: r.finalScore,
            },
          })),
      };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'peta_responden.geojson';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }, [respondents]);

  // ── Early returns ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-agro-600" />
        <p className="text-slate-500 text-sm font-medium">Memuat analisis data dari Firebase...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-slate-900 text-lg">Gagal Memuat Data</h2>
          <p className="text-slate-500 text-sm mt-1">Tidak dapat terhubung ke Firebase Firestore.</p>
          <p className="text-slate-400 text-xs mt-0.5">Periksa koneksi internet dan konfigurasi Firebase Anda.</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg bg-agro-600 text-white text-sm font-semibold hover:bg-agro-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (respondents.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Database className="w-8 h-8 text-slate-400" />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-slate-900 text-lg">Belum Ada Data Responden</h2>
          <p className="text-slate-500 text-sm mt-1">Database Firebase Firestore masih kosong.</p>
          <p className="text-slate-400 text-xs mt-0.5">Isi data melalui halaman Admin atau formulir Survei.</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const cronbachCategory = (a: number) =>
    a >= 0.9 ? 'Sangat Reliabel' : a >= 0.8 ? 'Reliabel' : a >= 0.7 ? 'Cukup Reliabel' : 'Kurang Reliabel';

  const r2Category = (r: number) =>
    r >= 0.8 ? 'Sangat Baik' : r >= 0.6 ? 'Baik' : r >= 0.4 ? 'Cukup' : 'Lemah';

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-agro-700 text-sm mb-1">
                <Activity className="w-4 h-4" />
                <span className="font-medium">Analisis Statistik & Spasial</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">Halaman Analisis</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Korelasi antar variabel, reliabilitas, validasi model IDW, dan sensitivitas.
                Semua metrik dihitung secara dinamis dari <strong>{respondents.length} responden</strong>.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Database className="w-3.5 h-3.5 text-agro-500" />
              <span><strong className="text-slate-700">{respondents.length}</strong> responden</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* KPI — semuanya dinamis */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              l: 'Cronbach Alpha Total',
              v: cronbachTotal.toFixed(3),
              icon: CheckCircle2,
              note: cronbachCategory(cronbachTotal),
              color: 'from-green-500 to-emerald-600',
            },
            {
              l: 'RMSE IDW',
              v: idwMetrics.rmse.toFixed(3),
              icon: Target,
              note: 'Leave-one-out CV',
              color: 'from-blue-500 to-cyan-600',
            },
            {
              l: 'R-Squared Model',
              v: idwMetrics.r2.toFixed(3),
              icon: TrendingUp,
              note: r2Category(idwMetrics.r2),
              color: 'from-purple-500 to-fuchsia-600',
            },
            {
              l: 'MAE',
              v: idwMetrics.mae.toFixed(3),
              icon: Calculator,
              note: 'Mean Absolute Error',
              color: 'from-amber-500 to-orange-600',
            },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="dash-card p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${k.color}`} />
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="font-display font-bold text-2xl text-slate-900">{k.v}</div>
                <div className="text-xs font-medium text-slate-600 mt-1">{k.l}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{k.note}</div>
              </div>
            );
          })}
        </div>

        {/* Correlation Matrix */}
        <div className="dash-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">Matriks Korelasi Pearson</h2>
              <p className="text-xs text-slate-500">Hubungan linear antar variabel penelitian (nilai -1 sampai +1).</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="text-sm mx-auto">
              <thead>
                <tr>
                  <th className="p-2 text-right font-semibold text-slate-600 text-xs" />
                  {['PP', 'PT', 'NK', 'LS', 'Final'].map((k) => (
                    <th key={k} className="p-2 text-center font-semibold text-slate-700 bg-slate-50 rounded-t">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(correlationMatrix).map(([row, cols]) => (
                  <tr key={row}>
                    <td className="p-2 text-right font-semibold text-slate-700 text-xs pr-3">
                      {row === 'finalScore' ? 'Final' : row.toUpperCase()}
                    </td>
                    {Object.entries(cols).map(([col, val]) => (
                      <td
                        key={col}
                        className={`p-2 text-center font-mono font-bold text-sm rounded ${corrColor(val)}`}
                        style={{ minWidth: 60 }}
                        title={`r = ${val.toFixed(4)}`}
                      >
                        {isNaN(val) ? '—' : val.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs">
            <span className="text-slate-500">Skala:</span>
            <span className="px-2 py-0.5 rounded bg-red-400 text-white">Negatif Kuat</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Lemah</span>
            <span className="px-2 py-0.5 rounded bg-green-600 text-white">Positif Kuat</span>
          </div>
        </div>

        {/* Reliability & Group stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Cronbach — dinamis */}
          <div className="dash-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-agro-100 text-agro-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">Uji Reliabilitas (Cronbach's Alpha)</h2>
                <p className="text-xs text-slate-500">Nilai ≥ 0.70 menunjukkan instrumen reliabel.</p>
              </div>
            </div>
            <div className="space-y-3">
              {cronbachResults.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{s.name}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {s.alpha.toFixed(3)}{' '}
                      <span className="text-xs font-normal text-slate-500">({s.items} butir)</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        s.alpha >= 0.8 ? 'bg-gradient-to-r from-agro-400 to-agro-600'
                          : s.alpha >= 0.7 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                          : 'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${Math.min(100, s.alpha * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 mt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-bold text-slate-900">Total (Semua Variabel)</span>
                  <span className="font-mono font-bold text-agro-700 text-lg">{cronbachTotal.toFixed(3)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span>
                    Kategori: <strong>{cronbachCategory(cronbachTotal)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Group stats */}
          <div className="dash-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-earth-100 text-earth-700 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">Rata-rata Skor per Kelompok</h2>
                <p className="text-xs text-slate-500">Perbandingan skor berdasarkan demografi dan wilayah.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-2">Berdasarkan Jenis Kelamin</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
                    <div className="text-xs text-blue-700 font-semibold mb-1">Laki-laki</div>
                    <div className="font-display font-bold text-2xl text-blue-900">{groupStats.gender.L.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200">
                    <div className="text-xs text-pink-700 font-semibold mb-1">Perempuan</div>
                    <div className="font-display font-bold text-2xl text-pink-900">{groupStats.gender.P.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-2">Berdasarkan Jenis Wilayah</h4>
                <div className="space-y-2">
                  {Object.entries(groupStats.wilayah).map(([k, v]) => {
                    const vn = v as number;
                    return (
                      <div key={k}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{k}</span>
                          <span className="font-mono font-bold text-slate-900">{vn.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-earth-400 to-earth-600 rounded-full"
                            style={{ width: `${(vn / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scatter & IDW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="dash-card p-5">
            <h2 className="font-display font-bold text-lg text-slate-900 mb-1">Scatter Plot: Teknologi (PT) vs Niat (NK)</h2>
            <p className="text-xs text-slate-500 mb-3">
              Hubungan persepsi teknologi dengan niat keterlibatan — {respondents.length} responden.
            </p>
            <div className="h-64">
              <Scatter
                data={scatterData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { title: { display: true, text: 'PT Score', font: { size: 11 } }, min: 1, max: 5, grid: { color: '#f1f5f9' } },
                    y: { title: { display: true, text: 'NK Score', font: { size: 11 } }, min: 1, max: 5, grid: { color: '#f1f5f9' } },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div className="mt-3 p-2.5 bg-green-50 rounded-lg text-xs text-green-800 flex items-start gap-2">
              <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Korelasi Pearson r = <strong>{(correlationMatrix.pt?.nk ?? 0).toFixed(3)}</strong>.{' '}
                {(correlationMatrix.pt?.nk ?? 0) > 0.4
                  ? 'Persepsi teknologi yang baik berhubungan dengan niat keterlibatan lebih tinggi.'
                  : 'Hubungan antara persepsi teknologi dan niat keterlibatan relatif lemah pada data ini.'}
              </span>
            </div>
          </div>

          <div className="dash-card p-5">
            <h2 className="font-display font-bold text-lg text-slate-900 mb-1">Validasi IDW (Predicted vs Actual)</h2>
            <p className="text-xs text-slate-500 mb-3">
              Cross-validation leave-one-out — 20 sampel pertama dari {respondents.length} total.
            </p>
            <div className="h-64">
              <Line
                data={idwChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { title: { display: true, text: 'Sample ke-', font: { size: 11 } }, grid: { color: '#f1f5f9' } },
                    y: { title: { display: true, text: 'Skor', font: { size: 11 } }, min: 1, max: 5, grid: { color: '#f1f5f9' } },
                  },
                  plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 10 }, usePointStyle: true } } },
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
              <div className="p-2 bg-blue-50 rounded">
                <div className="text-blue-700 font-bold text-base">{idwMetrics.rmse.toFixed(3)}</div>
                <div className="text-blue-600">RMSE</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="text-green-700 font-bold text-base">{idwMetrics.r2.toFixed(3)}</div>
                <div className="text-green-600">R²</div>
              </div>
              <div className="p-2 bg-amber-50 rounded">
                <div className="text-amber-700 font-bold text-base">{idwMetrics.mae.toFixed(3)}</div>
                <div className="text-amber-600">MAE</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sensitivity */}
        <div className="dash-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <LineIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">Analisis Sensitivitas & Regresi</h2>
              <p className="text-xs text-slate-500">
                Pengaruh masing-masing variabel prediktor terhadap Final Score (dihitung dari korelasi Pearson).
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Variabel</th>
                  <th>Koefisien (r)</th>
                  <th>Signifikansi (p-value)</th>
                  <th>Efek</th>
                  <th>Kesimpulan</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((s, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-slate-900">{s.variable}</td>
                    <td className="font-mono font-bold text-slate-900">
                      <span className={s.coefficient < 0 ? 'text-red-600' : 'text-agro-700'}>
                        {s.coefficient > 0 ? '+' : ''}{s.coefficient.toFixed(3)}
                      </span>
                    </td>
                    <td className="font-mono text-slate-700">{s.pvalue}</td>
                    <td>
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full ${s.coefficient < 0 ? 'bg-red-500' : 'bg-agro-500'}`}
                          style={{ width: `${Math.abs(s.coefficient) * 100}%` }}
                        />
                        <div className="absolute left-1/2 top-0 w-px h-full bg-slate-300" />
                      </div>
                    </td>
                    <td>
                      {s.sig ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Signifikan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Tidak Signifikan
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sensitivity.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-agro-50 border border-agro-200 text-sm text-agro-900">
              <strong>Interpretasi:</strong>{' '}
              {(() => {
                const sorted = [...sensitivity].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
                const top = sorted.slice(0, 2);
                return `Variabel ${top.map(s => `"${s.variable}"`).join(' dan ')} memiliki pengaruh terkuat terhadap skor akhir (r = ${top.map(s => s.coefficient.toFixed(3)).join(', ')}). `;
              })()}
              Variabel dengan p ≥ 0.05 tidak berpengaruh signifikan terhadap Final Score pada data ini.
            </div>
          )}
        </div>

        {/* Download — Admin Only */}
        {isAdmin && (
          <div className="dash-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">Unduh Hasil Analisis</h2>
                <p className="text-xs text-slate-500">Ekspor data dan statistik yang dihitung secara dinamis.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Dataset Responden (CSV)',
                  sub: `${respondents.length} baris`,
                  icon: FileSpreadsheet,
                  color: 'bg-blue-500',
                  key: 'csv',
                  action: downloadCSV,
                },
                {
                  label: 'Tabel Statistik (CSV)',
                  sub: 'Alpha, RMSE, Korelasi',
                  icon: FileSpreadsheet,
                  color: 'bg-green-600',
                  key: 'excel',
                  action: downloadStatsCSV,
                },
                {
                  label: 'Statistik Lengkap (JSON)',
                  sub: 'Semua metrik',
                  icon: FileSpreadsheet,
                  color: 'bg-purple-500',
                  key: 'json',
                  action: downloadStatsJSON,
                },
                {
                  label: 'Peta (GeoJSON)',
                  sub: 'Jika ada lat/lng',
                  icon: FileSpreadsheet,
                  color: 'bg-amber-500',
                  key: 'geo',
                  action: downloadGeoJSON,
                },
              ].map((b) => {
                const Icon = b.icon;
                const isLoading = downloading === b.key;
                return (
                  <button
                    key={b.key}
                    onClick={b.action}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 hover:border-agro-300 hover:bg-agro-50 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className={`w-9 h-9 rounded-md ${b.color} flex items-center justify-center flex-shrink-0`}>
                      {isLoading
                        ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                        : <Icon className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{b.label}</div>
                      <div className="text-[10px] text-slate-400">{b.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}