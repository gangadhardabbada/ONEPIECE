import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Twitter, RefreshDouble } from 'iconoir-react';
import gsap from 'gsap';
import { normalizeImageFile, loadImage, removeImageBackground } from './lib/image/imageNormalization';
import { renderFrame } from './lib/image/canvasRenderer';
import { shareToX, downloadBlob } from './lib/share/exporter';
import { jsPDF } from 'jspdf';
import './index.css';

type Step = 'upload' | 'generating' | 'result';

function App() {
  const [step, setStep] = useState<Step>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [team, setTeam] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 'generating' && dotsRef.current) {
      gsap.to(dotsRef.current.children, {
        y: -10,
        stagger: 0.1,
        yoyo: true,
        repeat: -1,
        duration: 0.4,
        ease: 'power1.inOut'
      });
    }
  }, [step]);

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    
    setStep('generating');
    
    try {
      const blob = await normalizeImageFile(file);
      const bgRemovedBlob = await removeImageBackground(blob);
      const img = await loadImage(bgRemovedBlob);
      const finalBlob = await renderFrame(img, { 
        width: 1800, 
        height: 1000,
        name: name || undefined,
        origin: origin || undefined,
        team: team || undefined
      });
      
      const objectUrl = URL.createObjectURL(finalBlob);
      setGeneratedBlob(finalBlob);
      setGeneratedUrl(objectUrl);
      
      // Simulate slight delay for dramatic effect if it was too fast
      setTimeout(() => {
        setStep('result');
        gsap.fromTo('.result-container', 
          { opacity: 0, y: 20 }, 
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        );
      }, 600);

    } catch (error) {
      console.error(error);
      alert('Failed to process image. Please try another one.');
      setStep('upload');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDownload = () => {
    if (generatedUrl) {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1800, 1000]
      });
      pdf.addImage(generatedUrl, 'PNG', 0, 0, 1800, 1000);
      pdf.save('HH_GOA_26_BoardingPass.pdf');
    }
  };

  const handleShare = () => {
    const text = "Less noise. More signal. See you at HH Goa 2026. #FrameInGoa";
    shareToX(text); // Web intent doesn't support local image blobs directly, user attaches downloaded one
  };

  const handleReset = () => {
    if (generatedUrl) {
      URL.revokeObjectURL(generatedUrl);
    }
    setGeneratedBlob(null);
    setGeneratedUrl(null);
    setStep('upload');
  };

  return (
    <div className="app-container" ref={containerRef}>
      <header className="app-header">
        <h1 className="app-title">HH GOA '26</h1>
        <h2 className="app-subtitle">
          <span>LESS NOISE.</span>
          <span>MORE SIGNAL.</span>
        </h2>
      </header>

      {step === 'upload' && (
        <div className="upload-section">
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Your Name (e.g. JITHEENDER MANAPURAM)" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="text-input" 
            />
            <input 
              type="text" 
              placeholder="Origin Code (e.g. VTZ)" 
              value={origin} 
              onChange={e => setOrigin(e.target.value)} 
              className="text-input" 
              maxLength={3}
            />
            <input 
              type="text" 
              placeholder="Team Name (e.g. VERNA VISIONARIES)" 
              value={team} 
              onChange={e => setTeam(e.target.value)} 
              className="text-input" 
            />
          </div>
          <label 
            className={`uploader ${dragActive ? 'drag-active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input 
              type="file" 
              accept="image/jpeg, image/png, image/heic"
              onChange={onFileChange}
            />
            <div className="uploader-content">
              <Upload className="uploader-icon" />
              <div className="uploader-text">TAP OR DRAG PHOTO TO GENERATE</div>
              <div className="uploader-metadata">JPG · PNG · HEIC</div>
            </div>
          </label>
        </div>
      )}

      {step === 'generating' && (
        <div className="loader-container">
          <div className="signal-loader" ref={dotsRef}>
            <div className="signal-dot"></div>
            <div className="signal-dot"></div>
            <div className="signal-dot"></div>
          </div>
          <div className="loader-text" style={{ textAlign: 'center' }}>
            <div>ANALYZING SIGNAL...</div>
            <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginTop: '8px', letterSpacing: '0.1em' }}>
              REMOVING BACKGROUND (THIS MAY TAKE A MOMENT)
            </div>
          </div>
        </div>
      )}

      {step === 'result' && generatedUrl && (
        <div className="result-container">
          <div className="preview-wrapper">
            <img src={generatedUrl} alt="HH Goa 2026 Branded Frame" className="preview-image" />
          </div>
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={handleDownload}>
              <Download /> DOWNLOAD
            </button>
            <button className="btn btn-secondary" onClick={handleShare}>
              <Twitter /> SHARE TO X
            </button>
            <button className="btn btn-text" onClick={handleReset}>
              <RefreshDouble /> START OVER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
