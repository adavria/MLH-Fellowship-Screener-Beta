import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Upload, 
  Clipboard, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Download,
  Filter,
  ArrowUpDown,
  History,
  LayoutDashboard,
  BrainCircuit,
  FileCode,
  Globe,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import { ApplicationRecord, ScreeningResult, BatchSummary } from './types';
import { screenApplication } from './lib/gemini';
import { cn } from './lib/utils';

export default function App() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'qualified' | 'disqualified' | 'social_good'>('all');

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const newApps = results.data as ApplicationRecord[];
          setApplications(prev => [...prev, ...newApps]);
        },
      });
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'text/csv': ['.csv'] } 
  });

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const newApps = results.data as ApplicationRecord[];
          setApplications(prev => [...prev, ...newApps]);
        },
      });
    }
  };

  const processBatch = async () => {
    if (applications.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    const newResults: ScreeningResult[] = [];

    for (let i = 0; i < applications.length; i++) {
      try {
        const result = await screenApplication(applications[i]);
        newResults.push(result);
        setProgress(((i + 1) / applications.length) * 100);
      } catch (error) {
        console.error(`Error processing application ${i}:`, error);
      }
    }

    // Sort by final score and assign rank
    const rankedResults = newResults
      .sort((a, b) => b.final_score - a.final_score)
      .map((res, index) => ({ ...res, rank: index + 1 }));

    setResults(rankedResults);
    setIsProcessing(false);
  };

  const summary = useMemo<BatchSummary>(() => {
    if (results.length === 0) return { total: 0, disqualified: 0, social_good_standouts: 0, collaborative_priority: 0, average_score: 0 };
    
    const total = results.length;
    const disqualified = results.filter(r => r.disqualified).length;
    const socialGood = results.filter(r => r.social_good === 'Y').length;
    const collab = results.filter(r => r.teamwork_evidence === 'Y').length;
    const avgScore = results.reduce((acc, curr) => acc + curr.final_score, 0) / total;

    return {
      total,
      disqualified,
      social_good_standouts: socialGood,
      collaborative_priority: collab,
      average_score: Math.round(avgScore * 10) / 10
    };
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      switch (filterType) {
        case 'qualified': return matchesSearch && !r.disqualified;
        case 'disqualified': return matchesSearch && r.disqualified;
        case 'social_good': return matchesSearch && r.social_good === 'Y';
        default: return matchesSearch;
      }
    });
  }, [results, searchTerm, filterType]);

  const downloadCSV = () => {
    const csv = Papa.unparse(filteredResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mlh_fellowship_${filterType}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = () => {
    const json = JSON.stringify(filteredResults, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mlh_fellowship_${filterType}_results.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadText = () => {
    const text = filteredResults.map(r => 
      `Rank: ${r.rank}\nName: ${r.name}\nEmail: ${r.email}\nFinal Score: ${r.final_score}\nSocial Good: ${r.social_good}\nTeamwork: ${r.teamwork_evidence}\nCode Quality: ${r.code_quality}\n---\n`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mlh_fellowship_${filterType}_results.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-end justify-between pb-6">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Internal Admissions Tool</div>
            <h1 className="text-3xl font-light text-white tracking-tight flex items-baseline gap-3">
              MLH Fellowship Screener 
              <span className="text-gray-600 font-mono text-sm">v3.0</span>
            </h1>
          </div>
          <div className="flex items-center gap-8">
            {results.length > 0 && (
              <div className="flex gap-8 text-right mr-8">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Batch Clarity</div>
                  <div className="text-xl font-mono text-white">{Math.round(summary.average_score)}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Social Good</div>
                  <div className="text-xl font-mono text-emerald-400">{summary.social_good_standouts}/{summary.total}</div>
                </div>
              </div>
            )}
            {results.length > 0 && (
              <div className="relative group">
                <button 
                  className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-emerald-400 hover:border-emerald-500 transition-all"
                >
                  <Download size={14} />
                  Export
                </button>
                <div className="absolute right-0 mt-1 w-40 bg-[#121212] border border-gray-800 rounded shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                  <button 
                    onClick={downloadCSV}
                    className="w-full text-left px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 hover:bg-emerald-500 hover:text-black transition-colors border-b border-gray-800 last:border-0"
                  >
                    CSV Data
                  </button>
                  <button 
                    onClick={downloadJSON}
                    className="w-full text-left px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 hover:bg-emerald-500 hover:text-black transition-colors border-b border-gray-800 last:border-0"
                  >
                    JSON Data
                  </button>
                  <button 
                    onClick={downloadText}
                    className="w-full text-left px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 hover:bg-emerald-500 hover:text-black transition-colors border-b border-gray-800 last:border-0"
                  >
                    Text Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {results.length === 0 ? (
          <div className="grid grid-cols-12 gap-8 items-center">
            <section className="col-span-12 lg:col-span-7 space-y-12">
              <div className="space-y-6">
                <div className="h-1 w-24 bg-emerald-500"></div>
                <h2 className="text-6xl font-light tracking-tight leading-[0.9] text-white">
                  Precision <span className="text-gray-600">Technical</span> Admissions.
                </h2>
                <p className="text-lg text-gray-400 max-w-md font-light leading-relaxed">
                  Identify high-potential builders through automated rubric-based evaluation. Prioritizing grit, teamwork, and social impact.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">Rubric v3.0</p>
                  <p className="text-sm border-t border-gray-800 pt-3">Equity-focused scoring prevents academic bias.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Social Good</p>
                  <p className="text-sm border-t border-gray-800 pt-3">Automated detection of community-focused projects.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold">APAC Filter</p>
                  <p className="text-sm border-t border-gray-800 pt-3">Seamless geographic exclusion as per fellowship rules.</p>
                </div>
              </div>
            </section>

            <section className="col-span-12 lg:col-span-5 bg-[#121212] p-8 border border-gray-800 rounded-lg shadow-2xl relative">
              <div className="space-y-8">
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border border-gray-800 rounded bg-[#0a0a0a] p-10 text-center transition-all cursor-pointer",
                    isDragActive ? "border-emerald-500 bg-emerald-950/10" : "hover:border-gray-600"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center mx-auto mb-4">
                    <Upload size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-white">Drop Batch Data</p>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">CSV format expected</p>
                </div>

                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-bold text-gray-700">
                  <span className="bg-[#121212] px-4">Buffer Input</span>
                </div>

                <div className="group relative" onPaste={handlePaste}>
                  <textarea 
                    placeholder="CLICK HERE AND PASTE (CTRL+V)..."
                    className="w-full h-24 p-4 bg-[#0a0a0a] rounded border border-gray-800 focus:border-emerald-500 transition-all resize-none font-mono text-[10px] uppercase tracking-wider text-gray-500 cursor-pointer"
                    readOnly
                  />
                </div>

                {applications.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-950/20 border border-emerald-900/30 rounded">
                      <div className="flex items-center gap-3">
                        <History size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-widest">{applications.length} Records Loaded</span>
                      </div>
                      <button onClick={() => setApplications([])} className="text-gray-500 hover:text-white transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={processBatch}
                      disabled={isProcessing}
                      className="w-full bg-emerald-500 text-black py-4 rounded text-xs font-bold uppercase tracking-[0.2em] transform transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? `Processing ${Math.round(progress)}%` : "Commence Screening"}
                    </button>
                  </motion.div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* Dashboard Sidebar Stats */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-5">
                <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-4">Batch Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-gray-800 pb-2">
                    <span className="text-[10px] uppercase text-gray-500">Qualified</span>
                    <span className="font-mono text-xl text-white">{summary.total - summary.disqualified}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-gray-800 pb-2">
                    <span className="text-[10px] uppercase text-gray-500">Filtered</span>
                    <span className="font-mono text-xl text-rose-500">{summary.disqualified}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-gray-800 pb-2">
                    <span className="text-[10px] uppercase text-gray-500">Impact Focus</span>
                    <span className="font-mono text-xl text-emerald-400">{summary.social_good_standouts}</span>
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-gray-500 leading-relaxed italic">
                  Priority given to collaborative builders and social-impact projects as per v3.0 rules.
                </div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-lg p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Filter View</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'all', label: 'All Candidates' },
                    { id: 'qualified', label: 'Qualified Only' },
                    { id: 'disqualified', label: 'Excluded' },
                    { id: 'social_good', label: 'Social Good' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFilterType(item.id as any)}
                      className={cn(
                        "text-left px-3 py-2 rounded text-[10px] uppercase tracking-widest font-bold transition-all border",
                        filterType === item.id 
                          ? "bg-emerald-500 text-black border-emerald-500" 
                          : "text-gray-500 border-transparent hover:border-gray-800 hover:text-gray-300"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { setResults([]); setApplications([]); }}
                className="w-full py-3 border border-gray-800 rounded text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-rose-500 hover:border-rose-900 transition-all"
              >
                Reset System
              </button>
            </div>

            {/* Results Table Area */}
            <div className="col-span-12 lg:col-span-9 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                <input 
                  type="text" 
                  placeholder="ID SEARCH_QUERY"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#121212] border border-gray-800 rounded uppercase text-[10px] tracking-widest font-mono text-emerald-400 placeholder:text-gray-700 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1a1a1a] text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-800">
                        <th className="py-4 px-6 font-medium">Rank</th>
                        <th className="py-4 px-6 font-medium">Candidate</th>
                        <th className="py-4 px-6 font-medium">App /13.5</th>
                        <th className="py-4 px-6 font-medium">Code /3.0</th>
                        <th className="py-4 px-6 font-medium text-emerald-500">Final Score</th>
                        <th className="py-4 px-6 font-medium">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      <AnimatePresence mode="popLayout">
                        {filteredResults.map((result) => (
                          <motion.tr 
                            layout
                            key={result.email}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "border-b border-gray-800 transition-colors",
                              result.disqualified ? "bg-rose-950/5 text-gray-600" : "hover:bg-[#1a1a1a]"
                            )}
                          >
                            <td className="py-4 px-6 text-gray-500">
                              {result.disqualified ? "-" : String(result.rank).padStart(2, '0')}
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-sans text-sm font-medium text-white">{result.name}</div>
                              <div className="text-[10px] text-gray-500">{result.email} • {result.country}</div>
                            </td>
                            <td className="py-4 px-6">{result.app_score.toFixed(1)}</td>
                            <td className="py-4 px-6">{result.code_score.toFixed(1)}</td>
                            <td className="py-4 px-6">
                              <span className={cn(
                                "text-lg font-bold",
                                result.disqualified ? "text-rose-900 border border-rose-900/30 px-2 py-1 italic rounded" : "text-emerald-400"
                              )}>
                                {result.disqualified ? "FILTERED" : result.final_score.toFixed(1)}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex gap-2">
                                {result.disqualified ? (
                                  <span className="text-rose-900 text-[9px] uppercase font-bold tracking-widest">{result.disqualification_reason}</span>
                                ) : (
                                  <>
                                    {result.social_good === 'Y' && (
                                      <span className="px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400 text-[9px] uppercase tracking-tighter">Social Good</span>
                                    )}
                                    {result.teamwork_evidence === 'Y' && (
                                      <span className="px-2 py-0.5 rounded border border-blue-500/30 text-blue-400 text-[9px] uppercase tracking-tighter">Collaborative</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="max-w-md w-full space-y-12 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-56 h-56 border border-gray-800 rounded-full animate-pulse"></div>
              <div className="absolute flex flex-col items-center">
                <span className="text-5xl font-light text-emerald-400 font-mono tracking-tighter">{Math.round(progress)}%</span>
                <span className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold mt-2">evaluating</span>
              </div>
              <div className="absolute inset-0 w-56 h-56 border-t-2 border-emerald-500 rounded-full animate-spin mx-auto"></div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-light text-white tracking-widest uppercase">Rubric Execution</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest leading-loose">
                Scanning repository structures<br/>
                Analyzing team sentiment<br/>
                Cross-referencing impact pillars
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
