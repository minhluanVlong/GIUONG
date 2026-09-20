export type ZoneType = 'KHU NỘI NHI' | 'KHU LÂY';

export type BedStatus = 'Trống' | 'Có người';
export type OccupancyType = 'Chính thức' | 'Nằm tạm';

export interface Bed {
  tt: number;
  maGiuong: string; // e.g. H001
  phongCode: string; // e.g. HS1, P1, LK
  tenPhong: string; // e.g. HỒI SỨC 1, PHÒNG 1
  khuVuc: ZoneType;
  hoTenBn: string; // "" if empty
  trangThai: BedStatus; // 'Có người' | 'Trống'
  loaiNam: OccupancyType; // 'Chính thức' | 'Nằm tạm'
  giuongHomSau?: string; // e.g. H010 if Nằm tạm
  ghiChu?: string;
  ngayVao?: string;
  khoaXuatVienHomNay?: boolean; // Khóa giường xuất viện trong ngày
  benhNhanVuaXuatVien?: string; // Tên BN vừa xuất viện hôm nay
  thoiGianXuatVienHomNay?: string;
}

export interface DischargeRecord {
  id: string;
  hoTenBn: string;
  giuongCu: string;
  thoiGian: string;
  ghiChu: string;
}

export interface SyncPayloadLog {
  id: string;
  timestamp: string;
  action: 'ASSIGN_BED' | 'DISCHARGE' | 'DELETE_DISCHARGE_HISTORY' | 'TRANSFER_BED';
  payload: Record<string, any>;
  summary: string;
}

export interface AssistantMessage {
  id: string;
  type: 'user' | 'assistant' | 'warning' | 'error' | 'success';
  content: string;
  timestamp: string;
  syncPayload?: Record<string, any>;
  actionRequired?: {
    actionType: 'RE_ADMIT' | 'TRANSFER_BED' | 'FORCE_ASSIGN';
    patientName: string;
    targetBedId: string;
    oldBedId?: string;
    occupancyType?: OccupancyType;
    nextBedId?: string;
  };
}

export type CheckResult =
  | { type: 'PASSED' }
  | {
      type: 'LOCKED_SAME_DAY_ERROR';
      message: string;
      targetBedId: string;
      dischargedPatient: string;
      dischargedAt: string;
    }
  | {
      type: 'OCCUPIED_ERROR';
      message: string;
      currentPatient: string;
      targetBedId: string;
    }
  | {
      type: 'DISCHARGED_WARNING';
      message: string;
      patientName: string;
      oldBedId: string;
      dischargedAt: string;
    }
  | {
      type: 'ANOTHER_BED_WARNING';
      message: string;
      patientName: string;
      oldBedId: string;
      targetBedId: string;
    };
