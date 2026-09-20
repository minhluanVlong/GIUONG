import React, { useState } from 'react';
import { DischargeRecord } from '../types';
import { History, Search, X, UserCheck, Calendar, AlertTriangle, Trash2 } from 'lucide-react';

interface DischargeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dischargeHistory: DischargeRecord[];
  onSelectForReAdmit: (patientName: string) => void;
  onDeleteRecord?: (id: string, patientName: string) => void;
}

export const DischargeHistoryModal: React.FC<DischargeHistoryModalProps> = ({
  isOpen,
  onClose,
  dischargeHistory,
  onSelectForReAdmit,
  onDeleteRecord,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = dischargeHistory.filter(
    item =>
      item.hoTenBn.toLowerCase().includes(search.toLowerCase()) ||
      item.giuongCu.toLowerCase().includes(search.toLowerCase()) ||
      item.ghiChu.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shadow-2xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Bộ Nhớ Lịch Sử Xuất Viện
              </h3>
              <p className="text-[11px] text-slate-500">
                Tự động lưu trữ danh sách [Họ tên, Giường cũ, Thời gian/Ghi chú] để kiểm tra cảnh báo tái nhập viện
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

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm bệnh nhân đã xuất viện theo tên hoặc giường cũ..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
            />
          </div>
        </div>

        {/* Records Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p className="text-xs">Chưa có hồ sơ xuất viện nào phù hợp.</p>
            </div>
          ) : (
            filtered.map(record => (
              <div
                key={record.id}
                className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-amber-400 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                      {record.hoTenBn}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-mono text-[10px] font-bold border border-amber-300">
                      Giường cũ: {record.giuongCu}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {record.thoiGian}
                    </span>
                    {record.ghiChu && (
                      <span className="italic text-slate-600 max-w-xs truncate">
                        • {record.ghiChu}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectForReAdmit(record.hoTenBn);
                      onClose();
                    }}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    title="Cấp lại giường cho bệnh nhân này (sẽ kích hoạt cảnh báo màu cam)"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Cấp Giường</span>
                  </button>

                  {onDeleteRecord && (
                    <button
                      onClick={() => onDeleteRecord(record.id, record.hoTenBn)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition-colors"
                      title={`Xóa ${record.hoTenBn} khỏi lịch sử xuất viện`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1 text-amber-900 text-[11px] font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Có thể xóa bằng nút thùng rác hoặc bằng lệnh chat: "Xóa [Tên BN] khỏi lịch sử xuất viện".
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs self-end sm:self-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
