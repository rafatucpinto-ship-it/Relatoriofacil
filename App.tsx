import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  ChevronLeft, 
  Camera, 
  Download, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Briefcase,
  X,
  Image as ImageIcon,
  Settings,
  Save,
  Edit3,
  Lock,
  LogOut,
  User,
  ArrowRight,
  Database,
  Upload,
  DownloadCloud,
  Moon,
  Sun,
  Palette,
  Search,
  PenTool,
  Type,
  Maximize,
  Info,
  Share2,
  FileCheck,
  Smartphone
} from 'lucide-react';
import { TEAMS, WORK_CENTERS, ReportTemplate, ReportData, ReportPhoto } from './types';
import * as db from './services/db';
import { generatePDF } from './services/pdfService';

// --- Configuration & Utils ---

type PhotoQuality = 'high' | 'medium' | 'low';

// ADJUSTED SETTINGS: Reduced max widths to prevent memory crashes on mobile devices during PDF generation
const PHOTO_SETTINGS = {
  high: { maxWidth: 1600, quality: 0.8, label: 'Alta (Boa para PDF)', desc: 'Detalhes nítidos, arquivo moderado.' },
  medium: { maxWidth: 1024, quality: 0.7, label: 'Média (Recomendado)', desc: 'Rápido e leve.' },
  low: { maxWidth: 800, quality: 0.6, label: 'Baixa (Econômica)', desc: 'Ideal para muitas fotos.' }
};

const getPhotoQuality = (): PhotoQuality => {
  return (localStorage.getItem('photoQuality') as PhotoQuality) || 'medium'; // Default changed to medium for safety
};

const processImage = (source: HTMLVideoElement | HTMLImageElement): string => {
  const qualityMode = getPhotoQuality();
  const settings = PHOTO_SETTINGS[qualityMode];
  
  let width, height;
  if (source instanceof HTMLVideoElement) {
    width = source.videoWidth;
    height = source.videoHeight;
  } else {
    width = source.naturalWidth;
    height = source.naturalHeight;
  }
  
  // Safety check for dimensions
  if (!width || !height || width === 0 || height === 0) return '';

  // Resize logic maintaining aspect ratio
  if (width > settings.maxWidth || height > settings.maxWidth) {
    const ratio = width / height;
    if (width > height) {
        width = settings.maxWidth;
        height = width / ratio;
    } else {
        height = settings.maxWidth;
        width = height * ratio;
    }
  }
  
  // Ensure integer dimensions for Canvas
  width = Math.floor(width);
  height = Math.floor(height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Fill white background to handle potential transparency issues
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  ctx.drawImage(source, 0, 0, width, height);
  
  // Always export as JPEG for PDF compatibility and compression
  return canvas.toDataURL('image/jpeg', settings.quality);
};

// --- Shared Components ---

const Header: React.FC<{ title: string; showBack?: boolean; rightAction?: React.ReactNode }> = ({ title, showBack, rightAction }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-emerald-700 dark:bg-emerald-900 text-white p-4 sticky top-0 z-50 shadow-md safe-area-top transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          {showBack && (
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-emerald-600 dark:hover:bg-emerald-800 rounded-full shrink-0">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-sm font-bold leading-tight">{title}</h1>
        </div>
        <div className="shrink-0 ml-2">{rightAction}</div>
      </div>
    </div>
  );
};

const Card: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className }) => (
  <div 
    onClick={onClick} 
    className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors duration-300 ${onClick ? 'active:bg-slate-50 dark:active:bg-slate-700 active:scale-[0.98] cursor-pointer' : ''} ${className || ''}`}
  >
    {children}
  </div>
);

const InputGroup: React.FC<{ label: string; children: React.ReactNode; error?: boolean }> = ({ label, children, error }) => (
  <div className="mb-4">
    <label className={`block text-sm font-semibold mb-1 ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
      {label} {error && '*'}
    </label>
    {children}
  </div>
);

// --- Screen: Login / Register ---

