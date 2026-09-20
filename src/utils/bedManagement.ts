import { Bed, DischargeRecord, CheckResult, OccupancyType } from '../types';

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * CÁC QUY TẮC AN TOÀN KHI CẤP PHÁT GIƯỜNG (KIỂM TRA THEO THỨ TỰ BẮT BUỘC):
 * 1. 🚫 CẢNH BÁO KHÓA GIƯỜNG XUẤT VIỆN TRONG NGÀY (QUY TẮC MỚI)
 * 2. 🚫 KIỂM TRA TRÙNG GIƯỜNG (GIƯỜNG ĐANG CÓ NGƯỜI)
 * 3. ⚠️ KIỂM TRA BỆNH NHÂN ĐÃ TỪNG XUẤT VIỆN
 * 4. ⚠️ KIỂM TRA BỆNH NHÂN ĐANG NẰM Ở GIƯỜNG KHÁC
 */
export function validateBedAssignment(
  beds: Bed[],
  dischargeHistory: DischargeRecord[],
  targetBedId: string,
  patientName: string,
  options?: { forceAssign?: boolean }
): CheckResult {
  const normName = normalizeName(patientName);
  const targetBed = beds.find(b => b.maGiuong.toUpperCase() === targetBedId.toUpperCase());

  if (!targetBed) {
    return {
      type: 'OCCUPIED_ERROR',
      message: `❌ LỖI: Mã giường [${targetBedId}] không tồn tại trong hệ thống (H001 - H093).`,
      currentPatient: '',
      targetBedId,
    };
  }

  // 1. 🚫 CẢNH BÁO KHÓA GIƯỜNG XUẤT VIỆN TRONG NGÀY (QUY TẮC MỚI)
  if (!options?.forceAssign && targetBed.khoaXuatVienHomNay) {
    const formerPatient = targetBed.benhNhanVuaXuatVien || 'Bệnh nhân trước';
    return {
      type: 'LOCKED_SAME_DAY_ERROR',
      message: `❌ LỖI KHÓA GIƯỜNG: Giường ${targetBed.maGiuong} hôm nay đã có bệnh nhân vừa làm thủ tục xuất viện. Giường đang khóa trong ngày để khử khuẩn và bảo đảm định mức viện phí, không được cấp cho bệnh nhân mới. Vui lòng chọn giường khác.`,
      targetBedId: targetBed.maGiuong,
      dischargedPatient: formerPatient,
      dischargedAt: targetBed.thoiGianXuatVienHomNay || 'Hôm nay',
    };
  }

  // 2. 🚫 KIỂM TRA TRÙNG GIƯỜNG (GIƯỜNG ĐANG CÓ NGƯỜI)
  if (targetBed.trangThai === 'Có người' && targetBed.hoTenBn.trim() !== '') {
    return {
      type: 'OCCUPIED_ERROR',
      message: `❌ LỖI TRÙNG GIƯỜNG: Giường ${targetBed.maGiuong} hiện đang có bệnh nhân ${targetBed.hoTenBn} nằm. Vui lòng chọn giường khác.`,
      currentPatient: targetBed.hoTenBn,
      targetBedId: targetBed.maGiuong,
    };
  }

  // 3. ⚠️ KIỂM TRA BỆNH NHÂN ĐÃ TỪNG XUẤT VIỆN
  const dischargedRecord = dischargeHistory.find(
    d => normalizeName(d.hoTenBn) === normName
  );
  if (dischargedRecord) {
    return {
      type: 'DISCHARGED_WARNING',
      message: `⚠️ CẢNH BÁO TÁI NHẬP VIỆN: Bệnh nhân ${normName} đã từng xuất viện trước đó (giường cũ: ${dischargedRecord.giuongCu}). Xác nhận làm thủ tục TÁI NHẬP VIỆN cho bệnh nhân này hay không? (Gõ 'Xác nhận' để cấp hoặc hủy bỏ).`,
      patientName: normName,
      oldBedId: dischargedRecord.giuongCu,
      dischargedAt: dischargedRecord.thoiGian,
    };
  }

  // 4. ⚠️ KIỂM TRA BỆNH NHÂN ĐANG NẰM Ở GIƯỜNG KHÁC
  const currentlyOccupiedBed = beds.find(
    b => b.maGiuong.toUpperCase() !== targetBedId.toUpperCase() &&
         b.trangThai === 'Có người' &&
         normalizeName(b.hoTenBn) === normName
  );
  if (currentlyOccupiedBed) {
    return {
      type: 'ANOTHER_BED_WARNING',
      message: `⚠️ Bệnh nhân ${normName} đang nằm ở giường ${currentlyOccupiedBed.maGiuong}. Có muốn làm thủ tục CHUYỂN GIƯỜNG sang ${targetBed.maGiuong} không?`,
      patientName: normName,
      oldBedId: currentlyOccupiedBed.maGiuong,
      targetBedId: targetBed.maGiuong,
    };
  }

  return { type: 'PASSED' };
}

