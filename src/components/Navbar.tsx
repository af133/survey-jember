import { useState } from 'react';
import { Menu, X, Leaf, MapPin, BarChart3, FileText, Home, Users, LogIn, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const menuItems = [
  { id: 'home', label: 'Home', icon: Home, protected: false },
  { id: 'about', label: 'Tentang', icon: FileText, protected: false },
  { id: 'survey', label: 'Isi Survei', icon: Users, protected: false },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, protected: true },
  { id: 'map', label: 'Peta Interaktif', icon: MapPin, protected: true },
  { id: 'analysis', label: 'Analisis', icon: BarChart3, protected: true },
];

export default function Navbar({ currentPage, setCurrentPage }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn, authLoading } = useAuth();

  const visibleMenuItems = menuItems.filter(
    (item) => !item.protected || (isLoggedIn && !authLoading)
  );

  const handleNav = (id: string) => {
    setCurrentPage(id);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-agro-500 to-agro-700 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-earth-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-display font-bold text-slate-900 text-lg leading-tight">GeoGenZ</div>
              <div className="text-[10px] text-agro-600 font-semibold uppercase tracking-wider leading-tight">AgroInsight</div>
            </div>
          </button>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center gap-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-agro-50 text-agro-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right side: badge + tombol Admin/Login */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-agro-50 border border-agro-200 text-xs font-medium text-agro-700">
              <div className="w-1.5 h-1.5 bg-agro-500 rounded-full animate-pulse"></div>
              <span>Live: 240 Responden</span>
            </div>

            {!authLoading && (
              isLoggedIn ? (
                <button
                  onClick={() => handleNav('admin')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === 'admin'
                      ? 'bg-agro-50 text-agro-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-agro-700'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              ) : (
                <button
                  onClick={() => handleNav('admin')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-agro-700 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-agro-50 text-agro-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}

            {!authLoading && (
              isLoggedIn ? (
                <button
                  onClick={() => handleNav('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 'admin'
                      ? 'bg-agro-50 text-agro-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </button>
              ) : (
                <button
                  onClick={() => handleNav('admin')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogIn className="w-5 h-5" />
                  Login
                </button>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
}