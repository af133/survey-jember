// Mock data for GeoGenZ AgroInsight
// Jember Regency, East Java, Indonesia

export const KECAMATAN_LIST = [
  'Kaliwates', 'Sumbersari', 'Patrang', 'Jember Kidul', 'Jember Lor',
  'Kebonsari', 'Bangsalsari', 'Panti', 'Sukowono', 'Ledokombo',
  'Sumberjambe', 'Arjasa', 'Pakusari', 'Kalisat', 'Gumukmas',
  'Ambulu', 'Rambipuji', 'Balung', 'Umbulsari', 'Semboro',
  'Jelbuk', 'Tanggul', 'Bangsalsari', 'Puger', 'Wuluhan'
];

export const KECAMATAN_COORDS: Record<string, [number, number]> = {
  'Kaliwates': [-8.1721, 113.6996],
  'Sumbersari': [-8.1667, 113.7167],
  'Patrang': [-8.1500, 113.7000],
  'Jember Kidul': [-8.1920, 113.7015],
  'Jember Lor': [-8.1550, 113.6850],
  'Kebonsari': [-8.1833, 113.6667],
  'Bangsalsari': [-8.2500, 113.5667],
  'Panti': [-8.1333, 113.6167],
  'Sukowono': [-8.0833, 113.6500],
  'Ledokombo': [-8.1167, 113.7667],
  'Sumberjambe': [-8.0667, 113.8167],
  'Arjasa': [-8.1167, 113.5833],
  'Pakusari': [-8.0833, 113.7333],
  'Kalisat': [-8.0333, 113.8000],
  'Gumukmas': [-8.2667, 113.5167],
  'Ambulu': [-8.3500, 113.6000],
  'Rambipuji': [-8.3000, 113.6667],
  'Balung': [-8.3000, 113.5333],
  'Umbulsari': [-8.2333, 113.4833],
  'Semboro': [-8.2500, 113.4333],
  'Jelbuk': [-8.1000, 113.8500],
  'Tanggul': [-8.2833, 113.4667],
  'Puger': [-8.3833, 113.5333],
  'Wuluhan': [-8.3333, 113.5500],
};

// Bounds of Jember Regency
export const JEMBER_BOUNDS: [[number, number], [number, number]] = [
  [-8.45, 113.40],
  [-8.00, 113.90]
];

export interface Respondent {
  id: string;
  nama: string;
  usia: number;
  jenisKelamin: 'L' | 'P';
  pendidikan: string;
  kecamatan: string;
  desa: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  // Variable scores
  pp: number;  // Persepsi Pertanian (1-5)
  pt: number;  // Persepsi Teknologi (1-5)
  nk: number;  // Niat Keterlibatan (1-5)
  ls: number;  // Lingkungan Spasial (1-5)
  finalScore: number;
  kategori: 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Tinggi';
  // Additional
  wilayahTinggal: 'Perkotaan' | 'Peri-urban' | 'Pedesaan';
  luasPertanian: 'Tidak ada' | 'Sedikit' | 'Sedang' | 'Banyak' | 'Sangat banyak';
  jarakLahan: string;
  pengalamanPertanian: number;
  literasiDigital: number;
}

const pendidikanOptions = ['SMA/SMK', 'Diploma (D1-D3)', 'S1', 'S2'];
const wilayahOptions: Array<'Perkotaan' | 'Peri-urban' | 'Pedesaan'> = ['Perkotaan', 'Peri-urban', 'Pedesaan'];
const luasOptions: Array<'Tidak ada' | 'Sedikit' | 'Sedang' | 'Banyak' | 'Sangat banyak'> = ['Tidak ada', 'Sedikit', 'Sedang', 'Banyak', 'Sangat banyak'];
const jarakOptions = ['<100 meter', '100–500 meter', '500–1000 meter', '>1000 meter'];

const namaDepan = ['Ahmad', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko',
  'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oki', 'Putri', 'Qori', 'Rizal', 'Siti', 'Tio',
  'Umi', 'Vina', 'Wawan', 'Xena', 'Yoga', 'Zainab', 'Arif', 'Bella', 'Cahya', 'Dina'];