export interface RoomGroup {
  phongCode: string;
  tenPhong: string;
  khuVuc: string;
  beds: Bed[];
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  lockedBeds: number;
  statusText: string;
}

export function groupBedsByRoom(beds: Bed[], filterZone?: string): RoomGroup[] {
  const roomsMap = new Map<string, RoomGroup>();

  for (const bed of beds) {
    if (filterZone && filterZone !== 'ALL' && bed.khuVuc !== filterZone) {
      continue;
    }

    if (!roomsMap.has(bed.phongCode)) {
      roomsMap.set(bed.phongCode, {
        phongCode: bed.phongCode,
        tenPhong: bed.tenPhong,
        khuVuc: bed.khuVuc,
        beds: [],
        totalBeds: 0,
        availableBeds: 0,
        occupiedBeds: 0,
        lockedBeds: 0,
        statusText: '',
      });
    }

    const room = roomsMap.get(bed.phongCode)!;
    room.beds.push(bed);
    room.totalBeds += 1;
    if (bed.trangThai === 'Trống') {
      if (bed.khoaXuatVienHomNay) {
        room.lockedBeds += 1;
      } else {
        room.availableBeds += 1;
      }
    } else {
      room.occupiedBeds += 1;
    }
  }

  const roomGroups = Array.from(roomsMap.values());
  for (const room of roomGroups) {
    room.statusText = room.availableBeds === 0 ? '[HẾT GIƯỜNG KHẢ DỤNG]' : '[CÒN GIƯỜNG TRỐNG]';
  }

  return roomGroups;
}

export function generateVisualMapText(beds: Bed[], zoneFilter?: 'ALL' | 'KHU NỘI NHI' | 'KHU LÂY'): string {
  const rooms = groupBedsByRoom(beds, zoneFilter);
  const lines: string[] = [];

  const title = zoneFilter === 'KHU NỘI NHI'
    ? 'KHU NỘI NHI (H001 - H050)'
    : zoneFilter === 'KHU LÂY'
    ? 'KHU NHIỄM / KHU LÂY (H051 - H093)'
    : 'TOÀN VIỆN (93 GIƯỜNG BỆNH)';

  lines.push(`=======================================================`);
  lines.push(`SƠ ĐỒ TRỰC QUAN KHỐI PHÒNG: ${title}`);
  lines.push(`Chú giải: 🟢 Trống | 🟡 Trống (Khóa XV hôm nay) | 🔴 Đang nằm`);
  lines.push(`=======================================================\n`);

  for (const room of rooms) {
    lines.push(
      `### 🏥 ${room.tenPhong} (${room.availableBeds} trống khả dụng, ${room.lockedBeds} khóa XV / ${room.totalBeds} giường)`
    );

    for (const b of room.beds) {
      if (b.trangThai === 'Trống') {
        if (b.khoaXuatVienHomNay) {
          lines.push(`🟡 ${b.maGiuong} (Khóa - Vừa có BN xuất viện hôm nay)`);
        } else {
          lines.push(`🟢 ${b.maGiuong} (Trống)`);
        }
      } else {
        if (b.loaiNam === 'Nằm tạm') {
          const nextBed = b.giuongHomSau ? ` - Mai sang ${b.giuongHomSau}` : '';
          lines.push(`🔴 ${b.maGiuong}: ${b.hoTenBn} (Đang nằm - Tạm${nextBed})`);
        } else {
          lines.push(`🔴 ${b.maGiuong}: ${b.hoTenBn} (Đang nằm)`);
        }
      }
    }
    lines.push('');
  }

  const total = beds.filter(b => !zoneFilter || zoneFilter === 'ALL' || b.khuVuc === zoneFilter);
  const available = total.filter(b => b.trangThai === 'Trống' && !b.khoaXuatVienHomNay).length;
  const locked = total.filter(b => b.trangThai === 'Trống' && b.khoaXuatVienHomNay).length;
  const occupied = total.filter(b => b.trangThai === 'Có người').length;

  lines.push(`-------------------------------------------------------`);
  lines.push(`📊 TỔNG KẾT: ${occupied}/${total.length} giường đang nằm | ${available} giường trống khả dụng | ${locked} giường khóa xuất viện.`);

  return lines.join('\n');
}

