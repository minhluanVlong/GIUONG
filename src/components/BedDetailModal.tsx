import React, { useState } from 'react';
import { Bed } from '../types';
import {
  X,
  BedDouble,
  LogOut,
  ArrowRightLeft,
  User,
  Clock,
  CheckCircle2,
  Building2,
  PlusCircle,
  AlertTriangle,
  Unlock,
} from 'lucide-react';

interface BedDetailModalProps {
  bed: Bed | null;
  allBeds: Bed[];
  onClose: () => void;
  onOpenAssign: (bed: Bed) => void;
  onDischarge: (bedId: string, note?: string) => void;
  onTransfer: (oldBedId: string, targetBedId: string, patientName: string) => void;
  onUnlockBed?: (bedId: string) => void;
}

export const BedDetailModal: React.FC<BedDetailModalProps> = ({
  bed,
  allBeds,
  onClose,
  onOpenAssign,
  onDischarge,
  onTransfer,
  onUnlockBed,
}) => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedTargetBed, setSelectedTargetBed] = useState('');
  const [dischargeNote, setDischargeNote] = useState('Xuất viện hoàn thành điều trị');

  if (!bed) return null;

  const isAvailable = bed.trangThai === 'Trống';
  const isLocked = isAvailable && bed.khoaXuatVienHomNay;
  const isTemp = bed.loaiNam === 'Nằm tạm' && !isAvailable;
  const availableBeds = allBeds.filter(b => b.maGiuong !== bed.maGiuong && b.trangThai === 'Trống' && !b.khoaXuatVienHomNay);

  const handleDischargeConfirm = () => {
    onDischarge(bed.maGiuong, dischargeNote);
    onClose();
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetBed) return;
    onTransfer(bed.maGiuong, selectedTargetBed, bed.hoTenBn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                !isAvailable
                  ? isTemp
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                  : isLocked
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Giường: {bed.maGiuong}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    !isAvailable
                      ? isTemp
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                      : isLocked
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {!isAvailable ? (isTemp ? 'Nằm Tạm' : 'Có Người') : isLocked ? 'Khóa Xuất Viện' : 'Trống'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {bed.tenPhong} • {bed.khuVuc}
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

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isAvailable ? (
            <div className="space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Bệnh nhân điều trị:</span>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {bed.hoTenBn}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Loại lưu trú:</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {bed.loaiNam}
                  </span>
                </div>
                {isTemp && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-amber-900 text-xs font-medium">
                    <span>Giường ngày mai sang:</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-950">
                      {bed.giuongHomSau || 'Chưa chỉ định'}
                    </span>
                  </div>
                )}
              </div>

              {/* Transfer Mode UI */}
              {isTransferring ? (
                <form onSubmit={handleTransferSubmit} className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">
                      Chọn giường mới để chuyển sang:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTransferring(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Hủy chuyển
                    </button>
                  </div>
                  <select
                    required
                    value={selectedTargetBed}
                    onChange={e => setSelectedTargetBed(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="">-- Chọn giường trống ({availableBeds.length} giường khả dụng) --</option>
                    {availableBeds.map(b => (
                      <option key={b.maGiuong} value={b.maGiuong}>
                        {b.maGiuong} - {b.tenPhong} ({b.khuVuc})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!selectedTargetBed}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Xác Nhận Chuyển Bệnh Nhân
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setIsTransferring(true)}
                    className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300 transition-colors shadow-2xs"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chuyển Giường</span>
                  </button>

                  <button
                    onClick={handleDischargeConfirm}
                    className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-200 transition-colors shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Xuất Viện BN</span>
                  </button>
                </div>
              )}
            </div>
          ) : isLocked ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Giường Khóa Xuất Viện Trong Ngày</span>
                </div>
                <div className="text-xs space-y-1 pt-1 text-slate-700 border-t border-amber-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bệnh nhân vừa xuất viện:</span>
                    <span className="font-bold text-slate-900 uppercase">{bed.benhNhanVuaXuatVien}</span>
                  </div>
                  {bed.thoiGianXuatVienHomNay && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thời gian xuất viện:</span>
                      <span className="font-mono text-slate-800">{bed.thoiGianXuatVienHomNay}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mục đích khóa:</span>
                    <span className="text-amber-900 font-semibold">Khử khuẩn & Viện phí</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onOpenAssign(bed);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Cấp Giường Này (Kiểm Tra Quy Tắc)</span>
                </button>

                {onUnlockBed && (
                  <button
                    onClick={() => {
                      onUnlockBed(bed.maGiuong);
                      onClose();
                    }}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-300"
                    title="Mở khóa giường thủ công sau khi hoàn tất khử khuẩn"
                  >
                    <Unlock className="w-3.5 h-3.5 text-slate-600" />
                    <span>Mở Khóa Giường (Đã Khử Khuẩn)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Giường {bed.maGiuong} hiện đang trống
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bạn có thể cấp giường này cho bệnh nhân mới hoặc xếp nằm tạm.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAssign(bed);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cấp Giường Cho Bệnh Nhân</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
