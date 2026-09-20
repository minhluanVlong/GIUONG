import React, { useState, useMemo } from 'react';
import { Bed } from '../types';
import { BedCard } from './BedCard';
import { groupBedsByRoom } from '../utils/bedManagement';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface BedGridProps {
  beds: Bed[];
  onSelectBed: (bed: Bed) => void;
  onQuickDischarge: (bed: Bed) => void;
  onQuickAssign: (bed: Bed) => void;
}

export const BedGrid: React.FC<BedGridProps> = ({
  beds,
  onSelectBed,
  onQuickDischarge,
  onQuickAssign,
}) => {
  const [selectedZone, setSelectedZone] = useState<'ALL' | 'KHU NỘI NHI' | 'KHU LÂY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'TEMP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBeds = useMemo(() => {
    return beds.filter(bed => {
      // Zone filter
      if (selectedZone !== 'ALL' && bed.khuVuc !== selectedZone) {
        return false;
      }

      // Status filter
      if (statusFilter === 'AVAILABLE' && bed.trangThai !== 'Trống') {
        return false;
      }
      if (statusFilter === 'OCCUPIED' && bed.trangThai !== 'Có người') {
        return false;
      }
      if (statusFilter === 'TEMP' && (bed.loaiNam !== 'Nằm tạm' || bed.trangThai === 'Trống')) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchBedId = bed.maGiuong.toLowerCase().includes(query);
        const matchPatient = bed.hoTenBn.toLowerCase().includes(query);
        const matchRoom = bed.tenPhong.toLowerCase().includes(query) || bed.phongCode.toLowerCase().includes(query);
        if (!matchBedId && !matchPatient && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [beds, selectedZone, statusFilter, searchQuery]);

  // Group filtered beds by room while retaining room header context
  const roomGroups = useMemo(() => {
    return groupBedsByRoom(filteredBeds);
  }, [filteredBeds]);

  // Count summaries for tabs
  const countNoiNhi = beds.filter(b => b.khuVuc === 'KHU NỘI NHI').length;
  const countNoiNhiAvailable = beds.filter(b => b.khuVuc === 'KHU NỘI NHI' && b.trangThai === 'Trống').length;

  const countLay = beds.filter(b => b.khuVuc === 'KHU LÂY').length;
  const countLayAvailable = beds.filter(b => b.khuVuc === 'KHU LÂY' && b.trangThai === 'Trống').length;

  return (
    <div className="space-y-4">
      {/* Control / Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Zone Switcher Tabs */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setSelectedZone('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedZone === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Toàn viện (93)</span>
            </button>

            <button
              onClick={() => setSelectedZone('KHU NỘI NHI')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedZone === 'KHU NỘI NHI'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Khu Nội Nhi (50)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-emerald-700 font-mono font-bold border border-slate-200">
                {countNoiNhiAvailable} trống
              </span>
            </button>

            <button
              onClick={() => setSelectedZone('KHU LÂY')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedZone === 'KHU LÂY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Khu Nhiễm / Lây (43)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-emerald-700 font-mono font-bold border border-slate-200">
                {countLayAvailable} trống
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Mã giường, Tên BN, Tên phòng..."
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sub-Filters: Status Badges */}
        <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-200 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <Filter className="w-3 h-3" /> Lọc trạng thái:
          </span>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Tất cả ({filteredBeds.length})
          </button>

          <button
            onClick={() => setStatusFilter('AVAILABLE')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'AVAILABLE'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>🟢 Còn trống ({beds.filter(b => b.trangThai === 'Trống').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('OCCUPIED')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'OCCUPIED'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>🔴 Có người ({beds.filter(b => b.trangThai === 'Có người').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('TEMP')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'TEMP'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>🟡 Nằm tạm ({beds.filter(b => b.loaiNam === 'Nằm tạm' && b.trangThai === 'Có người').length})</span>
          </button>
        </div>
      </div>

      {/* Room Group Cards */}
      {roomGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-xs">
          <p className="text-sm">Không tìm thấy giường bệnh phù hợp với bộ lọc hiện tại.</p>
          <button
            onClick={() => {
              setSelectedZone('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs"
          >
            Bỏ toàn bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {roomGroups.map(room => (
            <div
              key={room.phongCode}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
            >
              {/* Room Header according to user specification */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏥</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
                    {room.tenPhong}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    (Còn {room.availableBeds}/{room.totalBeds} giường trống)
                  </span>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wide ${
                      room.availableBeds === 0
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {room.statusText}
                  </span>
                </div>
              </div>

              {/* Beds Grid for this room */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2.5">
                {room.beds.map(bed => (
                  <BedCard
                    key={bed.maGiuong}
                    bed={bed}
                    onSelectBed={onSelectBed}
                    onQuickDischarge={onQuickDischarge}
                    onQuickAssign={onQuickAssign}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