export interface ParsedCommand {
  action:
    | 'ASSIGN'
    | 'ASSIGN_TEMP'
    | 'FORCE_ASSIGN'
    | 'DISCHARGE'
    | 'DELETE_DISCHARGE_HISTORY'
    | 'VIEW_DISCHARGE_HISTORY'
    | 'VIEW_MAP'
    | 'CONFIRM'
    | 'CANCEL'
    | 'UNLOCK_BED'
    | 'DOWNLOAD_PATIENTS'
    | 'UNKNOWN';
  bedId?: string;
  patientName?: string;
  nextBedId?: string;
  zone?: 'ALL' | 'KHU NỘI NHI' | 'KHU LÂY';
  rawText: string;
}

export function parseUserCommand(input: string): ParsedCommand {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. "Xác nhận" / "Đồng ý"
  if (lower === 'xác nhận' || lower === 'đồng ý' || lower === 'xac nhan' || lower === 'dong y') {
    return { action: 'CONFIRM', rawText: text };
  }

  // 2. "Hủy bỏ" / "Hủy"
  if (lower === 'hủy' || lower === 'hủy bỏ' || lower === 'huy' || lower === 'huy bo') {
    return { action: 'CANCEL', rawText: text };
  }

  // 3. "Xóa [Tên BN] khỏi lịch sử xuất viện"
  // e.g. "Xóa TRẦN VĂN AN khỏi lịch sử xuất viện"
  const deleteHistoryRegex = /xóa\s+(?:bn\s+|bệnh\s+nhân\s+)?(.+?)\s+khỏi\s+lịch\s+sử\s+xuất\s+viện/i;
  const deleteMatch = text.match(deleteHistoryRegex);
  if (deleteMatch) {
    return {
      action: 'DELETE_DISCHARGE_HISTORY',
      patientName: normalizeName(deleteMatch[1]),
      rawText: text,
    };
  }

  // 4. "Xem lịch sử xuất viện" / "Lịch sử xuất viện"
  if (
    lower.includes('lịch sử xuất viện') &&
    (lower.includes('xem') || lower.includes('danh sách') || lower.startsWith('lịch sử'))
  ) {
    return {
      action: 'VIEW_DISCHARGE_HISTORY',
      rawText: text,
    };
  }

  // 5. "Bắt buộc cấp cưỡng bức [giường] [Mã] cho [BN] [Tên]" hoặc "Cấp cưỡng bức [giường] [Mã] cho [BN] [Tên]"
  const forceAssignRegex = /(?:bắt\s+buộc\s+cấp\s+cưỡng\s+bức|cấp\s+cưỡng\s+bức)(?:\s+giường)?\s+(H\d{3})(?:\s+cho\s+(?:bn\s+|bệnh\s+nhân\s+)?(.+))?/i;
  const forceMatch = text.match(forceAssignRegex);
  if (forceMatch) {
    return {
      action: 'FORCE_ASSIGN',
      bedId: forceMatch[1].toUpperCase(),
      patientName: forceMatch[2] ? normalizeName(forceMatch[2]) : undefined,
      rawText: text,
    };
  }

  // 6. "Cấp [giường] tạm [Mã] cho [BN] [Họ tên], ngày mai sang [Mã]"
  const tempAssignRegex = /cấp(?:\s+giường)?\s+tạm\s+(H\d{3})\s+(?:cho\s+)?(?:bn\s+|bệnh\s+nhân\s+)?([^,]+)(?:,\s*(?:ngày\s+mai\s+|mai\s+)?sang\s+(H\d{3}))?/i;
  const tempMatch = text.match(tempAssignRegex);
  if (tempMatch) {
    return {
      action: 'ASSIGN_TEMP',
      bedId: tempMatch[1].toUpperCase(),
      patientName: normalizeName(tempMatch[2]),
      nextBedId: tempMatch[3] ? tempMatch[3].toUpperCase() : undefined,
      rawText: text,
    };
  }

  // 7a. "Cấp [giường] [Mã] cho [BN] [Họ tên]"
  // e.g. "Cấp giường H003 cho BN Nguyễn Văn A", "Cấp H003 cho Nguyễn Văn A", "Cấp H003 BN Trần Văn B"
  const assignRegex1 = /cấp(?:\s+giường)?\s+(H\d{3})\s+(?:cho\s+)?(?:bn\s+|bệnh\s+nhân\s+)?(.+)/i;
  const assignMatch1 = text.match(assignRegex1);
  if (assignMatch1) {
    return {
      action: 'ASSIGN',
      bedId: assignMatch1[1].toUpperCase(),
      patientName: normalizeName(assignMatch1[2]),
      rawText: text,
    };
  }

  // 7b. "Nhập/Thêm/Xếp/Gán/Cho [BN] [Họ tên] vào [giường] [Mã]"
  // e.g. "Nhập BN Nguyễn Văn A vào H003", "Thêm Nguyễn Văn A vào giường H003"
  const assignRegex2 = /(?:nhập|thêm|xếp|gán|cho)\s+(?:bn\s+|bệnh\s+nhân\s+)?(.+?)\s+vào(?:\s+giường)?\s+(H\d{3})/i;
  const assignMatch2 = text.match(assignRegex2);
  if (assignMatch2) {
    return {
      action: 'ASSIGN',
      bedId: assignMatch2[2].toUpperCase(),
      patientName: normalizeName(assignMatch2[1]),
      rawText: text,
    };
  }

  // 7c. "[Mã] : [Họ tên]" hoặc "[Mã] - [Họ tên]" hoặc "[Mã] = [Họ tên]"
  // e.g. "H003: NGUYỄN VĂN A", "H003 - NGUYỄN VĂN A"
  const assignRegex3 = /^(H\d{3})\s*[:\-=]\s*(?:bn\s+|bệnh\s+nhân\s+)?(.+)$/i;
  const assignMatch3 = text.match(assignRegex3);
  if (assignMatch3) {
    return {
      action: 'ASSIGN',
      bedId: assignMatch3[1].toUpperCase(),
      patientName: normalizeName(assignMatch3[2]),
      rawText: text,
    };
  }

  // 7d. "[Mã] [Họ tên]" (e.g. "H003 Nguyễn Văn A")
  const assignRegex4 = /^(H\d{3})\s+(?:bn\s+|bệnh\s+nhân\s+)?([a-zA-Zà-ỹÀ-Ỹ\s]{2,})$/i;
  const assignMatch4 = text.match(assignRegex4);
  if (assignMatch4) {
    return {
      action: 'ASSIGN',
      bedId: assignMatch4[1].toUpperCase(),
      patientName: normalizeName(assignMatch4[2]),
      rawText: text,
    };
  }

  // 8. "Xuất viện [BN] [Họ tên hoặc Mã giường]" / "Trả giường [Mã]" / "Giải phóng [Mã]"
  const dischargeRegex = /(?:xuất\s+viện|trả\s+giường|giải\s+phóng(?:\s+giường)?)\s+(?:bn\s+|bệnh\s+nhân\s+)?(.+)/i;
  const dischargeMatch = text.match(dischargeRegex);
  if (dischargeMatch) {
    const target = dischargeMatch[1].trim();
    const bedMatch = target.match(/^H\d{3}$/i);
    return {
      action: 'DISCHARGE',
      bedId: bedMatch ? bedMatch[0].toUpperCase() : undefined,
      patientName: !bedMatch ? normalizeName(target) : undefined,
      rawText: text,
    };
  }

  // 9. "Mở khóa [giường] [Mã]" / "Mở [giường] [Mã]" / "Khử khuẩn xong [Mã]"
  const unlockRegex = /(?:mở\s+khóa|mở|khử\s+khuẩn\s+xong)(?:\s+giường)?\s+(H\d{3})/i;
  const unlockMatch = text.match(unlockRegex);
  if (unlockMatch) {
    return {
      action: 'UNLOCK_BED',
      bedId: unlockMatch[1].toUpperCase(),
      rawText: text,
    };
  }

  // 10. "Xem sơ đồ [Tên khu hoặc Toàn viện]"
  if (lower.includes('xem sơ đồ') || lower.includes('xem tình trạng') || lower.includes('báo cáo phòng') || lower.includes('sơ đồ')) {
    let zone: 'ALL' | 'KHU NỘI NHI' | 'KHU LÂY' = 'ALL';
    if (lower.includes('nội nhi') || lower.includes('noi nhi')) {
      zone = 'KHU NỘI NHI';
    } else if (lower.includes('nhiễm') || lower.includes('lây') || lower.includes('nhiem') || lower.includes('lay')) {
      zone = 'KHU LÂY';
    }
    return {
      action: 'VIEW_MAP',
      zone,
      rawText: text,
    };
  }

  // 11. "Tải về danh sách bệnh nhân" / "Xuất file danh sách"
  if (
    lower.includes('tải danh sách') ||
    lower.includes('tai danh sach') ||
    lower.includes('xuất danh sách') ||
    lower.includes('xuat danh sach') ||
    lower.includes('download') ||
    lower.includes('tải file') ||
    lower.includes('tai file') ||
    lower.includes('xuất file') ||
    lower.includes('xuat file') ||
    lower.includes('tải excel') ||
    lower.includes('tai excel') ||
    lower.includes('tải ds') ||
    lower.includes('tai ds')
  ) {
    return {
      action: 'DOWNLOAD_PATIENTS',
      rawText: text,
    };
  }

  return {
    action: 'UNKNOWN',
    rawText: text,
  };
}