const namaBelakang = ['Pratama', 'Saputra', 'Wijaya', 'Nugroho', 'Setiawan', 'Permata', 'Anggraini',
  'Wibowo', 'Santoso', 'Hidayat', 'Rahmawati', 'Putra', 'Maharani', 'Handayani', 'Safitri'];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function getScoreCategory(score: number): Respondent['kategori'] {
  if (score <= 1.80) return 'Sangat Rendah';
  if (score <= 2.60) return 'Rendah';
  if (score <= 3.40) return 'Sedang';
  if (score <= 4.20) return 'Tinggi';
  return 'Sangat Tinggi';
}

function getCategoryColor(cat: Respondent['kategori']): string {
  switch (cat) {
    case 'Sangat Rendah': return '#dc2626';
    case 'Rendah': return '#f97316';
    case 'Sedang': return '#eab308';
    case 'Tinggi': return '#22c55e';
    case 'Sangat Tinggi': return '#2563eb';
  }
}

export { getCategoryColor };

export function generateMockRespondents(count: number = 240): Respondent[] {
  const rand = seededRandom(42);
  const kecamatanNames = Object.keys(KECAMATAN_COORDS);
  const respondents: Respondent[] = [];

  for (let i = 0; i < count; i++) {
    const kecamatan = kecamatanNames[Math.floor(rand() * kecamatanNames.length)];
    const baseCoord = KECAMATAN_COORDS[kecamatan];
    // Jitter the location
    const lat = baseCoord[0] + (rand() - 0.5) * 0.08;
    const lng = baseCoord[1] + (rand() - 0.5) * 0.08;

    // Generate likert scores
    const pp = 2.2 + rand() * 2.3;
    const pt = 2.5 + rand() * 2.2;
    const nk = 2.0 + rand() * 2.4;
    const ls = 1.8 + rand() * 2.5;
    const exp = 1.5 + rand() * 3.0;
    const lit = 2.0 + rand() * 2.5;
    const finalScore = (pp + pt + nk + ls) / 4;

    const age = 17 + Math.floor(rand() * 13); // 17-29
    const gend: 'L' | 'P' = rand() > 0.48 ? 'L' : 'P';

    respondents.push({
      id: `R-${String(i + 1).padStart(4, '0')}`,
      nama: `${namaDepan[Math.floor(rand() * namaDepan.length)]} ${namaBelakang[Math.floor(rand() * namaBelakang.length)]}`,
      usia: age,
      jenisKelamin: gend,
      pendidikan: pendidikanOptions[Math.floor(rand() * pendidikanOptions.length)],
      kecamatan,
      desa: `Desa ${Math.floor(rand() * 5) + 1}`,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      timestamp: new Date(Date.now() - Math.floor(rand() * 60 * 24 * 60 * 60 * 1000)).toISOString(),
      pp: parseFloat(pp.toFixed(2)),
      pt: parseFloat(pt.toFixed(2)),
      nk: parseFloat(nk.toFixed(2)),
      ls: parseFloat(ls.toFixed(2)),
      finalScore: parseFloat(finalScore.toFixed(2)),
      kategori: getScoreCategory(finalScore),
      wilayahTinggal: wilayahOptions[Math.floor(rand() * wilayahOptions.length)],
      luasPertanian: luasOptions[Math.floor(rand() * luasOptions.length)],
      jarakLahan: jarakOptions[Math.floor(rand() * jarakOptions.length)],
      pengalamanPertanian: parseFloat(exp.toFixed(2)),
      literasiDigital: parseFloat(lit.toFixed(2)),
    });
  }
  return respondents;
}