interface LoginScreenProps {
  onLogin: (status: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
        if (!username || !password) {
            throw new Error("Preencha todos os campos");
        }

        if (isRegistering) {
            if (password !== confirmPassword) {
                throw new Error("As senhas não coincidem");
            }
            if (password.length < 4) {
                throw new Error("A senha deve ter pelo menos 4 caracteres");
            }

            await db.createUser({
                username: username.trim(),
                password: password,
                createdAt: Date.now()
            });

            setSuccessMsg("Conta criada com sucesso! Faça login.");
            setIsRegistering(false);
            setPassword('');
            setConfirmPassword('');
        } else {
            const isValid = await db.validateUser(username.trim(), password);
            if (isValid) {
                onLogin(true);
            } else {
                throw new Error("Usuário ou senha incorretos");
            }
        }
    } catch (err: any) {
        setError(err.message || "Ocorreu um erro");
    } finally {
        setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccessMsg('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-colors duration-300">
        <div className="bg-emerald-700 dark:bg-emerald-800 p-8 text-center transition-colors">
          <div className="w-20 h-20 bg-emerald-600 dark:bg-emerald-700 rounded-full mx-auto flex items-center justify-center mb-4 shadow-inner">
             <Lock size={40} className="text-emerald-100" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">AUTOMAÇÃO</h1>
          <p className="text-emerald-200 text-sm tracking-widest uppercase">Mina Serra Sul</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-6">
              {isRegistering ? 'Criar Nova Conta' : 'Acesse sua Conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
             {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={16} />
                {successMsg}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={20} className="text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-slate-900 dark:text-white dark:placeholder-slate-400"
                  placeholder="Seu nome de usuário"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={20} className="text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-slate-900 dark:text-white dark:placeholder-slate-400"
                  placeholder="Sua senha"
                />
              </div>
            </div>

            {isRegistering && (
                <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Confirmar Senha</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={20} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-slate-900 dark:text-white dark:placeholder-slate-400"
                    placeholder="Repita sua senha"
                    />
                </div>
                </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 dark:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Processando...' : (isRegistering ? 'CRIAR CONTA' : 'ENTRAR')}
            </button>
            
            <div className="text-center pt-2">
                <button 
                    type="button" 
                    onClick={toggleMode}
                    className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                    {isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem conta? Crie uma agora'}
                </button>
            </div>
            
            {!isRegistering && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
                Dica: Use <strong>admin</strong> / <strong>admin</strong> se esqueceu a senha.
                </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Screen: Settings ---

interface SettingsScreenProps {
  installPrompt: any;
  onInstall: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ installPrompt, onInstall }) => {
  const [quality, setQuality] = useState<PhotoQuality>(getPhotoQuality());
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [processing, setProcessing] = useState(false);
  const [hideEmptyFields, setHideEmptyFields] = useState(localStorage.getItem('hideEmptyFields') === 'true');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSelect = (q: PhotoQuality) => {
    setQuality(q);
    localStorage.setItem('photoQuality', q);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  const toggleHideEmpty = () => {
      const newValue = !hideEmptyFields;
      setHideEmptyFields(newValue);
      localStorage.setItem('hideEmptyFields', String(newValue));
  };

  const handleExportBackup = async () => {
    setProcessing(true);
    try {
        const reports = await db.getAllReports();
        const templates = await db.getTemplates();
        
        const backupData = {
            version: 1,
            timestamp: new Date().toISOString(),
            reports,
            templates
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_mina_serra_sul_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Backup realizado com sucesso! \n${reports.length} Relatórios \n${templates.length} Modelos`);
    } catch (e) {
        console.error(e);
        alert('Erro ao gerar backup.');
    } finally {
        setProcessing(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: Isso irá adicionar relatórios e modelos do arquivo ao seu banco de dados atual. Deseja continuar?')) {
        e.target.value = '';
        return;
    }

    setProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (!json.reports || !json.templates) {
                throw new Error("Formato de arquivo inválido.");
            }
            
            await db.importBackup({
                reports: json.reports,
                templates: json.templates
            });

            alert('Backup restaurado com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao restaurar backup. Verifique se o arquivo é válido.');
        } finally {
            setProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header title="Configurações" showBack />
      <div className="p-4 max-w-lg mx-auto space-y-6">

        {/* Install App Section (Only if available) */}
        {installPrompt && (
           <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-xl shadow-lg p-5 text-white animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start justify-between">
                 <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      <Smartphone size={22} />
                      Instalar Aplicativo
                    </h2>
                    <p className="text-emerald-100 text-sm mt-1">
                      Adicione o app à sua tela inicial para acesso offline rápido e tela cheia.
                    </p>
                 </div>
              </div>
              <button 
                onClick={onInstall}
                className="mt-4 w-full bg-white text-emerald-800 font-bold py-3 rounded-lg hover:bg-emerald-50 active:scale-[0.98] transition-all"
              >
                Instalar Agora
              </button>
           </div>
        )}
        
        {/* Theme Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               <Palette size={20} className="text-purple-600 dark:text-purple-400"/>
               Aparência
             </h2>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
               Personalize a experiência visual do aplicativo.
             </p>
           </div>
           <div className="p-4">
              <button 
                onClick={toggleTheme}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}
              >
                  <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon size={24} className="text-blue-300" /> : <Sun size={24} className="text-amber-500" />}
                      <span className="font-semibold">{theme === 'dark' ? 'Modo Escuro Ativado' : 'Modo Claro Ativado'}</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                  </div>
              </button>
           </div>
        </div>

        {/* PDF Options */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
             <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               <FileCheck size={20} className="text-orange-600 dark:text-orange-400"/>
               Exportação PDF
             </h2>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
               Opções para a geração do relatório final.
             </p>
           </div>
           <div className="p-4">
                <label className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Ocultar campos vazios no PDF</span>
                    <input 
                        type="checkbox" 
                        checked={hideEmptyFields} 
                        onChange={toggleHideEmpty}
                        className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                </label>
           </div>
        </div>

        {/* Photo Quality Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
           <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               <Camera size={20} className="text-emerald-600 dark:text-emerald-400"/>
               Qualidade das Fotos
             </h2>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
               Ajuste a resolução das fotos para controlar o tamanho dos arquivos.
             </p>
           </div>
           
           <div className="divide-y divide-slate-100 dark:divide-slate-700">
             {(Object.keys(PHOTO_SETTINGS) as PhotoQuality[]).map((key) => {
               const setting = PHOTO_SETTINGS[key];
               const isSelected = quality === key;
               return (
                 <button
                   key={key}
                   onClick={() => handleSelect(key)}
                   className={`w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                 >
                   <div>
                     <div className={`font-semibold ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                       {setting.label}
                     </div>
                     <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{setting.desc}</div>
                   </div>
                   {isSelected && <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />}
                 </button>
               );
             })}
           </div>
        </div>

        {/* Backup Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
           <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               <Database size={20} className="text-blue-600 dark:text-blue-400"/>
               Backup e Dados
             </h2>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
               Exporte todos os seus relatórios e modelos para segurança.
             </p>
           </div>
           
           <div className="p-4 space-y-3">
              <button 
                onClick={handleExportBackup}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 p-3 rounded-lg font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 active:bg-blue-200 transition-colors disabled:opacity-50"
              >
                 <DownloadCloud size={20} />
                 {processing ? 'Processando...' : 'Fazer Backup (Download)'}
              </button>

              <div className="relative">
                 <input 
                    type="file" 
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={processing}
                 />
                 <button 
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 p-3 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 active:bg-slate-200 transition-colors disabled:opacity-50"
                 >
                    <Upload size={20} />
                    {processing ? 'Processando...' : 'Restaurar Backup'}
                 </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                  Nota: O arquivo de backup contém todas as fotos. Pode ser grande.
              </p>
           </div>
        </div>

        {/* About Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
           <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               <Info size={20} className="text-sky-600 dark:text-sky-400"/>
               Sobre
             </h2>
           </div>
           <div className="p-6 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Briefcase size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">Relatório de Execução</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                 Versão 1.1.0 (PWA)
              </p>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                 <p className="text-slate-700 dark:text-slate-300 font-medium italic">
                    "Criado por Rafael com o intuito de ajudar na agilidade das tarefas."
                 </p>
              </div>
              <p className="text-xs text-slate-400 mt-6">
                 © {new Date().getFullYear()} Automação Mina Serra Sul
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};

// --- Screen: Home ---

interface HomeScreenProps {
  onLogout: () => void;
  installPrompt: any;
  onInstall: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout, installPrompt, onInstall }) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [drafts, setDrafts] = useState<(ReportData & { templateTitle?: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tmpls, reports] = await Promise.all([
      db.getTemplates(),
      db.getAllReports()
    ]);
    
    setTemplates(tmpls.sort((a, b) => b.createdAt - a.createdAt));

    // Map drafts and join with template title
    const draftList = reports
      .filter(r => r.status === 'draft')
      .map(r => {
        const t = tmpls.find(tmpl => tmpl.id === r.templateId);
        return { ...r, templateTitle: t?.title || 'Modelo Excluído' };
      })
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    setDrafts(draftList);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm('Tem certeza que deseja excluir este modelo?')) {
        await db.deleteTemplate(id);
        loadData();
    }
  }

  const handleDeleteDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm('Tem certeza que deseja excluir este rascunho?')) {
        await db.deleteReport(id);
        loadData();
    }
  }

  // Filter Logic
  const filteredDrafts = drafts.filter(draft => {
      const searchLower = searchTerm.toLowerCase();
      return (
          (draft.omNumber && draft.omNumber.toLowerCase().includes(searchLower)) ||
          (draft.equipment && draft.equipment.toLowerCase().includes(searchLower)) ||
          (draft.technicians && draft.technicians.toLowerCase().includes(searchLower)) ||
          (draft.templateTitle && draft.templateTitle.toLowerCase().includes(searchLower))
      );
  });

  const filteredTemplates = templates.filter(tmpl => {
      const searchLower = searchTerm.toLowerCase();
      return (
          tmpl.title.toLowerCase().includes(searchLower) ||
          tmpl.omDescription.toLowerCase().includes(searchLower)
      );
  });

  return (
    <div className="min-h-screen pb-20 bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      <Header 
        title="RELATÓRIO DE EXECUÇÃO" 
        rightAction={
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/settings')} className="p-2 hover:bg-emerald-600 dark:hover:bg-emerald-800 rounded-full text-emerald-100 hover:text-white" title="Configurações">
              <Settings size={22} />
            </button>
            <button onClick={onLogout} className="p-2 hover:bg-emerald-600 dark:hover:bg-emerald-800 rounded-full text-emerald-100 hover:text-white" title="Sair">
              <LogOut size={22} />
            </button>
          </div>
        }
      />
      
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Search className="text-slate-400 dark:text-slate-500" size={20} />
            <input
                type="text"
                placeholder="Buscar OM, Equipamento, Técnico..."
                className="flex-1 bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
             {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X size={18} />
                </button>
            )}
        </div>

        {/* Install Banner */}
        {installPrompt && (
           <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white p-4 rounded-xl shadow-lg flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-5">
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Smartphone size={24} className="text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-sm">Instalar App</h3>
                    <p className="text-[10px] text-emerald-100 leading-tight">Funciona offline</p>
                 </div>
              </div>
              <button 
                onClick={onInstall}
                className="bg-white text-emerald-800 px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
              >
                INSTALAR
              </button>
           </div>
        )}

        {/* Info Message (only if not searching) */}
        {!searchTerm && !installPrompt && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
            <p>Selecione um rascunho para continuar ou um modelo para iniciar um novo relatório.</p>
            </div>
        )}

        {/* Drafts Section */}
        {filteredDrafts.length > 0 ? (
          <div className="mb-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-amber-600 dark:text-amber-500 font-bold uppercase text-xs tracking-wider flex items-center gap-1">
                  <Edit3 size={14} />
                  Rascunhos em Aberto
                </h2>
            </div>
            <div className="space-y-3">
              {filteredDrafts.map(draft => (
                <Card key={draft.id} onClick={() => navigate(`/report/edit/${draft.id}`)} className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
                  <div className="flex justify-between items-start">
                      <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">{draft.templateTitle}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            OM: <span className="font-semibold text-slate-700 dark:text-slate-300">{draft.omNumber || 'Não informada'}</span> • 
                            Equip: <span className="font-semibold text-slate-700 dark:text-slate-300">{draft.equipment || 'N/A'}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                             Editado em: {new Date(draft.updatedAt || draft.createdAt).toLocaleDateString()} às {new Date(draft.updatedAt || draft.createdAt).toLocaleTimeString()}
                          </p>
                      </div>
                      <button onClick={(e) => handleDeleteDraft(e, draft.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                          <Trash2 size={18} />
                      </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
            searchTerm && drafts.length > 0 && (
                <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm">
                    Nenhum rascunho corresponde à busca.
                </div>
            )
        )}

        <div className="flex items-center justify-between mb-2">
            <h2 className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs tracking-wider">Modelos Disponíveis</h2>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-600">
            <FileText size={48} className="mx-auto mb-3 opacity-20" />
            <p>{searchTerm ? 'Nenhum modelo encontrado.' : 'Nenhum modelo criado.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map(tmpl => (
              <Card key={tmpl.id} onClick={() => navigate(`/report/new/${tmpl.id}`)}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">{tmpl.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{tmpl.omDescription}</p>
                    </div>
                    <button onClick={(e) => handleDeleteTemplate(e, tmpl.id)} className="text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                        <Trash2 size={18} />
                    </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={() => navigate('/template/new')}
        className="fixed bottom-6 right-6 bg-emerald-600 dark:bg-emerald-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-90 transition-transform"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

// --- Screen: Create Template ---

const CreateTemplateScreen: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [omDesc, setOmDesc] = useState('');
  const [activity, setActivity] = useState('');

  const handleSave = async () => {
    if (!title || !omDesc || !activity) return alert("Preencha todos os campos");

    const newTemplate: ReportTemplate = {
      id: Date.now().toString(),
      title,
      omDescription: omDesc,
      activityExecuted: activity,
      createdAt: Date.now()
    };

    await db.saveTemplate(newTemplate);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header 
        title="Novo Modelo" 
        showBack 
        rightAction={
          <button onClick={handleSave} className="font-bold text-emerald-100 hover:text-white">SALVAR</button>
        } 
      />
      <div className="p-4 max-w-lg mx-auto">
        <Card className="space-y-4">
          <InputGroup label="Nome do Modelo (Apelido)">
            <input 
              type="text" 
              className="w-full border-b border-slate-300 dark:border-slate-600 py-2 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-2 rounded"
              placeholder="Ex: Troca de Rolo"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </InputGroup>

          <InputGroup label="Descrição da OM (Padrão)">
            <textarea 
              className="w-full border rounded-lg border-slate-300 dark:border-slate-600 p-3 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Descreva a OM..."
              value={omDesc}
              onChange={e => setOmDesc(e.target.value)}
            />
          </InputGroup>

          <InputGroup label="Atividade Executada (Padrão)">
            <textarea 
              className="w-full border rounded-lg border-slate-300 dark:border-slate-600 p-3 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Descreva a atividade..."
              value={activity}
              onChange={e => setActivity(e.target.value)}
            />
          </InputGroup>
        </Card>
      </div>
    </div>
  );
};

// --- Screen: Create/Edit Report ---

const ReportScreen: React.FC = () => {
  const { templateId, reportId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Validation State
  const [errors, setErrors] = useState<{
    omNumber?: boolean;
    equipment?: boolean;
    technicians?: boolean;
  }>({});

  // Editor State (Photo, Caption, Drawing)
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<ReportPhoto | null>(null);
  const [editCaption, setEditCaption] = useState('');
  
  // Drawing Canvas Refs and State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444'); // Red default
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Photo Staging State
  const [stagedPhotos, setStagedPhotos] = useState<ReportPhoto[]>([]);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<ReportData>>({
    date: new Date().toISOString().split('T')[0],
    equipment: '',
    omNumber: '',
    activityType: 'Corretiva',
    activityExecuted: '', 
    startTime: '08:00',
    endTime: '17:00',
    iamoDeviation: false,
    iamoDeviationDetails: '',
    omFinished: true,
    pendings: false,
    pendingDetails: '',
    team: 'A',
    workCenter: WORK_CENTERS[0],
    technicians: '',
    photos: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        let tmpl: ReportTemplate | undefined;
        let reportData: ReportData | undefined;

        if (reportId) {
          reportData = await db.getReport(reportId);
          if (reportData) {
            // Migration logic for old string photos if necessary
            if (reportData.photos.length > 0 && typeof reportData.photos[0] === 'string') {
                reportData.photos = (reportData.photos as unknown as string[]).map(p => ({
                    id: Date.now() + Math.random().toString(),
                    base64: p,
                    caption: ''
                }));
            }
            setFormData(reportData);
            tmpl = (await db.getTemplates()).find(t => t.id === reportData?.templateId);
          }
        } else if (templateId) {
          tmpl = (await db.getTemplates()).find(t => t.id === templateId);
          if (tmpl) {
            setFormData(prev => ({ ...prev, activityExecuted: tmpl?.activityExecuted }));
          }
        }

        if (tmpl) {
          setTemplate(tmpl);
        } else {
          alert("Dados não encontrados (Modelo ou Relatório excluído)");
          navigate('/');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [templateId, reportId, navigate]);

  // Canvas Drawing Logic
  useEffect(() => {
    if (editorOpen && currentPhoto && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = currentPhoto.base64;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
    }
  }, [editorOpen, currentPhoto]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingMode || !canvasRef.current) return;
      setIsDrawing(true);
      
      const pos = getPos(e);
      lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !isDrawingMode || !canvasRef.current || !lastPos.current) return;
      
      const pos = getPos(e);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.beginPath();
          ctx.moveTo(lastPos.current.x, lastPos.current.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = drawColor;
          ctx.lineWidth = 5; // Fixed line width for visibility
          ctx.lineCap = 'round';
          ctx.stroke();
      }
      lastPos.current = pos;
  };

  const stopDrawing = () => {
      setIsDrawing(false);
      lastPos.current = null;
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  const saveEditorChanges = () => {
      if (currentPhoto && canvasRef.current) {
          const newBase64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
          
          setFormData(prev => ({
              ...prev,
              photos: prev.photos?.map(p => 
                  p.id === currentPhoto.id 
                  ? { ...p, base64: newBase64, caption: editCaption, edited: true } 
                  : p
              )
          }));
          setEditorOpen(false);
          setIsDrawingMode(false);
      }
  };

  // Camera Effect
  useEffect(() => {
    if (isCameraOpen) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: "environment",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera error:", err);
          alert("Não foi possível acessar a câmera.");
          setIsCameraOpen(false);
        }
      };
      startCamera();
    } else {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }
  }, [isCameraOpen]);

  const capturePhoto = () => {
    if (videoRef.current) {
        const video = videoRef.current;
        const processedBase64 = processImage(video);
        if (processedBase64) {
             const newPhoto: ReportPhoto = {
                 id: Date.now().toString(),
                 base64: processedBase64,
                 caption: ''
             };
             setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), newPhoto] }));
             setIsCameraOpen(false);
        }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsProcessingPhotos(true);
    const files = Array.from(e.target.files);
    const processedPhotos: ReportPhoto[] = [];

    // Process sequentially to avoid memory spikes on mobile devices
    for (const file of files) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              try {
                const processed = processImage(img);
                resolve(processed);
              } catch (err) {
                reject(err);
              }
            };
            img.onerror = () => reject(new Error('Falha ao carregar imagem'));
            img.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error('Falha na leitura do arquivo'));
          reader.readAsDataURL(file);
        });

        if (base64) {
          processedPhotos.push({
            id: Date.now() + Math.random().toString(),
            base64: base64,
            caption: ''
          });
        }
      } catch (err) {
        console.warn(`Erro ao processar imagem ${file.name}:`, err);
      }
    }

    if (processedPhotos.length > 0) {
      setStagedPhotos(prev => [...prev, ...processedPhotos]);
      setIsPhotoPreviewOpen(true);
    } else {
      alert("Nenhuma imagem pôde ser processada. Tente arquivos menores ou outro formato.");
    }
    
    setIsProcessingPhotos(false);
    // Reset input value so same files can be selected again if needed
    e.target.value = '';
  };

  const removePhoto = (id: string) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos?.filter(p => p.id !== id)
    }));
    setEditorOpen(false);
  };

  const removeStagedPhoto = (index: number) => {
    setStagedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const confirmStagedPhotos = () => {
    if (stagedPhotos.length === 0) {
         setIsPhotoPreviewOpen(false);
         return;
    }
    setFormData(prev => ({ 
         ...prev, 
         photos: [...(prev.photos || []), ...stagedPhotos] 
    }));
    setStagedPhotos([]);
    setIsPhotoPreviewOpen(false);
  };

  const cancelStagedPhotos = () => {
    setStagedPhotos([]);
    setIsPhotoPreviewOpen(false);
  };

  const openEditor = (photo: ReportPhoto) => {
      setCurrentPhoto(photo);
      setEditCaption(photo.caption || '');
      setEditorOpen(true);
      setIsDrawingMode(false);
  };

  const handleSaveDraft = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const draft: ReportData = {
        ...formData as ReportData,
        id: formData.id || Date.now().toString(),
        templateId: template.id,
        status: 'draft',
        createdAt: formData.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      
      await db.saveReport(draft);
      // Update local ID if it was new
      setFormData(prev => ({ ...prev, id: draft.id }));
      alert("Rascunho salvo com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar rascunho.");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!template) return;
    
    // Validate required fields
    const newErrors: typeof errors = {};
    if (!formData.omNumber?.trim()) newErrors.omNumber = true;
    if (!formData.equipment?.trim()) newErrors.equipment = true;
    if (!formData.technicians?.trim()) newErrors.technicians = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert("Por favor, preencha os campos obrigatórios destacados em vermelho.");
      return;
    }
    
    // Clear errors if valid
    setErrors({});

    const fullReport: ReportData = {
      ...formData as ReportData,
      id: formData.id || Date.now().toString(),
      templateId: template.id,
      createdAt: formData.createdAt || Date.now()
    };

    setGeneratingPdf(true);
    
    // Give UI time to update "Generating" state before blocking thread
    setTimeout(async () => {
        try {
          const success = await generatePDF(fullReport, template);
          if (success) {
              navigate('/');
          }
        } catch (err) {
          console.error(err);
          alert("Erro crítico ao gerar PDF. Tente com menos fotos ou reinicie o aplicativo.");
        } finally {
          setGeneratingPdf(false);
        }
    }, 100);
  };

  if (loading) return <div className="p-10 text-center dark:text-slate-300">Carregando...</div>;
  if (!template) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-32 transition-colors duration-300">
       <Header title={`Relatório: ${template.title}`} showBack />
       
       <div className="p-4 space-y-5 max-w-xl mx-auto">
          
          {/* Read Only / Static Info */}
          <Card className="bg-slate-50 dark:bg-slate-700/50 border-emerald-100 dark:border-emerald-900/50">
             <div className="">
               <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Descrição da OM (Fixo)</h3>
               <p className="text-slate-800 dark:text-slate-100 text-sm">{template.omDescription}</p>
             </div>
          </Card>

          {/* Editable Fields */}
          <Card>
            {/* Single Column Layout for Key Fields */}
            <InputGroup label="Data">
              <input 
                type="date" 
                className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </InputGroup>
            
            <InputGroup label="Nº OM" error={errors.omNumber}>
              <input 
                type="text" 
                placeholder="123456"
                className={`w-full p-2 bg-white dark:bg-slate-700 rounded border ${errors.omNumber ? 'border-red-500 dark:border-red-400' : 'border-slate-300 dark:border-slate-600'} text-slate-900 dark:text-white dark:placeholder-slate-400`}
                value={formData.omNumber}
                onChange={e => {
                  setFormData({...formData, omNumber: e.target.value});
                  if (errors.omNumber) setErrors(prev => ({...prev, omNumber: false}));
                }}
              />
            </InputGroup>

            <InputGroup label="Equipamento" error={errors.equipment}>
               <input 
                  type="text" 
                  placeholder="Ex: TR-001"
                  className={`w-full p-2 bg-white dark:bg-slate-700 rounded border ${errors.equipment ? 'border-red-500 dark:border-red-400' : 'border-slate-300 dark:border-slate-600'} text-slate-900 dark:text-white dark:placeholder-slate-400`}
                  value={formData.equipment}
                  onChange={e => {
                    setFormData({...formData, equipment: e.target.value});
                    if (errors.equipment) setErrors(prev => ({...prev, equipment: false}));
                  }}
                />
            </InputGroup>

            {/* Activity Type Selection */}
            <InputGroup label="Tipo de Atividade">
               <div className="flex gap-2">
                 {['Preventiva', 'Corretiva'].map(type => (
                   <button
                     key={type}
                     onClick={() => setFormData(prev => ({
                        ...prev, 
                        activityType: type as any,
                        // If switching back to Preventiva, reset text to template default. 
                        // If switching to Corretiva, keep current text (which starts as template default) but allow edit
                        activityExecuted: type === 'Preventiva' ? template.activityExecuted : prev.activityExecuted
                     }))}
                     className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${formData.activityType === type ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600'}`}
                   >
                     {type}
                   </button>
                 ))}
               </div>
            </InputGroup>

            {/* Conditional Activity Executed Field */}
            <InputGroup label={`Atividade Executada ${formData.activityType === 'Corretiva' ? '(Editável)' : '(Fixo)'}`}>
                {formData.activityType === 'Corretiva' ? (
                     <textarea 
                        className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 h-24 text-sm text-slate-900 dark:text-white"
                        value={formData.activityExecuted}
                        onChange={e => setFormData({...formData, activityExecuted: e.target.value})}
                     />
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded p-3">
                         <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{template.activityExecuted}</p>
                    </div>
                )}
            </InputGroup>

            <InputGroup label="Horário Inicial">
              <input type="time" className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </InputGroup>
            
            <InputGroup label="Horário Final">
              <input type="time" className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </InputGroup>

            <div className="py-2 border-t border-slate-100 dark:border-slate-700 my-2">
                <label className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        Desvio IAMO?
                    </span>
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded p-1">
                        <button onClick={() => setFormData({...formData, iamoDeviation: true})} className={`px-3 py-1 rounded text-xs font-bold ${formData.iamoDeviation ? 'bg-amber-500 text-white' : 'text-slate-500 dark:text-slate-400'}`}>SIM</button>
                        <button onClick={() => setFormData({...formData, iamoDeviation: false})} className={`px-3 py-1 rounded text-xs font-bold ${!formData.iamoDeviation ? 'bg-slate-500 dark:bg-slate-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>NÃO</button>
                    </div>
                </label>
                {formData.iamoDeviation && (
                    <textarea 
                        placeholder="Informe período e motivo..."
                        className="w-full p-2 text-sm bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-800 rounded text-slate-900 dark:text-white"
                        value={formData.iamoDeviationDetails}
                        onChange={e => setFormData({...formData, iamoDeviationDetails: e.target.value})}
                    />
                )}
            </div>

             <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                 <InputGroup label="OM Finalizada?">
                    <select 
                        className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                        value={formData.omFinished ? 'Sim' : 'Não'}
                        onChange={e => setFormData({...formData, omFinished: e.target.value === 'Sim'})}
                    >
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                    </select>
                 </InputGroup>
                 <InputGroup label="Pendências?">
                    <select 
                        className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                        value={formData.pendings ? 'Sim' : 'Não'}
                        onChange={e => setFormData({...formData, pendings: e.target.value === 'Sim'})}
                    >
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                    </select>
                 </InputGroup>
             </div>
             {formData.pendings && (
                 <div className="mb-4 animate-in fade-in duration-200">
                    <textarea 
                        placeholder="Descreva as pendências..."
                        className="w-full p-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded h-20 text-slate-900 dark:text-white"
                        value={formData.pendingDetails}
                        onChange={e => setFormData({...formData, pendingDetails: e.target.value})}
                    />
                 </div>
             )}

             <div className="grid grid-cols-2 gap-4">
                 <InputGroup label="Equipe (Turno)">
                    <select 
                        className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                        value={formData.team}
                        onChange={e => setFormData({...formData, team: e.target.value})}
                    >
                        {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </InputGroup>
                 <InputGroup label="Centro de Trabalho">
                    <select 
                        className="w-full p-2 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                        value={formData.workCenter}
                        onChange={e => setFormData({...formData, workCenter: e.target.value})}
                    >
                        {WORK_CENTERS.map(wc => <option key={wc} value={wc}>{wc}</option>)}
                    </select>
                 </InputGroup>
             </div>

             <InputGroup label="Técnicos (Nomes)" error={errors.technicians}>
                <textarea 
                  className={`w-full p-2 bg-white dark:bg-slate-700 rounded border h-20 ${errors.technicians ? 'border-red-500 dark:border-red-400' : 'border-slate-300 dark:border-slate-600'} text-slate-900 dark:text-white dark:placeholder-slate-400`}
                  placeholder="João Silva, Maria Souza..."
                  value={formData.technicians}
                  onChange={e => {
                    setFormData({...formData, technicians: e.target.value});
                    if (errors.technicians) setErrors(prev => ({...prev, technicians: false}));
                  }}
                />
             </InputGroup>

          </Card>

          {/* Photos */}
          <Card>
             <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                 <Camera size={20} />
                 Evidências
             </h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                 {formData.photos?.map((photo, idx) => (
                     <div 
                      key={photo.id} 
                      onClick={() => openEditor(photo)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                     >
                         <img src={photo.base64} className="w-full h-full object-cover" alt="evidencia" />
                         {photo.caption && (
                             <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1">
                                 <p className="text-[10px] text-white truncate text-center">{photo.caption}</p>
                             </div>
                         )}
                         {photo.edited && (
                             <div className="absolute top-1 right-1">
                                 <div className="bg-blue-500 rounded-full p-1"><PenTool size={10} className="text-white"/></div>
                             </div>
                         )}
                     </div>
                 ))}
                 
                 {/* Camera Button */}
                 <button 
                   onClick={() => setIsCameraOpen(true)}
                   className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-colors"
                 >
                     <Camera size={24} />
                     <span className="text-[10px] font-bold mt-1 uppercase">Câmera</span>
                 </button>

                 {/* Gallery Button */}
                 <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 cursor-pointer active:bg-emerald-100 dark:active:bg-emerald-900/40 transition-colors">
                     <div className="flex flex-col items-center">
                         <ImageIcon size={24} />
                         <span className="text-[10px] font-bold mt-1 uppercase">Galeria</span>
                     </div>
                     <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                 </label>
             </div>
          </Card>
       </div>

       {/* Camera Modal */}
       {isCameraOpen && (
         <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-in fade-in duration-200">
           <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-8 rounded-lg"></div>
           </div>
           <div className="p-8 bg-black flex justify-between items-center safe-area-bottom">
              <button 
                onClick={() => setIsCameraOpen(false)} 
                className="text-white font-medium p-4 hover:opacity-80"
              >
                Cancelar
              </button>
              
              <button 
                onClick={capturePhoto} 
                className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 bg-white rounded-full border-[3px] border-black"></div> 
              </button>
              
              <div className="w-20"></div> {/* Spacer for alignment */}
           </div>
         </div>
       )}

       {/* Photo Upload Preview Modal */}
       {isPhotoPreviewOpen && (
         <div className="fixed inset-0 z-[80] bg-black bg-opacity-90 flex flex-col animate-in fade-in duration-200">
            <div className="p-4 bg-emerald-700 dark:bg-emerald-900 text-white flex justify-between items-center shadow-md safe-area-top">
               <h3 className="font-bold text-lg">Pré-visualizar Fotos ({stagedPhotos.length})</h3>
               <button onClick={cancelStagedPhotos} className="p-1 hover:bg-emerald-600 dark:hover:bg-emerald-800 rounded">
                 <X size={24} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
               {stagedPhotos.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-white/50">
                    <ImageIcon size={48} className="mb-2" />
                    <p>Nenhuma foto selecionada</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                    {stagedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 group">
                         <img src={photo.base64} className="w-full h-full object-cover" alt="preview" />
                         <button 
                           onClick={() => removeStagedPhoto(idx)}
                           className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 active:scale-95 transition-transform"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
               <div className="flex gap-3">
                  <button 
                    onClick={cancelStagedPhotos}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmStagedPhotos}
                    disabled={stagedPhotos.length === 0}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    Adicionar ({stagedPhotos.length})
                  </button>
               </div>
            </div>
         </div>
       )}

       {/* Processing Overlay */}
       {isProcessingPhotos && (
         <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center flex-col">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
            <p className="text-white font-bold">Processando imagens...</p>
         </div>
       )}
       
       {/* PDF Generating Overlay */}
       {generatingPdf && (
         <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center flex-col animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Gerando Relatório...</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Preparando para compartilhar</p>
            </div>
         </div>
       )}

       {/* Detailed Photo Editor Modal */}
       {editorOpen && currentPhoto && (
         <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col safe-area-top animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800 text-white border-b border-slate-700">
              <button 
                onClick={() => setEditorOpen(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <h3 className="font-bold">Editar Foto</h3>
              <button 
                 onClick={saveEditorChanges}
                 className="flex items-center gap-2 bg-emerald-600 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-emerald-500"
              >
                  <Save size={16} />
                  Salvar
              </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden touch-none">
                 <canvas 
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="max-w-full max-h-full shadow-2xl"
                 />
                 {isDrawingMode && (
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800 rounded-full px-4 py-2 flex gap-3 shadow-lg border border-slate-700">
                         {['#ef4444', '#eab308', '#22c55e', '#3b82f6'].map(color => (
                             <button 
                                key={color}
                                onClick={() => setDrawColor(color)}
                                className={`w-6 h-6 rounded-full border-2 ${drawColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                             />
                         ))}
                     </div>
                 )}
            </div>

            {/* Toolbar */}
            <div className="bg-slate-800 p-4 border-t border-slate-700 safe-area-bottom space-y-4">
                {/* Tools */}
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => setIsDrawingMode(!isDrawingMode)}
                        className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${isDrawingMode ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        <PenTool size={20} />
                        <span className="text-[10px] font-bold">RABISCAR</span>
                    </button>
                    <button 
                       onClick={() => {
                           if(confirm('Tem certeza que deseja excluir esta foto?')) removePhoto(currentPhoto.id);
                       }}
                       className="p-3 rounded-lg flex flex-col items-center gap-1 bg-slate-700 text-red-400 hover:bg-slate-600 transition-all"
                    >
                        <Trash2 size={20} />
                        <span className="text-[10px] font-bold">EXCLUIR</span>
                    </button>
                </div>

                {/* Caption Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Type size={16} className="text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Adicionar legenda na foto..."
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                </div>
            </div>
         </div>
       )}

       {/* Floating Action Buttons */}
       <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex gap-3 z-40 transition-colors duration-300">
           <button 
             onClick={handleSaveDraft}
             disabled={saving}
             className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold py-4 px-6 rounded-xl shadow flex items-center justify-center gap-2 hover:bg-amber-200 dark:hover:bg-amber-900/60 active:scale-[0.98] transition-all"
           >
               <Save size={20} />
               <span className="hidden xs:inline">Salvar Rascunho</span>
           </button>
           <button 
             onClick={handleGeneratePDF}
             disabled={generatingPdf}
             className="flex-1 bg-emerald-600 dark:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
           >
               {generatingPdf ? (
                 <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
               ) : (
                 <Download size={20} />
               )}
               Baixar PDF
           </button>
       </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [initialized, setInitialized] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
      const auth = localStorage.getItem('serra_sul_auth');
      if (auth === 'true') {
          setIsAuthenticated(true);
      }
      setInitialized(true);

      // PWA Install Prompt Listener
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
  }, []);

  const handleLogin = (status: boolean) => {
    if (status) {
        localStorage.setItem('serra_sul_auth', 'true');
        setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
      if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('serra_sul_auth');
        setIsAuthenticated(false);
      }
  };

  const handleInstallApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    });
  };

  if (!initialized) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeScreen onLogout={handleLogout} installPrompt={installPrompt} onInstall={handleInstallApp} />} />
        <Route path="/settings" element={<SettingsScreen installPrompt={installPrompt} onInstall={handleInstallApp} />} />
        <Route path="/template/new" element={<CreateTemplateScreen />} />
        <Route path="/report/new/:templateId" element={<ReportScreen />} />
        <Route path="/report/edit/:reportId" element={<ReportScreen />} />
      </Routes>
    </Router>
  );
};

export default App;