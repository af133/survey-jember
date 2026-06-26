import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  Layers as LayersIcon, MapPin, Thermometer, Info, X,
  Search, Eye, Crosshair, Loader2, User, GraduationCap,
  Sprout, Navigation
} from 'lucide-react';
import { getCategoryColor, JEMBER_BOUNDS, KECAMATAN_COORDS, Respondent } from '../data/mockData';
import { getRespondentsFromFirestore } from '../utils/firebase';

// Fix default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Basemap tile configs ──────────────────────────────────────────────────────
type BasemapKey = 'osm' | 'satellite' | 'terrain' | 'dark';

const BASEMAPS: Record<BasemapKey, { url: string; attribution: string; label: string }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: 'OpenStreetMap',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a> World Imagery',
    label: 'Satellite',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: 'Terrain',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    label: 'Dark',
  },
};

// ─── Dynamic TileLayer swapper ─────────────────────────────────────────────────
function BasemapLayer({ basemap }: { basemap: BasemapKey }) {
  const map = useMap();
  const cfg = BASEMAPS[basemap];

  // Remove old tile layers and add new one when basemap changes
  useEffect(() => {
    const layers: L.TileLayer[] = [];
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) layers.push(layer);
    });
    layers.forEach((l) => map.removeLayer(l));

    const tl = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 19 });
    tl.addTo(map);

    return () => {
      map.removeLayer(tl);
    };
  }, [basemap, map, cfg]);

  return null;
}

// ─── Heat layer ────────────────────────────────────────────────────────────────
function SimpleHeatLayer({
  data,
  getColor,
  radius = 25,
}: {
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
            pathOptions={{ color: 'transparent', fillColor: color, fillOpacity: 0.28, weight: 0 }}
          />
        );
      })}
    </>
  );
}

// ─── Map controls ──────────────────────────────────────────────────────────────
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

// ─── Search overlay ────────────────────────────────────────────────────────────
function SearchControl({
  show, onClose, query, setQuery,
}: {
  show: boolean; onClose: () => void; query: string; setQuery: (v: string) => void;
}) {
  const map = useMap();
  const kecamatan = Object.keys(KECAMATAN_COORDS);
  const results = query
    ? kecamatan.filter((k) => k.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
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
              onClick={() => { map.flyTo(KECAMATAN_COORDS[k], 14, { duration: 1 }); onClose(); }}
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
const mean = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

/** Map a 1–5 score to an RGBA array [r,g,b,a] for smooth interpolation */
function scoreToRGBA(val: number): [number, number, number, number] {
  // Stops: 1=red, 2=orange, 3=yellow, 4=green, 5=blue
  const stops: Array<[number, [number, number, number]]> = [
    [1.0, [220, 38,  38 ]],
    [2.0, [249, 115, 22 ]],
    [3.0, [234, 179, 8  ]],
    [4.0, [34,  197, 94 ]],
    [5.0, [37,  99,  235]],
  ];
  const clamped = Math.min(5, Math.max(1, val));
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i];
    const [v1, c1] = stops[i + 1];
    if (clamped <= v1) {
      const t = (clamped - v0) / (v1 - v0);
      return [
        Math.round(c0[0] + t * (c1[0] - c0[0])),
        Math.round(c0[1] + t * (c1[1] - c0[1])),
        Math.round(c0[2] + t * (c1[2] - c0[2])),
        180, // alpha 0–255
      ];
    }
  }
  return [37, 99, 235, 180];
}

// ─── IDW Canvas Overlay ────────────────────────────────────────────────────────
interface IDWPoint { lat: number; lng: number; value: number }

/**
 * Smooth IDW surface rendered to a <canvas> that sits in Leaflet's mapPane.
 *
 * Key fixes vs previous version:
 *  - Uses `mapPane` (not `overlayPane`) so the canvas is NOT double-transformed
 *    by Leaflet's pan CSS transform. We reposition manually after every redraw.
 *  - The canvas is sized to the full map container and repositioned to pixel (0,0)
 *    in screen space by computing the container's top-left layer-point offset.
 *  - Distance-based alpha falloff: pixels far from ALL respondents fade to transparent
 *    so the surface only appears where data actually exists.
 *  - Separate low-res IDW pass (GRID×GRID) + full-res bilinear interpolation pass
 *    keep it fast while looking smooth.
 */
