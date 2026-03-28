import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { Activity, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

function AnimatedCounter({ target, duration = 1500 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <span ref={ref} className="font-mono text-3xl font-semibold">{count}</span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, scansRes] = await Promise.all([
          api.get('/stats'),
          api.get('/scans'),
        ]);
        setStats(statsRes.data);
        setRecentScans(scansRes.data.slice(0, 5));
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      }
    };
    fetchData();
  }, []);

  const statCards = stats ? [
    { label: 'Total Scans', value: stats.total_scans, icon: TrendingUp, color: '#00E5FF' },
    { label: 'TB Detected', value: stats.tb_detected, icon: AlertTriangle, color: '#EF4444' },
    { label: 'Normal Cases', value: stats.normal_cases, icon: CheckCircle, color: '#10B981' },
    { label: 'Possible TB', value: stats.possible_tb, icon: Activity, color: '#EAB308' },
  ] : [];

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Sidebar />
      <div className="lg:ml-64">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto" data-testid="dashboard-page">
          <motion.div initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>
                Welcome back, <span className="text-[#00E5FF]">{user?.name || 'Doctor'}</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">Here's an overview of your TB analysis activity</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {stats ? statCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  variants={fadeUp}
                  custom={i + 1}
                  className="glass-card p-6"
                  data-testid={`stat-${card.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                      <card.icon className="w-4 h-4" style={{ color: card.color }} />
                    </div>
                  </div>
                  <AnimatedCounter target={card.value} />
                </motion.div>
              )) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card p-6">
                    <div className="skeleton h-4 w-24 rounded mb-4" />
                    <div className="skeleton h-8 w-16 rounded" />
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <motion.div variants={fadeUp} custom={5} className="mb-10">
              <h2 className="text-lg font-medium text-white mb-4" style={{ fontFamily: 'Outfit' }}>Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/analyze')}
                  data-testid="quick-analyze-btn"
                  className="glass-card p-6 text-left group"
                >
                  <Activity className="w-6 h-6 text-[#00E5FF] mb-3" />
                  <h3 className="text-white font-medium mb-1" style={{ fontFamily: 'Outfit' }}>New Analysis</h3>
                  <p className="text-sm text-slate-400">Upload a chest X-ray for TB detection</p>
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  data-testid="quick-reports-btn"
                  className="glass-card p-6 text-left group"
                >
                  <TrendingUp className="w-6 h-6 text-[#10B981] mb-3" />
                  <h3 className="text-white font-medium mb-1" style={{ fontFamily: 'Outfit' }}>View Reports</h3>
                  <p className="text-sm text-slate-400">Browse your analysis history and download reports</p>
                </button>
              </div>
            </motion.div>

            {/* Recent Scans */}
            <motion.div variants={fadeUp} custom={6}>
              <h2 className="text-lg font-medium text-white mb-4" style={{ fontFamily: 'Outfit' }}>Recent Scans</h2>
              {recentScans.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No scans yet. Start your first analysis!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="glass-card p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => navigate(`/reports`)}
                      data-testid={`recent-scan-${scan.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          scan.severity === 'high' ? 'bg-red-500' :
                          scan.severity === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`} />
                        <div>
                          <p className="text-sm text-white">{scan.filename}</p>
                          <p className="text-xs text-slate-500">{new Date(scan.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-mono font-medium ${
                          scan.severity === 'high' ? 'text-red-400' :
                          scan.severity === 'medium' ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                          {(scan.probability * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">{scan.result}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
