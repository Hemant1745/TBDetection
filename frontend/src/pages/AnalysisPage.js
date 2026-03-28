import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Sidebar from '@/components/Sidebar';
import { Upload, X, Scan, FileDown, Eye, EyeOff } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AnalysisPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const handleFile = useCallback((f) => {
    if (!f) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    setError('');
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post(`${API}/predict`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    try {
      const res = await axios.get(`${API}/report/${result.id}?patient_name=Patient&patient_age=N/A&patient_gender=N/A`, {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TB_Report_${result.id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to download report.');
    }
  };

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const probabilityPercent = result ? (result.probability * 100) : 0;
  const getColor = (sev) => sev === 'high' ? '#EF4444' : sev === 'medium' ? '#EAB308' : '#10B981';

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Sidebar />
      <div className="lg:ml-64">
        <div className="p-6 lg:p-10 max-w-5xl mx-auto" data-testid="analysis-page">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight mb-2" style={{ fontFamily: 'Outfit' }}>
              X-Ray <span className="text-[#00E5FF]">Analysis</span>
            </h1>
            <p className="text-slate-400 text-sm mb-8">Upload a chest X-ray image for AI-powered TB detection</p>

            {/* Upload Zone */}
            {!result && (
              <div className="mb-8">
                {!preview ? (
                  <div
                    className={`upload-zone rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? 'active' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input').click()}
                    data-testid="upload-zone"
                  >
                    <input
                      id="file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files[0])}
                      data-testid="file-input"
                    />
                    <Upload className="w-10 h-10 text-slate-500 mx-auto mb-4" />
                    <p className="text-white text-sm font-medium mb-1">Drop your chest X-ray here</p>
                    <p className="text-slate-500 text-xs">or click to browse (JPEG, PNG, WebP)</p>
                  </div>
                ) : (
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Scan className="w-5 h-5 text-[#00E5FF]" />
                        <span className="text-white text-sm">{file.name}</span>
                      </div>
                      <button onClick={clearAll} data-testid="clear-upload-btn" className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex justify-center mb-6">
                      <img
                        src={preview}
                        alt="X-ray preview"
                        className="max-h-64 rounded-lg border border-white/10"
                        data-testid="image-preview"
                      />
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      data-testid="analyze-btn"
                      className="w-full py-3 rounded-xl bg-[#00E5FF] text-black font-medium text-sm hover:scale-[1.01] transition-transform disabled:opacity-50"
                    >
                      {analyzing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Analyzing with AI...
                        </span>
                      ) : 'Analyze X-Ray'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            <AnimatePresence>
              {analyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-10 text-center mb-8 analyzing-pulse"
                >
                  <div className="w-16 h-16 border-3 border-[#00E5FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-sm mb-1">AI Model Processing...</p>
                  <p className="text-slate-500 text-xs">Running deep learning inference & generating Grad-CAM heatmap</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div data-testid="analysis-error" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-8">
                {error}
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                  {/* Probability & Result */}
                  <div className="glass-card p-8 mb-6" data-testid="analysis-result">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-medium text-white" style={{ fontFamily: 'Outfit' }}>Analysis Result</h2>
                      <span
                        className="px-4 py-1.5 rounded-full text-xs font-medium"
                        style={{
                          background: `${getColor(result.severity)}15`,
                          color: getColor(result.severity),
                          border: `1px solid ${getColor(result.severity)}30`
                        }}
                        data-testid="result-badge"
                      >
                        {result.result}
                      </span>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-end justify-between mb-3">
                        <span className="text-sm text-slate-400">TB Probability</span>
                        <span
                          className="font-mono text-3xl font-semibold"
                          style={{ color: getColor(result.severity) }}
                          data-testid="probability-value"
                        >
                          {probabilityPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden" data-testid="probability-progress">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${probabilityPercent}%` }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{
                            background: getColor(result.severity),
                            boxShadow: `0 0 12px ${getColor(result.severity)}60`
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed">
                      {result.severity === 'high'
                        ? 'The AI model has detected strong indicators of tuberculosis. Immediate clinical consultation is recommended.'
                        : result.severity === 'medium'
                        ? 'Some patterns suggestive of TB were detected. Follow-up examination is advised.'
                        : 'No significant TB indicators detected. The X-ray appears normal based on AI analysis.'}
                    </p>
                  </div>

                  {/* Heatmap Visualization */}
                  {result.heatmap_image && (
                    <div className="glass-card p-8 mb-6" data-testid="heatmap-section">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-medium text-white" style={{ fontFamily: 'Outfit' }}>Grad-CAM Visualization</h2>
                        <button
                          onClick={() => setShowHeatmap(!showHeatmap)}
                          data-testid="toggle-heatmap-btn"
                          className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#00E5FF] transition-colors"
                        >
                          {showHeatmap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showHeatmap ? 'Hide' : 'Show'} Heatmap
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Original X-Ray</p>
                          <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            src={`data:image/png;base64,${result.original_image}`}
                            alt="Original X-ray"
                            className="w-full rounded-lg border border-white/10"
                            data-testid="original-xray-img"
                          />
                        </div>
                        <AnimatePresence>
                          {showHeatmap && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5 }}
                            >
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Heatmap Overlay</p>
                              <img
                                src={`data:image/png;base64,${result.heatmap_image}`}
                                alt="Grad-CAM heatmap"
                                className="w-full rounded-lg border border-white/10"
                                data-testid="heatmap-img"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={handleDownloadPdf}
                      data-testid="download-report-btn"
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00E5FF] text-black font-medium text-sm hover:scale-[1.01] transition-transform"
                    >
                      <FileDown className="w-4 h-4" />
                      Download Report
                    </button>
                    <button
                      onClick={clearAll}
                      data-testid="new-analysis-btn"
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white text-sm hover:bg-white/5 transition-colors"
                    >
                      New Analysis
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
