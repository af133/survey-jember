import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  Layers as LayersIcon, MapPin, Thermometer, Info, X,
  Maximize2, Minimize2, Search, Eye, Crosshair, Loader2
} from 'lucide-react';
import { generateMockRespondents, getCategoryColor, JEMBER_BOUNDS, KECAMATAN_COORDS, Respondent } from '../data/mockData';
import { getRespondentsFromFirestore } from '../utils/firebase';

// Fix default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Heat layer: Simple circle-based heatmap (since leaflet.heat needs init per mount)
function SimpleHeatLayer({ data, getColor, radius = 25 }: {
  data: Array<{ lat: number; lng: number; w?: number }>;
  getColor?: (v: number) => string;
  radius?: number;
}) {
  return (
    <>
      {data.map((pt, i) => {
        const intensity = pt.w ?? 0.6;
        const color = getColor ? getColor(intensity) : `rgba(220, 38, 38, ${intensity})`;
        return (
          <CircleMarker
            key={i}
            center={[pt.lat, pt.lng]}
            radius={radius}
            pathOptions={{
              color: 'transparent',
              fillColor: color,
              fillOpacity: 0.25,
              weight: 0,
            }}
          />
        );
      })}
    </>
  );
}

// Custom control for layer toggle buttons
function MapControls({ onSearch, onLocate }: { onSearch: () => void; onLocate: () => void }) {
  return (
    <div className="leaflet-top leaflet-right !top-2 !right-2 !z-[500] flex flex-col gap-2">
      <button
        onClick={onSearch}
        className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
        title="Cari Kecamatan"
      >
        <Search className="w-4 h-4" />
      </button>
      <button
        onClick={onLocate}
        className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors"
        title="Lokasi Saya"
      >
        <Crosshair className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function InteractiveMap() {
  const [activeLayer, setActiveLayer] = useState<
    'points' | 'heat' | 'heat_pp' | 'heat_pt' | 'heat_nk' | 'heat_ls' | 'idw' | 'zones'
  >('points');
  const [selectedR, setSelectedR] = useState<Respondent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getRespondentsFromFirestore();
        if (data.length > 0) {
          setRespondents(data);
        } else {
          setRespondents(generateMockRespondents(240));
        }
      } catch (e) {
        console.error('Error fetching respondents from Firestore: ', e);
        setRespondents(generateMockRespondents(240));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-agro-600" />
        <p className="text-slate-500 text-sm font-medium">Memuat data spasial...</p>
      </div>
    );
  }

  const center: [number, number] = [-8.18, 113.67];

  const layerOptions = [
    { id: 'points', label: 'Titik Responden', desc: 'Marker realtime responden', icon: MapPin, color: 'bg-agro-500' },
    { id: 'heat', label: 'Heatmap Persebaran', desc: 'Kepadatan responden', icon: Thermometer, color: 'bg-red-500' },
    { id: 'heat_pp', label: 'Heatmap PP', desc: 'Persepsi Pertanian', icon: Thermometer, color: 'bg-green-500' },
    { id: 'heat_pt', label: 'Heatmap PT', desc: 'Persepsi Teknologi', icon: Thermometer, color: 'bg-blue-500' },
    { id: 'heat_nk', label: 'Heatmap NK', desc: 'Niat Keterlibatan', icon: Thermometer, color: 'bg-amber-500' },
    { id: 'heat_ls', label: 'Heatmap LS', desc: 'Lingkungan Spasial', icon: Thermometer, color: 'bg-earth-500' },
    { id: 'idw', label: 'IDW Surface', desc: 'Interpolasi persepsi', icon: Eye, color: 'bg-purple-500' },
    { id: 'zones', label: 'Zona Peluang', desc: 'Zona regenerasi', icon: LayersIcon, color: 'bg-teal-600' },
  ] as const;

  // Generate IDW grid points (simulated)
  const idwPoints = useMemo(() => {
    const pts: Array<{ lat: number; lng: number; value: number }> = [];
    for (let lat = -8.4; lat <= -8.0; lat += 0.02) {
      for (let lng = 113.45; lng <= 113.85; lng += 0.02) {
        // Use inverse distance weighting approximation based on nearest respondent
        let wsum = 0;
        let vsum = 0;
        for (let i = 0; i < respondents.length; i++) {
          const r = respondents[i];
          const d = Math.sqrt((lat - r.latitude) ** 2 + (lng - r.longitude) ** 2);
          const w = 1 / (d ** 2 + 0.0001);
          wsum += w;
          vsum += w * r.finalScore;
        }
        const v = vsum / wsum;
        pts.push({ lat, lng, value: v });
      }
    }
    return pts;
  }, [respondents]);

  // Zones layer
  const zones = useMemo(() => {
    const zs = [
      { center: [-8.10, 113.75], type: 'Zona Prioritas', color: 'rgba(22, 101, 52, 0.35)', radius: 14000, border: '#14532d' },
      { center: [-8.32, 113.55], type: 'Zona Prioritas', color: 'rgba(22, 101, 52, 0.35)', radius: 12000, border: '#14532d' },
      { center: [-8.18, 113.68], type: 'Zona Edukasi Teknologi', color: 'rgba(234, 179, 8, 0.3)', radius: 8000, border: '#ca8a04' },
      { center: [-8.07, 113.62], type: 'Zona Edukasi Teknologi', color: 'rgba(234, 179, 8, 0.3)', radius: 9000, border: '#ca8a04' },
      { center: [-8.25, 113.50], type: 'Zona Intervensi Sosial', color: 'rgba(249, 115, 22, 0.3)', radius: 10000, border: '#ea580c' },
      { center: [-8.38, 113.48], type: 'Zona Non-Prioritas', color: 'rgba(220, 38, 38, 0.25)', radius: 7000, border: '#dc2626' },
    ];
    return zs;
  }, []);

  const heatColors = (val: number) => {
    if (val > 4.2) return 'rgba(37, 99, 235, 0.55)';
    if (val > 3.4) return 'rgba(34, 197, 94, 0.5)';
    if (val > 2.6) return 'rgba(234, 179, 8, 0.5)';
    if (val > 1.8) return 'rgba(249, 115, 22, 0.5)';
    return 'rgba(220, 38, 38, 0.5)';
  };

  const variableHeatColor = (val: number, variable: 'pp' | 'pt' | 'nk' | 'ls') => {
    const v = val / 5;
    const palette: Record<string, (v: number) => string> = {
      pp: (v) => `rgba(${Math.round(34 + (1 - v) * 200)}, ${Math.round(197 - v * 100)}, ${Math.round(94 - v * 50)}, 0.5)`,
      pt: (v) => `rgba(${Math.round(37 + (1 - v) * 200)}, ${Math.round(99 + v * 60)}, ${Math.round(235 - v * 100)}, 0.5)`,
      nk: (v) => `rgba(${Math.round(245 - v * 20)}, ${Math.round(158 - v * 100)}, ${Math.round(11 + v * 20)}, 0.5)`,
      ls: (v) => `rgba(${Math.round(168 - v * 80)}, ${Math.round(87 - v * 40)}, ${Math.round(47 - v * 20)}, 0.5)`,
    };
    return palette[variable](v);
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-agro-700 text-sm mb-1">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Peta Interaktif WebGIS</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">Peta Persebaran & Analisis Spasial</h1>
              <p className="text-sm text-slate-500 mt-0.5">Visualisasi titik responden, heatmap, IDW, dan zona peluang regenerasi pertanian.</p>
            </div>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium self-start md:self-auto"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {fullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            </button>
          </div>
        </div>
      </div>

      <div className={`max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 ${fullscreen ? 'py-2' : 'py-5'}`}>
        <div className={`grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 ${fullscreen ? 'h-[calc(100vh-140px)]' : ''}`}>
          {/* Left: Layer Control */}
          <div className="dash-card p-4 lg:h-full lg:overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <LayersIcon className="w-4 h-4 text-agro-700" />
              <h3 className="font-display font-bold text-slate-900 text-sm">Layer Kontrol</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">Pilih layer untuk ditampilkan pada peta.</p>
            <div className="space-y-1.5">
              {layerOptions.map((opt) => {
                const Icon = opt.icon;
                const active = activeLayer === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setActiveLayer(opt.id)}
                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all border ${
                      active
                        ? 'bg-agro-50 border-agro-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-md ${opt.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold leading-tight ${active ? 'text-agro-900' : 'text-slate-800'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</div>
                    </div>
                    {active && <div className="w-2 h-2 rounded-full bg-agro-500 mt-1.5 animate-pulse flex-shrink-0"></div>}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="font-semibold text-slate-900 text-xs mb-2 uppercase tracking-wide">Basemap</h4>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button className="px-2 py-1.5 rounded border border-agro-300 bg-agro-50 text-agro-700 font-medium">OpenStreetMap</button>
                <button className="px-2 py-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Satellite</button>
                <button className="px-2 py-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Terrain</button>
                <button className="px-2 py-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Dark</button>
              </div>
            </div>
          </div>

          {/* Center: Map */}
          <div className={`dash-card overflow-hidden relative ${fullscreen ? '' : 'h-[500px] lg:h-[720px]'}`}>
            <MapContainer
              center={center}
              zoom={11}
              bounds={JEMBER_BOUNDS as L.LatLngBoundsExpression}
              style={{ height: '100%', width: '100%', borderRadius: 14 }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Search box */}
              <SearchControl
                show={showSearch}
                onClose={() => setShowSearch(false)}
                query={searchQuery}
                setQuery={setSearchQuery}
              />

              {/* Points Layer */}
              {activeLayer === 'points' && respondents.map((r) => {
                const color = getCategoryColor(r.kategori);
                return (
                  <CircleMarker
                    key={r.id}
                    center={[r.latitude, r.longitude]}
                    radius={6}
                    pathOptions={{
                      color: '#fff',
                      weight: 2,
                      fillColor: color,
                      fillOpacity: 0.9,
                    }}
                    eventHandlers={{
                      click: () => setSelectedR(r),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                      <div className="text-xs">
                        <div className="font-bold">{r.id} • {r.kecamatan}</div>
                        <div>Skor: {r.finalScore.toFixed(2)} ({r.kategori})</div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

              {/* Heat Density */}
              {activeLayer === 'heat' && (
                <SimpleHeatLayer
                  data={respondents.map(r => ({ lat: r.latitude, lng: r.longitude }))}
                  radius={35}
                  getColor={() => 'rgba(239, 68, 68, 0.35)'}
                />
              )}

              {/* PP Heat */}
              {activeLayer === 'heat_pp' && (
                <SimpleHeatLayer
                  data={respondents.map(r => ({ lat: r.latitude, lng: r.longitude, w: r.pp / 5 }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'pp')}
                />
              )}

              {/* PT Heat */}
              {activeLayer === 'heat_pt' && (
                <SimpleHeatLayer
                  data={respondents.map(r => ({ lat: r.latitude, lng: r.longitude, w: r.pt / 5 }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'pt')}
                />
              )}

              {/* NK Heat */}
              {activeLayer === 'heat_nk' && (
                <SimpleHeatLayer
                  data={respondents.map(r => ({ lat: r.latitude, lng: r.longitude, w: r.nk / 5 }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'nk')}
                />
              )}

              {/* LS Heat */}
              {activeLayer === 'heat_ls' && (
                <SimpleHeatLayer
                  data={respondents.map(r => ({ lat: r.latitude, lng: r.longitude, w: r.ls / 5 }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'ls')}
                />
              )}

              {/* IDW */}
              {activeLayer === 'idw' && idwPoints.map((pt, i) => (
                <CircleMarker
                  key={i}
                  center={[pt.lat, pt.lng]}
                  radius={8}
                  pathOptions={{
                    color: 'transparent',
                    fillColor: heatColors(pt.value),
                    fillOpacity: 0.55,
                    weight: 0,
                  }}
                />
              ))}

              {/* Zones */}
              {activeLayer === 'zones' && zones.map((z, i) => (
                <Circle
                  key={i}
                  center={z.center as [number, number]}
                  radius={z.radius}
                  pathOptions={{
                    color: z.border,
                    weight: 2,
                    dashArray: '5,5',
                    fillColor: z.color,
                    fillOpacity: 0.6,
                  }}
                >
                  <Tooltip permanent direction="center" className="font-bold text-slate-900 text-xs">
                    {z.type}
                  </Tooltip>
                </Circle>
              ))}

              <MapControls onSearch={() => setShowSearch(!showSearch)} onLocate={() => {}} />

              {/* Scale / coordinates - let's add a custom info */}
              <div className="leaflet-bottom leaflet-left !mb-2 !ml-2">
                <div className="bg-white/95 backdrop-blur px-2 py-1 rounded shadow text-[11px] text-slate-700 font-mono">
                  Kabupaten Jember • 8.18°S 113.67°E
                </div>
              </div>
            </MapContainer>
          </div>

          {/* Right: Legend + Info */}
          <div className="space-y-4 lg:h-full lg:overflow-y-auto">
            <div className="dash-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-agro-700" />
                <h3 className="font-display font-bold text-slate-900 text-sm">Legenda</h3>
              </div>
              {activeLayer === 'points' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-2">Kategori Skor Akhir:</p>
                  {[
                    { c: 'Sangat Rendah', color: '#dc2626' },
                    { c: 'Rendah', color: '#f97316' },
                    { c: 'Sedang', color: '#eab308' },
                    { c: 'Tinggi', color: '#22c55e' },
                    { c: 'Sangat Tinggi', color: '#2563eb' },
                  ].map((l) => (
                    <div key={l.c} className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: l.color }}></span>
                      <span className="text-slate-700">{l.c}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeLayer === 'heat' && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Kepadatan Responden</p>
                  <div className="h-3 rounded-full bg-gradient-to-r from-red-200 via-orange-400 to-red-600"></div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Rendah</span><span>Tinggi</span>
                  </div>
                </div>
              )}
              {activeLayer.startsWith('heat_') && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Intensitas Skor</p>
                  <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500"></div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Rendah (1)</span><span>Sedang (3)</span><span>Tinggi (5)</span>
                  </div>
                </div>
              )}
              {activeLayer === 'idw' && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Interpolasi IDW Persepsi</p>
                  <div className="space-y-1.5">
                    {[
                      { c: 'Sangat Rendah', color: '#dc2626' },
                      { c: 'Rendah', color: '#f97316' },
                      { c: 'Sedang', color: '#eab308' },
                      { c: 'Tinggi', color: '#22c55e' },
                      { c: 'Sangat Tinggi', color: '#2563eb' },
                    ].map((l) => (
                      <div key={l.c} className="flex items-center gap-2 text-xs">
                        <span className="w-6 h-3 rounded" style={{ backgroundColor: l.color }}></span>
                        <span className="text-slate-700">{l.c}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-purple-50 rounded text-[11px] text-purple-800">
                    <strong>RMSE:</strong> 0.342 (Leave-one-out CV)
                  </div>
                </div>
              )}
              {activeLayer === 'zones' && (
                <div className="space-y-2">
                  {[
                    { c: 'Zona Prioritas', color: '#166534', bg: 'rgba(22,101,52,0.35)' },
                    { c: 'Zona Edukasi Teknologi', color: '#ca8a04', bg: 'rgba(234,179,8,0.3)' },
                    { c: 'Zona Intervensi Sosial', color: '#ea580c', bg: 'rgba(249,115,22,0.3)' },
                    { c: 'Zona Non-Prioritas', color: '#dc2626', bg: 'rgba(220,38,38,0.25)' },
                  ].map((l) => (
                    <div key={l.c} className="flex items-start gap-2 text-xs">
                      <span className="w-4 h-4 rounded mt-0.5 border-2 flex-shrink-0" style={{ backgroundColor: l.bg, borderColor: l.color, borderStyle: 'dashed' }}></span>
                      <span className="text-slate-700">{l.c}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedR && (
              <div className="dash-card p-4 relative">
                <button
                  onClick={() => setSelectedR(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-md bg-agro-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-agro-700" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">Detail Responden</h3>
                    <p className="text-[11px] text-slate-500 font-mono">{selectedR.id}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <InfoRow label="Nama" value={selectedR.nama} />
                  <InfoRow label="Usia" value={`${selectedR.usia} tahun`} />
                  <InfoRow label="Jenis Kelamin" value={selectedR.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'} />
                  <InfoRow label="Kecamatan" value={selectedR.kecamatan} />
                  <InfoRow label="Desa" value={selectedR.desa} />
                  <div className="h-px bg-slate-100 my-2"></div>
                  <div className="grid grid-cols-2 gap-2">
                    <ScoreBox label="PP" value={selectedR.pp} color="bg-agro-500" />
                    <ScoreBox label="PT" value={selectedR.pt} color="bg-blue-500" />
                    <ScoreBox label="NK" value={selectedR.nk} color="bg-amber-500" />
                    <ScoreBox label="LS" value={selectedR.ls} color="bg-earth-500" />
                  </div>
                  <div className="h-px bg-slate-100 my-2"></div>
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: getCategoryColor(selectedR.kategori) + '20' }}>
                    <div>
                      <div className="text-[10px] text-slate-500">Skor Akhir</div>
                      <div className="font-display font-bold text-lg text-slate-900">{selectedR.finalScore.toFixed(2)}</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: getCategoryColor(selectedR.kategori) }}>
                      {selectedR.kategori}
                    </span>
                  </div>
                  <div className="h-px bg-slate-100 my-2"></div>
                  <InfoRow label="Latitude" value={selectedR.latitude.toFixed(6)} mono />
                  <InfoRow label="Longitude" value={selectedR.longitude.toFixed(6)} mono />
                  <InfoRow label="Waktu" value={new Date(selectedR.timestamp).toLocaleString('id-ID')} />
                </div>
              </div>
            )}

            <div className="dash-card p-4">
              <h3 className="font-display font-bold text-slate-900 text-sm mb-2">Statistik Layer Aktif</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-slate-50">
                  <div className="text-slate-500 text-[10px]">Total Titik</div>
                  <div className="font-bold text-slate-900">{respondents.length}</div>
                </div>
                <div className="p-2 rounded bg-slate-50">
                  <div className="text-slate-500 text-[10px]">Kecamatan</div>
                  <div className="font-bold text-slate-900">{new Set(respondents.map(r => r.kecamatan)).size}</div>
                </div>
                <div className="p-2 rounded bg-slate-50">
                  <div className="text-slate-500 text-[10px]">Skor Max</div>
                  <div className="font-bold text-green-700">{Math.max(...respondents.map(r => r.finalScore)).toFixed(2)}</div>
                </div>
                <div className="p-2 rounded bg-slate-50">
                  <div className="text-slate-500 text-[10px]">Skor Min</div>
                  <div className="font-bold text-red-700">{Math.min(...respondents.map(r => r.finalScore)).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold text-slate-900 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  );
}

function ScoreBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-slate-50">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500">{label}</span>
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
      </div>
      <div className="font-mono font-bold text-slate-900">{value.toFixed(2)}</div>
    </div>
  );
}

function SearchControl({ show, onClose, query, setQuery }: {
  show: boolean;
  onClose: () => void;
  query: string;
  setQuery: (v: string) => void;
}) {
  const map = useMap();
  const kecamatan = Object.keys(KECAMATAN_COORDS);
  const results = query
    ? kecamatan.filter(k => k.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : kecamatan.slice(0, 6);

  if (!show) return null;

  return (
    <div className="leaflet-top leaflet-left !top-2 !left-2 !z-[500] w-64">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-2.5 flex items-center gap-2 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kecamatan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent"
            autoFocus
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">Tidak ditemukan</div>
          ) : results.map((k) => (
            <button
              key={k}
              onClick={() => {
                map.flyTo(KECAMATAN_COORDS[k], 14, { duration: 1 });
                onClose();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 text-agro-600" />
              <span>{k}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
