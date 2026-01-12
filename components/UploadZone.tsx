
import React from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isProcessing }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (e.dataTransfer.files[0].type === 'application/pdf') {
        onFileSelect(e.dataTransfer.files[0]);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  return (
    <div 
      className={`
        border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer
        ${isProcessing 
          ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' 
          : 'border-brand-200 bg-white hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10'
        }
      `}
      onDrop={!isProcessing ? handleDrop : undefined}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !isProcessing && document.getElementById('pdf-input')?.click()}
    >
      <input 
        type="file" 
        id="pdf-input" 
        className="hidden" 
        accept="application/pdf"
        disabled={isProcessing}
        onChange={handleInputChange} 
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className={`
          w-20 h-20 rounded-2xl flex items-center justify-center text-3xl
          ${isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-brand-600 text-white shadow-xl shadow-brand-600/20'}
        `}>
          {isProcessing ? '⚙️' : '📄'}
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-900">
                {isProcessing ? 'Processing PDF...' : 'Drop your PDF here'}
            </h3>
            <p className="text-slate-500 font-medium mt-1 text-sm">
                Up to 20 pages recommended • Auto-Layout Analysis
            </p>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
