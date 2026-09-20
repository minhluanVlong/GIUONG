import React from 'react';
import { Bed, DischargeRecord } from '../types';
import {
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  FileText,
  RotateCcw,
  FileSpreadsheet,
  Download,
  CloudCheck,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  beds: Bed[];
  dischargeHistory: DischargeRecord[];
  onOpenHistory: () => void;
  onOpenVisualMap: () => void;
  onOpenGoogleSheets?: () => void;
  onOpenDownloadModal?: () => void;
  onResetData: () => void;
  syncStatus?: 'synced' | 'syncing' | 'local' | 'error';
  lastSavedTime?: string;
  onRefreshFromServer?: () => void;
  onForceSyncToServer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  beds,
  dischargeHistory,
  onOpenHistory,
  onOpenVisualMap,
  onOpenGoogleSheets,
  onOpenDownloadModal,
  onResetData,
  syncStatus = 'synced',
  lastSavedTime,
  onRefreshFromServer,
  onForceSyncToServer,
}) => {
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.trangThai === 'Có người').length;
  const lockedBeds = beds.filter(b => b.trangThai === 'Trống' && b.khoaXuatVienHomNay).length;
  const availableBeds = beds.filter(b => b.trangThai === 'Trống' && !b.khoaXuatVienHomNay).length;
  const tempBeds = beds.filter(b => b.loaiNam === 'Nằm tạm' && b.trangThai === 'Có người').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  HỆ THỐNG ĐIỀU PHỐI GIƯỜNG BỆNH VÀ ĐỒNG BỘ DỮ LIỆU TỰ ĐỘNG
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Đồng Bộ 2 Sheet
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sheet "PHÒNG" (H001-H093) & Sheet "XUẤT VIỆN" • Kiểm tra 4 điều kiện an toàn bắt buộc • Tự động xuất JSON Payload
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {onOpenDownloadModal && (
              <button
                onClick={onOpenDownloadModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-xs"
                title="Tải về danh sách bệnh nhân theo giường (File Excel .CSV UTF-8)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải DS Bệnh Nhân</span>
              </button>
            )}

            {onOpenGoogleSheets && (
              <button
                onClick={onOpenGoogleSheets}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors shadow-xs"
                title="Xem mô phỏng 2 Sheet Google Sheets thời gian thực và xuất dữ liệu"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Sheets (2 Sheet)</span>
              </button>
            )}

            <button
              onClick={onOpenVisualMap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors shadow-2xs"
              title="Xem và sao chép sơ đồ phòng bệnh trực quan"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Sơ Đồ Trực Quan</span>
            </button>

            <button
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors"
              title="Xem danh sách bệnh nhân đã xuất viện"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Sheet Xuất Viện</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                {dischargeHistory.length}
              </span>
            </button>

            <button
              onClick={onResetData}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
              title="Đặt lại dữ liệu ban đầu theo file CSV"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Dữ liệu gốc</span>
            </button>
          </div>
        </div>

        {/* Real-time Status Metric Badges */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
            <span className="font-bold text-slate-900">{totalBeds}</span>
            <span className="text-slate-500">Tổng giường</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="font-bold text-rose-900">{occupiedBeds}</span>
            <span>Có người ({occupancyRate}%)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-emerald-900">{availableBeds}</span>
            <span>Trống khả dụng</span>
          </div>

          {lockedBeds > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900" title="Giường có BN xuất viện hôm nay, khóa khử khuẩn/viện phí">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="font-bold text-amber-950">{lockedBeds}</span>
              <span>Khóa XV hôm nay</span>
            </div>
          )}

          {tempBeds > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-bold text-amber-950">{tempBeds}</span>
              <span>Nằm tạm</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Server Sync Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : syncStatus === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
              title={
                syncStatus === 'synced'
                  ? `Dữ liệu đã được lưu an toàn trên máy chủ${lastSavedTime ? ` (${lastSavedTime})` : ''}`
                  : syncStatus === 'syncing'
                  ? 'Đang lưu dữ liệu lên máy chủ...'
                  : 'Dữ liệu đang lưu bộ nhớ tạm. Bấm đồng bộ để lưu máy chủ.'
              }
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              )}
              <span>
                {syncStatus === 'synced'
                  ? `Máy chủ: Đã lưu ${lastSavedTime ? `(${lastSavedTime})` : 'tự động'}`
                  : syncStatus === 'syncing'
                  ? 'Đang lưu máy chủ...'
                  : syncStatus === 'error'
                  ? 'Lỗi kết nối máy chủ'
                  : 'Đã lưu cục bộ'}
              </span>
            </div>

            {onRefreshFromServer && (
              <button
                onClick={onRefreshFromServer}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Tải lại dữ liệu mới nhất từ máy chủ"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
