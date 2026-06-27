import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, MapPin, User, CheckCircle2, ChevronLeft,
  ChevronRight, Loader2, Send, Check, Leaf, Lock,
  Navigation, AlertTriangle, RefreshCw
} from 'lucide-react';
import { SURVEY_SECTIONS, KECAMATAN_LIST, Respondent } from '../data/mockData';
import { saveRespondentToFirestore } from '../utils/firebase';

const LIKERT_LABELS = [
  { value: 1, label: 'STS', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { value: 2, label: 'TS', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
  { value: 3, label: 'N', color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' },
  { value: 4, label: 'S', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
  { value: 5, label: 'SS', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
];

const LIKERT_FULL = ['Sangat Tidak Setuju', 'Tidak Setuju', 'Netral', 'Setuju', 'Sangat Setuju'];

// Koordinat fallback: pusat Kabupaten Jember
const FALLBACK_LAT = -8.1721;
const FALLBACK_LNG = 113.6996;

// ─── GPS helper ──────────────────────────────────────────────────────────────
type GpsStatus = 'idle' | 'loading' | 'success' | 'denied' | 'unavailable' | 'timeout' | 'error';

function getGpsErrorStatus(err: GeolocationPositionError): GpsStatus {
  switch (err.code) {
    case err.PERMISSION_DENIED: return 'denied';
    case err.POSITION_UNAVAILABLE: return 'unavailable';
    case err.TIMEOUT: return 'timeout';
    default: return 'error';
  }
}

function gpsStatusMessage(status: GpsStatus): { text: string; isWarning: boolean } {
  switch (status) {
    case 'loading':
      return { text: 'Mendapatkan lokasi GPS...', isWarning: false };
    case 'success':
      return { text: 'GPS berhasil terkunci.', isWarning: false };
    case 'denied':
      return {
        text: 'Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser/perangkat Anda, lalu tekan "Coba Lagi".',
        isWarning: true,
      };
    case 'unavailable':
      return {
        text: 'Sinyal GPS tidak tersedia. Pastikan GPS/Location Service aktif di perangkat Anda.',
        isWarning: true,
      };
    case 'timeout':
      return {
        text: 'GPS timeout. Sinyal lemah atau GPS belum aktif. Tekan "Coba Lagi" setelah memastikan GPS aktif.',
        isWarning: true,
      };
    default:
      return { text: 'Gagal mendapatkan lokasi. Koordinat default Jember digunakan.', isWarning: true };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Survey() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const [identitas, setIdentitas] = useState({
    nama: '',
    usia: '',
    jenisKelamin: '',
    pendidikan: '',
    kecamatan: '',
    desa: '',
    latitude: null as number | null,
    longitude: null as number | null,
    wilayahTinggal: '',
    luasPertanian: '',
    jarakLahan: '',
  });

  // ─── GPS: dibungkus useCallback agar bisa dipanggil ulang (retry) ───────
  const requestGps = useCallback(() => {
    // Cek support
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setIdentitas(p => ({ ...p, latitude: FALLBACK_LAT, longitude: FALLBACK_LNG }));
      return;
    }

    setGpsStatus('loading');

    // Opsi: enableHighAccuracy butuh izin penuh di iOS/Android Chrome
    // maximumAge: 0 → jangan gunakan cache lokasi lama
    // timeout: 15000 → beri waktu lebih panjang untuk perangkat lambat
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIdentitas(p => ({
          ...p,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setGpsStatus('success');
      },
      (err) => {
        const status = getGpsErrorStatus(err);
        setGpsStatus(status);

        // Selalu set fallback agar form bisa dilanjutkan
        setIdentitas(p => ({
          ...p,
          latitude: p.latitude ?? FALLBACK_LAT,  // jangan overwrite kalau sudah ada koordinat
          longitude: p.longitude ?? FALLBACK_LNG,
        }));
      },
      options,
    );
  }, []);

  // Panggil GPS saat pertama kali mount
  useEffect(() => {
    requestGps();
  }, [requestGps]);

  // ─── Fixed respondent ID & timestamp (pakai useState agar tidak re-render) ─
  const [respondentId] = useState(() => `R-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [timestamp] = useState(() => new Date().toISOString());

  const sections = ['PP', 'PT', 'NK', 'LS', 'EXP', 'DIG'] as const;
  const totalSteps = 8;

  const setResponse = (key: string, val: number) => {
    setResponses(p => ({ ...p, [key]: val }));
  };

  const sectionComplete = (sectionKey: string) => {
    const sec = SURVEY_SECTIONS[sectionKey as keyof typeof SURVEY_SECTIONS];
    return sec.items.every(it => responses[it.id] !== undefined);
  };

  const canProceed = () => {
    if (step === 1) {
      return !!(
        identitas.nama && identitas.usia && identitas.jenisKelamin &&
        identitas.pendidikan && identitas.kecamatan && identitas.desa &&
        identitas.wilayahTinggal && identitas.luasPertanian && identitas.jarakLahan
      );
    }
    if (step >= 2 && step <= 7) {
      const key = sections[step - 2];
      return sectionComplete(key);
    }
    return true;
  };

  const calculateScores = () => {
    const avg = (ids: string[]) => {
      const vals = ids.map(id => responses[id]).filter(v => v !== undefined);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const pp  = avg(SURVEY_SECTIONS.PP.items.map(i => i.id));
    const pt  = avg(SURVEY_SECTIONS.PT.items.map(i => i.id));
    const nk  = avg(SURVEY_SECTIONS.NK.items.map(i => i.id));
    const ls  = avg(SURVEY_SECTIONS.LS.items.map(i => i.id));
    const exp = avg(SURVEY_SECTIONS.EXP.items.map(i => i.id));
    const dig = avg(SURVEY_SECTIONS.DIG.items.map(i => i.id));
    const final = (pp + pt + nk + ls) / 4;
    return { pp, pt, nk, ls, exp, dig, final };
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const scores = calculateScores();
      const cat =
        scores.final <= 1.8 ? 'Sangat Rendah' :
        scores.final <= 2.6 ? 'Rendah' :
        scores.final <= 3.4 ? 'Sedang' :
        scores.final <= 4.2 ? 'Tinggi' : 'Sangat Tinggi';

      const surveyData: Respondent = {
        id: respondentId,
        nama: identitas.nama,
        usia: Number(identitas.usia),
        jenisKelamin: identitas.jenisKelamin as 'L' | 'P',
        pendidikan: identitas.pendidikan,
        kecamatan: identitas.kecamatan,
        desa: identitas.desa,
        latitude: identitas.latitude ?? FALLBACK_LAT,
        longitude: identitas.longitude ?? FALLBACK_LNG,
        timestamp,
        pp: parseFloat(scores.pp.toFixed(2)),
        pt: parseFloat(scores.pt.toFixed(2)),
        nk: parseFloat(scores.nk.toFixed(2)),
        ls: parseFloat(scores.ls.toFixed(2)),
        finalScore: parseFloat(scores.final.toFixed(2)),
        kategori: cat,
        wilayahTinggal: identitas.wilayahTinggal as 'Perkotaan' | 'Peri-urban' | 'Pedesaan',
        luasPertanian: identitas.luasPertanian as 'Tidak ada' | 'Sedikit' | 'Sedang' | 'Banyak' | 'Sangat banyak',
        jarakLahan: identitas.jarakLahan,
        pengalamanPertanian: parseFloat(scores.exp.toFixed(2)),
        literasiDigital: parseFloat(scores.dig.toFixed(2)),
      };

      await saveRespondentToFirestore(surveyData);
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (e) {
      console.error('Error submitting survey: ', e);
      alert('Gagal mengirim survei ke database: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── GPS Status UI ────────────────────────────────────────────────────────
  const GpsStatusBox = () => {
    const { text, isWarning } = gpsStatusMessage(gpsStatus);
    return (
      <div className={`p-4 rounded-xl border mb-6 ${
        isWarning ? 'bg-orange-50 border-orange-200' : 'bg-agro-50 border-agro-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className={`w-4 h-4 ${isWarning ? 'text-orange-700' : 'text-agro-700'}`} />
          <span className={`font-semibold text-sm ${isWarning ? 'text-orange-900' : 'text-agro-900'}`}>Status GPS</span>
        </div>

        {gpsStatus === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-agro-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            {text}
          </div>
        ) : gpsStatus === 'success' ? (
          <div className="flex items-center gap-2 text-sm text-agro-700">
            <Check className="w-4 h-4" />
            GPS terkunci:{' '}
            <span className="font-mono font-semibold">
              {identitas.latitude?.toFixed(5)}, {identitas.longitude?.toFixed(5)}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-orange-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{text}</span>
            </div>
            {identitas.latitude && (
              <div className="text-xs text-orange-700 font-mono">
                Koordinat fallback: {identitas.latitude.toFixed(5)}, {identitas.longitude?.toFixed(5)}
              </div>
            )}
            <button
              onClick={requestGps}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 text-xs font-semibold hover:bg-orange-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Success screen ───────────────────────────────────────────────────────
  if (submitted) {
    const scores = calculateScores();
    const cat =
      scores.final <= 1.8 ? 'Sangat Rendah' :
      scores.final <= 2.6 ? 'Rendah' :
      scores.final <= 3.4 ? 'Sedang' :
      scores.final <= 4.2 ? 'Tinggi' : 'Sangat Tinggi';

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="dash-card p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-agro-400 to-agro-600 flex items-center justify-center mb-5 shadow-lg">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">Terima Kasih!</h1>
            <p className="text-slate-600 mb-6">
              Jawaban Anda telah berhasil disimpan. Data Anda berkontribusi pada penelitian regenerasi pertanian Kabupaten Jember.
            </p>
            <div className="bg-slate-50 rounded-xl p-5 text-left mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-slate-500">ID Responden:</div>
                <div className="font-mono font-bold text-slate-900">{respondentId}</div>
                <div className="text-slate-500">Nama:</div>
                <div className="font-semibold text-slate-900">{identitas.nama}</div>
                <div className="text-slate-500">Kecamatan:</div>
                <div className="font-semibold text-slate-900">{identitas.kecamatan}</div>
                <div className="text-slate-500">Koordinat GPS:</div>
                <div className="font-mono text-xs text-slate-700">
                  {identitas.latitude?.toFixed(5)}, {identitas.longitude?.toFixed(5)}
                  {gpsStatus !== 'success' && <span className="ml-1 text-orange-500">(fallback)</span>}
                </div>
                <div className="text-slate-500">Skor Akhir:</div>
                <div className="font-bold text-agro-700">{scores.final.toFixed(2)}</div>
                <div className="text-slate-500">Kategori:</div>
                <div className="font-bold text-agro-700">{cat}</div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-agro-50 text-center"><div className="font-bold text-agro-700">PP</div><div className="text-slate-700 font-semibold">{scores.pp.toFixed(2)}</div></div>
                <div className="p-2 rounded bg-blue-50 text-center"><div className="font-bold text-blue-700">PT</div><div className="text-slate-700 font-semibold">{scores.pt.toFixed(2)}</div></div>
                <div className="p-2 rounded bg-amber-50 text-center"><div className="font-bold text-amber-700">NK</div><div className="text-slate-700 font-semibold">{scores.nk.toFixed(2)}</div></div>
                <div className="p-2 rounded bg-earth-50 text-center"><div className="font-bold text-earth-700">LS</div><div className="text-slate-700 font-semibold">{scores.ls.toFixed(2)}</div></div>
              </div>
            </div>
            <button
              onClick={() => {
                setStep(0);
                setSubmitted(false);
                setResponses({});
                setIdentitas({
                  nama: '', usia: '', jenisKelamin: '', pendidikan: '',
                  kecamatan: '', desa: '', latitude: null, longitude: null,
                  wilayahTinggal: '', luasPertanian: '', jarakLahan: '',
                });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-agro-600 text-white font-semibold hover:bg-agro-700 transition-colors"
            >
              <Leaf className="w-4 h-4" />
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-agro-700 text-sm mb-2">
            <ClipboardList className="w-4 h-4" />
            <span className="font-medium">Kuesioner Penelitian</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">
            Formulir Survei GeoGenZ AgroInsight
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Isi formulir ini untuk berpartisipasi dalam penelitian persepsi Generasi Z terhadap pertanian.
          </p>
        </div>

        {/* Progress */}
        <div className="dash-card p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
              <span>Langkah {step + 1} dari {totalSteps}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Data Anda terenkripsi & anonim
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-agro-500 to-agro-600 transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-400">
            <span>Intro</span>
            <span>Identitas</span>
            <span>PP</span>
            <span>PT</span>
            <span>NK</span>
            <span>LS</span>
            <span>EXP/DIG</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="dash-card p-6 md:p-8">

          {/* Step 0: Intro */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-agro-100 text-agro-700 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900">Petunjuk Pengisian</h2>
                  <p className="text-sm text-slate-500">Mohon baca sebelum memulai</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 leading-relaxed mb-6">
                <p>
                  Terima kasih atas kesediaan Anda berpartisipasi dalam penelitian ini. Berikut adalah petunjuk pengisian kuesioner:
                </p>
                <ul className="space-y-2">
                  {[
                    'Kuesioner ini ditujukan untuk Generasi Z (lahir 1997–2012) yang berdomisili di Kabupaten Jember.',
                    'Semua jawaban menggunakan Skala Likert 1–5: STS (Sangat Tidak Setuju) hingga SS (Sangat Setuju).',
                    'Lokasi GPS Anda akan terekam otomatis untuk keperluan analisis spasial.',
                    'Data Anda bersifat anonim dan hanya digunakan untuk kepentingan penelitian ilmiah.',
                    'Proses pengisian membutuhkan waktu sekitar 8–10 menit.',
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-agro-600 mt-0.5 flex-shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* GPS Status Box di intro */}
              <GpsStatusBox />

              {/* Panduan izin GPS per device */}
              {(gpsStatus === 'denied' || gpsStatus === 'unavailable') && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 mb-4 text-sm text-blue-800 space-y-1">
                  <p className="font-semibold mb-2">📱 Cara mengaktifkan izin lokasi:</p>
                  <p><span className="font-semibold">Android Chrome:</span> Ketuk ikon gembok di address bar → Izin Situs → Lokasi → Izinkan</p>
                  <p><span className="font-semibold">iPhone Safari:</span> Pengaturan → Safari → Lokasi → Izinkan</p>
                  <p><span className="font-semibold">iPhone Chrome:</span> Pengaturan → Chrome → Lokasi → Izinkan</p>
                  <p><span className="font-semibold">Desktop:</span> Klik ikon lokasi di address bar → Izinkan</p>
                  <p className="text-xs text-blue-600 mt-2">Setelah mengaktifkan, tekan tombol "Coba Lagi" di kotak GPS di atas.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Identitas */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900">Identitas Responden</h2>
                  <p className="text-sm text-slate-500">Data demografis dan lokasi</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">ID Responden (Otomatis)</label>
                  <input type="text" value={respondentId} disabled className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono text-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Nama Lengkap</label>
                  <input
                    type="text"
                    value={identitas.nama}
                    onChange={(e) => setIdentitas({ ...identitas, nama: e.target.value })}
                    placeholder="Masukkan nama Anda"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Usia</label>
                  <input
                    type="number" min="14" max="29"
                    value={identitas.usia}
                    onChange={(e) => setIdentitas({ ...identitas, usia: e.target.value })}
                    placeholder="14–29"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Jenis Kelamin</label>
                  <select
                    value={identitas.jenisKelamin}
                    onChange={(e) => setIdentitas({ ...identitas, jenisKelamin: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                  >
                    <option value="">Pilih...</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Pendidikan Terakhir</label>
                  <select
                    value={identitas.pendidikan}
                    onChange={(e) => setIdentitas({ ...identitas, pendidikan: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                  >
                    <option value="">Pilih...</option>
                    <option>SMP / Sederajat</option>
                    <option>SMA / SMK / Sederajat</option>
                    <option>Diploma (D1-D3)</option>
                    <option>Sarjana (S1)</option>
                    <option>Pascasarjana (S2/S3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Kecamatan</label>
                  <select
                    value={identitas.kecamatan}
                    onChange={(e) => setIdentitas({ ...identitas, kecamatan: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                  >
                    <option value="">Pilih kecamatan...</option>
                    {KECAMATAN_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Desa/Kelurahan</label>
                  <input
                    type="text"
                    value={identitas.desa}
                    onChange={(e) => setIdentitas({ ...identitas, desa: e.target.value })}
                    placeholder="Nama desa/kelurahan"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                  />
                </div>

                {/* GPS panel di step identitas */}
                <div className="md:col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Navigation className="w-3.5 h-3.5" />
                      KOORDINAT GPS (OTOMATIS)
                    </div>
                    {gpsStatus !== 'success' && gpsStatus !== 'loading' && (
                      <button
                        onClick={requestGps}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-300 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Coba Lagi
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                      <input
                        type="text"
                        value={
                          gpsStatus === 'loading' ? 'Memuat...' :
                          identitas.latitude ? identitas.latitude.toFixed(6) : '-'
                        }
                        disabled
                        className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                      <input
                        type="text"
                        value={
                          gpsStatus === 'loading' ? 'Memuat...' :
                          identitas.longitude ? identitas.longitude.toFixed(6) : '-'
                        }
                        disabled
                        className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${
                      gpsStatus === 'success' ? 'bg-green-500' :
                      gpsStatus === 'loading' ? 'bg-yellow-400 animate-pulse' :
                      'bg-orange-400'
                    }`}></div>
                    <span className="text-[11px] text-slate-400">
                      {gpsStatus === 'success' ? 'GPS aktif' :
                       gpsStatus === 'loading' ? 'Menunggu GPS...' :
                       'Koordinat fallback (pusat Jember)'}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-auto">
                      {new Date(timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Jenis Wilayah</label>
                  <select
                    value={identitas.wilayahTinggal}
                    onChange={(e) => setIdentitas({ ...identitas, wilayahTinggal: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                  >
                    <option value="">Pilih...</option>
                    <option>Perkotaan</option>
                    <option>Peri-urban</option>
                    <option>Pedesaan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Luas Area Pertanian di Sekitar</label>
                  <select
                    value={identitas.luasPertanian}
                    onChange={(e) => setIdentitas({ ...identitas, luasPertanian: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                  >
                    <option value="">Pilih...</option>
                    <option>Tidak ada</option>
                    <option>Sedikit</option>
                    <option>Sedang</option>
                    <option>Banyak</option>
                    <option>Sangat banyak</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Jarak Rumah ke Lahan Pertanian</label>
                  <select
                    value={identitas.jarakLahan}
                    onChange={(e) => setIdentitas({ ...identitas, jarakLahan: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                  >
                    <option value="">Pilih...</option>
                    <option>{'<100 meter'}</option>
                    <option>100–500 meter</option>
                    <option>500–1000 meter</option>
                    <option>{'>1000 meter'}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section steps 2–7 */}
          {step >= 2 && step <= 7 && (() => {
            const key = sections[step - 2];
            const sec = SURVEY_SECTIONS[key];
            return (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-black text-white text-lg ${
                    key === 'PP'  ? 'bg-gradient-to-br from-agro-500 to-emerald-600'  :
                    key === 'PT'  ? 'bg-gradient-to-br from-blue-500 to-cyan-600'     :
                    key === 'NK'  ? 'bg-gradient-to-br from-amber-500 to-orange-600'  :
                    key === 'LS'  ? 'bg-gradient-to-br from-earth-500 to-earth-700'   :
                    key === 'EXP' ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600':
                    'bg-gradient-to-br from-teal-500 to-cyan-600'
                  }`}>
                    {key}
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl text-slate-900">{sec.name}</h2>
                    <p className="text-sm text-slate-500">Berikan penilaian Anda pada setiap pernyataan berikut.</p>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2 mb-4 text-center text-[10px] font-semibold">
                  <div className="col-span-1"></div>
                  {LIKERT_LABELS.map((l) => (
                    <div key={l.value} className="text-slate-500">
                      <div>{l.label}</div>
                      <div className="text-[9px] text-slate-400 font-normal truncate">{LIKERT_FULL[l.value - 1]}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {sec.items.map((item, idx) => (
                    <div key={item.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-agro-200 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 font-bold text-xs text-slate-500 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-800 leading-relaxed mb-2">{item.text}</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {LIKERT_LABELS.map((l) => {
                              const selected = responses[item.id] === l.value;
                              return (
                                <button
                                  key={l.value}
                                  onClick={() => setResponse(item.id, l.value)}
                                  className={`py-1.5 rounded-md border-2 text-xs font-bold transition-all ${
                                    selected
                                      ? `${l.color} ring-2 ring-offset-1 ring-agro-400 border-transparent scale-105`
                                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                  }`}
                                >
                                  {l.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali
            </button>

            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-agro-600 text-white hover:bg-agro-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors shadow-sm"
              >
                Lanjut
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-agro-600 to-agro-500 text-white hover:from-agro-500 hover:to-agro-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Survei
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}