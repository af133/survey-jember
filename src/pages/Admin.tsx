import { useState, useMemo } from 'react';
import {
  Shield, Lock, LogIn, Trash2, Edit3,
  Search, Filter, AlertTriangle, CheckCircle2,
  FileSpreadsheet, FileJson, FileType2, Database,
  Users, Check, X, Eye, UserCheck
} from 'lucide-react';
import { generateMockRespondents, getCategoryColor, Respondent } from '../data/mockData';

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [search, setSearch] = useState('');
  const [filterKec, setFilterKec] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingR, setEditingR] = useState<Respondent | null>(null);

  const [respondents, setRespondents] = useState<Respondent[]>(() => generateMockRespondents(80));

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Username atau password salah. Gunakan admin / admin.');
    }
  };

  const filtered = useMemo(() => {
    return respondents.filter(r => {
      const matchSearch = !search || r.nama.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) || r.kecamatan.toLowerCase().includes(search.toLowerCase());
      const matchKec = !filterKec || r.kecamatan === filterKec;
      return matchSearch && matchKec;
    });
  }, [respondents, search, filterKec]);

  const kecamatanList = useMemo(() => Array.from(new Set(respondents.map(r => r.kecamatan))).sort(), [respondents]);

  const stats = useMemo(() => {
    const total = respondents.length;
    const validGPS = respondents.filter(r => r.latitude < -8 && r.latitude > -8.5).length;
    const duplicates = Math.floor(total * 0.03);
    return {
      total,
      validGPS,
      invalidGPS: total - validGPS,
      duplicates,
    };
  }, [respondents]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    setRespondents(respondents.filter(r => !selected.has(r.id)));
    setSelected(new Set());
  };

  const deleteRespondent = (id: string) => {
    setRespondents(respondents.filter(r => r.id !== id));
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="dash-card p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-agro-600 to-agro-800 flex items-center justify-center mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-sm text-slate-500 mt-1">GeoGenZ AgroInsight Dashboard Admin</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Username</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-agro-600 to-agro-700 hover:from-agro-500 hover:to-agro-600 text-white font-semibold transition-all shadow-md"
              >
                <LogIn className="w-4 h-4" />
                Masuk ke Admin
              </button>
            </form>

            <div className="mt-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
              <strong>Demo credentials:</strong> username <code className="bg-white px-1 rounded">admin</code> / password <code className="bg-white px-1 rounded">admin</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-agro-700 text-sm mb-1">
                <Shield className="w-4 h-4" />
                <span className="font-medium">Administrator Panel</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">Kelola Data Responden</h1>
              <p className="text-sm text-slate-500 mt-0.5">Verifikasi GPS, deteksi duplikasi, edit data, dan export.</p>
            </div>
            <button
              onClick={() => setLoggedIn(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium self-start md:self-auto"
            >
              <X className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'Total Responden', v: stats.total, icon: Users, color: 'from-agro-500 to-agro-600' },
            { l: 'GPS Valid', v: stats.validGPS, icon: CheckCircle2, color: 'from-green-500 to-emerald-600' },
            { l: 'GPS Tidak Valid', v: stats.invalidGPS, icon: AlertTriangle, color: 'from-red-500 to-red-600' },
            { l: 'Duplikasi', v: stats.duplicates, icon: Database, color: 'from-amber-500 to-orange-600' },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="dash-card p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${k.color}`}></div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">{k.l}</div>
                    <div className="font-display font-bold text-2xl text-slate-900 mt-0.5">{k.v}</div>
                  </div>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export */}
        <div className="dash-card p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div>
              <h3 className="font-display font-bold text-slate-900">Export Data</h3>
              <p className="text-xs text-slate-500">Unduh data responden dalam berbagai format.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'CSV', icon: FileSpreadsheet, color: 'bg-green-600' },
                { label: 'Excel', icon: FileSpreadsheet, color: 'bg-emerald-700' },
                { label: 'GeoJSON', icon: FileJson, color: 'bg-blue-600' },
                { label: 'Shapefile', icon: FileType2, color: 'bg-purple-600' },
                { label: 'GeoPackage', icon: Database, color: 'bg-earth-600' },
              ].map((b, i) => {
                const Icon = b.icon;
                return (
                  <button key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors">
                    <div className={`w-6 h-6 rounded ${b.color} flex items-center justify-center`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="dash-card p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama / ID / kecamatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={filterKec}
                  onChange={(e) => setFilterKec(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white appearance-none"
                >
                  <option value="">Semua Kecamatan</option>
                  {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus {selected.size}
                </button>
              )}
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-agro-600 text-white hover:bg-agro-700 text-sm font-medium">
                <UserCheck className="w-4 h-4" />
                Validasi GPS
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="dash-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-agro-600 focus:ring-agro-500"
                    />
                  </th>
                  <th>ID</th>
                  <th>Nama</th>
                  <th>Usia</th>
                  <th>JK</th>
                  <th>Kecamatan</th>
                  <th>Koordinat</th>
                  <th>Skor</th>
                  <th>Kategori</th>
                  <th>GPS</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 30).map((r) => {
                  const gpsValid = r.latitude < -8 && r.latitude > -8.5;
                  return (
                    <tr key={r.id} className={selected.has(r.id) ? 'bg-agro-50' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="rounded border-slate-300 text-agro-600 focus:ring-agro-500"
                        />
                      </td>
                      <td className="font-mono font-semibold text-slate-600 text-xs">{r.id}</td>
                      <td className="font-medium text-slate-900">{r.nama}</td>
                      <td>{r.usia}</td>
                      <td>{r.jenisKelamin}</td>
                      <td className="text-xs">{r.kecamatan}</td>
                      <td className="font-mono text-[11px] text-slate-500">{r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}</td>
                      <td className="font-mono font-bold text-slate-900">{r.finalScore.toFixed(2)}</td>
                      <td>
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: getCategoryColor(r.kategori) }}
                        >
                          {r.kategori}
                        </span>
                      </td>
                      <td>
                        {gpsValid ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setEditingR(r)}
                            className="w-7 h-7 rounded hover:bg-blue-50 text-blue-600 flex items-center justify-center"
                            title="Lihat/Edit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingR(r)}
                            className="w-7 h-7 rounded hover:bg-amber-50 text-amber-600 flex items-center justify-center"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRespondent(r.id)}
                            className="w-7 h-7 rounded hover:bg-red-50 text-red-600 flex items-center justify-center"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {Math.min(30, filtered.length)} dari {filtered.length} data.</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">Sebelumnya</button>
              <button className="px-2 py-1 rounded bg-agro-600 text-white">1</button>
              <button className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">2</button>
              <button className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">3</button>
              <button className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">Selanjutnya</button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingR && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={() => setEditingR(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-display font-bold text-slate-900">Detail Responden</h3>
                <p className="text-xs text-slate-500 font-mono">{editingR.id}</p>
              </div>
              <button onClick={() => setEditingR(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama" value={editingR.nama} />
                <Field label="Usia" value={`${editingR.usia} tahun`} />
                <Field label="Jenis Kelamin" value={editingR.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'} />
                <Field label="Pendidikan" value={editingR.pendidikan} />
                <Field label="Kecamatan" value={editingR.kecamatan} />
                <Field label="Desa" value={editingR.desa} />
              </div>
              <div className="h-px bg-slate-100 my-2"></div>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded bg-agro-50 text-center">
                  <div className="text-[10px] text-agro-700 font-bold">PP</div>
                  <div className="font-mono font-bold text-agro-900">{editingR.pp.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded bg-blue-50 text-center">
                  <div className="text-[10px] text-blue-700 font-bold">PT</div>
                  <div className="font-mono font-bold text-blue-900">{editingR.pt.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded bg-amber-50 text-center">
                  <div className="text-[10px] text-amber-700 font-bold">NK</div>
                  <div className="font-mono font-bold text-amber-900">{editingR.nk.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded bg-earth-50 text-center">
                  <div className="text-[10px] text-earth-700 font-bold">LS</div>
                  <div className="font-mono font-bold text-earth-900">{editingR.ls.toFixed(2)}</div>
                </div>
              </div>
              <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: getCategoryColor(editingR.kategori) + '20' }}>
                <div>
                  <div className="text-[10px] text-slate-500">Skor Akhir</div>
                  <div className="font-display font-bold text-2xl text-slate-900">{editingR.finalScore.toFixed(2)}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: getCategoryColor(editingR.kategori) }}>
                  {editingR.kategori}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-slate-50">
                  <div className="text-slate-500">Latitude</div>
                  <div className="font-mono font-bold">{editingR.latitude.toFixed(6)}</div>
                </div>
                <div className="p-2 rounded bg-slate-50">
                  <div className="text-slate-500">Longitude</div>
                  <div className="font-mono font-bold">{editingR.longitude.toFixed(6)}</div>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 text-xs">
                <div className="text-slate-500">Waktu Pengisian</div>
                <div className="font-medium text-slate-700">{new Date(editingR.timestamp).toLocaleString('id-ID')}</div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
              <button onClick={() => setEditingR(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium">Tutup</button>
              <button className="px-4 py-2 rounded-lg bg-agro-600 text-white hover:bg-agro-700 text-sm font-semibold inline-flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" />
                Edit Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wide mb-0.5">{label}</div>
      <div className="font-medium text-slate-900 text-sm">{value}</div>
    </div>
  );
}