// Survey questions
export const SURVEY_SECTIONS = {
  PP: {
    name: 'Persepsi terhadap Pertanian',
    short: 'PP',
    items: [
      { id: 'PP1', text: 'Saya memandang pertanian sebagai sektor pekerjaan yang penting.' },
      { id: 'PP2', text: 'Pertanian memiliki peluang karier yang baik di masa depan.' },
      { id: 'PP3', text: 'Generasi muda masih memiliki peran penting dalam pertanian.' },
      { id: 'PP4', text: 'Sektor pertanian dapat memberikan penghasilan yang layak.' },
      { id: 'PP5', text: 'Pertanian memiliki potensi ekonomi yang menjanjikan.' },
      { id: 'PP6', text: 'Bekerja di sektor pertanian tetap memiliki nilai sosial yang baik.' },
      { id: 'PP7', text: 'Lingkungan sekitar saya mendukung generasi muda untuk terlibat di pertanian.' },
    ]
  },
  PT: {
    name: 'Persepsi Teknologi Pertanian',
    short: 'PT',
    items: [
      { id: 'PT1', text: 'Teknologi digital dapat meningkatkan sektor pertanian.' },
      { id: 'PT2', text: 'Penggunaan teknologi membuat pertanian lebih menarik bagi generasi muda.' },
      { id: 'PT3', text: 'Saya tertarik pada konsep smart farming atau pertanian digital.' },
      { id: 'PT4', text: 'Saya tertarik mempelajari teknologi pertanian modern.' },
      { id: 'PT5', text: 'Teknologi membuka peluang karier baru di bidang pertanian.' },
      { id: 'PT6', text: 'Pertanian berbasis teknologi cocok dengan karakter Generasi Z.' },
    ]
  },
  NK: {
    name: 'Niat Keterlibatan Pertanian',
    short: 'NK',
    items: [
      { id: 'NK1', text: 'Saya tertarik bekerja di sektor pertanian.' },
      { id: 'NK2', text: 'Saya tertarik membangun usaha berbasis pertanian.' },
      { id: 'NK3', text: 'Saya mempertimbangkan sektor pertanian sebagai pilihan masa depan.' },
      { id: 'NK4', text: 'Saya bersedia mencoba kegiatan pertanian modern.' },
      { id: 'NK5', text: 'Generasi muda perlu berkontribusi pada pertanian daerah.' },
      { id: 'NK6', text: 'Pertanian penting bagi pembangunan wilayah Kabupaten Jember.' },
    ]
  },
  LS: {
    name: 'Kondisi Spasial & Lingkungan',
    short: 'LS',
    items: [
      { id: 'LS1', text: 'Tempat tinggal saya berada dekat dengan area pertanian.' },
      { id: 'LS2', text: 'Keluarga saya memiliki hubungan dengan sektor pertanian.' },
      { id: 'LS3', text: 'Saya sering melihat aktivitas pertanian di sekitar tempat tinggal saya.' },
      { id: 'LS4', text: 'Sebagian masyarakat di sekitar tempat tinggal saya bekerja di sektor pertanian.' },
      { id: 'LS5', text: 'Wilayah tempat tinggal saya memiliki potensi pertanian yang baik.' },
      { id: 'LS6', text: 'Pertanian masih menjadi sektor penting di wilayah tempat tinggal saya.' },
    ]
  },
  EXP: {
    name: 'Pengalaman Pertanian',
    short: 'EXP',
    items: [
      { id: 'EXP1', text: 'Saya pernah terlibat dalam kegiatan pertanian.' },
      { id: 'EXP2', text: 'Saya pernah membantu keluarga dalam kegiatan pertanian.' },
      { id: 'EXP3', text: 'Orang tua atau anggota keluarga bekerja di sektor pertanian.' },
      { id: 'EXP4', text: 'Saya pernah mengikuti pelatihan atau kegiatan pertanian.' },
      { id: 'EXP5', text: 'Saya memiliki pengalaman menanam tanaman.' },
      { id: 'EXP6', text: 'Saya memiliki minat terhadap usaha pertanian.' },
    ]
  },
  DIG: {
    name: 'Literasi Digital Pertanian',
    short: 'DIG',
    items: [
      { id: 'DIG1', text: 'Saya mengetahui konsep smart farming.' },
      { id: 'DIG2', text: 'Saya mengetahui penggunaan drone dalam pertanian.' },
      { id: 'DIG3', text: 'Saya mengetahui penggunaan Internet of Things (IoT) dalam pertanian.' },
      { id: 'DIG4', text: 'Saya pernah menggunakan aplikasi pertanian digital.' },
      { id: 'DIG5', text: 'Saya mengikuti konten pertanian di media sosial.' },
      { id: 'DIG6', text: 'Saya percaya teknologi digital akan menjadi bagian penting dari pertanian masa depan.' },
    ]
  }
};
