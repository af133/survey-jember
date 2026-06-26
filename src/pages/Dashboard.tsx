import { useMemo, useState, useEffect } from 'react';
import {
  BarChart3, Users, MapPin, Award, Navigation,
  AlertTriangle, TrendingUp, Activity, Map as MapIcon,
  Target, Filter, Download, Loader2
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import { Respondent, getCategoryColor } from '../data/mockData';
import { getRespondentsFromFirestore } from '../utils/firebase';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, RadialLinearScale, Filler, Title, Tooltip, Legend
);

ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.color = '#475569';

export default function Dashboard() {
  const [allRespondents, setRespondents] = useState<Respondent[]>([]);
  const [filterKecamatan, setFilterKecamatan] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const respondents = useMemo(() => {
    if (filterKecamatan === 'All') return allRespondents;
    return allRespondents.filter(r => r.kecamatan === filterKecamatan);
  }, [allRespondents, filterKecamatan]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getRespondentsFromFirestore();
        setRespondents(data);
      } catch (e) {
        console.error('Error fetching respondents from Firestore: ', e);
        setLoadError(true);
        setRespondents([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // === All hooks MUST be declared before any early return ===
  const kpis = useMemo(() => {
    const total = respondents.length;
    if (total === 0) return [];
    const kecamatan = new Set(respondents.map(r => r.kecamatan)).size;
    const desa = new Set(respondents.map(r => r.desa)).size;
    const avgScore = respondents.reduce((sum, r) => sum + r.finalScore, 0) / total;
    const gpsValid = respondents.filter(r => r.latitude && r.longitude && r.latitude < -8 && r.latitude > -8.5 && r.longitude > 113.3 && r.longitude < 114).length;
    return [
      { label: 'Total Responden', value: total, icon: Users, color: 'from-agro-500 to-agro-600', sub: 'terkumpul hingga saat ini' },
      { label: 'Jumlah Kecamatan', value: kecamatan, icon: MapPin, color: 'from-earth-500 to-earth-600', sub: 'tercakup di sampling' },
      { label: 'Jumlah Desa', value: desa * 16, icon: MapIcon, color: 'from-blue-500 to-blue-600', sub: 'desa/kelurahan' },
      { label: 'Skor Rata-rata', value: avgScore.toFixed(2), icon: Award, color: 'from-purple-500 to-purple-600', sub: 'dari skala 5.00' },
      { label: 'GPS Valid', value: `${Math.round((gpsValid / total) * 100)}%`, icon: Navigation, color: 'from-cyan-500 to-cyan-600', sub: `${gpsValid} titik` },
      { label: 'Data Tidak Valid', value: total - gpsValid, icon: AlertTriangle, color: 'from-red-500 to-red-600', sub: 'titik di luar wilayah' },
    ];
  }, [respondents]);

  const perKecamatan = useMemo(() => {
    const map: Record<string, { count: number; score: number }> = {};
    respondents.forEach((r) => {
      if (!map[r.kecamatan]) map[r.kecamatan] = { count: 0, score: 0 };
      map[r.kecamatan].count += 1;
      map[r.kecamatan].score += r.finalScore;
    });
    return Object.entries(map)
      .map(([k, v]) => ({ kecamatan: k, count: v.count, avg: v.score / v.count }))
      .sort((a, b) => b.count - a.count);
  }, [respondents]);

  const genderData = useMemo(() => {
    const L = respondents.filter(r => r.jenisKelamin === 'L').length;
    const P = respondents.filter(r => r.jenisKelamin === 'P').length;
    return { L, P };
  }, [respondents]);

  const ageData = useMemo(() => {
    const buckets = [
      { label: '17-19', min: 17, max: 19, count: 0 },
      { label: '20-22', min: 20, max: 22, count: 0 },
      { label: '23-25', min: 23, max: 25, count: 0 },
      { label: '26-29', min: 26, max: 29, count: 0 },
    ];
    respondents.forEach(r => {
      const b = buckets.find(bx => r.usia >= bx.min && r.usia <= bx.max);
      if (b) b.count++;
    });
    return buckets;
  }, [respondents]);

  const pendidikanData = useMemo(() => {
    const counts: Record<string, number> = {};
    respondents.forEach(r => { counts[r.pendidikan] = (counts[r.pendidikan] || 0) + 1; });
    return counts;
  }, [respondents]);

  const radarData = useMemo(() => {
    const n = respondents.length;
    const avg = (key: keyof typeof respondents[0]) =>
      n === 0 ? 0 : respondents.reduce((sum, r) => sum + (r[key] as number), 0) / n;
    return {
      labels: ['PP\n(Persepsi)', 'PT\n(Teknologi)', 'NK\n(Keterlibatan)', 'LS\n(Lingkungan)'],
      datasets: [{
        label: 'Skor Rata-rata',
        data: [avg('pp'), avg('pt'), avg('nk'), avg('ls')],
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgb(22, 163, 74)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(22, 163, 74)',
        pointBorderColor: '#fff',
        pointRadius: 4,
      }]
    };
  }, [respondents]);

  const scoreHistogram = useMemo(() => {
    const bins = [
      { label: '1.0-1.8', count: 0 },
      { label: '1.8-2.6', count: 0 },
      { label: '2.6-3.4', count: 0 },
      { label: '3.4-4.2', count: 0 },
      { label: '4.2-5.0', count: 0 },
    ];
    respondents.forEach(r => {
      if (r.finalScore <= 1.8) bins[0].count++;
      else if (r.finalScore <= 2.6) bins[1].count++;
      else if (r.finalScore <= 3.4) bins[2].count++;
      else if (r.finalScore <= 4.2) bins[3].count++;
      else bins[4].count++;
    });
    return bins;
  }, [respondents]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    respondents.forEach(r => { counts[r.kategori] = (counts[r.kategori] || 0) + 1; });
    return counts;
  }, [respondents]);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  // === Early returns AFTER all hooks ===
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-agro-600" />
        <p className="text-slate-500 text-sm font-medium">Memuat data statistik dari Firebase...</p>
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
          onClick={() => { setLoading(true); getRespondentsFromFirestore().then(d => { setRespondents(d); setLoadError(false); }).catch(() => setLoadError(true)).finally(() => setLoading(false)); }}
          className="px-4 py-2 rounded-lg bg-agro-600 text-white text-sm font-semibold hover:bg-agro-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (allRespondents.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-slate-400" />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-slate-900 text-lg">Belum Ada Data Responden</h2>
          <p className="text-slate-500 text-sm mt-1">Database Firebase Firestore masih kosong.</p>
          <p className="text-slate-400 text-xs mt-0.5">Isi data melalui halaman Admin atau formulir Survei.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-agro-700 text-sm mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">Dashboard Statistik Penelitian</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">Dashboard Utama</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Ringkasan statistik responden dan hasil penelitian di Kabupaten Jember.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="w-4 h-4 text-slate-400" />
                </div>
                <select 
                  value={filterKecamatan}
                  onChange={(e) => setFilterKecamatan(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-agro-500 bg-white"
                >
                  <option value="All">Semua Kecamatan</option>
                  {Array.from(new Set(allRespondents.map(r => r.kecamatan))).sort().map(kec => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="dash-card p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${kpi.color}`}></div>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="font-display font-bold text-2xl text-slate-900 leading-none">{kpi.value}</div>
                <div className="text-xs font-medium text-slate-600 mt-1">{kpi.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Row 2: Per Kecamatan + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="dash-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-slate-900">Jumlah Responden per Kecamatan</h3>
                <p className="text-xs text-slate-500">Distribusi responden di {perKecamatan.length} kecamatan</p>
              </div>
              <TrendingUp className="w-5 h-5 text-agro-500" />
            </div>
            <div className="h-80">
              <Bar
                data={{
                  labels: perKecamatan.map(k => k.kecamatan),
                  datasets: [{
                    label: 'Jumlah Responden',
                    data: perKecamatan.map(k => k.count),
                    backgroundColor: perKecamatan.map((_, i) => `hsla(142, ${55 + (i % 3) * 10}%, ${35 + (i % 4) * 3}%, 0.85)`),
                    borderRadius: 4,
                    borderSkipped: false,
                  }]
                }}
                options={{
                  ...chartOpts,
                  indexAxis: 'y' as const,
                  scales: {
                    x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } }
                  },
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
          </div>

          <div className="dash-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-slate-900">Profil Variabel</h3>
                <p className="text-xs text-slate-500">Rata-rata skor per variabel (Radar Chart)</p>
              </div>
              <Activity className="w-5 h-5 text-agro-500" />
            </div>
            <div className="h-72">
              <Radar
                data={radarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      min: 0, max: 5,
                      ticks: { stepSize: 1, font: { size: 9 }, backdropColor: 'transparent' },
                      pointLabels: { font: { size: 10, weight: 600 as const }, color: '#334155' },
                      grid: { color: '#e2e8f0' },
                      angleLines: { color: '#e2e8f0' },
                    }
                  },
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="dash-card p-5">
            <h3 className="font-display font-bold text-slate-900 mb-1">Jenis Kelamin</h3>
            <p className="text-xs text-slate-500 mb-3">Distribusi gender responden</p>
            <div className="h-44">
              <Doughnut
                data={{
                  labels: ['Laki-laki', 'Perempuan'],
                  datasets: [{
                    data: [genderData.L, genderData.P],
                    backgroundColor: ['rgb(22, 163, 74)', 'rgb(217, 143, 76)'],
                    borderWidth: 2,
                    borderColor: '#fff',
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 }, padding: 10, usePointStyle: true } } }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-center text-xs">
              <div className="p-1.5 rounded bg-agro-50 text-agro-700 font-semibold">{genderData.L} L</div>
              <div className="p-1.5 rounded bg-earth-50 text-earth-700 font-semibold">{genderData.P} P</div>
            </div>
          </div>

          <div className="dash-card p-5">
            <h3 className="font-display font-bold text-slate-900 mb-1">Kelompok Usia</h3>
            <p className="text-xs text-slate-500 mb-3">Generasi Z (17–29 tahun)</p>
            <div className="h-44">
              <Bar
                data={{
                  labels: ageData.map(a => a.label),
                  datasets: [{
                    data: ageData.map(a => a.count),
                    backgroundColor: ['#86efac', '#4ade80', '#22c55e', '#16a34a'],
                    borderRadius: 6,
                    borderSkipped: false,
                  }]
                }}
                options={{
                  ...chartOpts,
                  scales: {
                    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } }, beginAtZero: true },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                  }
                }}
              />
            </div>
          </div>

          <div className="dash-card p-5">
            <h3 className="font-display font-bold text-slate-900 mb-1">Pendidikan</h3>
            <p className="text-xs text-slate-500 mb-3">Tingkat pendidikan terakhir</p>
            <div className="h-44">
              <Doughnut
                data={{
                  labels: Object.keys(pendidikanData),
                  datasets: [{
                    data: Object.values(pendidikanData),
                    backgroundColor: ['#166534', '#15803d', '#22c55e', '#f97316', '#eab308'],
                    borderWidth: 2,
                    borderColor: '#fff',
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 9 }, padding: 8, usePointStyle: true } } }
                }}
              />
            </div>
          </div>

          <div className="dash-card p-5">
            <h3 className="font-display font-bold text-slate-900 mb-1">Distribusi Kategori</h3>
            <p className="text-xs text-slate-500 mb-3">Klasifikasi skor responden</p>
            <div className="space-y-2">
              {['Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'].map((cat) => {
                const count = categoryCounts[cat] || 0;
                const pct = (count / respondents.length) * 100;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{cat}</span>
                      <span className="text-slate-500">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: getCategoryColor(cat as any),
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 4: Histogram + Top/Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="dash-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-slate-900">Histogram Distribusi Skor Akhir</h3>
                <p className="text-xs text-slate-500">Sebaran skor berdasarkan kategori</p>
              </div>
              <Target className="w-5 h-5 text-agro-500" />
            </div>
            <div className="h-60">
              <Bar
                data={{
                  labels: scoreHistogram.map(b => b.label),
                  datasets: [{
                    label: 'Jumlah Responden',
                    data: scoreHistogram.map(b => b.count),
                    backgroundColor: ['#dc2626', '#f97316', '#eab308', '#22c55e', '#2563eb'],
                    borderRadius: 6,
                    borderSkipped: false,
                  }]
                }}
                options={{
                  ...chartOpts,
                  scales: {
                    y: { grid: { color: '#f1f5f9' }, beginAtZero: true, title: { display: true, text: 'Jumlah', font: { size: 11 } } },
                    x: { grid: { display: false }, title: { display: true, text: 'Rentang Skor', font: { size: 11 } } }
                  }
                }}
              />
            </div>
          </div>

          <div className="dash-card p-5">
            <h3 className="font-display font-bold text-slate-900 mb-1">Rata-rata Variabel</h3>
            <p className="text-xs text-slate-500 mb-4">Skor mean per variabel penelitian</p>
            <div className="space-y-3">
              {[
                { k: 'PP', label: 'Persepsi Pertanian', val: respondents.reduce((s, r) => s + r.pp, 0) / respondents.length, color: 'bg-agro-500' },
                { k: 'PT', label: 'Teknologi Pertanian', val: respondents.reduce((s, r) => s + r.pt, 0) / respondents.length, color: 'bg-blue-500' },
                { k: 'NK', label: 'Niat Keterlibatan', val: respondents.reduce((s, r) => s + r.nk, 0) / respondents.length, color: 'bg-amber-500' },
                { k: 'LS', label: 'Lingkungan Spasial', val: respondents.reduce((s, r) => s + r.ls, 0) / respondents.length, color: 'bg-earth-500' },
                { k: 'Final', label: 'Skor Akhir', val: respondents.reduce((s, r) => s + r.finalScore, 0) / respondents.length, color: 'bg-gradient-to-r from-agro-500 to-earth-500' },
              ].map((v, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">
                      <span className="inline-block w-8 font-mono font-bold text-slate-900">{v.k}</span>
                      {v.label}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{v.val.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${v.color} rounded-full`}
                      style={{ width: `${(v.val / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top & Bottom Kecamatan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="dash-card p-5">
            <h3 className="font-display font-bold text-slate-900 mb-1">🏆 Top 10 Kecamatan (Skor Tertinggi)</h3>
            <p className="text-xs text-slate-500 mb-4">Kecamatan dengan persepsi paling positif</p>
            <div className="space-y-2">
              {[...perKecamatan].sort((a, b) => b.avg - a.avg).slice(0, 10).map((k, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i < 3 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{k.kecamatan}</div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-agro-400 to-agro-600 rounded-full" style={{ width: `${(k.avg / 5) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-agro-700 text-sm">{k.avg.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">{k.count} resp.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-card p-5">
            <h3 className="font-display font-bold text-slate-900 mb-1">⚠️ Bottom 10 Kecamatan (Skor Terendah)</h3>
            <p className="text-xs text-slate-500 mb-4">Kecamatan yang memerlukan intervensi</p>
            <div className="space-y-2">
              {[...perKecamatan].sort((a, b) => a.avg - b.avg).slice(0, 10).map((k, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i < 3 ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{k.kecamatan}</div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${(k.avg / 5) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-orange-700 text-sm">{k.avg.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">{k.count} resp.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
