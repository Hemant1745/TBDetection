import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Sidebar from '@/components/Sidebar';
import { FileDown, Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReportsPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState({});

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const { data } = await axios.get(`${API}/scans`, { withCredentials: true });
        setScans(data);
      } catch (e) {
        console.error('Failed to fetch scans', e);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  const handleExpand = async (scanId) => {
    if (expandedId === scanId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(scanId);
    if (!expandedData[scanId]) {
      try {
        const { data } = await axios.get(`${API}/scans/${scanId}`, { withCredentials: true });
        setExpandedData((prev) => ({ ...prev, [scanId]: data }));
      } catch (e) {
        console.error('Failed to fetch scan details', e);
      }
    }
  };

  const handleDownload = async (scanId) => {
    try {
      const res = await axios.get(`${API}/report/${scanId}?patient_name=Patient&patient_age=N/A&patient_gender=N/A`, {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TB_Report_${scanId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download report', e);
    }
  };

  const filtered = scans.filter((s) =>
    s.filename?.toLowerCase().includes(search.toLowerCase()) ||
    s.result?.toLowerCase().includes(search.toLowerCase())
  );

  const getSeverityColor = (sev) => sev === 'high' ? 'text-red-400' : sev === 'medium' ? 'text-yellow-400' : 'text-emerald-400';
  const getSeverityBg = (sev) => sev === 'high' ? 'bg-red-500' : sev === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Sidebar />
      <div className="lg:ml-64">
        <div className="p-6 lg:p-10 max-w-5xl mx-auto" data-testid="reports-page">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>
                  Scan <span className="text-[#00E5FF]">Reports</span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">View and download your analysis history</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search scans..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="search-scans-input"
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card p-5">
                    <div className="skeleton h-5 w-48 rounded mb-2" />
                    <div className="skeleton h-4 w-32 rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-12 text-center" data-testid="no-scans-message">
                <p className="text-slate-400 text-sm">
                  {scans.length === 0 ? 'No scans yet. Go to Analyze to perform your first scan!' : 'No matching scans found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="scans-list">
                {filtered.map((scan) => (
                  <div key={scan.id} className="glass-card overflow-hidden">
                    <div
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => handleExpand(scan.id)}
                      data-testid={`scan-row-${scan.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${getSeverityBg(scan.severity)}`} />
                        <div>
                          <p className="text-sm text-white font-medium">{scan.filename}</p>
                          <p className="text-xs text-slate-500">{new Date(scan.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className={`text-sm font-mono font-medium ${getSeverityColor(scan.severity)}`}>
                            {(scan.probability * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-500">{scan.result}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === scan.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {expandedId === scan.id && expandedData[scan.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-white/10 p-6"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                          {expandedData[scan.id].original_image && (
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Original X-Ray</p>
                              <img
                                src={`data:image/png;base64,${expandedData[scan.id].original_image}`}
                                alt="X-ray"
                                className="w-full max-w-[224px] rounded-lg border border-white/10"
                                data-testid={`scan-original-${scan.id}`}
                              />
                            </div>
                          )}
                          {expandedData[scan.id].heatmap_image && (
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Heatmap</p>
                              <img
                                src={`data:image/png;base64,${expandedData[scan.id].heatmap_image}`}
                                alt="Heatmap"
                                className="w-full max-w-[224px] rounded-lg border border-white/10"
                                data-testid={`scan-heatmap-${scan.id}`}
                              />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(scan.id); }}
                          data-testid={`download-report-${scan.id}`}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E5FF] text-black font-medium text-sm hover:scale-[1.01] transition-transform"
                        >
                          <FileDown className="w-4 h-4" />
                          Download PDF Report
                        </button>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
