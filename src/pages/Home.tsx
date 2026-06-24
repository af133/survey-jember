import {
  Leaf, MapPin, BarChart3, Users, Database, Map as MapIcon,
  Target, FlaskConical, BookOpen, Award, CheckCircle2,
  ChevronRight, Sprout, Smartphone, ArrowRight, Zap
} from 'lucide-react';

interface HomeProps {
  setCurrentPage: (page: string) => void;
}

export default function Home({ setCurrentPage }: HomeProps) {
  const stats = [
    { label: 'Total Responden', value: '240+', icon: Users, color: 'text-agro-600', bg: 'bg-agro-50' },
    { label: 'Kecamatan', value: '21', icon: MapPin, color: 'text-earth-600', bg: 'bg-earth-50' },
    { label: 'Variabel Penelitian', value: '4', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Akurasi Model', value: '87%', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const features = [
    {
      icon: MapPin,
      title: 'Akuisisi GPS Otomatis',
      desc: 'Lokasi responden terekam otomatis menggunakan GPS perangkat untuk akurasi spasial tinggi.'
    },
    {
      icon: MapIcon,
      title: 'Peta Interaktif Realtime',
      desc: 'Titik responden, heatmap, dan zona peluang divisualisasikan langsung di peta interaktif.'
    },
    {
      icon: BarChart3,
      title: 'Dashboard Statistik',
      desc: 'Visualisasi chart dan KPI penelitian dengan gaya dashboard ArcGIS profesional.'
    },
    {
      icon: FlaskConical,
      title: 'Interpolasi IDW',
      desc: 'Analisis spasial Inverse Distance Weighting untuk permukaan persepsi kontinu.'
    },
    {
      icon: Sprout,
      title: 'Zona Regenerasi',
      desc: 'Klasifikasi zona prioritas untuk mendukung regenerasi petani muda di Kabupaten Jember.'
    },
    {
      icon: Zap,
      title: 'Heatmap Multi-Variabel',
      desc: 'Heatmap terpisah untuk PP, PT, NK, dan LS dalam mengidentifikasi pola spasial.'
    },
  ];

  const methodology = [
    { num: '01', title: 'Studi Pustaka', desc: 'Mengkaji literatur tentang generasi Z, pertanian, dan geoinformatika.' },
    { num: '02', title: 'Desain Instrumen', desc: 'Kuesioner Likert dengan 4 variabel utama terstruktur dan teruji.' },
    { num: '03', title: 'Pengumpulan Data', desc: 'Survei online dengan akuisisi GPS otomatis pada responden Gen Z.' },
    { num: '04', title: 'Pengolahan Spasial', desc: 'Analisis heatmap dan interpolasi IDW di PostGIS + Leaflet.' },
    { num: '05', title: 'Pemodelan & Zonasi', desc: 'Klasifikasi zona peluang regenerasi pertanian berdasarkan skor.' },
    { num: '06', title: 'Visualisasi WebGIS', desc: 'Platform web interaktif dengan dashboard dan peta analitis.' },
  ];

  const outputs = [
    'Model Geoinformatika Persepsi Gen Z',
    'Dashboard WebGIS Interaktif',
    'Peta Zona Peluang Regenerasi Pertanian',
    'Peta Heatmap Persebaran Responden',
    'Hasil Interpolasi IDW',
    'Artikel Ilmiah Terindeks',
    'Dataset Spasial Terbuka',
    'Sistem Pendukung Keputusan',
  ];

  const team = [
    { name: 'Erik Yohan Kartiko, S.Pd., M.Kom.', role: 'Ketua Peneliti', img: '👨‍🏫' },
    { name: 'Prof. Dr. Saiful Bukhori, S.T., M.Kom.', role: 'Ahli Intelligent Multimedia System', img: '👩‍🏫' },
    { name: 'Andre Firmansyah', role: 'Asisten Peneliti', img: '👨‍💻' },
    { name: 'Randy Putranto', role: 'Asisten Peneliti', img: '👩‍🌾' },
  ];

  return (
    <div className="font-sans">
      {/* HERO */}
      <section className="bg-gradient-to-br from-slate-900 via-agro-950 to-agro-900 hero-pattern relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm mb-6">
                <div className="w-2 h-2 bg-agro-400 rounded-full animate-pulse" />
                <span>Penelitian Geoinformatika 2026</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 text-white">
                GeoGenZ <span className="text-agro-400">AgroInsight</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-200 leading-relaxed mb-8 max-w-xl">
                Platform WebGIS untuk Analisis Persepsi Generasi Z dan Peluang Regenerasi Pertanian
                <span className="text-agro-300 font-semibold"> Kabupaten Jember</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setCurrentPage('survey')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-agro-500 hover:bg-agro-400 text-white font-semibold shadow-lg shadow-agro-900/30 hover:shadow-agro-400/30 transition-all hover:-translate-y-0.5"
                >
                  <Smartphone className="w-5 h-5" />
                  Isi Survei
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold transition-all hover:-translate-y-0.5"
                >
                  <BarChart3 className="w-5 h-5" />
                  Lihat Dashboard
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/10">
                {stats.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                      </div>
                      <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                      <div className="text-xs text-slate-300">{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="flex-1 text-center text-xs text-slate-300 font-mono">WebGIS Dashboard Preview</div>
                </div>
                <div className="rounded-xl overflow-hidden aspect-video relative shadow-2xl border border-white/10 group bg-slate-900">
                  <img src="/dashboard-preview.png" alt="WebGIS Dashboard Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-xs text-slate-400">Skor Rata-rata</div>
                    <div className="text-lg font-bold text-agro-300">3.42</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-xs text-slate-400">Desa</div>
                    <div className="text-lg font-bold text-earth-300">148</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-xs text-slate-400">GPS Valid</div>
                    <div className="text-lg font-bold text-blue-300">96%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latar Belakang */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-50 text-agro-700 text-sm font-medium mb-4">
                <BookOpen className="w-4 h-4" />
                Latar Belakang
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-5 leading-tight">
                Regenerasi Petani & <br />
                <span className="text-agro-600">Persepsi Generasi Z</span>
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Kabupaten Jember merupakan salah satu lumbung pangan dan kawasan agropolitan penting di Jawa Timur.
                  Namun, minat generasi muda (Generasi Z) untuk berkarier di sektor pertanian terus menurun,
                  mengancam keberlanjutan sistem pertanian lokal.
                </p>
                <p>
                  Penelitian ini mengembangkan <strong className="text-slate-900">model geoinformatika</strong> untuk
                  memetakan persepsi Generasi Z terhadap potensi wilayah, mengintegrasikan data survei dengan analisis
                  spasial menggunakan teknologi WebGIS modern.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Populasi Gen Z', value: '32%', sub: 'dari total penduduk Jember' },
                { title: 'Penurunan Petani Muda', value: '-4.2%', sub: 'per tahun (BPS 2024)' },
                { title: 'Lahan Pertanian', value: '42%', sub: 'dari luas wilayah' },
                { title: 'Potensi Digital', value: '87%', sub: 'Gen Z aktif di teknologi' },
              ].map((c, i) => (
                <div key={i} className="dash-card p-5">
                  <div className="text-3xl font-display font-bold text-agro-600 mb-1">{c.value}</div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">{c.title}</div>
                  <div className="text-xs text-slate-500">{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-100 text-agro-700 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Fitur Platform
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Sistem Pendukung Keputusan Berbasis Geospasial
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Menggabungkan teknologi GPS, GIS, dan visualisasi data modern untuk penelitian yang akurat dan mudah diinterpretasi.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="dash-card p-6 group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-agro-500 to-agro-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Metodologi */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-earth-100 text-earth-700 text-sm font-medium mb-4">
              <FlaskConical className="w-4 h-4" />
              Metodologi
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Alur Penelitian Terstruktur
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {methodology.map((m, i) => (
              <div key={i} className="dash-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 text-7xl font-display font-black text-slate-50 leading-none pointer-events-none">
                  {m.num}
                </div>
                <h3 className="font-display font-bold text-slate-900 text-lg mb-2 relative">{m.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed relative">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Luaran */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-agro-900 to-agro-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern opacity-50"></div>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-4">
                <Award className="w-4 h-4" />
                Luaran Penelitian
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-5">
                Output Penelitian yang Diharapkan
              </h2>
              <p className="text-agro-100 leading-relaxed mb-6">
                Penelitian ini menghasilkan berbagai luaran ilmiah dan sistem yang dapat digunakan oleh pemangku kebijakan,
                peneliti, dan masyarakat untuk mendukung regenerasi pertanian Kabupaten Jember.
              </p>
              <button
                onClick={() => setCurrentPage('map')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-agro-700 font-semibold hover:bg-agro-50 transition-colors"
              >
                <MapIcon className="w-4 h-4" />
                Jelajahi Peta
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {outputs.map((o, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <CheckCircle2 className="w-5 h-5 text-agro-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{o}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tim Peneliti */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Tim Peneliti
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Tim Riset GeoGenZ
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((t, i) => (
              <div key={i} className="dash-card p-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-agro-100 to-earth-100 flex items-center justify-center text-4xl mb-4">
                  {t.img}
                </div>
                <h3 className="font-display font-bold text-slate-900 mb-1 text-sm leading-snug">{t.name}</h3>
                <p className="text-xs text-agro-600 font-medium">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Berpartisipasi dalam Penelitian
          </h2>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
            Generasi Z (kelahiran 1997–2012) yang berdomisili di Kabupaten Jember dapat mengisi kuesioner
            untuk mendukung penelitian ini. Data GPS akan terekam otomatis saat pengisian.
          </p>
          <button
            onClick={() => setCurrentPage('survey')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-agro-600 to-agro-500 hover:from-agro-500 hover:to-agro-400 text-white font-semibold shadow-lg shadow-agro-600/20 transition-all hover:-translate-y-0.5 text-lg"
          >
            <Leaf className="w-5 h-5" />
            Mulai Isi Survei Sekarang
          </button>
        </div>
      </section>
    </div>
  );
}
