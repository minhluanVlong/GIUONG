import React, { useState } from 'react';
import { Bed, DischargeRecord, SyncPayloadLog } from '../types';
import {
  Table,
  FileSpreadsheet,
  X,
  Copy,
  Check,
  Download,
  Code2,
  ListOrdered,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  beds: Bed[];
  dischargeHistory: DischargeRecord[];
  syncLogs: SyncPayloadLog[];
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  beds,
  dischargeHistory,
  syncLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'PHONG' | 'XUAT_VIEN' | 'LOGS' | 'APPS_SCRIPT'>('PHONG');
  const [filterText, setFilterText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate TSV for Sheet "PHÒNG" (pasteable directly into Google Sheets)
  const getPhongTSV = () => {
    const headers = ['STT', 'HỌ VÀ TÊN', 'GIƯỜNG', 'PHÒNG', 'KHU VỰC', 'TRẠNG THÁI', 'GHI CHÚ'];
    const rows = beds.map((b, idx) => [
      idx + 1,
      b.hoTenBn || '',
      b.maGiuong,
      b.tenPhong,
      b.khuVuc,
      b.trangThai === 'Có người'
        ? b.loaiNam === 'Nằm tạm'
          ? 'Nằm tạm'
          : 'Có người'
        : b.khoaXuatVienHomNay
        ? 'Khóa xuất viện'
        : 'Trống',
      b.giuongHomSau ? `Ngày mai sang ${b.giuongHomSau}` : b.ghiChu || '',
    ]);
    return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
  };

  // Generate TSV for Sheet "XUẤT VIỆN"
  const getXuatVienTSV = () => {
    const headers = ['MÃ GIƯỜNG', 'TÊN BỆNH NHÂN', 'NGÀY GIỜ XUẤT VIỆN', 'GHI CHÚ'];
    const rows = dischargeHistory.map(d => [
      d.giuongCu,
      d.hoTenBn,
      d.thoiGian,
      d.ghiChu || 'Xuất viện',
    ]);
    return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
  };

  const sampleAppsScriptCode = `/**
 * Google Apps Script Webhook đồng bộ tự động 2 Sheet
 * Dán vào: Google Sheets -> Tiện ích mở rộng -> Apps Script -> Triển khai dưới dạng Ứng dụng web
 */
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetPhong = ss.getSheetByName("PHÒNG");
  var sheetXuatVien = ss.getSheetByName("XUẤT VIỆN");
  
  if (!sheetPhong || !sheetXuatVien) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Vui lòng tạo đủ 2 Sheet: 'PHÒNG' và 'XUẤT VIỆN'"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  
  if (action === "ASSIGN_BED") {
    // Cập nhật Cột B (HỌ VÀ TÊN) tại Cột C (GIƯỜNG)
    var bedId = data.bedId;
    var patientName = data.patientName;
    var values = sheetPhong.getRange("C2:C94").getValues();
    for (var i = 0; i < values.length; i++) {
      if (values[i][0] === bedId) {
        sheetPhong.getRange(i + 2, 2).setValue(patientName); // Cột B
        break;
      }
    }
  } else if (action === "DISCHARGE") {
    var bedId = data.bedId;
    var patientName = "";
    var values = sheetPhong.getRange("C2:C94").getValues();
    for (var i = 0; i < values.length; i++) {
      if (values[i][0] === bedId) {
        patientName = sheetPhong.getRange(i + 2, 2).getValue();
        sheetPhong.getRange(i + 2, 2).setValue(""); // Xóa tên ở Sheet PHÒNG
        break;
      }
    }
    // Ghi vào Sheet XUẤT VIỆN: [MÃ GIƯỜNG, TÊN BỆNH NHÂN, NGÀY GIỜ, GHI CHÚ]
    var now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm");
    sheetXuatVien.appendRow([bedId, patientName, now, data.note || "Xuất viện"]);
  } else if (action === "DELETE_DISCHARGE_HISTORY") {
    var pName = (data.patientName || "").trim().toUpperCase();
    var lastRow = sheetXuatVien.getLastRow();
    if (lastRow >= 2) {
      var vals = sheetXuatVien.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var j = vals.length - 1; j >= 0; j--) {
        if ((vals[j][0] + "").trim().toUpperCase() === pName) {
          sheetXuatVien.deleteRow(j + 2);
        }
      }
    }
  } else if (action === "TRANSFER_BED") {
    var oldBed = data.oldBedId;
    var newBed = data.targetBedId;
    var pName = data.patientName;
    var values = sheetPhong.getRange("C2:C94").getValues();
    for (var i = 0; i < values.length; i++) {
      if (values[i][0] === oldBed) {
        sheetPhong.getRange(i + 2, 2).setValue("");
      }
      if (values[i][0] === newBed) {
        sheetPhong.getRange(i + 2, 2).setValue(pName);
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    action: action
  })).setMimeType(ContentService.MimeType.JSON);
}`;

  const filteredBeds = beds.filter(
    b =>
      b.maGiuong.toLowerCase().includes(filterText.toLowerCase()) ||
      b.hoTenBn.toLowerCase().includes(filterText.toLowerCase()) ||
      b.tenPhong.toLowerCase().includes(filterText.toLowerCase()) ||
      b.khuVuc.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredDischarge = dischargeHistory.filter(
    d =>
      d.hoTenBn.toLowerCase().includes(filterText.toLowerCase()) ||
      d.giuongCu.toLowerCase().includes(filterText.toLowerCase()) ||
      d.thoiGian.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  ĐỒNG BỘ 2 SHEET GOOGLE SHEETS
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Chuẩn Cấu Trúc
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Sheet 1: "PHÒNG" (Cột B: Họ tên, Cột C: Giường H001-H093) • Sheet 2: "XUẤT VIỆN" (Cột A: Giường, B: Tên, C: Ngày giờ, D: Ghi chú)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('PHONG')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                activeTab === 'PHONG'
                  ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Sheet "PHÒNG" (93 Giường)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {beds.filter(b => b.trangThai === 'Có người').length}/93
              </span>
            </button>

            <button
              onClick={() => setActiveTab('XUAT_VIEN')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                activeTab === 'XUAT_VIEN'
                  ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ListOrdered className="w-4 h-4 text-amber-600" />
              <span>Sheet "XUẤT VIỆN"</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {dischargeHistory.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                activeTab === 'LOGS'
                  ? 'bg-white text-blue-800 border-t-2 border-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Send className="w-4 h-4 text-blue-600" />
              <span>Gói JSON Đồng Bộ ({syncLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('APPS_SCRIPT')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                activeTab === 'APPS_SCRIPT'
                  ? 'bg-white text-purple-800 border-t-2 border-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Code2 className="w-4 h-4 text-purple-600" />
              <span>Code Apps Script Tự Động</span>
            </button>
          </div>

          {/* Quick Copy / Export Buttons */}
          <div className="pb-2 flex items-center gap-2">
            {activeTab === 'PHONG' && (
              <button
                onClick={() => handleCopy(getPhongTSV(), 'phong-tsv')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Sao chép toàn bộ bảng Sheet PHÒNG để dán trực tiếp vào Google Sheets"
              >
                {copied === 'phong-tsv' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === 'phong-tsv' ? 'Đã Sao Chép!' : 'Sao Chép Để Dán Vào Sheet'}</span>
              </button>
            )}

            {activeTab === 'XUAT_VIEN' && (
              <button
                onClick={() => handleCopy(getXuatVienTSV(), 'xuat-vien-tsv')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Sao chép bảng Sheet XUẤT VIỆN để dán trực tiếp vào Google Sheets"
              >
                {copied === 'xuat-vien-tsv' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === 'xuat-vien-tsv' ? 'Đã Sao Chép!' : 'Sao Chép Để Dán Vào Sheet'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Sheet "PHÒNG" */}
        {activeTab === 'PHONG' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Meta sub-bar */}
            <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">
                  Cấu trúc: Cột B (Họ tên) • Cột C (Giường H001-H093)
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">
                  Khu Nội Nhi: <span className="font-semibold text-blue-700">H001 - H050</span> • Khu Nhiễm/Lây: <span className="font-semibold text-amber-700">H051 - H093</span>
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="Lọc giường, bệnh nhân, phòng..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-bold z-10">
                  <tr>
                    <th className="py-2 px-3 w-14 text-center">STT</th>
                    <th className="py-2 px-3 text-emerald-800 bg-emerald-50/70 border-x border-emerald-200">
                      Cột B: HỌ VÀ TÊN
                    </th>
                    <th className="py-2 px-3 text-emerald-800 bg-emerald-50/70 border-r border-emerald-200 w-28">
                      Cột C: GIƯỜNG
                    </th>
                    <th className="py-2 px-3">Phòng</th>
                    <th className="py-2 px-3">Khu Vực</th>
                    <th className="py-2 px-3 w-32">Trạng Thái</th>
                    <th className="py-2 px-3">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredBeds.map((bed, idx) => {
                    const isOccupied = bed.trangThai === 'Có người';
                    const isLocked = bed.trangThai === 'Trống' && bed.khoaXuatVienHomNay;
                    return (
                      <tr
                        key={bed.maGiuong}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isOccupied ? 'bg-rose-50/30' : isLocked ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {bed.tt}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 border-x border-slate-100">
                          {bed.hoTenBn ? (
                            <span className="text-slate-900 uppercase font-bold">{bed.hoTenBn}</span>
                          ) : (
                            <span className="text-slate-300 italic">-- Trống --</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-100">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              bed.khuVuc === 'KHU NỘI NHI'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {bed.maGiuong}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{bed.tenPhong}</td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">{bed.khuVuc}</td>
                        <td className="py-2 px-3">
                          {isOccupied ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              {bed.loaiNam === 'Nằm tạm' ? 'Nằm Tạm' : 'Đang Nằm'}
                            </span>
                          ) : isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Khóa XV
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Trống
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {bed.giuongHomSau
                            ? `Mai sang ${bed.giuongHomSau}`
                            : isLocked
                            ? `Vừa XV: ${bed.benhNhanVuaXuatVien}`
                            : bed.ghiChu || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Sheet "XUẤT VIỆN" */}
        {activeTab === 'XUAT_VIEN' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  Cấu trúc Sheet: Cột A (Mã giường) • Cột B (Tên BN) • Cột C (Ngày giờ XV) • Cột D (Ghi chú)
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="Tìm bệnh nhân đã xuất viện..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {filteredDischarge.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Chưa có dữ liệu nào trong Sheet XUẤT VIỆN.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-bold z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-14 text-center">STT</th>
                      <th className="py-2.5 px-3 font-mono text-amber-900 bg-amber-50/70 border-x border-amber-200 w-32">
                        Cột A: MÃ GIƯỜNG
                      </th>
                      <th className="py-2.5 px-3 text-amber-900 bg-amber-50/70 border-r border-amber-200">
                        Cột B: TÊN BỆNH NHÂN
                      </th>
                      <th className="py-2.5 px-3 w-48">Cột C: NGÀY GIỜ XUẤT VIỆN</th>
                      <th className="py-2.5 px-3">Cột D: GHI CHÚ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDischarge.map((record, idx) => (
                      <tr key={record.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 border-x border-slate-100">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                            {record.giuongCu}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 uppercase border-r border-slate-100">
                          {record.hoTenBn}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                          {record.thoiGian}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {record.ghiChu || 'Xuất viện'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Sync Payloads Log */}
        {activeTab === 'LOGS' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>Dòng Gói Dữ Liệu Đồng Bộ JSON (Trigger Payloads)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Các payload được tự động xuất sinh kèm mỗi lệnh điều phối thành công.
                </p>
              </div>
              <button
                onClick={() =>
                  handleCopy(JSON.stringify(syncLogs, null, 2), 'all-logs')
                }
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1"
              >
                {copied === 'all-logs' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Sao chép toàn bộ Logs</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto space-y-3">
              {syncLogs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                  Chưa có gói dữ liệu nào được phát sinh trong phiên này. Hãy thực hiện một lệnh điều phối (Cấp giường, Xuất viện, Chuyển giường).
                </div>
              ) : (
                syncLogs.map(log => (
                  <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-800">{log.summary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
                        <button
                          onClick={() => handleCopy(JSON.stringify(log.payload, null, 2), log.id)}
                          className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                          title="Sao chép JSON"
                        >
                          {copied === log.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Google Apps Script Webhook */}
        {activeTab === 'APPS_SCRIPT' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-purple-600" />
                  <span>Mã Kịch Bản Google Apps Script Sẵn Dùng</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tự động ghi nhận chính xác vào Sheet "PHÒNG" (Cột B & C) và Sheet "XUẤT VIỆN" (Cột A, B, C, D)
                </p>
              </div>
              <button
                onClick={() => handleCopy(sampleAppsScriptCode, 'apps-script')}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copied === 'apps-script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === 'apps-script' ? 'Đã Sao Chép Code!' : 'Sao Chép Code Apps Script'}</span>
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs space-y-1 leading-relaxed">
              <p className="font-bold">📋 Hướng dẫn tích hợp 1 phút:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-purple-900">
                <li>Mở file Google Sheets của bạn &gt; Đặt tên 2 Sheet là <b>PHÒNG</b> và <b>XUẤT VIỆN</b>.</li>
                <li>Vào menu <b>Tiện ích mở rộng (Extensions)</b> &gt; Chọn <b>Apps Script</b>.</li>
                <li>Dán toàn bộ đoạn code bên dưới vào và bấm <b>Lưu (Save)</b>.</li>
                <li>Bấm <b>Triển khai (Deploy)</b> &gt; <b>Triển khai mới (New deployment)</b> &gt; Chọn loại <b>Ứng dụng web (Web app)</b>.</li>
                <li>Mục "Ai có quyền truy cập": Chọn <b>Bất kỳ ai (Anyone)</b> &gt; Bấm Triển khai để nhận URL Webhook.</li>
              </ol>
            </div>

            <pre className="flex-1 p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-auto border border-slate-800 leading-relaxed">
              {sampleAppsScriptCode}
            </pre>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đồng bộ 2 chiều: Trạng thái giường cập nhật tức thời tương ứng cấu trúc 2 Sheet.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
