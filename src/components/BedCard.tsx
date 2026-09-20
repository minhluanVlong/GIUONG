import React from 'react';
import { Bed } from '../types';
import { User, Clock, ArrowRight, LogOut, PlusCircle } from 'lucide-react';

interface BedCardProps {
  bed: Bed;
  onSelectBed: (bed: Bed) => void;
  onQuickDischarge: (bed: Bed) => void;
  onQuickAssign: (bed: Bed) => void;
}

export const BedCard: React.FC<BedCardProps> = ({
  bed,
  onSelectBed,
  onQuickDischarge,
  onQuickAssign,
}) => {
  const isAvailable = bed.trangThai === 'Trống';
  const isLocked = isAvailable && bed.khoaXuatVienHomNay;
  const isTemp = bed.loaiNam === 'Nằm tạm' && !isAvailable;

  return (
    <div
      onClick={() => onSelectBed(bed)}
      className={`group relative rounded-xl p-3 transition-all duration-150 cursor-pointer border text-left flex flex-col justify-between min-h-[96px] shadow-2xs ${
        !isAvailable
          ? isTemp
            ? 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 hover:border-amber-400'
            : 'bg-rose-50/60 hover:bg-rose-100/80 border-rose-200 hover:border-rose-400'
          : isLocked
          ? 'bg-amber-50/70 hover:bg-amber-100/90 border-amber-300 hover:border-amber-400'
          : 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 hover:border-emerald-400'
      }`}
    >
      {/* Top row: Bed Code and Status Badge */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              !isAvailable
                ? isTemp
                  ? 'bg-amber-500 ring-2 ring-amber-200'
                  : 'bg-rose-600 ring-2 ring-rose-200'
                : isLocked
                ? 'bg-amber-500 ring-2 ring-amber-200'
                : 'bg-emerald-600 ring-2 ring-emerald-200'
            }`}
          />
          <span
            className={`font-mono font-bold text-xs sm:text-sm tracking-wide ${
              !isAvailable
                ? isTemp
                  ? 'text-amber-950'
                  : 'text-slate-900'
                : isLocked
                ? 'text-amber-950'
                : 'text-emerald-950'
            }`}
          >
            {bed.maGiuong}
          </span>
        </div>

        {isAvailable ? (
          isLocked ? (
            <span
              className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300"
              title="Khóa xuất viện trong ngày (khử khuẩn / viện phí)"
            >
              Khóa XV
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Trống
            </span>
          )
        ) : isTemp ? (
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-amber-700" /> Nằm tạm
          </span>
        ) : (
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            Có người
          </span>
        )}
      </div>

      {/* Middle: Patient Name or Empty / Locked Prompt */}
      <div className="my-1.5">
        {!isAvailable ? (
          <div>
            <p className="text-xs font-bold text-slate-900 uppercase truncate" title={bed.hoTenBn}>
              {bed.hoTenBn}
            </p>
            {isTemp && (
              <p className="text-[10px] text-amber-900 font-semibold flex items-center gap-1 mt-0.5">
                <span>Mai sang:</span>
                <span className="px-1 py-0.2 rounded bg-amber-200/80 font-mono font-bold text-amber-950 border border-amber-300">
                  {bed.giuongHomSau || 'Chưa định'}
                </span>
              </p>
            )}
          </div>
        ) : isLocked ? (
          <div>
            <p className="text-[11px] text-amber-900 font-semibold truncate" title={`Vừa XV: ${bed.benhNhanVuaXuatVien}`}>
              Vừa XV: {bed.benhNhanVuaXuatVien || 'Bệnh nhân'}
            </p>
            <p className="text-[10px] text-amber-700 italic">Khóa khử khuẩn</p>
          </div>
        ) : (
          <p className="text-[11px] text-emerald-700 font-medium italic flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sẵn sàng tiếp nhận
          </p>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
        <span className="truncate font-mono text-slate-400 font-medium">{bed.phongCode}</span>

        {isAvailable ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAssign(bed);
            }}
            className={`inline-flex items-center gap-1 font-bold hover:underline transition-colors ${
              isLocked ? 'text-amber-800 hover:text-amber-950' : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <PlusCircle className="w-3 h-3" /> {isLocked ? 'Cấp (Khóa)' : 'Cấp giường'}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickDischarge(bed);
            }}
            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-bold hover:underline transition-colors"
          >
            <LogOut className="w-3 h-3" /> Xuất viện
          </button>
        )}
      </div>
    </div>
  );
};
