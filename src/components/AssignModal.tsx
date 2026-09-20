import React, { useState, useEffect } from 'react';
import { Bed, OccupancyType, DischargeRecord } from '../types';
import { X, Check, BedDouble, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { validateBedAssignment, normalizeName } from '../utils/bedManagement';

interface AssignModalProps {
  bed: Bed | null;
  allBeds: Bed[];
  dischargeHistory: DischargeRecord[];
  initialPatientName?: string;
  onClose: () => void;
  onAssign: (bedId: string, patientName: string, occupancyType: OccupancyType, nextBedId?: string) => void;
  onTriggerAlert: (
    result: any,
    targetBedId: string,
    patientName: string,
    occupancyType: OccupancyType,
    nextBedId?: string
  ) => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  bed,
  allBeds,
  dischargeHistory,
  initialPatientName = '',
  onClose,
  onAssign,
  onTriggerAlert,
}) => {
  const [patientName, setPatientName] = useState(initialPatientName);
  const [occupancyType, setOccupancyType] = useState<OccupancyType>('Chính thức');
  const [nextBedId, setNextBedId] = useState('');
  const [isForce, setIsForce] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialPatientName) {
      setPatientName(initialPatientName);
    }
  }, [initialPatientName]);

  if (!bed) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = patientName.trim();
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập họ và tên bệnh nhân');
      return;
    }

    if (occupancyType === 'Nằm tạm' && !nextBedId.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập mã giường ngày mai sẽ chuyển sang');
      return;
    }

    const normName = normalizeName(trimmedName);

    // 4-step validation (passes forceAssign option if isForce checked)
    const check = validateBedAssignment(allBeds, dischargeHistory, bed.maGiuong, normName, {
      forceAssign: isForce,
    });

    if (check.type !== 'PASSED') {
      onTriggerAlert(check, bed.maGiuong, normName, occupancyType, nextBedId.trim().toUpperCase() || undefined);
      return;
    }

    // Direct assign if PASSED
    onAssign(bed.maGiuong, normName, occupancyType, nextBedId.trim().toUpperCase() || undefined);
    onClose();
  };

  const availableOtherBeds = allBeds.filter(b => b.maGiuong !== bed.maGiuong && b.trangThai === 'Trống');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Cấp Giường: {bed.maGiuong}
              </h3>
              <p className="text-[11px] text-slate-500">
                Phòng: {bed.tenPhong} ({bed.khuVuc})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {bed.khoaXuatVienHomNay && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">⚠️ Giường đã khóa xuất viện trong ngày</p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Bệnh nhân <span className="font-semibold">{bed.benhNhanVuaXuatVien || 'trước'}</span> vừa làm thủ tục xuất viện hôm nay. Theo quy định an toàn y tế và thanh toán viện phí, giường này bị khóa không cấp mới.
                </p>
                <label className="inline-flex items-center gap-2 mt-1 font-bold text-rose-800 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isForce}
                    onChange={e => setIsForce(e.target.checked)}
                    className="rounded border-amber-400 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Bắt buộc cấp cưỡng bức (Vượt qua khóa)</span>
                </label>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Họ và tên bệnh nhân <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="VD: NGUYỄN VĂN A"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none uppercase font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Loại hình nằm điều trị
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOccupancyType('Chính thức')}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                  occupancyType === 'Chính thức'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🔴 Chính Thức
              </button>

              <button
                type="button"
                onClick={() => setOccupancyType('Nằm tạm')}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                  occupancyType === 'Nằm tạm'
                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>🟡 Nằm Tạm</span>
              </button>
            </div>
          </div>

          {occupancyType === 'Nằm tạm' && (
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-300 space-y-2 animate-in fade-in duration-100">
              <label className="block text-xs font-bold text-amber-950">
                Ngày mai dự kiến sang giường nào? <span className="text-rose-600">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nextBedId}
                  onChange={e => setNextBedId(e.target.value.toUpperCase())}
                  placeholder="VD: H010"
                  className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase font-bold"
                />
                <select
                  onChange={e => setNextBedId(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">Chọn giường trống...</option>
                  {availableOtherBeds.slice(0, 15).map(b => (
                    <option key={b.maGiuong} value={b.maGiuong}>
                      {b.maGiuong} ({b.tenPhong})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-amber-900 font-medium">
                Trạng thái giường sẽ hiển thị: 🟡 [{bed.maGiuong}]: [Tên BN] [TẠM - Mai sang {nextBedId || '...'}]
              </p>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            🛡️ <strong className="text-slate-800">Hệ thống sẽ tự động quét:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
              <li>Kiểm tra xem bệnh nhân đã từng xuất viện chưa</li>
              <li>Kiểm tra trùng giường (giường đã có người)</li>
              <li>Kiểm tra bệnh nhân đang nằm ở giường khác</li>
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tiến Hành Cấp Giường</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
