import React, { useState, useMemo } from 'react';
import { Bed, DischargeRecord } from '../types';
import {
  exportOccupiedPatientsCSV,
  exportAllBedsCSV,
  exportDischargeHistoryCSV,
  generatePatientsTSV,
} from '../utils/exportUtils';
import {
  X,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Search,
  Printer,
  Users,
  BedDouble,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

interface DownloadPatientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  beds: Bed[];
  dischargeHistory: DischargeRecord[];
}

export const DownloadPatientListModal: React.FC<DownloadPatientListModalProps> = ({
  isOpen,
  onClose,
  beds,
  dischargeHistory,
}) => {
  const [viewMode, setViewMode] = useState<'OCCUPIED_ONLY' | 'ALL_BEDS'>('OCCUPIED_ONLY');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'KHU NỘI NHI' | 'KHU LÂY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const occupiedBeds = useMemo(() => beds.filter(b => b.trangThai === 'Có người'), [beds]);
  const tempBeds = useMemo(() => beds.filter(b => b.trangThai === 'Có người' && b.loaiNam === 'Nằm tạm'), [beds]);
  const availableBeds = useMemo(() => beds.filter(b => b.trangThai === 'Trống' && !b.khoaXuatVienHomNay), [beds]);
  const lockedBeds = useMemo(() => beds.filter(b => b.trangThai === 'Trống' && b.khoaXuatVienHomNay), [beds]);

  // Filtered rows for live preview table
  const displayedBeds = useMemo(() => {
    let list = viewMode === 'OCCUPIED_ONLY' ? occupiedBeds : beds;

    if (zoneFilter !== 'ALL') {
      list = list.filter(b => b.khuVuc === zoneFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        b =>
          b.maGiuong.toLowerCase().includes(q) ||
          b.hoTenBn.toLowerCase().includes(q) ||
          b.tenPhong.toLowerCase().includes(q)
      );
    }

    return list;
  }, [beds, occupiedBeds, viewMode, zoneFilter, searchQuery]);

  if (!isOpen) return null;

  const handleCopyTSV = () => {
    const tsv = generatePatientsTSV(beds, viewMode === 'OCCUPIED_ONLY');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                TẢI VỀ DANH SÁCH BỆNH NHÂN THEO GIƯỜNG
              </h2>
              <p className="text-xs text-slate-300">
                Xuất file Excel CSV (Unicode UTF-8 chuẩn), đồng bộ theo 93 giường bệnh và 2 phân khu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Export Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Bệnh nhân đang nằm */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Khuyên Dùng Giao Ban
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {occupiedBeds.length} Bệnh nhân
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">DS Bệnh Nhân Đang Nằm</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chỉ gồm các giường đang có người điều trị, kèm loại nằm và phòng điều trị.
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportOccupiedPatientsCSV(beds)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File Excel (.CSV UTF-8)</span>
              </button>
            </div>

            {/* Card 2: Toàn bộ 93 Giường (Sheet PHÒNG) */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-all">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    Sheet "PHÒNG"
                  </span>
                  <span className="text-sm font-extrabold text-blue-700">
                    93 Giường (H001 - H093)
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Toàn Bộ 93 Giường Bệnh</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đầy đủ thông tin giường trống ({availableBeds.length}), có người ({occupiedBeds.length}) và khóa XV ({lockedBeds.length}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportAllBedsCSV(beds)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Tải Toàn Bộ Giường (.CSV)</span>
              </button>
            </div>

            {/* Card 3: Tiện ích Sao chép & In ấn */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    Công Cụ Nhanh
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Sheet XV: {dischargeHistory.length} BN
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Dán Excel / In Ấn</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sao chép bảng để dán trực tiếp vào Google Sheets hoặc in báo cáo giao ban.
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyTSV}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép!' : 'Chép bảng'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportDischargeHistoryCSV(dischargeHistory)}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors"
                  title="Tải Sheet Xuất Viện"
                >
                  <Download className="w-3.5 h-3.5 text-amber-700" />
                  <span>Sheet XV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls for Preview Table */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Tabs */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('OCCUPIED_ONLY')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  viewMode === 'OCCUPIED_ONLY'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chỉ BN Đang Nằm ({occupiedBeds.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ALL_BEDS')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  viewMode === 'ALL_BEDS'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất Cả 93 Giường
              </button>
            </div>

            {/* Zone Filter */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setZoneFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-md font-semibold ${
                  zoneFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Tất cả khu
              </button>
              <button
                type="button"
                onClick={() => setZoneFilter('KHU NỘI NHI')}
                className={`px-2.5 py-1.5 rounded-md font-semibold ${
                  zoneFilter === 'KHU NỘI NHI' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Khu Nội Nhi (50)
              </button>
              <button
                type="button"
                onClick={() => setZoneFilter('KHU LÂY')}
                className={`px-2.5 py-1.5 rounded-md font-semibold ${
                  zoneFilter === 'KHU LÂY' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Khu Lây (43)
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên BN, mã giường, phòng..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs inline-flex items-center gap-1 font-semibold"
              title="In danh sách này"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In</span>
            </button>
          </div>
        </div>

        {/* Table Content Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 w-24">MÃ GIƯỜNG</th>
                  <th className="py-2.5 px-3 w-40">PHÒNG</th>
                  <th className="py-2.5 px-3 w-32">KHU VỰC</th>
                  <th className="py-2.5 px-3">HỌ VÀ TÊN BỆNH NHÂN</th>
                  <th className="py-2.5 px-3 w-32">TRẠNG THÁI</th>
                  <th className="py-2.5 px-3 w-28">LOẠI NẰM</th>
                  <th className="py-2.5 px-3">GHI CHÚ / KẾ HOẠCH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedBeds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      Không tìm thấy giường hoặc bệnh nhân nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  displayedBeds.map((bed, index) => {
                    const isOccupied = bed.trangThai === 'Có người';
                    const isLocked = bed.trangThai === 'Trống' && bed.khoaXuatVienHomNay;
                    const isTemp = isOccupied && bed.loaiNam === 'Nằm tạm';

                    return (
                      <tr
                        key={bed.maGiuong}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isOccupied ? 'bg-white' : isLocked ? 'bg-amber-50/40' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-500 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {bed.maGiuong}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">
                          {bed.tenPhong}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                              bed.khuVuc === 'KHU NỘI NHI'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {bed.khuVuc}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {bed.hoTenBn ? (
                            <span className="text-slate-900">{bed.hoTenBn}</span>
                          ) : (
                            <span className="text-slate-400 italic font-normal">
                              {isLocked ? '(Đang khử khuẩn - BN vừa XV)' : '(Chưa có bệnh nhân)'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {isOccupied ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              Có người
                            </span>
                          ) : isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              Khóa XV hôm nay
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Trống khả dụng
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {isOccupied ? (
                            isTemp ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-700" />
                                Nằm tạm
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Chính thức
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {bed.giuongHomSau ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                              ➡️ Mai sang: {bed.giuongHomSau}
                            </span>
                          ) : bed.ghiChu ? (
                            <span>{bed.ghiChu}</span>
                          ) : isLocked ? (
                            <span className="text-amber-700 italic text-[11px]">
                              Khóa khử khuẩn đến hết ngày
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Hiển thị <strong>{displayedBeds.length}</strong> dòng
            </span>
            <span>•</span>
            <span>
              Tổng BN nội trú: <strong>{occupiedBeds.length}</strong> / 93 giường
            </span>
            {tempBeds.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-800 font-semibold">
                  {tempBeds.length} giường nằm tạm
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-700 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => exportOccupiedPatientsCSV(beds)}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Excel Danh Sách BN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
