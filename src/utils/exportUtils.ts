import { Bed, DischargeRecord } from '../types';

/**
 * Trigger file download in browser with UTF-8 BOM for Microsoft Excel compatibility
 */
function triggerDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatCSVCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Format current timestamp for filenames (e.g. 20260920_1140)
 */
function getTimestampString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}`;
}

/**
 * TẢI VỀ DANH SÁCH BỆNH NHÂN ĐANG NẰM THEO GIƯỜNG (CSV EXCEL UTF-8)
 * Chỉ xuất các giường đang có bệnh nhân điều trị
 */
export function exportOccupiedPatientsCSV(beds: Bed[]) {
  const occupiedBeds = beds.filter(b => b.trangThai === 'Có người');

  // UTF-8 BOM so Excel opens Vietnamese characters properly
  const BOM = '\uFEFF';
  const headers = [
    'STT',
    'MÃ GIƯỜNG',
    'TÊN PHÒNG',
    'PHÂN KHU',
    'HỌ VÀ TÊN BỆNH NHÂN',
    'LOẠI NẰM',
    'GIƯỜNG CHUYỂN ĐẾN NGÀY MAI',
    'TRẠNG THÁI',
    'GHI CHÚ',
  ];

  const rows = occupiedBeds.map((b, index) => {
    const loaiNam = b.loaiNam === 'Nằm tạm' ? 'Nằm tạm' : 'Chính thức';
    const giuongSau = b.giuongHomSau ? b.giuongHomSau : '';
    const ghiChu = b.giuongHomSau ? `Ngày mai sang ${b.giuongHomSau}` : (b.ghiChu || '');

    return [
      formatCSVCell(index + 1),
      formatCSVCell(b.maGiuong),
      formatCSVCell(b.tenPhong),
      formatCSVCell(b.khuVuc),
      formatCSVCell(b.hoTenBn),
      formatCSVCell(loaiNam),
      formatCSVCell(giuongSau),
      formatCSVCell(b.trangThai),
      formatCSVCell(ghiChu),
    ].join(',');
  });

  const csvContent = BOM + [headers.map(h => formatCSVCell(h)).join(','), ...rows].join('\r\n');
  const filename = `Danh_sach_benh_nhan_theo_giuong_${getTimestampString()}.csv`;
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * TẢI VỀ TOÀN BỘ 93 GIƯỜNG BỆNH (SHEET PHÒNG - CSV EXCEL UTF-8)
 * Bao gồm cả giường có người, giường trống và giường khóa xuất viện
 */
export function exportAllBedsCSV(beds: Bed[]) {
  const BOM = '\uFEFF';
  const headers = [
    'STT',
    'MÃ GIƯỜNG',
    'MÃ PHÒNG',
    'TÊN PHÒNG',
    'PHÂN KHU',
    'HỌ VÀ TÊN BỆNH NHÂN',
    'TRẠNG THÁI GIƯỜNG',
    'LOẠI NẰM',
    'KHÓA XUẤT VIỆN HÔM NAY',
    'BN VỪA XUẤT VIỆN',
    'GIƯỜNG SANG NGÀY MAI',
    'GHI CHÚ',
  ];

  const rows = beds.map((b, index) => {
    let trangThaiText: string = b.trangThai;
    if (b.trangThai === 'Trống' && b.khoaXuatVienHomNay) {
      trangThaiText = 'Khóa xuất viện (Khử khuẩn)';
    }

    const loaiNamText = b.trangThai === 'Có người' ? (b.loaiNam || 'Chính thức') : '';
    const khoaXVText = b.khoaXuatVienHomNay ? 'Đang khóa trong ngày' : 'Không';
    const bnXuatVien = b.benhNhanVuaXuatVien || '';
    const giuongSau = b.giuongHomSau || '';
    const ghiChu = b.giuongHomSau ? `Ngày mai sang ${b.giuongHomSau}` : (b.ghiChu || '');

    return [
      formatCSVCell(index + 1),
      formatCSVCell(b.maGiuong),
      formatCSVCell(b.phongCode),
      formatCSVCell(b.tenPhong),
      formatCSVCell(b.khuVuc),
      formatCSVCell(b.hoTenBn),
      formatCSVCell(trangThaiText),
      formatCSVCell(loaiNamText),
      formatCSVCell(khoaXVText),
      formatCSVCell(bnXuatVien),
      formatCSVCell(giuongSau),
      formatCSVCell(ghiChu),
    ].join(',');
  });

  const csvContent = BOM + [headers.map(h => formatCSVCell(h)).join(','), ...rows].join('\r\n');
  const filename = `Sheet_PHONG_93_giuong_${getTimestampString()}.csv`;
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * TẢI VỀ SHEET XUẤT VIỆN (CSV EXCEL UTF-8)
 */
export function exportDischargeHistoryCSV(dischargeHistory: DischargeRecord[]) {
  const BOM = '\uFEFF';
  const headers = ['STT', 'MÃ GIƯỜNG', 'HỌ VÀ TÊN BỆNH NHÂN', 'NGÀY GIỜ XUẤT VIỆN', 'GHI CHÚ'];

  const rows = dischargeHistory.map((d, index) => {
    return [
      formatCSVCell(index + 1),
      formatCSVCell(d.giuongCu),
      formatCSVCell(d.hoTenBn),
      formatCSVCell(d.thoiGian),
      formatCSVCell(d.ghiChu || 'Xuất viện'),
    ].join(',');
  });

  const csvContent = BOM + [headers.map(h => formatCSVCell(h)).join(','), ...rows].join('\r\n');
  const filename = `Sheet_XUAT_VIEN_${getTimestampString()}.csv`;
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Tạo dữ liệu TSV (Tab-Separated) để sao chép trực tiếp vào Excel / Google Sheets
 */
export function generatePatientsTSV(beds: Bed[], onlyOccupied: boolean = true): string {
  const targetBeds = onlyOccupied ? beds.filter(b => b.trangThai === 'Có người') : beds;
  const headers = ['STT', 'MÃ GIƯỜNG', 'PHÒNG', 'KHU VỰC', 'HỌ TÊN BỆNH NHÂN', 'LOẠI NẰM', 'GHI CHÚ'];

  const rows = targetBeds.map((b, i) => [
    i + 1,
    b.maGiuong,
    b.tenPhong,
    b.khuVuc,
    b.hoTenBn || (b.khoaXuatVienHomNay ? '(Khóa XV hôm nay)' : '(Trống)'),
    b.trangThai === 'Có người' ? (b.loaiNam || 'Chính thức') : '',
    b.giuongHomSau ? `Ngày mai sang ${b.giuongHomSau}` : (b.ghiChu || ''),
  ]);

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
}