function IDWCanvasLayer({ points, visible }: { points: IDWPoint[]; visible: boolean }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    if (!visible || points.length === 0) {
      if (canvasRef.current) canvasRef.current.style.display = 'none';
      return;
    }

    const size = map.getSize(); // pixel size of the map container
    const W = size.x;
    const H = size.y;

    // ── Create canvas once, appended to mapPane (no CSS transform applied to it)
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.pointerEvents = 'none';
      // mapPane z-index is 400; we want to sit just above tiles (200) but below markers (600)
      canvas.style.zIndex = '300';
      canvas.style.imageRendering = 'auto'; // bilinear browser upscale — smooth look
      canvasRef.current = canvas;
      // mapPane: its origin moves with pan but we'll correct for that below
      map.getPanes().mapPane.appendChild(canvas);
    }

    const canvas = canvasRef.current;
    canvas.style.display = 'block';

    // Make canvas exactly the size of the visible map container
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    // ── Offset: mapPane is translated by Leaflet; we must counter that so our
    //    canvas top-left aligns with the map's top-left screen pixel.
    const mapPanePos = L.DomUtil.getPosition(map.getPanes().mapPane);
    canvas.style.left = `${-mapPanePos.x}px`;
    canvas.style.top  = `${-mapPanePos.y}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    // ── Convert respondent lat/lng → pixel coords once
    const ptPx = points.map((p) => {
      const px = map.latLngToContainerPoint(L.latLng(p.lat, p.lng));
      return { x: px.x, y: px.y, value: p.value };
    });

    // ── Low-res IDW grid in PIXEL space (faster than lat/lng math per pixel)
    const GRID = 60;
    const gridVals  = new Float32Array(GRID * GRID); // IDW interpolated value
    const gridAlpha = new Float32Array(GRID * GRID); // influence weight for opacity

    // Influence radius: ~15% of the larger map dimension in pixels
    const INFLUENCE_PX = Math.max(W, H) * 0.18;
    const INF2 = INFLUENCE_PX * INFLUENCE_PX;

    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const px = (gx + 0.5) * (W / GRID);
        const py = (gy + 0.5) * (H / GRID);

        let wsum = 0, vsum = 0, maxInfluence = 0;

        for (const p of ptPx) {
          const dx = px - p.x;
          const dy = py - p.y;
          const d2 = dx * dx + dy * dy;
          const w  = 1 / (d2 + 1); // IDW power=1 in pixel space
          wsum += w;
          vsum += w * p.value;

          // Soft influence: 1 at centre, 0 at INFLUENCE_PX
          const inf = Math.max(0, 1 - d2 / INF2);
          if (inf > maxInfluence) maxInfluence = inf;
        }

        gridVals [gy * GRID + gx] = vsum / wsum;
        gridAlpha[gy * GRID + gx] = maxInfluence;
      }
    }

    // ── Write pixels with bilinear interpolation from the grid
    const imageData = ctx.createImageData(W, H);
    const buf = imageData.data;

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        // Fractional grid coords
        const gxf = (px / W) * GRID - 0.5;
        const gyf = (py / H) * GRID - 0.5;

        const gx0 = Math.max(0, Math.floor(gxf));
        const gy0 = Math.max(0, Math.floor(gyf));
        const gx1 = Math.min(GRID - 1, gx0 + 1);
        const gy1 = Math.min(GRID - 1, gy0 + 1);

        const tx = Math.max(0, gxf - gx0);
        const ty = Math.max(0, gyf - gy0);
        const w00 = (1 - tx) * (1 - ty);
        const w10 = tx       * (1 - ty);
        const w01 = (1 - tx) * ty;
        const w11 = tx       * ty;

        const i00 = gy0 * GRID + gx0;
        const i10 = gy0 * GRID + gx1;
        const i01 = gy1 * GRID + gx0;
        const i11 = gy1 * GRID + gx1;

        const val = gridVals[i00] * w00 + gridVals[i10] * w10
                  + gridVals[i01] * w01 + gridVals[i11] * w11;

        // Smooth alpha: interpolate the influence weight too
        const alphaRaw = gridAlpha[i00] * w00 + gridAlpha[i10] * w10
                       + gridAlpha[i01] * w01 + gridAlpha[i11] * w11;

        // Ease-in-out on alpha so edges are soft, not abrupt
        const alphaNorm = alphaRaw < 0.05 ? 0 : Math.pow(Math.min(1, alphaRaw), 0.6);
        const a = Math.round(alphaNorm * 160); // max opacity ≈ 63%

        if (a < 4) continue; // skip fully transparent pixels

        const [r, g, b] = scoreToRGBA(val);
        const idx = (py * W + px) * 4;
        buf[idx]     = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = a;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [map, points, visible]);

  // Register map events and clean up on unmount
  useEffect(() => {
    // Initial draw after Leaflet finishes laying out
    const timer = setTimeout(draw, 50);
    map.on('moveend zoomend resize viewreset', draw);
    return () => {
      clearTimeout(timer);
      map.off('moveend zoomend resize viewreset', draw);
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, [map, draw]);

  // React to visibility / points changes
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!visible) {
      canvasRef.current.style.display = 'none';
    } else {
      canvasRef.current.style.display = 'block';
      draw();
    }
  }, [visible, draw]);

  return null;
}

const variableHeatColor = (val: number, variable: 'pp' | 'pt' | 'nk' | 'ls') => {
  const v = Math.min(1, Math.max(0, val / 5));
  const palettes: Record<string, (v: number) => string> = {
    pp: (v) => `rgba(${Math.round(22 + (1 - v) * 220)}, ${Math.round(163 - v * 80)}, ${Math.round(74 - v * 50)}, 0.55)`,
    pt: (v) => `rgba(${Math.round(37 + (1 - v) * 180)}, ${Math.round(99 + v * 80)}, ${Math.round(235 - v * 100)}, 0.55)`,
    nk: (v) => `rgba(${Math.round(234 - v * 30)}, ${Math.round(179 - v * 120)}, ${Math.round(8 + v * 30)}, 0.55)`,
    ls: (v) => `rgba(${Math.round(180 - v * 100)}, ${Math.round(100 - v * 60)}, ${Math.round(60 - v * 30)}, 0.55)`,
  };
  return palettes[variable](v);
};

// ─── Dynamic zone generator ────────────────────────────────────────────────────
interface ZoneData {
  center: [number, number];
  label: string;
  type: 'Zona Prioritas' | 'Zona Edukasi Teknologi' | 'Zona Intervensi Sosial' | 'Zona Non-Prioritas';
  color: string;
  border: string;
  radius: number;
  avgScore: number;
  count: number;
}

function buildDynamicZones(respondents: Respondent[]): ZoneData[] {
  if (respondents.length === 0) return [];

  // Group by kecamatan
  const byKec: Record<string, Respondent[]> = {};
  respondents.forEach((r) => {
    if (!byKec[r.kecamatan]) byKec[r.kecamatan] = [];
    byKec[r.kecamatan].push(r);
  });

  return Object.entries(byKec)
    .map(([kec, rList]) => {
      const avgScore = mean(rList.map((r) => r.finalScore));
      const avgLat = mean(rList.map((r) => r.latitude));
      const avgLng = mean(rList.map((r) => r.longitude));
      const count = rList.length;

      // Radius proportional to count, min 4km max 18km
      const radius = Math.min(18000, Math.max(4000, count * 600));

      let type: ZoneData['type'];
      let color: string;
      let border: string;

      if (avgScore >= 4.0) {
        type = 'Zona Prioritas';
        color = 'rgba(22, 101, 52, 0.3)';
        border = '#14532d';
      } else if (avgScore >= 3.4) {
        type = 'Zona Edukasi Teknologi';
        color = 'rgba(234, 179, 8, 0.28)';
        border = '#ca8a04';
      } else if (avgScore >= 2.6) {
        type = 'Zona Intervensi Sosial';
        color = 'rgba(249, 115, 22, 0.28)';
        border = '#ea580c';
      } else {
        type = 'Zona Non-Prioritas';
        color = 'rgba(220, 38, 38, 0.22)';
        border = '#dc2626';
      }

      return {
        center: [avgLat, avgLng] as [number, number],
        label: kec,
        type,
        color,
        border,
        radius,
        avgScore,
        count,
      };
    })
    .sort((a, b) => b.count - a.count); // largest first
}

// ─── Layer options ─────────────────────────────────────────────────────────────
const LAYER_OPTIONS = [
  { id: 'points',   label: 'Titik Responden',    desc: 'Marker per responden',              icon: MapPin,     color: 'bg-agro-500'    },
  { id: 'heat',     label: 'Heatmap Kepadatan',  desc: 'Konsentrasi responden',             icon: Thermometer,color: 'bg-red-500'     },
  { id: 'heat_pp',  label: 'Heatmap PP',         desc: 'Persepsi Pertanian',                icon: Sprout,     color: 'bg-green-500'   },
  { id: 'heat_pt',  label: 'Heatmap PT',         desc: 'Persepsi Teknologi Pertanian',      icon: Thermometer,color: 'bg-blue-500'    },
  { id: 'heat_nk',  label: 'Heatmap NK',         desc: 'Niat Keterlibatan Pertanian',       icon: Thermometer,color: 'bg-amber-500'   },
  { id: 'heat_ls',  label: 'Heatmap LS',         desc: 'Kondisi Spasial & Lingkungan',      icon: Navigation, color: 'bg-earth-500'   },
  { id: 'idw',      label: 'IDW Surface',        desc: 'Interpolasi persepsi spasial',      icon: Eye,        color: 'bg-purple-500'  },
  { id: 'zones',    label: 'Zona Peluang',       desc: 'Zona regenerasi per kecamatan',     icon: LayersIcon, color: 'bg-teal-600'    },
] as const;

type LayerId = typeof LAYER_OPTIONS[number]['id'];

// ─── Main component ────────────────────────────────────────────────────────────
export default function InteractiveMap() {
  const [activeLayer, setActiveLayer] = useState<LayerId>('points');
  const [basemap, setBasemap] = useState<BasemapKey>('osm');
  const [selectedR, setSelectedR] = useState<Respondent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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

  // IDW source points — raw respondent coords fed directly to the canvas layer
  const idwPoints = useMemo<IDWPoint[]>(
    () => respondents.map((r) => ({ lat: r.latitude, lng: r.longitude, value: r.finalScore })),
    [respondents]
  );

  // Dynamic zones from real data
  const zones = useMemo(() => buildDynamicZones(respondents), [respondents]);

  // ── Early returns ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-agro-600" />
        <p className="text-slate-500 text-sm font-medium">Memuat data peta dari Firebase...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <Info className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-slate-900 text-lg">Gagal Memuat Data Peta</h2>
          <p className="text-slate-500 text-sm mt-1">Tidak dapat terhubung ke Firebase Firestore.</p>
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

  const center: [number, number] = [-8.18, 113.67];

  const scoreStats = respondents.length > 0 ? {
    max: Math.max(...respondents.map((r) => r.finalScore)),
    min: Math.min(...respondents.map((r) => r.finalScore)),
    avg: mean(respondents.map((r) => r.finalScore)),
  } : { max: 0, min: 0, avg: 0 };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-agro-700 text-sm mb-1">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Peta Interaktif WebGIS</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">Peta Persebaran & Analisis Spasial</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Visualisasi <strong>{respondents.length}</strong> responden — titik, heatmap, IDW, dan zona peluang per kecamatan.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">

          {/* ── Left panel ───────────────────────────────────────────────────── */}
          <div className="dash-card p-4 lg:max-h-[740px] lg:overflow-y-auto">
            {/* Layer toggle */}
            <div className="flex items-center gap-2 mb-3">
              <LayersIcon className="w-4 h-4 text-agro-700" />
              <h3 className="font-display font-bold text-slate-900 text-sm">Layer Kontrol</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">Pilih layer untuk ditampilkan.</p>
            <div className="space-y-1.5">
              {LAYER_OPTIONS.map((opt) => {
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
                    {active && <div className="w-2 h-2 rounded-full bg-agro-500 mt-1.5 animate-pulse flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Basemap selector — benar-benar mengganti tile */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="font-semibold text-slate-900 text-xs mb-2 uppercase tracking-wide">Basemap</h4>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(Object.entries(BASEMAPS) as [BasemapKey, typeof BASEMAPS[BasemapKey]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setBasemap(key)}
                    className={`px-2 py-1.5 rounded border font-medium transition-colors ${
                      basemap === key
                        ? 'border-agro-300 bg-agro-50 text-agro-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Map ──────────────────────────────────────────────────────────── */}
          <div className="dash-card overflow-hidden relative h-[500px] lg:h-[740px]">
            <MapContainer
              center={center}
              zoom={11}
              bounds={JEMBER_BOUNDS as L.LatLngBoundsExpression}
              style={{ height: '100%', width: '100%', borderRadius: 14 }}
              scrollWheelZoom
            >
              {/* Dynamic basemap — no initial TileLayer here, BasemapLayer handles it */}
              <BasemapLayer basemap={basemap} />

              {/* Search */}
              <SearchControl
                show={showSearch}
                onClose={() => setShowSearch(false)}
                query={searchQuery}
                setQuery={setSearchQuery}
              />

              {/* Points */}
              {activeLayer === 'points' && respondents.map((r) => {
                const color = getCategoryColor(r.kategori);
                return (
                  <CircleMarker
                    key={r.id}
                    center={[r.latitude, r.longitude]}
                    radius={6}
                    pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.9 }}
                    eventHandlers={{ click: () => setSelectedR(r) }}
                  >
                    <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                      <div className="text-xs">
                        <div className="font-bold">{r.nama ?? r.id} • {r.kecamatan}</div>
                        <div>Skor: {r.finalScore.toFixed(2)} ({r.kategori})</div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

              {/* Heat density */}
              {activeLayer === 'heat' && (
                <SimpleHeatLayer
                  data={respondents.map((r) => ({ lat: r.latitude, lng: r.longitude }))}
                  radius={35}
                  getColor={() => 'rgba(239, 68, 68, 0.35)'}
                />
              )}

              {/* PP: Persepsi terhadap Pertanian */}
              {activeLayer === 'heat_pp' && (
                <SimpleHeatLayer
                  data={respondents.map((r) => ({ lat: r.latitude, lng: r.longitude, w: r.pp }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'pp')}
                />
              )}

              {/* PT: Persepsi Teknologi Pertanian */}
              {activeLayer === 'heat_pt' && (
                <SimpleHeatLayer
                  data={respondents.map((r) => ({ lat: r.latitude, lng: r.longitude, w: r.pt }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'pt')}
                />
              )}

              {/* NK: Niat Keterlibatan Pertanian */}
              {activeLayer === 'heat_nk' && (
                <SimpleHeatLayer
                  data={respondents.map((r) => ({ lat: r.latitude, lng: r.longitude, w: r.nk }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'nk')}
                />
              )}

              {/* LS: Kondisi Spasial & Lingkungan */}
              {activeLayer === 'heat_ls' && (
                <SimpleHeatLayer
                  data={respondents.map((r) => ({ lat: r.latitude, lng: r.longitude, w: r.ls }))}
                  radius={30}
                  getColor={(v) => variableHeatColor(v, 'ls')}
                />
              )}

              {/* IDW — smooth canvas surface */}
              <IDWCanvasLayer points={idwPoints} visible={activeLayer === 'idw'} />

              {/* Zones — dynamic per kecamatan */}
              {activeLayer === 'zones' && zones.map((z, i) => (
                <Circle
                  key={i}
                  center={z.center}
                  radius={z.radius}
                  pathOptions={{ color: z.border, weight: 2, dashArray: '5,5', fillColor: z.color, fillOpacity: 0.65 }}
                >
                  <Tooltip direction="center" className="font-semibold text-slate-900 text-xs">
                    <div className="font-bold">{z.label}</div>
                    <div className="text-[11px] text-slate-600">{z.type}</div>
                    <div className="text-[11px]">Avg: {z.avgScore.toFixed(2)} • {z.count} resp.</div>
                  </Tooltip>
                </Circle>
              ))}

              <MapControls onSearch={() => setShowSearch(!showSearch)} onLocate={() => {}} />

              <div className="leaflet-bottom leaflet-left !mb-2 !ml-2">
                <div className="bg-white/95 backdrop-blur px-2 py-1 rounded shadow text-[11px] text-slate-700 font-mono">
                  Kabupaten Jember • 8.18°S 113.67°E
                </div>
              </div>
            </MapContainer>
          </div>

          {/* ── Right panel ──────────────────────────────────────────────────── */}
          <div className="space-y-4 lg:max-h-[740px] lg:overflow-y-auto">

            {/* Legend */}
            <div className="dash-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-agro-700" />
                <h3 className="font-display font-bold text-slate-900 text-sm">Legenda</h3>
              </div>

              {activeLayer === 'points' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-2">Kategori Final Score:</p>
                  {[
                    { c: 'Sangat Rendah', color: '#dc2626' },
                    { c: 'Rendah',        color: '#f97316' },
                    { c: 'Sedang',        color: '#eab308' },
                    { c: 'Tinggi',        color: '#22c55e' },
                    { c: 'Sangat Tinggi', color: '#2563eb' },
                  ].map((l) => (
                    <div key={l.c} className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded-full border-2 border-white shadow flex-shrink-0" style={{ backgroundColor: l.color }} />
                      <span className="text-slate-700">{l.c}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeLayer === 'heat' && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Kepadatan Responden</p>
                  <div className="h-3 rounded-full bg-gradient-to-r from-red-200 via-orange-400 to-red-600" />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Rendah</span><span>Tinggi</span>
                  </div>
                </div>
              )}

              {(activeLayer === 'heat_pp' || activeLayer === 'heat_pt' || activeLayer === 'heat_nk' || activeLayer === 'heat_ls') && (
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">
                    {activeLayer === 'heat_pp' && 'Persepsi terhadap Pertanian (PP)'}
                    {activeLayer === 'heat_pt' && 'Persepsi Teknologi Pertanian (PT)'}
                    {activeLayer === 'heat_nk' && 'Niat Keterlibatan Pertanian (NK)'}
                    {activeLayer === 'heat_ls' && 'Kondisi Spasial & Lingkungan (LS)'}
                  </p>
                  <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Rendah (1)</span><span>Sedang (3)</span><span>Tinggi (5)</span>
                  </div>
                </div>
              )}

              {activeLayer === 'idw' && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Interpolasi IDW Final Score</p>
                  <div className="space-y-1.5">
                    {[
                      { c: '> 4.2 — Sangat Tinggi', color: '#2563eb' },
                      { c: '3.4–4.2 — Tinggi',      color: '#22c55e' },
                      { c: '2.6–3.4 — Sedang',       color: '#eab308' },
                      { c: '1.8–2.6 — Rendah',       color: '#f97316' },
                      { c: '< 1.8 — Sangat Rendah',  color: '#dc2626' },
                    ].map((l) => (
                      <div key={l.c} className="flex items-center gap-2 text-xs">
                        <span className="w-6 h-3 rounded flex-shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="text-slate-700">{l.c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeLayer === 'zones' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-1">Zona berdasarkan rata-rata skor kecamatan:</p>
                  {[
                    { c: 'Zona Prioritas (≥ 4.0)',           border: '#14532d', bg: 'rgba(22,101,52,0.3)'   },
                    { c: 'Zona Edukasi Teknologi (3.4–4.0)', border: '#ca8a04', bg: 'rgba(234,179,8,0.28)'  },
                    { c: 'Zona Intervensi Sosial (2.6–3.4)', border: '#ea580c', bg: 'rgba(249,115,22,0.28)' },
                    { c: 'Zona Non-Prioritas (< 2.6)',        border: '#dc2626', bg: 'rgba(220,38,38,0.22)' },
                  ].map((l) => (
                    <div key={l.c} className="flex items-start gap-2 text-xs">
                      <span className="w-5 h-4 rounded mt-0.5 border-2 flex-shrink-0"
                        style={{ backgroundColor: l.bg, borderColor: l.border, borderStyle: 'dashed' }} />
                      <span className="text-slate-700">{l.c}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 mt-2">
                    {zones.length} zona dari {new Set(respondents.map(r => r.kecamatan)).size} kecamatan
                  </p>
                </div>
              )}
            </div>

            {/* Selected respondent detail */}
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
                    <User className="w-4 h-4 text-agro-700" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">
                      {(selectedR as any).nama ?? selectedR.id}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">{selectedR.id}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <InfoRow label="Usia" value={`${selectedR.usia} tahun`} />
                  <InfoRow label="Jenis Kelamin" value={selectedR.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'} />
                  <InfoRow label="Kecamatan" value={selectedR.kecamatan} />
                  <InfoRow label="Desa" value={selectedR.desa} />
                  <InfoRow label="Wilayah" value={(selectedR as any).wilayahTinggal ?? '—'} />

                  {(selectedR as any).pendidikan && (
                    <InfoRow label="Pendidikan" value={(selectedR as any).pendidikan} />
                  )}
                  {(selectedR as any).luasPertanian && (
                    <InfoRow label="Luas Pertanian" value={(selectedR as any).luasPertanian} />
                  )}
                  {(selectedR as any).jarakLahan && (
                    <InfoRow label="Jarak Lahan" value={(selectedR as any).jarakLahan} />
                  )}

                  <div className="h-px bg-slate-100 my-2" />

                  {/* Skor 4 variabel */}
                  <div className="grid grid-cols-2 gap-2">
                    <ScoreBox label="PP" sublabel="Persepsi Pertanian"   value={selectedR.pp} color="bg-agro-500" />
                    <ScoreBox label="PT" sublabel="Persepsi Teknologi"   value={selectedR.pt} color="bg-blue-500" />
                    <ScoreBox label="NK" sublabel="Niat Keterlibatan"    value={selectedR.nk} color="bg-amber-500" />
                    <ScoreBox label="LS" sublabel="Kondisi Spasial"      value={selectedR.ls} color="bg-earth-500" />
                  </div>

                  {/* Extra numeric fields */}
                  {(selectedR as any).literasiDigital != null && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <ScoreBox label="Lit. Digital" sublabel="Skor" value={(selectedR as any).literasiDigital} color="bg-purple-500" />
                      {(selectedR as any).pengalamanPertanian != null && (
                        <ScoreBox label="Pengalaman" sublabel="Pertanian" value={(selectedR as any).pengalamanPertanian} color="bg-teal-500" />
                      )}
                    </div>
                  )}

                  <div className="h-px bg-slate-100 my-2" />

                  <div className="flex items-center justify-between p-2 rounded-lg"
                    style={{ backgroundColor: getCategoryColor(selectedR.kategori) + '20' }}>
                    <div>
                      <div className="text-[10px] text-slate-500">Final Score</div>
                      <div className="font-display font-bold text-lg text-slate-900">{selectedR.finalScore.toFixed(2)}</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: getCategoryColor(selectedR.kategori) }}>
                      {selectedR.kategori}
                    </span>
                  </div>

                  <div className="h-px bg-slate-100 my-2" />
                  <InfoRow label="Latitude"  value={selectedR.latitude.toFixed(6)}  mono />
                  <InfoRow label="Longitude" value={selectedR.longitude.toFixed(6)} mono />
                  <InfoRow label="Waktu" value={new Date(selectedR.timestamp).toLocaleString('id-ID')} />
                </div>
              </div>
            )}

            {/* Stats panel */}
            <div className="dash-card p-4">
              <h3 className="font-display font-bold text-slate-900 text-sm mb-2">Statistik Ringkas</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <StatBox label="Total Responden"  value={String(respondents.length)}         />
                <StatBox label="Kecamatan"         value={String(new Set(respondents.map(r => r.kecamatan)).size)} />
                <StatBox label="Skor Tertinggi"    value={scoreStats.max.toFixed(2)} valueColor="text-green-700" />
                <StatBox label="Skor Terendah"     value={scoreStats.min.toFixed(2)} valueColor="text-red-700"   />
                <StatBox label="Rata-rata Skor"    value={scoreStats.avg.toFixed(2)} valueColor="text-blue-700"  />
                <StatBox label="Zona Aktif"        value={String(zones.length)}                />
              </div>

              {activeLayer === 'zones' && zones.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                    Distribusi Zona
                  </p>
                  {(['Zona Prioritas', 'Zona Edukasi Teknologi', 'Zona Intervensi Sosial', 'Zona Non-Prioritas'] as ZoneData['type'][]).map((t) => {
                    const count = zones.filter((z) => z.type === t).length;
                    const pct = zones.length ? Math.round((count / zones.length) * 100) : 0;
                    const colors: Record<ZoneData['type'], string> = {
                      'Zona Prioritas':          'bg-green-600',
                      'Zona Edukasi Teknologi':  'bg-yellow-500',
                      'Zona Intervensi Sosial':  'bg-orange-500',
                      'Zona Non-Prioritas':      'bg-red-500',
                    };
                    return (
                      <div key={t}>
                        <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                          <span>{t}</span>
                          <span className="font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${colors[t]} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-slate-500 flex-shrink-0">{label}</span>
      <span className={`font-semibold text-slate-900 text-right ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  );
}

function ScoreBox({ label, sublabel, value, color }: { label: string; sublabel: string; value: number; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-slate-50">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-bold text-slate-600">{label}</span>
        <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
      </div>
      <div className="font-mono font-bold text-slate-900">{value.toFixed(2)}</div>
      <div className="text-[9px] text-slate-400 leading-tight">{sublabel}</div>
    </div>
  );
}

function StatBox({ label, value, valueColor = 'text-slate-900' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="p-2 rounded bg-slate-50">
      <div className="text-slate-500 text-[10px]">{label}</div>
      <div className={`font-bold text-sm ${valueColor}`}>{value}</div>
    </div>
  );
}