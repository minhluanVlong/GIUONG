import React, { useRef, useState } from 'react';
import { Bed, DischargeRecord, SyncPayloadLog } from '../types';
import { exportHospitalBackupJSON, importHospitalBackupJSON } from '../utils/storage';
import {
  Download,
  Upload,
  Database,
  X,
  CheckCircle,
  AlertCircle,
  FileJson,
  ShieldCheck,
  RefreshCw,
  HardDrive,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  beds: Bed[];
  dischargeHistory: DischargeRecord[];
  syncLogs: SyncPayloadLog[];
  onRestoreData: (beds: Bed[], history: DischargeRecord[], logs: SyncPayloadLog[]) => void;
  syncStatus: 'synced' | 'syncing' | 'local' | 'error';
  lastSavedTime?: string;
  onRefreshFromServer?: () => void;
  onForceSyncToServer?: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  beds,
  dischargeHistory,
  syncLogs,
  onRestoreData,
  syncStatus,
  lastSavedTime,
  onRefreshFromServer,
  onForceSyncToServer,
}) => {
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const occupiedCount = beds.filter(b => b.trangThai === 'Có người').length;
  const lockedCount = beds.filter(b => b.khoaXuatVienHomNay).length;

  const handleExportJSON = () => {
    exportHospitalBackupJSON(beds, dischargeHistory, syncLogs);
    setImportStatus({
      type: 'success',
      message: `Đã xuất thành công file sao lưu đầy đủ 93 giường bệnh (${occupiedCount} bệnh nhân nội trú).`,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importHospitalBackupJSON(file);
    if (result.success && result.beds) {
      onRestoreData(result.beds, result.dischargeHistory || [], result.syncLogs || []);
      setImportStatus({
        type: 'success',
        message: result.message,
      });
    } else {
      setImportStatus({
        type: 'error',
        message: result.message,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Quản Lý & Sao Lưu Dữ Liệu</h3>
              <p className="text-xs text-slate-300">Đảm bảo an toàn 100% dữ liệu 93 giường bệnh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Status Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs">
            <HardDrive className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="space-y-1 text-slate-700 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Trạng thái lưu trữ hiện thời:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-800'
                      : syncStatus === 'syncing'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {syncStatus === 'synced'
                    ? 'Máy chủ & Bộ nhớ máy'
                    : syncStatus === 'syncing'
                    ? 'Đang đồng bộ...'
                    : 'Bộ nhớ trình duyệt an toàn'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                • <strong>{occupiedCount}</strong> giường đang điều trị / <strong>93</strong> giường tổng.
                {lockedCount > 0 && ` (Đang khóa ${lockedCount} giường vừa xuất viện).`}
              </p>
              <p className="text-[11px] text-slate-500">
                • Dữ liệu tự động lưu <strong>ngay tức thì</strong> vào bộ nhớ máy mỗi khi nhập bệnh nhân.
              </p>
            </div>
          </div>

          {/* Alert Message */}
          {importStatus.message && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{importStatus.message}</span>
            </div>
          )}

          {/* Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export JSON */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-white transition-all space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Download className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Sao lưu (Tải file .json)</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Lưu toàn bộ danh sách 93 giường, bệnh nhân và lịch sử xuất viện về máy để lưu trữ hoặc chuyển máy khác.
                </p>
              </div>
              <button
                onClick={handleExportJSON}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <FileJson className="w-4 h-4" />
                <span>Tải File Sao Lưu (.JSON)</span>
              </button>
            </div>

            {/* Import JSON */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white transition-all space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Upload className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Khôi phục (Nhập file)</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Đưa dữ liệu đã sao lưu từ trước vào hệ thống ngay lập tức mà không làm mất thông tin.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn File Để Khôi Phục</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multi-computer / GitHub Pages Note */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-slate-700 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Lưu ý khi sử dụng trên nhiều máy tính / GitHub Pages</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              • Khi chuyển sang máy tính hoặc điện thoại khác, hãy bấm <strong>"Tải File Sao Lưu (.JSON)"</strong> rồi gửi sang máy mới bấm <strong>"Chọn File Để Khôi Phục"</strong>.
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              • Hoặc sử dụng tính năng <strong>Google Sheets (2 Sheet)</strong> để đồng bộ dữ liệu trực tiếp với Google Drive của bệnh viện.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 text-[11px]">
            Hệ thống quản lý 93 giường bệnh nội trú
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
