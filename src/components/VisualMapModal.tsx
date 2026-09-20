import React, { useState } from 'react';
import { Bed } from '../types';
import { generateVisualMapText } from '../utils/bedManagement';
import { FileText, Copy, Check, X, Printer, LayoutGrid, Building2, AlertCircle } from 'lucide-react';

interface VisualMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  beds: Bed[];
  initialZone?: 'ALL' | 'KHU NỘI NHI' | 'KHU LÂY';
}

export const VisualMapModal: React.FC<VisualMapModalProps> = ({
  isOpen,
  onClose,
  beds,
  initialZone = 'ALL',
}) => {
  const [selectedZone, setSelectedZone] = useState<'ALL' | 'KHU NỘI NHI' | 'KHU LÂY'>(initialZone);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mapText = generateVisualMapText(beds, selectedZone);

  const handleCopy = () => {
    navigator.clipboard.writeText(mapText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-300 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Báo Cáo Sơ Đồ Trực Quan Giường Bệnh
              </h3>
              <p className="text-[11px] text-slate-500">
                Định dạng khối trực quan theo tiêu chuẩn quy định sẵn sàng in hoặc sao chép báo cáo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Zone Selector */}
          <div className="inline-flex rounded-lg bg-slate-200/80 p-1 border border-slate-300">
            <button
              onClick={() => setSelectedZone('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedZone === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Toàn viện (93)</span>
            </button>
            <button
              onClick={() => setSelectedZone('KHU NỘI NHI')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedZone === 'KHU NỘI NHI'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Khu Nội Nhi (50)</span>
            </button>
            <button
              onClick={() => setSelectedZone('KHU LÂY')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedZone === 'KHU LÂY'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Khu Nhiễm / Lây (43)</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao Chép Sơ Đồ</span>
              </>
            )}
          </button>
        </div>

        {/* Text Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-white font-mono text-xs text-slate-800 selection:bg-blue-100 selection:text-blue-900">
          <pre className="whitespace-pre-wrap leading-relaxed">
            {mapText}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">🟢 Trống</span>
            <span className="flex items-center gap-1 text-rose-700 font-semibold">🔴 Có người</span>
            <span className="flex items-center gap-1 text-amber-700 font-semibold">🟡 Nằm tạm</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
