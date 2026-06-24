import { Leaf, MapPin, Mail, Code2, GraduationCap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-agro-500 to-agro-700 flex items-center justify-center shadow-md">
                  <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-earth-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <div>
                <div className="font-display font-bold text-white text-lg leading-tight">GeoGenZ AgroInsight</div>
                <div className="text-xs text-agro-400 font-medium">WebGIS Penelitian Kabupaten Jember</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg mb-4">
              Platform WebGIS untuk analisis persepsi Generasi Z terhadap potensi wilayah lokal
              di Kabupaten Jember, Jawa Timur.
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <GraduationCap className="w-4 h-4" />
              <span>Penelitian Akademik Fakultas Ilmu Komputer &copy; {new Date().getFullYear()}</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Navigasi</h4>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:text-agro-400 transition-colors cursor-pointer">Home</a></li>
              <li><a className="hover:text-agro-400 transition-colors cursor-pointer">Tentang Penelitian</a></li>
              <li><a className="hover:text-agro-400 transition-colors cursor-pointer">Isi Survei</a></li>
              <li><a className="hover:text-agro-400 transition-colors cursor-pointer">Dashboard</a></li>
              <li><a className="hover:text-agro-400 transition-colors cursor-pointer">Peta Interaktif</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Kontak</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-agro-400 flex-shrink-0" />
                <span>Fakultas Ilmu Komputer<br />Jember, Jawa Timur<br />Indonesia</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-agro-400" />
                <span>geogenz@unej.ac.id</span>
              </li>
              <li className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-agro-400" />
                <span>Open Source Research</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} GeoGenZ AgroInsight. Penelitian Model Geoinformatika.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Built with React + Vite + Firebase + Leaflet</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
            <span>Basemap &copy; OpenStreetMap</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
