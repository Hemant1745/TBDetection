import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Shield, Brain, FileBarChart, Scan } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' } }),
};

const features = [
  { icon: Brain, title: 'AI-Powered Analysis', desc: 'Deep learning CNN model trained on thousands of chest X-rays for accurate TB detection.' },
  { icon: Scan, title: 'Grad-CAM Heatmaps', desc: 'Explainable AI visualization showing exactly where the model detects abnormalities.' },
  { icon: FileBarChart, title: 'Professional Reports', desc: 'Generate detailed PDF reports with patient info, diagnosis, and clinical interpretation.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your medical data is protected with enterprise-grade authentication and encryption.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0A0A0A' }}>
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/ee5438d8-37db-4f1a-8ea0-e85184d45be8/images/430eb1377d4f7d6b50336c743c95a652b359bc6a07921c5bf6ffd90e5d86e77f.png"
          alt=""
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#0A0A0A]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/20">
            <Scan className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <span className="text-lg font-semibold text-white" style={{ fontFamily: 'Outfit' }}>TB Detect AI</span>
        </div>
        <div className="flex gap-3">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              data-testid="landing-go-dashboard"
              className="px-5 py-2.5 rounded-full bg-[#00E5FF] text-black font-medium text-sm hover:scale-[1.02] transition-transform"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                data-testid="landing-login-btn"
                className="px-5 py-2.5 rounded-full border border-white/20 text-white text-sm hover:bg-white/5 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                data-testid="landing-register-btn"
                className="px-5 py-2.5 rounded-full bg-[#00E5FF] text-black font-medium text-sm hover:scale-[1.02] transition-transform"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 lg:px-12 pt-20 lg:pt-32 pb-20 max-w-7xl mx-auto">
        <motion.div initial="hidden" animate="visible" className="max-w-2xl">
          <motion.p
            variants={fadeUp} custom={0}
            className="text-[#00E5FF] text-sm font-medium uppercase tracking-[0.2em] mb-6"
          >
            AI-Powered Medical Imaging
          </motion.p>
          <motion.h1
            variants={fadeUp} custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-tight mb-6"
            style={{ fontFamily: 'Outfit' }}
          >
            AI-Based Tuberculosis{' '}
            <span className="text-[#00E5FF] text-glow-cyan">Detection System</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} custom={2}
            className="text-slate-400 text-base lg:text-lg leading-relaxed mb-10 max-w-xl"
          >
            Upload chest X-rays and detect tuberculosis with advanced deep learning. Get instant AI analysis with Grad-CAM heatmap visualizations and professional medical reports.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate(user ? '/analyze' : '/register')}
              data-testid="start-analysis-btn"
              className="group px-8 py-3.5 rounded-full bg-[#00E5FF] text-black font-medium text-sm flex items-center gap-2 hover:scale-[1.02] transition-transform glow-cyan"
            >
              Start Analysis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/about')}
              data-testid="learn-more-btn"
              className="px-8 py-3.5 rounded-full border border-white/20 text-white text-sm hover:bg-white/5 transition-colors"
            >
              Learn More
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 lg:px-12 pb-24 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              className="glass-card p-6"
              data-testid={`feature-card-${i}`}
            >
              <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <h3 className="text-white font-medium mb-2" style={{ fontFamily: 'Outfit' }}>{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-slate-500">
          <span>TB Detect AI - Medical AI Platform</span>
          <span>For research and educational purposes only</span>
        </div>
      </footer>
    </div>
  );
}
