import {
  BookOpen, Target, FlaskConical, Database, MapPin,
  Users, Award, Server, Globe, Quote, CheckCircle2,
  Sprout, Code,
  Layers, Zap, BarChart3
} from 'lucide-react';

export default function About() {
  const variables = [
    {
      kode: 'PP',
      nama: 'Persepsi terhadap Pertanian',
      warna: 'from-green-500 to-emerald-600',
      indikator: ['Citra pertanian', 'Persepsi ekonomi', 'Persepsi sosial'],
      item: 7,
    },
    {
      kode: 'PT',
      nama: 'Persepsi Teknologi Pertanian',
      warna: 'from-blue-500 to-cyan-600',
      indikator: ['Modernisasi', 'Kesiapan teknologi', 'Integrasi teknologi & karier'],
      item: 6,
    },
    {
      kode: 'NK',
      nama: 'Niat Keterlibatan dalam Pertanian',
      warna: 'from-amber-500 to-orange-600',
      indikator: ['Ketertarikan', 'Keterlibatan masa depan', 'Kontribusi wilayah'],
      item: 6,
    },
    {
      kode: 'LS',
      nama: 'Kondisi Spasial & Lingkungan',
      warna: 'from-earth-500 to-earth-700',
      indikator: ['Kedekatan lahan', 'Keterkaitan keluarga', 'Aktivitas pertanian sekitar'],
      item: 6,
    },
  ];

  const tech = [
    { name: 'React', desc: 'Frontend library', icon: Code, color: 'text-blue-500' },
    { name: 'Vite', desc: 'Frontend build tool', icon: Zap, color: 'text-purple-500' },
    { name: 'Firebase', desc: 'Backend & Database', icon: Database, color: 'text-yellow-500' },
    { name: 'TypeScript', desc: 'Type-safe JavaScript', icon: Code, color: 'text-blue-700' },
    { name: 'Leaflet.js', desc: 'Interactive maps', icon: MapPin, color: 'text-agro-600' },
    { name: 'Chart.js', desc: 'Data visualization', icon: BarChart3, color: 'text-pink-500' },
    { name: 'Tailwind CSS', desc: 'Utility-first styling', icon: Sprout, color: 'text-cyan-500' },
    { name: 'OpenStreetMap', desc: 'Basemap provider', icon: Globe, color: 'text-green-600' },
  ];

  const team = [
    { name: 'Erik Yohan Kartiko, S.Pd., M.Kom.', role: 'Ketua Peneliti', affiliation: 'Fakultas Ilmu Komputer', img: '👨‍🏫' },
    { name: 'Prof. Dr. Saiful Bukhori, S.T., M.Kom.', role: 'Ahli Intelligent Multimedia System',  affiliation: 'Fakultas Ilmu Komputer', img: '👩‍🏫' },
    { name: 'Andre Firmansyah', role: 'Asisten Peneliti', affiliation: 'Fakultas Ilmu Komputer', img: '👨‍💻' },
    { name: 'Randy Putranto', role: 'Asisten Peneliti', affiliation: 'Fakultas Ilmu Komputer', img: '👨‍💻' },
  ];

  const outputs = [
    { label: 'Jurnal Internasional Bereputasi', count: '2 artikel' },
    { label: 'Prosiding Seminar Nasional', count: '1 artikel' },
    { label: 'Platform WebGIS Open Source', count: '1 sistem' },
    { label: 'Dataset Spasial Terbuka', count: '1 paket' },
    { label: 'Peta Tematik Zonasi', count: '4 lembar peta' },
    { label: 'Buku Ajar / Modul', count: '1 buku' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Page Header */}
      <section className="bg-gradient-to-br from-agro-900 via-agro-800 to-earth-800 text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-center gap-2 text-agro-200 text-sm mb-3">
            <BookOpen className="w-4 h-4" />
            <span>Tentang Penelitian</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">
            Model Geoinformatika untuk Analisis Persepsi
            <span className="text-agro-300"> Generasi Z</span>
          </h1>
          <p className="text-agro-100 max-w-3xl text-lg leading-relaxed">
            Penelitian berbasis WebGIS untuk menganalisis persepsi Generasi Z terhadap potensi wilayah lokal
            dan merumuskan zona peluang regenerasi pertanian di Kabupaten Jember.
          </p>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Latar Belakang */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-agro-100 text-agro-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Latar Belakang Penelitian</h2>
          </div>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-3 leading-relaxed">
            <p>
              Regenerasi petani merupakan salah satu tantangan utama dalam pembangunan pertanian berkelanjutan. Menurunnya minat generasi muda terhadap sektor pertanian dapat berdampak pada keberlanjutan produksi pangan di masa depan. Di sisi lain, Generasi Z sebagai generasi digital memiliki karakteristik yang dekat dengan teknologi dan inovasi, sehingga berpotensi menjadi aktor penting dalam transformasi pertanian modern.

            </p>
            <p>
              Perkembangan teknologi geoinformatika dan penginderaan jauh memungkinkan analisis potensi wilayah pertanian secara objektif. Namun, kajian mengenai persepsi generasi muda terhadap sektor pertanian masih banyak dilakukan secara non-spasial. Oleh karena itu, penelitian ini mengintegrasikan aspek sosial dan biofisik wilayah dalam suatu model komputasional geospasial.
            </p>
          </div>
        </div>

        {/* Tujuan */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-earth-100 text-earth-700 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Tujuan Penelitian</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              'Menganalisis persepsi Generasi Z terhadap sektor pertanian di Kabupaten Jember.',
              'Mengubah data persepsi menjadi informasi spasial melalui interpolasi spasial.',
              'Memodelkan potensi wilayah pertanian menggunakan data penginderaan jauh dan data statistik pertanian.',
              'Mengintegrasikan faktor sosial dan biofisik dalam suatu model geospasial.',
              'Menghasilkan peta zona peluang regenerasi pertanian sebagai proof of concept model pada Tingkat Kesiapterapan Teknologi (TKT) 3',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <CheckCircle2 className="w-5 h-5 text-agro-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Variabel Penelitian */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Variabel Penelitian</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {variables.map((v, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl border border-slate-200 p-5 bg-white">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${v.warna}`}></div>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${v.warna} flex items-center justify-center flex-shrink-0`}>
                    <span className="font-display font-black text-white text-lg">{v.kode}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-slate-900 mb-2">{v.nama}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {v.indikator.map((ind, j) => (
                        <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {ind}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500">{v.item} butir pertanyaan Skala Likert 1–5</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2 text-sm">Perhitungan Skor</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 block mb-2">
                  FinalScore = (PP_score + PT_score + NK_score + LS_score) / 4
                </code>
                <p className="text-xs text-slate-500">Skor rata-rata dari 4 variabel utama.</p>
              </div>
              <div className="grid grid-cols-5 gap-1 text-[11px] text-center">
                <div className="p-2 rounded bg-red-50 text-red-700"><div className="font-bold">1.00–1.80</div>Sangat Rendah</div>
                <div className="p-2 rounded bg-orange-50 text-orange-700"><div className="font-bold">1.81–2.60</div>Rendah</div>
                <div className="p-2 rounded bg-yellow-50 text-yellow-700"><div className="font-bold">2.61–3.40</div>Sedang</div>
                <div className="p-2 rounded bg-green-50 text-green-700"><div className="font-bold">3.41–4.20</div>Tinggi</div>
                <div className="p-2 rounded bg-blue-50 text-blue-700"><div className="font-bold">4.21–5.00</div>Sangat Tinggi</div>
              </div>
            </div>
          </div>
        </div>

        {/* Metode Penelitian */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Metode Penelitian</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: 'Pengumpulan Data Persepsi',
                desc: 'Survei geotagged berbasis lokasi kepada Generasi Z untuk memperoleh data persepsi terhadap sektor pertanian beserta koordinat geografis responden.',
                icon: Users
              },
              {
                title: 'Transformasi Data Spasial',
                desc: 'Data survei diubah menjadi titik spasial menggunakan koordinat GPS sehingga dapat dianalisis dalam lingkungan Sistem Informasi Geografis (SIG).',
                icon: MapPin
              },
              {
                title: 'Interpolasi Spasial',
                desc: 'Metode Inverse Distance Weighting (IDW) digunakan untuk membentuk permukaan persepsi Generasi Z dan memetakan pola persebarannya secara spasial.',
                icon: Target
              },
              {
                title: 'Pemodelan Potensi Pertanian',
                desc: 'Analisis dilakukan menggunakan citra Sentinel-2, data statistik pertanian time series, dan pengolahan spasial berbasis SIG untuk mengidentifikasi potensi wilayah pertanian.',
                icon: BookOpen
              },
              {
                title: 'Integrasi Layer Geospasial',
                desc: 'Layer persepsi Generasi Z dan layer potensi wilayah pertanian diintegrasikan untuk menghasilkan zona peluang regenerasi petani di Kabupaten Jember.',
                icon: Layers
              }
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center mb-3 shadow-sm">
                    <Icon className="w-5 h-5 text-agro-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{m.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wilayah Studi */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-earth-100 text-earth-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Wilayah Studi: Kabupaten Jember</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3 text-slate-600 text-sm leading-relaxed">
              <p>
                Kabupaten Jember terletak di wilayah tapal kuda Jawa Timur pada posisi 7°58'–8°33' LS dan 113°16'–114°00' BT,
                dengan luas wilayah sekitar <strong>3.293 km²</strong> dan terdiri dari <strong>31 kecamatan</strong>.
              </p>
              <p>
                Wilayah ini memiliki topografi bervariasi mulai dari dataran rendah di pesisir selatan hingga perbukitan dan
                pegunungan di bagian utara (Gunung Argopuro, Raung, dan Hyang). Potensi pertanian meliputi padi, tembakau
                cerutu, kopi robusta, kakao, tebu, dan berbagai tanaman hortikultura.
              </p>
              <p>
                Jember juga dikenal sebagai <em>Kota Tembakau</em> dan memiliki kawasan agropolitan yang menjadi
                tulang punggung perekonomian regional dengan populasi Generasi Z yang cukup besar.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Luas Wilayah', v: '3.293 km²' },
                { l: 'Kecamatan', v: '31' },
                { l: 'Kelurahan/Desa', v: '245' },
                { l: 'Populasi', v: '2.5 Juta' },
                { l: 'Luas Lahan Sawah', v: '63.472 ha' },
                { l: 'Gen Z (14–29)', v: '±32%' },
              ].map((d, i) => (
                <div key={i} className="p-3 rounded-lg bg-gradient-to-br from-agro-50 to-earth-50 border border-agro-100">
                  <div className="text-xs text-slate-500 mb-0.5">{d.l}</div>
                  <div className="font-display font-bold text-agro-800">{d.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Teknologi */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Teknologi yang Digunakan</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tech.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-agro-300 hover:shadow-md transition-all text-center">
                  <Icon className={`w-8 h-8 ${t.color} mx-auto mb-2`} />
                  <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tim */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Tim Peneliti</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {team.map((t, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                  {t.img}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm leading-tight">{t.name}</div>
                  <div className="text-xs text-agro-600 font-medium mt-1">{t.role}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.affiliation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Luaran */}
        <div className="dash-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900">Luaran Penelitian</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {outputs.map((o, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-agro-50 to-white border border-agro-100">
                <Award className="w-8 h-8 text-agro-600 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{o.label}</div>
                  <div className="text-xs text-agro-700 mt-0.5 font-medium">{o.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sitasi */}
        <div className="dash-card p-6 md:p-8 bg-gradient-to-br from-slate-50 to-agro-50 border-agro-200">
          <div className="flex items-center gap-3 mb-4">
            <Quote className="w-5 h-5 text-agro-700" />
            <h2 className="font-display font-bold text-xl text-slate-900">Sitasi Penelitian</h2>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-agro-500 text-sm text-slate-600 leading-relaxed font-mono">
            Kartiko, E. Y., Bukhori, S., Firmansyah, A., & Putranto, R. (2026). <em>Model Geoinformatika untuk Analisis Persepsi
            Generasi Z terhadap Potensi Wilayah Lokal Kabupaten Jember.</em>
            Laporan Penelitian. GeoGenZ AgroInsight.
          </div>
        </div>
      </div>
    </div>
  );
}
