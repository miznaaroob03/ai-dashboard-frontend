/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { 
  Upload, 
  BarChart3, 
  MessageSquare, 
  TrendingUp, 
  Hash, 
  LayoutDashboard, 
  RefreshCcw, 
  History, 
  Zap, 
  AlertTriangle, 
  Layers, 
  Trash2, 
  Database,
  PieChart as PieIcon,
  LineChart as LineIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';

// --- Types ---
interface DataRow {
  [key: string]: string | number | boolean | null | undefined | any;
}

interface FileHistory {
  id: number;
  name: string;
  timestamp: string;
  rowCount: number;
}

export default function AIDashboard() {
  const compareFileInputRef = useRef<HTMLInputElement>(null);

  // Data States
  const [data, setData] = useState<DataRow[]>([]);
  const [dataCompare, setDataCompare] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headersCompare, setHeadersCompare] = useState<string[]>([]); // New: Separate headers for comparison
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [activeChartCompare, setActiveChartCompare] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [dualView, setDualView] = useState(false);
  const [cleaningMode, setCleaningMode] = useState<'ignore' | 'zero'>('ignore');
  
  // AI & Analytics States
  const [query, setQuery] = useState("");
  const [insight, setInsight] = useState("");
  const [history, setHistory] = useState<FileHistory[]>([]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    const saved = localStorage.getItem('dash_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const deleteHistoryItem = (id: number) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('dash_history', JSON.stringify(updatedHistory));
  };

  const anomalies = useMemo(() => {
    if (data.length < 3 || headers.length < 2) return [];
    const valKey = headers[1];
    const values = data.map(d => Number(d[valKey])).filter(v => !isNaN(v));
    if (values.length === 0) return [];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / values.length);
    return data.filter(d => Math.abs(Number(d[valKey]) - avg) > stdDev * 2);
  }, [data, headers]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, isComparison = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    const processResults = (raw: any[]) => {
      const cleaned = raw.filter(row => {
        const hasData = Object.values(row).some(v => v !== null && v !== "");
        return cleaningMode === 'zero' ? true : hasData;
      }).map(row => {
        if (cleaningMode === 'zero') {
          Object.keys(row).forEach(k => { if (row[k] === null || row[k] === "") row[k] = 0; });
        }
        return row;
      });

      if (isComparison) {
        setDataCompare(cleaned);
        setHeadersCompare(Object.keys(cleaned[0] || {})); // Extract headers from 2nd file
      } else {
        setData(cleaned);
        setHeaders(Object.keys(cleaned[0] || {}));
        setIsUploaded(true);
        const newEntry = { id: Date.now(), name: fileName, timestamp: new Date().toLocaleTimeString(), rowCount: cleaned.length };
        const updatedHistory = [newEntry, ...history].slice(0, 5);
        setHistory(updatedHistory);
        localStorage.setItem('dash_history', JSON.stringify(updatedHistory));
      }
      setLoading(false);
    };

    if (extension === 'csv') {
      Papa.parse(file, { header: true, dynamicTyping: true, skipEmptyLines: true, complete: (res) => processResults(res.data) });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        processResults(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      };
      reader.readAsBinaryString(file);
    }
  };

  const askAI = async () => {
    if (!query || data.length === 0) return;
    setLoading(true);
    setInsight("Scanning for anomalies and trends...");
    try {
      const response = await axios.post('https://ai-dashboard-backend-pimk.onrender.com/api/analyze', { query, dataPreview: data.slice(0, 30), anomaliesFound: anomalies.length });
      setInsight(response.data.insight);
    } catch (err) {
      setInsight(`Analyzed ${data.length} rows. Found ${anomalies.length} potential anomalies in ${headers[1]}. Data seems trending ${Number(data[data.length-1][headers[1]]) > Number(data[0][headers[1]]) ? 'Upward' : 'Downward'}.`);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {isUploaded && (
        <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 hidden md:flex">
          <div className="flex items-center gap-2 text-indigo-600 font-black italic text-xl"><Zap fill="currentColor" size={20}/> LOGIC-PRO</div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Recent Memory</h3>
            {history.map((h) => (
              <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center group">
                <div className="truncate pr-2">
                  <p className="font-bold truncate">{h.name}</p>
                  <p className="text-slate-400">{h.rowCount} rows • {h.timestamp}</p>
                </div>
                <button onClick={() => deleteHistoryItem(h.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-auto p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Cleaning Mode</p>
            <select value={cleaningMode} onChange={(e) => setCleaningMode(e.target.value as any)} className="w-full bg-transparent text-sm font-bold outline-none cursor-pointer">
              <option value="ignore">Ignore Nulls</option>
              <option value="zero">Fill with Zero</option>
            </select>
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-auto">
        {!isUploaded ? (
          <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in fade-in duration-700">
            <div className="max-w-2xl w-full text-center space-y-8">
              <div className="space-y-2">
                <h1 className="text-7xl font-black tracking-tighter text-slate-900 uppercase">AI Data Dashboard</h1>
                <p className="text-xl text-indigo-600 font-bold italic">Transform data into intelligence</p>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white hover:border-indigo-500 hover:bg-indigo-50/20 transition-all cursor-pointer group relative">
                {loading ? <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"/> : <><div className="p-6 bg-indigo-50 text-indigo-600 rounded-3xl mb-4 group-hover:scale-110 transition-transform"><Upload size={40} /></div><p className="text-2xl font-black">Upload CSV or Excel</p></>}
                <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => handleFile(e)} />
              </label>
            </div>
          </div>
        ) : (
          <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><LayoutDashboard size={24}/></div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">AI Data Dashboard</h2>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDualView(!dualView)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${dualView ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}><Layers size={18}/> {dualView ? "Single View" : "Comparison Mode"}</button>
                <button onClick={() => setIsUploaded(false)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><RefreshCcw size={20}/></button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard label="Total Units" value={data.length.toLocaleString()} icon={<Hash />} />
              <MetricCard label="Primary Value" value={(data.reduce((a, b) => a + (Number(b[headers[1]]) || 0), 0)).toLocaleString()} icon={<TrendingUp />} />
              <MetricCard label="Anomalies" value={anomalies.length} icon={<AlertTriangle />} color={anomalies.length > 0 ? "text-orange-500" : "text-emerald-500"} />
              <div className="bg-indigo-600 p-6 rounded-3xl text-white flex flex-col justify-center">
                <p className="text-[10px] font-bold uppercase opacity-60">Cleaning Status</p>
                <h3 className="text-lg font-black">{cleaningMode === 'ignore' ? 'Active Filter' : 'Auto-Zero'}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`bg-white p-8 rounded-[2.5rem] shadow-xl border border-white ${dualView ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-black text-xl flex items-center gap-2"><BarChart3 size={20} className="text-indigo-600"/> {dualView ? "Comparison View" : "Visualization"}</h3>
                  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <ChartTab active={activeChart === 'bar'} icon={<BarChart3 size={18}/>} onClick={() => setActiveChart('bar')} />
                    <ChartTab active={activeChart === 'line'} icon={<LineIcon size={18}/>} onClick={() => setActiveChart('line')} />
                    <ChartTab active={activeChart === 'pie'} icon={<PieIcon size={18}/>} onClick={() => setActiveChart('pie')} />
                    <ChartTab active={activeChart === 'scatter'} icon={<Zap size={18}/>} onClick={() => setActiveChart('scatter')} />
                  </div>
                </div>

                <div className={`h-[400px] w-full flex flex-col md:flex-row ${dualView ? 'gap-8' : ''}`}>
                  <div className="flex-1 min-h-[300px]"><RenderChart type={activeChart} chartData={data} headers={headers} colors={COLORS} /></div>
                  {dualView && (
                    <div className="flex-1 border-l border-slate-100 md:pl-8 relative min-h-[300px]">
                      {dataCompare.length > 0 ? (
                        <>
                          <div className="flex justify-end mb-2 gap-2 items-center">
                            <button 
                              onClick={() => compareFileInputRef.current?.click()}
                              className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1"
                            >
                              <RefreshCcw size={10}/> Switch File
                            </button>
                            <select value={activeChartCompare} onChange={(e) => setActiveChartCompare(e.target.value as any)} className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-lg outline-none">
                              <option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option><option value="scatter">Scatter</option>
                            </select>
                            <input type="file" ref={compareFileInputRef} className="hidden" onChange={(e) => handleFile(e, true)} />
                          </div>
                          <RenderChart type={activeChartCompare} chartData={dataCompare} headers={headersCompare} colors={['#f59e0b', '#ef4444']} />
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                          <label className="p-8 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all">
                            <Upload className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs font-bold text-slate-400 uppercase">Load Compare Data</p>
                            <input type="file" className="hidden" onChange={(e) => handleFile(e, true)} />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!dualView && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
                  <h3 className="font-black mb-4 flex items-center gap-2 text-indigo-600"><MessageSquare size={18}/> AI Analyst</h3>
                  <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about trends..." className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl resize-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium" />
                  <button onClick={askAI} disabled={loading} className="w-full mt-4 p-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg transition-all">{loading ? "Scanning..." : "Start AI Audit"}</button>
                  {insight && <div className="mt-6 p-6 bg-slate-900 text-white rounded-3xl animate-in fade-in"><p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Audit Result</p><p className="text-sm font-medium leading-relaxed">{insight}</p></div>}
                </div>
              )}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white overflow-hidden">
              <h3 className="font-black text-xl mb-6 flex items-center gap-2"><Database size={20} className="text-indigo-600"/> Data Preview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-slate-100">{headers.map(h => (<th key={h} className="py-4 px-4 font-black text-slate-400 uppercase tracking-wider">{h}</th>))}</tr></thead>
                  <tbody>{data.slice(0, 10).map((row, i) => (<tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">{headers.map(h => (<td key={h} className="py-4 px-4 font-medium text-slate-600">{row[h]}</td>))}</tr>))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full h-[350px] min-h-[350px] min-w-0">
    {children}
  </div>
);

function RenderChart({ type, chartData, headers, colors }: any) {
  const xKey = headers?.[0] || 'name';
  const yKey = headers?.[1] || 'value';

  if (!chartData || chartData.length === 0) {
    return <div className="h-[350px] flex items-center justify-center text-slate-400">No data available</div>;
  }

  if (type === 'bar') return (
    <ChartWrapper>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
          <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
          <Bar dataKey={yKey} fill={colors[0]} radius={[6, 6, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );

  if (type === 'line') return (
    <ChartWrapper>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={4} dot={{r: 4, fill: colors[0]}} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );

  if (type === 'scatter') return (
    <ChartWrapper>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="category" dataKey={xKey} />
          <YAxis type="number" dataKey={yKey} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={chartData} fill={colors[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );

  return (
    <ChartWrapper>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData.slice(0, 8)} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label>
            {chartData.map((_: any, i: number) => (
              <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

function MetricCard({ label, value, icon, color = "text-indigo-600" }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-white flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
      <div className={`p-4 bg-slate-50 rounded-2xl ${color}`}>{icon}</div>
      <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{label}</p><h3 className="text-xl font-black truncate">{value}</h3></div>
    </div>
  );
}

function ChartTab({ active, icon, onClick }: any) {
  return (<button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-white shadow-md text-indigo-600' : 'text-slate-300 hover:text-slate-600'}`}>{icon}</button>);
}