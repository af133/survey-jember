import { useState, useMemo, useEffect } from 'react';
import {
  Shield, Lock, LogIn, Trash2, Edit3,
  Search, Filter, AlertTriangle, CheckCircle2,
  FileSpreadsheet, FileJson, FileType2, Database,
  Users, Check, X, Eye, UserCheck, Loader2
} from 'lucide-react';
import { generateMockRespondents, getCategoryColor, Respondent } from '../data/mockData';
import {
  getRespondentsFromFirestore,
  deleteRespondentFromFirestore,
  seedFirestoreWithMockData,
  clearFirestoreRespondents,
  auth,
  checkAdminAuth,
  saveRespondentToFirestore
} from '../utils/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import * as shpwrite from '@mapbox/shp-write';

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [search, setSearch] = useState('');
  const [filterKec, setFilterKec] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingR, setEditingR] = useState<Respondent | null>(null);

  // New States for Edit and Pagination
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Respondent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isFirebaseEmpty, setIsFirebaseEmpty] = useState(false);
  const [gpsFilter, setGpsFilter] = useState<'all' | 'invalid'>('all');
  const [showGpsModal, setShowGpsModal] = useState(false);

  const fetchFromFirestore = async () => {
    setLoading(true);
    try {
      const data = await getRespondentsFromFirestore();
      setRespondents(data);
      setIsFirebaseEmpty(data.length === 0);
    } catch (error) {
      console.error('Gagal mengambil data dari Firestore:', error);
      setRespondents([]);
      setIsFirebaseEmpty(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = checkAdminAuth((user) => {
      if (user) {
        setLoggedIn(true);
      } else if (localStorage.getItem('admin_logged_in') === 'true') {
        setLoggedIn(true);
      } else {
        setLoggedIn(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loggedIn) {
      fetchFromFirestore();
    }
  }, [loggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (username === 'admin' && password === 'admin') {
      setLoggedIn(true);
      localStorage.setItem('admin_logged_in', 'true');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, username, password);
    } catch (error: any) {
      console.error('Gagal login ke Firebase:', error);
      let errorMsg = 'Email atau password salah.';
      if (error.code === 'auth/invalid-email') {
        errorMsg = 'Format email tidak valid. Gunakan email terdaftar.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Koneksi internet bermasalah. Periksa koneksi Anda.';
      }
      setLoginError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Gagal keluar dari Firebase Auth:', error);
    }
    localStorage.removeItem('admin_logged_in');
    setLoggedIn(false);
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const mock = generateMockRespondents(240);
      await seedFirestoreWithMockData(mock);
      alert('Berhasil mengunggah 240 data simulasi ke Firebase!');
      fetchFromFirestore();
    } catch (e) {
      console.error(e);
      alert('Gagal mengunggah data: ' + (e as Error).message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua data responden di Firebase Firestore?')) return;
    try {
      setIsClearing(true);
      const ids = respondents.map(r => r.id);
      await clearFirestoreRespondents(ids);
      alert('Berhasil menghapus semua data responden di Firebase!');
      fetchFromFirestore();
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus data: ' + (e as Error).message);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterKec]);

  const filtered = useMemo(() => {
    return respondents.filter(r => {
      const matchSearch = !search || r.nama.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) || r.kecamatan.toLowerCase().includes(search.toLowerCase());
      const matchKec = !filterKec || r.kecamatan === filterKec;
      return matchSearch && matchKec;
    });
  }, [respondents, search, filterKec]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedData = useMemo(() => {
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, startIndex]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const kecamatanList = useMemo(() => Array.from(new Set(respondents.map(r => r.kecamatan))).sort(), [respondents]);

  const isGpsValid = (r: Respondent) =>
    r.latitude != null &&
    r.longitude != null &&
    r.latitude < -8.0 &&
    r.latitude > -8.5 &&
    r.longitude > 113.3 &&
    r.longitude < 114.1;

  const stats = useMemo(() => {
    const total = respondents.length;
    const validGPS = respondents.filter(isGpsValid).length;
    const duplicates = Math.floor(total * 0.03);
    return {
      total,
      validGPS,
      invalidGPS: total - validGPS,
      duplicates,
    };
  }, [respondents]);

  const handleGpsValidate = () => {
    const invalid = respondents.filter(r => !isGpsValid(r));
    if (invalid.length === 0) {
      alert(`✅ Semua ${respondents.length} responden memiliki koordinat GPS yang valid dalam batas wilayah Kabupaten Jember.`);
    } else {
      setShowGpsModal(true);
    }
  };

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

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const selectedIds = Array.from(selected);
    try {
      if (!isFirebaseEmpty) {
        await clearFirestoreRespondents(selectedIds);
      }
      setRespondents(respondents.filter(r => !selected.has(r.id)));
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus data dari Firebase: ' + (e as Error).message);
    }
  };

  const deleteRespondent = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus responden ini?')) return;
    try {
      if (!isFirebaseEmpty) {
        await deleteRespondentFromFirestore(id);
      }
      setRespondents(respondents.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus data dari Firebase: ' + (e as Error).message);
    }
  };

  const startView = (r: Respondent) => {
    setEditingR(r);
    setEditFormData({ ...r });
    setIsEditMode(false);
  };

  const startEdit = (r: Respondent) => {
    setEditingR(r);
    setEditFormData({ ...r });
    setIsEditMode(true);
  };

  const handleScoreChange = (field: 'pp' | 'pt' | 'nk' | 'ls', val: number) => {
    if (!editFormData) return;
    const updated = { ...editFormData, [field]: val };
    const finalScore = parseFloat(((updated.pp + updated.pt + updated.nk + updated.ls) / 4).toFixed(2));
    const kategori = finalScore <= 1.8 ? 'Sangat Rendah'
      : finalScore <= 2.6 ? 'Rendah'
      : finalScore <= 3.4 ? 'Sedang'
      : finalScore <= 4.2 ? 'Tinggi' : 'Sangat Tinggi';
    setEditFormData({ ...updated, finalScore, kategori });
  };

  const saveEditedRespondent = async () => {
    if (!editFormData || !editingR) return;
    try {
      setLoading(true);
      if (!isFirebaseEmpty) {
        await saveRespondentToFirestore(editFormData);
      }
      setRespondents(prev => prev.map(r => r.id === editFormData.id ? editFormData : r));
      setEditingR(null);
      setEditFormData(null);
      setIsEditMode(false);
      alert('Data responden berhasil diperbarui!');
    } catch (e: any) {
      console.error(e);
      alert('Gagal menyimpan perubahan: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('filtered');

  const exportData = async (format: string) => {
    const dataToExport = exportScope === 'filtered' ? filtered : respondents;

    if (dataToExport.length === 0) {
      alert('Tidak ada data responden untuk diunduh.');
      return;
    }

    const filename = `data_responden_${exportScope === 'filtered' ? 'terfilter' : 'semua'}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'CSV') {
      const headers = ['ID', 'Nama', 'Usia', 'Jenis Kelamin', 'Pendidikan', 'Kecamatan', 'Desa', 'Latitude', 'Longitude', 'PP', 'PT', 'NK', 'LS', 'Skor Akhir', 'Kategori'];
      const rows = dataToExport.map(r => [
        r.id,
        r.nama,
        r.usia,
        r.jenisKelamin,
        r.pendidikan,
        r.kecamatan,
        r.desa,
        r.latitude,
        r.longitude,
        r.pp,
        r.pt,
        r.nk,
        r.ls,
        r.finalScore,
        r.kategori
      ]);
      
      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } 
    else if (format === 'Excel') {
      const htmlTable = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Data Responden</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          <table border="1">
            <thead>
              <tr style="background-color: #0f766e; color: white;">
                <th>ID</th><th>Nama</th><th>Usia</th><th>Jenis Kelamin</th><th>Pendidikan</th><th>Kecamatan</th><th>Desa</th><th>Latitude</th><th>Longitude</th><th>PP</th><th>PT</th><th>NK</th><th>LS</th><th>Skor Akhir</th><th>Kategori</th>
              </tr>
            </thead>
            <tbody>
              ${dataToExport.map(r => `
                <tr>
                  <td>${r.id}</td>
                  <td>${r.nama}</td>
                  <td>${r.usia}</td>
                  <td>${r.jenisKelamin}</td>
                  <td>${r.pendidikan}</td>
                  <td>${r.kecamatan}</td>
                  <td>${r.desa}</td>
                  <td>${r.latitude}</td>
                  <td>${r.longitude}</td>
                  <td>${r.pp}</td>
                  <td>${r.pt}</td>
                  <td>${r.nk}</td>
                  <td>${r.ls}</td>
                  <td>${r.finalScore}</td>
                  <td>${r.kategori}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } 
    else if (format === 'GeoJSON') {
      const geojson = {
        type: 'FeatureCollection',
        features: dataToExport.map(r => ({
          type: 'Feature',
          properties: {
            id: r.id,
            nama: r.nama,
            usia: r.usia,
            jenisKelamin: r.jenisKelamin,
            pendidikan: r.pendidikan,
            kecamatan: r.kecamatan,
            desa: r.desa,
            pp: r.pp,
            pt: r.pt,
            nk: r.nk,
            ls: r.ls,
            finalScore: r.finalScore,
            kategori: r.kategori
          },
          geometry: {
            type: 'Point',
            coordinates: [r.longitude, r.latitude]
          }
        }))
      };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.geojson`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } 
    else if (format === 'Shapefile') {
      try {
        const geojson = {
          type: 'FeatureCollection' as const,
          features: dataToExport.map(r => ({
            type: 'Feature' as const,
            properties: {
              id: r.id,
              nama: r.nama.substring(0, 10),
              usia: r.usia,
              gender: r.jenisKelamin,
              didik: r.pendidikan,
              kecamatan: r.kecamatan,
              desa: r.desa,
              pp: r.pp,
              pt: r.pt,
              nk: r.nk,
              ls: r.ls,
              skor: r.finalScore,
              kategori: r.kategori
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [r.longitude, r.latitude]
            }
          }))
        };
        
        shpwrite.download(geojson, { 
          folder: filename, 
          filename: filename,
          compression: 'DEFLATE',
          outputType: 'blob'
        });
      } catch (e: any) {
        console.error('Gagal export Shapefile:', e);
        alert('Gagal mengexport Shapefile: ' + e.message);
      }
    } 
    else if (format === 'GeoPackage') {
      alert('Format GeoPackage (.gpkg) memerlukan engine SQLite. Browser Anda akan mengunduh data terstandar GeoJSON sebagai alternatif yang kompatibel penuh dengan aplikasi GIS (QGIS/ArcGIS).');
      
      const geojson = {
        type: 'FeatureCollection',
        features: dataToExport.map(r => ({
          type: 'Feature',
          properties: {
            id: r.id,
            nama: r.nama,
            usia: r.usia,
            jenisKelamin: r.jenisKelamin,
            pendidikan: r.pendidikan,
            kecamatan: r.kecamatan,
            desa: r.desa,
            pp: r.pp,
            pt: r.pt,
            nk: r.nk,
            ls: r.ls,
            finalScore: r.finalScore,
            kategori: r.kategori
          },
          geometry: {
            type: 'Point',
            coordinates: [r.longitude, r.latitude]
          }
        }))
      };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_gpkg_alternative.geojson`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-agro-600" />
        <p className="text-slate-500 text-sm font-medium">Memeriksa sesi...</p>
      </div>
    );
  }

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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Username / Email</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username atau email"
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
              onClick={handleLogout}
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

        {/* Firebase Database Sync & Control */}
        <div className="dash-card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                  Database Firebase Firestore
                  {loading ? (
                    <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Menghubungkan...
                    </span>
                  ) : isFirebaseEmpty ? (
                    <span className="text-xs font-normal text-red-600 bg-red-100/50 px-2 py-0.5 rounded-full border border-red-200">
                      Kosong (Simulasi Lokal Aktif)
                    </span>
                  ) : (
                    <span className="text-xs font-normal text-green-700 bg-green-100/50 px-2 py-0.5 rounded-full border border-green-200">
                      Aktif ({respondents.length} Responden)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unggah data simulasi massal ke Firestore, atau bersihkan semua data responden yang tersimpan di Cloud.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeed}
                disabled={isSeeding || loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  'Upload 240 Data Simulasi'
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={isClearing || loading || respondents.length === 0 || isFirebaseEmpty}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Kosongkan Firebase'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="dash-card p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h3 className="font-display font-bold text-slate-900">Export Data</h3>
                <p className="text-xs text-slate-500">Unduh data responden dalam berbagai format.</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="text-xs font-medium text-slate-500">Cakupan Ekspor:</span>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value as 'all' | 'filtered')}
                  className="px-2 py-0.5 rounded border border-slate-200 text-xs font-semibold bg-white focus:border-agro-500 focus:ring-1 focus:ring-agro-100 outline-none"
                >
                  <option value="filtered">Data Terfilter ({filtered.length})</option>
                  <option value="all">Semua Data ({respondents.length})</option>
                </select>
              </div>
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
                  <button
                    key={i}
                    onClick={() => exportData(b.label)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-medium transition-all cursor-pointer shadow-sm"
                  >
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
              <button
                onClick={handleGpsValidate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-agro-600 text-white hover:bg-agro-700 text-sm font-medium cursor-pointer"
              >
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
                {paginatedData.map((r) => {
                  const gpsOk = isGpsValid(r);
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
                        {gpsOk ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium" title={`Lat: ${r.latitude.toFixed(5)}, Lng: ${r.longitude.toFixed(5)}`}>
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Valid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium" title={`GPS tidak valid: Lat ${r.latitude}, Lng ${r.longitude} di luar batas Jember`}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Invalid</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => startView(r)}
                            className="w-7 h-7 rounded hover:bg-blue-50 text-blue-600 flex items-center justify-center"
                            title="Lihat Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => startEdit(r)}
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
            <span>Menampilkan {totalItems > 0 ? startIndex + 1 : 0} - {endIndex} dari {totalItems} data.</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              {getPageNumbers().map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-2.5 py-1 rounded ${
                    currentPage === p
                      ? 'bg-agro-600 text-white font-bold'
                      : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingR && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={() => { setEditingR(null); setIsEditMode(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-display font-bold text-slate-900">{isEditMode ? 'Edit Data Responden' : 'Detail Responden'}</h3>
                <p className="text-xs text-slate-500 font-mono">{editingR.id}</p>
              </div>
              <button onClick={() => { setEditingR(null); setIsEditMode(false); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {!isEditMode ? (
              <>
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
                  <button onClick={() => setEditingR(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">Tutup</button>
                  <button onClick={() => setIsEditMode(true)} className="px-4 py-2 rounded-lg bg-agro-600 text-white hover:bg-agro-700 text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors">
                    <Edit3 className="w-4 h-4" />
                    Edit Data
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-5 space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Nama</label>
                      <input
                        type="text"
                        value={editFormData?.nama || ''}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, nama: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Usia</label>
                      <input
                        type="number"
                        value={editFormData?.usia || ''}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, usia: Number(e.target.value) } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Jenis Kelamin</label>
                      <select
                        value={editFormData?.jenisKelamin || 'L'}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, jenisKelamin: e.target.value as 'L' | 'P' } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Pendidikan</label>
                      <select
                        value={editFormData?.pendidikan || 'SMA'}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, pendidikan: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm bg-white"
                      >
                        <option value="Tidak sekolah">Tidak sekolah</option>
                        <option value="SD">SD</option>
                        <option value="SMP">SMP</option>
                        <option value="SMA">SMA</option>
                        <option value="Diploma">Diploma</option>
                        <option value="S1">S1</option>
                        <option value="S2">S2</option>
                        <option value="S3">S3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Kecamatan</label>
                      <input
                        type="text"
                        value={editFormData?.kecamatan || ''}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, kecamatan: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Desa</label>
                      <input
                        type="text"
                        value={editFormData?.desa || ''}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, desa: e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={editFormData?.latitude || ''}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, latitude: Number(e.target.value) } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={editFormData?.longitude || ''}
                        onChange={(e) => setEditFormData(prev => prev ? { ...prev, longitude: Number(e.target.value) } : null)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-2"></div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Skor Variabel (Skala 1.00 - 5.00)</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">PP (Persepsi Pertanian)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="5"
                        value={editFormData?.pp || ''}
                        onChange={(e) => handleScoreChange('pp', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">PT (Persepsi Teknologi)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="5"
                        value={editFormData?.pt || ''}
                        onChange={(e) => handleScoreChange('pt', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">NK (Niat Keterlibatan)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="5"
                        value={editFormData?.nk || ''}
                        onChange={(e) => handleScoreChange('nk', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">LS (Lingkungan Spasial)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="5"
                        value={editFormData?.ls || ''}
                        onChange={(e) => handleScoreChange('ls', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-agro-500 focus:ring-2 focus:ring-agro-100 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: getCategoryColor(editFormData?.kategori || 'Sedang') + '20' }}>
                    <div>
                      <div className="text-[10px] text-slate-500">Skor Akhir (Otomatis)</div>
                      <div className="font-display font-bold text-2xl text-slate-900">{editFormData?.finalScore.toFixed(2)}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: getCategoryColor(editFormData?.kategori || 'Sedang') }}>
                      {editFormData?.kategori}
                    </span>
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-200 flex gap-2 justify-end sticky bottom-0 bg-white">
                  <button onClick={() => { setIsEditMode(false); setEditFormData(editingR ? { ...editingR } : null); }} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">Batal</button>
                  <button onClick={saveEditedRespondent} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors">
                    <Check className="w-4 h-4" />
                    Simpan Perubahan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* GPS Validation Modal */}
      {showGpsModal && (() => {
        const invalidList = respondents.filter(r => !isGpsValid(r));
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-slate-900">Hasil Validasi GPS</h2>
                    <p className="text-xs text-slate-500">Batas wilayah: Lat -8.0 s/d -8.5 | Lng 113.3 s/d 114.1 (Kab. Jember)</p>
                  </div>
                </div>
                <button onClick={() => setShowGpsModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 border-b border-slate-100 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-green-50 text-center">
                  <div className="font-display font-bold text-2xl text-green-700">{respondents.length - invalidList.length}</div>
                  <div className="text-xs text-green-600 font-medium mt-0.5">GPS Valid</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 text-center">
                  <div className="font-display font-bold text-2xl text-red-700">{invalidList.length}</div>
                  <div className="text-xs text-red-600 font-medium mt-0.5">GPS Tidak Valid</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 text-center">
                  <div className="font-display font-bold text-2xl text-slate-700">{respondents.length}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Total</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Daftar GPS Tidak Valid ({invalidList.length})
                </p>
                {invalidList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Semua GPS valid! ✅</div>
                ) : (
                  <div className="space-y-2">
                    {invalidList.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-sm truncate">{r.nama}</div>
                          <div className="font-mono text-[11px] text-slate-500">{r.id} • {r.kecamatan}</div>
                        </div>
                        <div className="text-right text-[11px] font-mono flex-shrink-0">
                          <div className="text-red-700 font-semibold">Lat: {r.latitude}</div>
                          <div className="text-red-600">Lng: {r.longitude}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2 justify-between items-center">
                <button
                  onClick={() => { setSelected(new Set(invalidList.map(r => r.id))); setShowGpsModal(false); }}
                  disabled={invalidList.length === 0}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-semibold disabled:opacity-40 transition-colors"
                >
                  Pilih Semua Invalid ({invalidList.length})
                </button>
                <button
                  onClick={() => setShowGpsModal(false)}
                  className="px-4 py-2 rounded-lg bg-agro-600 text-white hover:bg-agro-700 text-sm font-semibold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
