import React from 'react';
import { AlertTriangle, XCircle, ArrowRight, X } from 'lucide-react';
import { CheckResult, OccupancyType } from '../types';

interface AlertModalProps {
  alertData: {
    result: CheckResult;
    targetBedId: string;
    patientName: string;
    occupancyType: OccupancyType;
    nextBedId?: string;
  } | null;
  onClose: () => void;
  onConfirmReAdmit: () => void;
  onConfirmTransfer: (oldBedId: string, targetBedId: string, patientName: string) => void;
  onForceAssign?: (targetBedId: string, patientName: string, occupancyType: OccupancyType, nextBedId?: string) => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  alertData,
  onClose,
  onConfirmReAdmit,
  onConfirmTransfer,
  onForceAssign,
}) => {
  if (!alertData) return null;

  const { result, targetBedId, patientName, occupancyType, nextBedId } = alertData;

  const isLockedError = result.type === 'LOCKED_SAME_DAY_ERROR';
  const isOccupiedError = result.type === 'OCCUPIED_ERROR';
  const isBlockingError = isLockedError || isOccupiedError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isBlockingError
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
            {isLockedError ? (
              <>
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>LỖI KHÓA GIƯỜNG (XUẤT VIỆN TRONG NGÀY)</span>
              </>
            ) : isOccupiedError ? (
              <>
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>LỖI TRÙNG GIƯỜNG (BẮT BUỘC TỪ CHỐI)</span>
              </>
            ) : result.type === 'DISCHARGED_WARNING' ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>CẢNH BÁO BỆNH NHÂN ĐÃ XUẤT VIỆN</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>CẢNH BÁO BỆNH NHÂN ĐANG NẰM GIƯỜNG KHÁC</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
              isBlockingError
                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            {isLockedError && (
              <div>
                <p className="font-bold text-rose-900 mb-2">
                  ❌ LỖI KHÓA GIƯỜNG: Giường <span className="font-mono underline">{result.targetBedId}</span> hôm nay đã có bệnh nhân (<span className="font-bold">{result.dischargedPatient}</span>) vừa làm thủ tục xuất viện.
                </p>
                <p className="text-slate-700 text-xs leading-relaxed">
                  Không được cấp giường này cho bệnh nhân mới trong ngày hôm nay để đảm bảo khử khuẩn và quy chế thanh toán viện phí! Vui lòng chọn giường khác.
                </p>
                {result.dischargedAt && (
                  <p className="text-slate-500 text-[11px] mt-1.5 italic">
                    Thời gian xuất viện: {result.dischargedAt}
                  </p>
                )}
              </div>
            )}

            {isOccupiedError && (
              <div>
                <p className="font-bold text-rose-900 mb-2">
                  ❌ LỖI TRÙNG GIƯỜNG: Giường <span className="font-mono underline">{result.targetBedId}</span> hiện đang có bệnh nhân <span className="font-bold">{result.currentPatient}</span> nằm.
                </p>
                <p className="text-slate-600 text-xs">
                  Vui lòng chọn giường khác hoặc làm thủ tục xuất viện/chuyển giường cho bệnh nhân cũ trước khi gán mới!
                </p>
              </div>
            )}

            {result.type === 'DISCHARGED_WARNING' && (
              <div>
                <p className="font-bold text-amber-950 mb-2">
                  ⚠️ CẢNH BÁO: Bệnh nhân <span className="font-bold underline">{result.patientName}</span> đã từng điều trị và xuất viện trước đó (giường cũ: <span className="font-mono">{result.oldBedId}</span>).
                </p>
                <p className="text-slate-600 text-xs">
                  Bạn có chắc chắn muốn làm thủ tục <strong className="text-slate-900 font-bold">TÁI NHẬP VIỆN / CẤP LẠI GIƯỜNG MỚI</strong> ({targetBedId}) cho bệnh nhân này không?
                </p>
              </div>
            )}

            {result.type === 'ANOTHER_BED_WARNING' && (
              <div>
                <p className="font-bold text-amber-950 mb-2">
                  ⚠️ CẢNH BÁO: Bệnh nhân <span className="font-bold underline">{result.patientName}</span> hiện đang nằm ở giường <span className="font-mono text-blue-900 font-bold">{result.oldBedId}</span>.
                </p>
                <p className="text-slate-600 text-xs">
                  Bạn có muốn <strong className="text-slate-900 font-bold">CHUYỂN GIƯỜNG</strong> từ <span className="font-mono font-bold text-amber-900">{result.oldBedId}</span> sang giường <span className="font-mono font-bold text-emerald-800">{result.targetBedId}</span> không?
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Mã giường đích:</span>
              <span className="font-mono font-bold text-slate-900">{targetBedId}</span>
            </div>
            <div className="flex justify-between">
              <span>Bệnh nhân chỉ định:</span>
              <span className="font-bold text-slate-900">{patientName}</span>
            </div>
            {occupancyType && (
              <div className="flex justify-between">
                <span>Hình thức:</span>
                <span className="font-semibold text-slate-800">{occupancyType}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          {isLockedError ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
              >
                Đóng (Chọn Giường Khác)
              </button>
              {onForceAssign && (
                <button
                  onClick={() => {
                    onForceAssign(targetBedId, patientName, occupancyType, nextBedId);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Cấp cưỡng bức vượt qua kiểm tra khóa giường xuất viện trong ngày"
                >
                  <span>Bắt Buộc Cấp Cưỡng Bức</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : isOccupiedError ? (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
            >
              Đã hiểu, đóng thông báo
            </button>
          ) : result.type === 'DISCHARGED_WARNING' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={onConfirmReAdmit}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Xác Nhận Tái Nhập Viện</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  if (result.type === 'ANOTHER_BED_WARNING') {
                    onConfirmTransfer(result.oldBedId, result.targetBedId, result.patientName);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Xác Nhận Chuyển Giường</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
