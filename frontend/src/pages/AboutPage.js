import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { Brain, Layers, Eye, Cpu, ArrowRight, Zap } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5 } }),
};

const steps = [
  { icon: Layers, title: 'Image Preprocessing', desc: 'The uploaded chest X-ray is resized to 224x224 pixels and normalized for the neural network input.' },
  { icon: Brain, title: 'CNN Feature Extraction', desc: 'A Convolutional Neural Network with multiple conv-pool layers extracts hierarchical features from the X-ray.' },
  { icon: Cpu, title: 'Classification', desc: 'Dense layers with dropout process the extracted features and output a TB probability score (0-1).' },
  { icon: Eye, title: 'Grad-CAM Heatmap', desc: 'Gradient-weighted Class Activation Mapping highlights the image regions most influential in the model\'s decision.' },
  { icon: Zap, title: 'Report Generation', desc: 'Results are compiled into a professional medical report with images, probabilities, and clinical interpretation.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Sidebar />
      <div className="lg:ml-64">
        <div className="p-6 lg:p-10 max-w-5xl mx-auto" data-testid="about-page">
          <motion.div initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="mb-10">
              <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>
                How It <span className="text-[#00E5FF]">Works</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">Understanding the AI technology behind TB detection</p>
            </motion.div>

            {/* AI Workflow Pipeline */}
            <motion.div variants={fadeUp} custom={1} className="mb-12">
              <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: 'Outfit' }}>AI Analysis Pipeline</h2>
              <div className="space-y-4">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.title}
                    variants={fadeUp}
                    custom={i + 2}
                    className="glass-card p-6 flex items-start gap-5"
                    data-testid={`pipeline-step-${i}`}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-[#00E5FF]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs text-[#00E5FF]/60">STEP {i + 1}</span>
                        {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                      </div>
                      <h3 className="text-white font-medium mb-1" style={{ fontFamily: 'Outfit' }}>{step.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Bento Grid - CNN & Grad-CAM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <motion.div variants={fadeUp} custom={7} className="glass-card p-8" data-testid="cnn-explanation">
                <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/10 flex items-center justify-center mb-4">
                  <Brain className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <h3 className="text-white text-lg font-medium mb-3" style={{ fontFamily: 'Outfit' }}>Convolutional Neural Network</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Our CNN architecture consists of three convolutional layers with max-pooling, followed by dense layers with dropout for regularization. The model was trained on thousands of labeled chest X-ray images to learn patterns associated with tuberculosis.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                    <span className="text-xs text-slate-300">3 Conv2D + MaxPooling layers</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                    <span className="text-xs text-slate-300">Dense layers with 50% dropout</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                    <span className="text-xs text-slate-300">Sigmoid activation for binary output</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                    <span className="text-xs text-slate-300">224x224 RGB input images</span>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} custom={8} className="glass-card p-8" data-testid="gradcam-explanation">
                <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center mb-4">
                  <Eye className="w-5 h-5 text-[#10B981]" />
                </div>
                <h3 className="text-white text-lg font-medium mb-3" style={{ fontFamily: 'Outfit' }}>Grad-CAM Explainability</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Gradient-weighted Class Activation Mapping (Grad-CAM) provides visual explanations for the model's decisions. It uses gradients flowing into the final convolutional layer to produce a coarse heatmap highlighting important regions.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span className="text-xs text-slate-300">Computes gradients of output w.r.t. conv features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span className="text-xs text-slate-300">Global average pooling of gradient channels</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span className="text-xs text-slate-300">Weighted combination produces attention map</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span className="text-xs text-slate-300">Red = high attention, Blue = low attention</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Background image section */}
            <motion.div variants={fadeUp} custom={9} className="glass-card overflow-hidden mb-8" data-testid="ai-visual-section">
              <div className="relative h-48">
                <img
                  src="https://static.prod-images.emergentagent.com/jobs/ee5438d8-37db-4f1a-8ea0-e85184d45be8/images/c7b0a87ff9ce6d4edd599851d61773ca957967dd194e4ff684fb72e298cf9563.png"
                  alt="AI scanning concept"
                  className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-white text-lg font-medium mb-1" style={{ fontFamily: 'Outfit' }}>Explainable AI in Healthcare</h3>
                  <p className="text-sm text-slate-300">Our system combines deep learning accuracy with visual interpretability, enabling medical professionals to understand and validate AI-assisted diagnoses.</p>
                </div>
              </div>
            </motion.div>

            {/* Disclaimer */}
            <motion.div variants={fadeUp} custom={10} className="glass-card p-6 border-l-2 border-[#EAB308]" data-testid="disclaimer">
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-yellow-400">Disclaimer:</strong> This system is designed for research and educational purposes only. It should not be used as a sole diagnostic tool. Always consult qualified medical professionals for clinical decisions regarding tuberculosis diagnosis and treatment.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
