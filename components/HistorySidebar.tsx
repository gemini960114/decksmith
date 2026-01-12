
import React from 'react';
import { ProjectJob } from '../types';

interface HistorySidebarProps {
  jobs: ProjectJob[];
  currentJobId: string | null;
  onSelectJob: (job: ProjectJob) => void;
  onDeleteJob: (jobId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ jobs, currentJobId, onSelectJob, onDeleteJob, isOpen, onClose }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose}></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-slate-800 uppercase tracking-wide">Project History</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {jobs.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                    <p className="text-xs font-medium">No history found.</p>
                </div>
            )}
            
            {[...jobs].sort((a,b) => b.timestamp - a.timestamp).map(job => (
                <div 
                    key={job.id}
                    className={`
                        p-4 rounded-xl border cursor-pointer transition-all group relative
                        ${currentJobId === job.id 
                            ? 'bg-brand-50 border-brand-200 shadow-sm' 
                            : 'bg-white border-slate-100 hover:border-brand-200 hover:bg-slate-50'
                        }
                    `}
                    onClick={() => {
                        onSelectJob(job);
                        onClose();
                    }}
                >
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-bold text-sm ${currentJobId === job.id ? 'text-brand-800' : 'text-slate-700'}`}>
                            {job.name}
                        </h4>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm("Delete this project?")) onDeleteJob(job.id);
                            }}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(job.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {job.pageCount} Pages
                        </span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
