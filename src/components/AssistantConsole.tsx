import React, { useState, useMemo, useRef } from 'react';
import { Bed, DischargeRecord, AssistantMessage, OccupancyType, SyncPayloadLog } from '../types';
import {
  parseUserCommand,
  validateBedAssignment,
  generateVisualMapText,
  groupBedsByRoom,
} from '../utils/bedManagement';
import { exportOccupiedPatientsCSV, exportAllBedsCSV } from '../utils/exportUtils';
import { BedCard } from './BedCard';
import {
  Terminal,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileSpreadsheet,
  History,
  FileText,
  LayoutGrid,
  Search,
  Copy,
  Check,
  X,
  Building2,
  Sparkles,
  Download,
} from 'lucide-react';

interface AssistantConsoleProps {
  beds: Bed[];
  dischargeHistory: DischargeRecord[];
  onAssignBed: (
    bedId: string,
    patientName: string,
    occupancyType?: OccupancyType,
    nextBedId?: string
  ) => void;
  onForceAssignBed: (
    bedId: string,
    patientName: string,
    occupancyType?: OccupancyType,
    nextBedId?: string
  ) => void;
  onTransferBed: (oldBedId: string, targetBedId: string, patientName: string) => void;
  onDischargeBed: (bedId: string, note?: string) => void;
  onDeleteDischargeHistory: (patientName: string) => boolean;
  onUnlockBed: (bedId: string) => void;
  onOpenVisualMapModal: (zone?: 'ALL' | 'KHU NỘI NHI' | 'KHU LÂY') => void;
  onOpenDischargeHistoryModal: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenDownloadModal?: () => void;
  onRecordSyncLog?: (log: SyncPayloadLog) => void;
  onSelectBed: (bed: Bed) => void;
  onQuickDischarge: (bed: Bed) => void;
  onQuickAssign: (bed: Bed) => void;
}

export const AssistantConsole: React.FC<AssistantConsoleProps> = ({
  beds,
  dischargeHistory,
  onAssignBed,
  onForceAssignBed,
  onTransferBed,
  onDischargeBed,
  onDeleteDischargeHistory,
  onUnlockBed,
  onOpenVisualMapModal,
  onOpenDischargeHistoryModal,
  onOpenGoogleSheetsModal,
  onOpenDownloadModal,
  onRecordSyncLog,
  onSelectBed,
  onQuickDischarge,
  onQuickAssign,
}) => {
  const [inputText, setInputText] = useState('');
  const [pendingAction, setPendingAction] = useState<AssistantMessage['actionRequired'] | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedTextMap, setCopiedTextMap] = useState(false);

  // View & Filter States for Sơ đồ trực quan 93 giường
  const [viewMode, setViewMode] = useState<'GRID' | 'TEXT_MAP'>('GRID');
  const [selectedZone, setSelectedZone] = useState<'ALL' | 'KHU NỘI NHI' | 'KHU LÂY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'LOCKED' | 'TEMP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Latest status banner after executing a command
  const [latestFeedback, setLatestFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    syncPayload?: any;
    actionRequired?: AssistantMessage['actionRequired'];
  } | null>({
    type: 'info',
    message:
      'HỆ THỐNG ĐIỀU PHỐI VÀ ĐỒNG BỘ 93 GIƯỜNG NỘI TRÚ ĐÃ SẴN SÀNG. Kiểm tra 4 quy tắc an toàn bắt buộc (Khóa XV trong ngày, Trùng giường, Tái nhập viện, Chuyển giường).',
  });

  const commandInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const copyTextMap = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextMap(true);
    setTimeout(() => setCopiedTextMap(false), 2000);
  };

  // Filtered beds calculation
  const filteredBeds = useMemo(() => {
    return beds.filter(bed => {
      // Zone filter
      if (selectedZone !== 'ALL' && bed.khuVuc !== selectedZone) {
        return false;
      }

      // Status filter
      if (statusFilter === 'AVAILABLE' && (bed.trangThai !== 'Trống' || bed.khoaXuatVienHomNay)) {
        return false;
      }
      if (statusFilter === 'OCCUPIED' && bed.trangThai !== 'Có người') {
        return false;
      }
      if (statusFilter === 'LOCKED' && (!bed.khoaXuatVienHomNay || bed.trangThai !== 'Trống')) {
        return false;
      }
      if (statusFilter === 'TEMP' && (bed.loaiNam !== 'Nằm tạm' || bed.trangThai === 'Trống')) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchBedId = bed.maGiuong.toLowerCase().includes(query);
        const matchPatient = bed.hoTenBn.toLowerCase().includes(query);
        const matchRoom =
          bed.tenPhong.toLowerCase().includes(query) || bed.phongCode.toLowerCase().includes(query);
        if (!matchBedId && !matchPatient && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [beds, selectedZone, statusFilter, searchQuery]);

  // Group filtered beds by room
  const roomGroups = useMemo(() => {
    return groupBedsByRoom(filteredBeds);
  }, [filteredBeds]);

  // Bed statistics
  const countTotal = beds.length;
  const countAvailable = beds.filter(b => b.trangThai === 'Trống' && !b.khoaXuatVienHomNay).length;
  const countOccupied = beds.filter(b => b.trangThai === 'Có người').length;
  const countLocked = beds.filter(b => b.trangThai === 'Trống' && b.khoaXuatVienHomNay).length;
  const countTemp = beds.filter(b => b.loaiNam === 'Nằm tạm' && b.trangThai === 'Có người').length;

  // Handle Command Execution
  const handleCommandExecution = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();

    // Check for quick confirmation or cancellation
    if (
      pendingAction &&
      (lower === 'xác nhận' || lower === 'xac nhan' || lower === 'đồng ý' || lower === 'dong y' || lower === 'ok')
    ) {
      if (pendingAction.actionType === 'RE_ADMIT') {
        handleConfirmReAdmit(pendingAction);
      } else if (pendingAction.actionType === 'TRANSFER_BED') {
        handleConfirmTransfer(pendingAction);
      } else if (pendingAction.actionType === 'FORCE_ASSIGN') {
        handleConfirmForceAssign(pendingAction);
      }
      return;
    }

    if (
      pendingAction &&
      (lower === 'hủy' || lower === 'huy' || lower === 'hủy bỏ' || lower === 'huy bo' || lower === 'cancel')
    ) {
      setPendingAction(null);
      setLatestFeedback({
        type: 'info',
        message: 'Đã hủy bỏ thao tác điều phối đang chờ.',
      });
      return;
    }

    const parsed = parseUserCommand(trimmed);

    switch (parsed.action) {
      case 'CONFIRM': {
        if (pendingAction) {
          if (pendingAction.actionType === 'RE_ADMIT') {
            handleConfirmReAdmit(pendingAction);
          } else if (pendingAction.actionType === 'TRANSFER_BED') {
            handleConfirmTransfer(pendingAction);
          } else if (pendingAction.actionType === 'FORCE_ASSIGN') {
            handleConfirmForceAssign(pendingAction);
          }
        } else {
          setLatestFeedback({
            type: 'info',
            message: 'Hiện tại không có thao tác điều phối nào đang chờ xác nhận.',
          });
        }
        break;
      }

      case 'CANCEL': {
        setPendingAction(null);
        setLatestFeedback({
          type: 'info',
          message: 'Đã hủy bỏ thao tác điều phối đang chờ.',
        });
        break;
      }

      case 'ASSIGN':
      case 'ASSIGN_TEMP': {
        const bedId = parsed.bedId!;
        const patientName = parsed.patientName!;
        const occupancyType: OccupancyType = parsed.action === 'ASSIGN_TEMP' ? 'Nằm tạm' : 'Chính thức';
        const nextBedId = parsed.nextBedId;

        // Run 4-step safety validation
        const checkResult = validateBedAssignment(beds, dischargeHistory, bedId, patientName);

        if (checkResult.type !== 'PASSED') {
          if (checkResult.type === 'LOCKED_SAME_DAY_ERROR') {
            // Rule 1: Khóa giường xuất viện trong ngày
            const actionReq = {
              actionType: 'FORCE_ASSIGN' as const,
              targetBedId: bedId,
              patientName: patientName,
              occupancyType: occupancyType,
              nextBedId: nextBedId,
            };
            setPendingAction(actionReq);
            setLatestFeedback({
              type: 'warning',
              message: `🚫 [QUY TẮC 1]: ${checkResult.message}`,
              actionRequired: actionReq,
            });
          } else if (checkResult.type === 'OCCUPIED_ERROR') {
            // Rule 2: Trùng giường
            setPendingAction(null);
            setLatestFeedback({
              type: 'error',
              message: `🚫 [QUY TẮC 2 - TRÙNG GIƯỜNG]: ${checkResult.message}`,
            });
          } else if (checkResult.type === 'DISCHARGED_WARNING') {
            // Rule 3: Bệnh nhân từng xuất viện
            const actionReq = {
              actionType: 'RE_ADMIT' as const,
              targetBedId: bedId,
              patientName: patientName,
              occupancyType: occupancyType,
              nextBedId: nextBedId,
            };
            setPendingAction(actionReq);
            setLatestFeedback({
              type: 'warning',
              message: `⚠️ [QUY TẮC 3 - TÁI NHẬP VIỆN]: ${checkResult.message}`,
              actionRequired: actionReq,
            });
          } else if (checkResult.type === 'ANOTHER_BED_WARNING') {
            // Rule 4: Bệnh nhân đang nằm giường khác
            const actionReq = {
              actionType: 'TRANSFER_BED' as const,
              targetBedId: bedId,
              patientName: patientName,
              oldBedId: checkResult.oldBedId,
            };
            setPendingAction(actionReq);
            setLatestFeedback({
              type: 'warning',
              message: `⚠️ [QUY TẮC 4 - CHUYỂN GIƯỜNG]: ${checkResult.message}`,
              actionRequired: actionReq,
            });
          }
        } else {
          // Passed all 4 rules
          onAssignBed(bedId, patientName, occupancyType, nextBedId);
          const noteStr =
            occupancyType === 'Nằm tạm'
              ? nextBedId
                ? `Nằm tạm, ngày mai sang ${nextBedId}`
                : 'Nằm tạm'
              : 'Chính thức';

          const syncPayload = {
            action: 'ASSIGN_BED',
            bedId: bedId,
            patientName: patientName,
            note: noteStr,
          };

          setLatestFeedback({
            type: 'success',
            message: `✅ Đã ghi nhận bệnh nhân ${patientName} vào giường ${bedId} trên sheet PHÒNG.`,
            syncPayload,
          });

          onRecordSyncLog?.({
            id: `sync-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            action: 'ASSIGN_BED',
            payload: syncPayload,
            summary: `Cấp ${bedId} cho BN ${patientName}`,
          });

          setPendingAction(null);
        }
        break;
      }

      case 'FORCE_ASSIGN': {
        const bedId = parsed.bedId!;
        const patientName = parsed.patientName!;
        const occupancyType: OccupancyType = 'Chính thức';

        const targetBed = beds.find(b => b.maGiuong.toUpperCase() === bedId.toUpperCase());
        if (!targetBed) {
          setLatestFeedback({
            type: 'error',
            message: `❌ LỖI: Không tìm thấy giường [${bedId}] trong danh mục 93 giường bệnh viện.`,
          });
          break;
        }

        if (targetBed.trangThai === 'Có người') {
          setLatestFeedback({
            type: 'error',
            message: `❌ KHÔNG THỂ CƯỠNG BỨC: Giường [${bedId}] hiện ĐANG CÓ BỆNH NHÂN [${targetBed.hoTenBn}] nằm. Hãy chuyển bệnh nhân này trước.`,
          });
          break;
        }

        onForceAssignBed(bedId, patientName, occupancyType);

        const syncPayload = {
          action: 'ASSIGN_BED',
          bedId: bedId,
          patientName: patientName,
          note: 'Cấp cưỡng bức (Vượt khóa xuất viện)',
        };

        setLatestFeedback({
          type: 'success',
          message: `✅ ĐÃ CẤP CƯỠNG BỨC: Đã ghi nhận bệnh nhân ${patientName} vào giường ${bedId} trên sheet PHÒNG (Bỏ qua khóa khử khuẩn).`,
          syncPayload,
        });

        onRecordSyncLog?.({
          id: `sync-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          action: 'ASSIGN_BED',
          payload: syncPayload,
          summary: `Cấp cưỡng bức ${bedId} cho BN ${patientName}`,
        });

        setPendingAction(null);
        break;
      }

      case 'UNLOCK_BED': {
        const bedId = parsed.bedId!;
        const targetBed = beds.find(b => b.maGiuong.toUpperCase() === bedId.toUpperCase());
        if (!targetBed) {
          setLatestFeedback({
            type: 'error',
            message: `❌ LỖI: Không tìm thấy giường [${bedId}] trong danh mục bệnh viện.`,
          });
          break;
        }

        if (!targetBed.khoaXuatVienHomNay) {
          setLatestFeedback({
            type: 'info',
            message: `ℹ️ Giường [${bedId}] hiện không bị khóa (Trạng thái: ${targetBed.trangThai}). Không cần mở khóa.`,
          });
          break;
        }

        onUnlockBed(bedId);
        const syncPayload = {
          action: 'UNLOCK_BED',
          bedId: bedId,
          note: 'Hoàn tất khử khuẩn buồng bệnh',
        };

        setLatestFeedback({
          type: 'success',
          message: `✅ Đã mở khóa giường ${bedId} thành công trên sheet PHÒNG. Giường hiện đã chuyển sang trạng thái 🟢 TRỐNG khả dụng tiếp nhận bệnh nhân mới.`,
          syncPayload,
        });
        break;
      }

      case 'DISCHARGE': {
        let targetBed: Bed | undefined;

        if (parsed.bedId) {
          targetBed = beds.find(b => b.maGiuong.toUpperCase() === parsed.bedId!.toUpperCase());
        } else if (parsed.patientName) {
          const norm = parsed.patientName.trim().toLowerCase();
          targetBed = beds.find(b => b.hoTenBn.trim().toLowerCase() === norm);
        }

        if (!targetBed) {
          setLatestFeedback({
            type: 'error',
            message: `❌ Không tìm thấy thông tin bệnh nhân hoặc giường để làm thủ tục xuất viện.`,
          });
          break;
        }

        if (targetBed.trangThai === 'Trống') {
          setLatestFeedback({
            type: 'error',
            message: `❌ Giường [${targetBed.maGiuong}] hiện đang TRỐNG, không có bệnh nhân để làm thủ tục xuất viện.`,
          });
          break;
        }

        const dischargedPatient = targetBed.hoTenBn;
        const dischargedBed = targetBed.maGiuong;
        onDischargeBed(dischargedBed, 'Xuất viện');

        const syncPayload = {
          action: 'DISCHARGE',
          bedId: dischargedBed,
          note: 'Xuất viện',
        };

        setLatestFeedback({
          type: 'success',
          message: `✅ Đã làm thủ tục xuất viện cho BN ${dischargedPatient} khỏi giường ${dischargedBed}. Dữ liệu đã tự động lưu sang sheet XUẤT VIỆN và giải phóng giường trên sheet PHÒNG (Giường đã khóa cấp trong ngày hôm nay).`,
          syncPayload,
        });

        onRecordSyncLog?.({
          id: `sync-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          action: 'DISCHARGE',
          payload: syncPayload,
          summary: `Xuất viện BN ${dischargedPatient} khỏi ${dischargedBed}`,
        });

        break;
      }

      case 'DELETE_DISCHARGE_HISTORY': {
        const targetName = parsed.patientName!;
        const ok = onDeleteDischargeHistory(targetName);
        if (ok) {
          const syncPayload = {
            action: 'DELETE_DISCHARGE_HISTORY',
            patientName: targetName,
          };

          setLatestFeedback({
            type: 'success',
            message: `✅ Đã xóa bệnh nhân ${targetName} khỏi sheet XUẤT VIỆN. Lịch sử cảnh báo cũ đã được gỡ bỏ.`,
            syncPayload,
          });

          onRecordSyncLog?.({
            id: `sync-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            action: 'DELETE_DISCHARGE_HISTORY',
            payload: syncPayload,
            summary: `Xóa BN ${targetName} khỏi sheet XUẤT VIỆN`,
          });
        } else {
          setLatestFeedback({
            type: 'error',
            message: `❌ Không tìm thấy bệnh nhân [${targetName}] trong sheet XUẤT VIỆN.`,
          });
        }
        break;
      }

      case 'VIEW_DISCHARGE_HISTORY': {
        onOpenDischargeHistoryModal();
        break;
      }

      case 'VIEW_MAP': {
        if (parsed.zone) {
          setSelectedZone(parsed.zone);
        }
        setViewMode('TEXT_MAP');
        break;
      }

      case 'DOWNLOAD_PATIENTS': {
        exportOccupiedPatientsCSV(beds);
        if (onOpenDownloadModal) {
          onOpenDownloadModal();
        }
        const occupiedCount = beds.filter(b => b.trangThai === 'Có người').length;
        setLatestFeedback({
          type: 'success',
          message: `✅ ĐÃ TẢI VỀ DANH SÁCH BỆNH NHÂN THEO GIƯỜNG: Đã xuất thành công file Excel (.CSV UTF-8) danh sách ${occupiedCount} bệnh nhân đang điều trị nội trú.`,
        });
        break;
      }

      default: {
        setLatestFeedback({
          type: 'info',
          message: `Cú pháp hỗ trợ: Cấp giường [Mã] cho BN [Họ tên] | Xuất viện BN [Mã] | Bắt buộc cấp cưỡng bức [Mã] cho BN [Họ tên] | Mở khóa giường [Mã] | Xóa [Họ tên] khỏi lịch sử xuất viện.`,
        });
        break;
      }
    }
  };

  const handleConfirmReAdmit = (actionRequired: NonNullable<AssistantMessage['actionRequired']>) => {
    onAssignBed(
      actionRequired.targetBedId,
      actionRequired.patientName,
      actionRequired.occupancyType || 'Chính thức',
      actionRequired.nextBedId
    );

    const syncPayload = {
      action: 'ASSIGN_BED',
      bedId: actionRequired.targetBedId,
      patientName: actionRequired.patientName,
      note: 'Tái nhập viện',
    };

    setLatestFeedback({
      type: 'success',
      message: `✅ Đã ghi nhận bệnh nhân ${actionRequired.patientName} vào giường ${actionRequired.targetBedId} trên sheet PHÒNG (Tái nhập viện thành công).`,
      syncPayload,
    });

    onRecordSyncLog?.({
      id: `sync-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      action: 'ASSIGN_BED',
      payload: syncPayload,
      summary: `Tái nhập viện ${actionRequired.targetBedId} cho BN ${actionRequired.patientName}`,
    });

    setPendingAction(null);
  };

  const handleConfirmTransfer = (actionRequired: NonNullable<AssistantMessage['actionRequired']>) => {
    if (actionRequired.oldBedId) {
      onTransferBed(actionRequired.oldBedId, actionRequired.targetBedId, actionRequired.patientName);

      const syncPayload = {
        action: 'TRANSFER_BED',
        oldBedId: actionRequired.oldBedId,
        targetBedId: actionRequired.targetBedId,
        patientName: actionRequired.patientName,
      };

      setLatestFeedback({
        type: 'success',
        message: `✅ Đã chuyển bệnh nhân ${actionRequired.patientName} từ giường ${actionRequired.oldBedId} sang giường ${actionRequired.targetBedId} trên sheet PHÒNG. Giường cũ đã được giải phóng.`,
        syncPayload,
      });

      onRecordSyncLog?.({
        id: `sync-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        action: 'TRANSFER_BED',
        payload: syncPayload,
        summary: `Chuyển BN ${actionRequired.patientName} từ ${actionRequired.oldBedId} sang ${actionRequired.targetBedId}`,
      });

      setPendingAction(null);
    }
  };

  const handleConfirmForceAssign = (actionRequired: NonNullable<AssistantMessage['actionRequired']>) => {
    onForceAssignBed(
      actionRequired.targetBedId,
      actionRequired.patientName,
      actionRequired.occupancyType || 'Chính thức',
      actionRequired.nextBedId
    );

    const syncPayload = {
      action: 'ASSIGN_BED',
      bedId: actionRequired.targetBedId,
      patientName: actionRequired.patientName,
      note: 'Cấp cưỡng bức (Vượt khóa xuất viện)',
    };

    setLatestFeedback({
      type: 'success',
      message: `✅ ĐÃ CẤP CƯỠNG BỨC: Đã ghi nhận bệnh nhân ${actionRequired.patientName} vào giường ${actionRequired.targetBedId} trên sheet PHÒNG (Bỏ qua khóa khử khuẩn).`,
      syncPayload,
    });

    onRecordSyncLog?.({
      id: `sync-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      action: 'ASSIGN_BED',
      payload: syncPayload,
      summary: `Cấp cưỡng bức ${actionRequired.targetBedId} cho BN ${actionRequired.patientName}`,
    });

    setPendingAction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    handleCommandExecution(text);
  };

  const handleQuickCommand = (cmd: string) => {
    handleCommandExecution(cmd);
  };

  const textMapContent = useMemo(() => {
    return generateVisualMapText(beds, selectedZone);
  }, [beds, selectedZone]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col space-y-0">
      {/* 1. TOP HEADER: Title & Quick Integration Badges */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-sm sm:text-base tracking-tight text-white">
                BÀN LỆNH ĐIỀU PHỐI VÀ ĐỒNG BỘ DỮ LIỆU TỰ ĐỘNG
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SƠ ĐỒ TRỰC QUAN 93 GIƯỜNG
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kiểm tra an toàn 4 bước bắt buộc • Tự động xuất JSON Payload đồng bộ 2 Sheet (PHÒNG & XUẤT VIỆN)
            </p>
          </div>
        </div>

        {/* Header Actions & Mode Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch Mode: Interactive Grid vs Text Map */}
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'GRID'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Xem sơ đồ dạng lưới ô phòng bệnh trực quan tương tác"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Lưới Ô Trực Quan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TEXT_MAP')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'TEXT_MAP'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Xem định dạng sơ đồ khối trực quan chuẩn báo cáo văn bản"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sơ Đồ Chuẩn Báo Cáo</span>
            </button>
          </div>

          {onOpenDownloadModal && (
            <button
              type="button"
              onClick={onOpenDownloadModal}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-bold shadow-xs"
              title="Tải về danh sách bệnh nhân theo giường (File Excel .CSV UTF-8)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải DS Bệnh Nhân</span>
            </button>
          )}

          {onOpenGoogleSheetsModal && (
            <button
              type="button"
              onClick={onOpenGoogleSheetsModal}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-semibold shadow-xs"
              title="Xem 2 sheet Google Sheets mô phỏng thời gian thực"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Google Sheets (2 Sheet)</span>
              <span className="sm:hidden">Sheets</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenDischargeHistoryModal}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
            title="Xem danh sách bệnh nhân đã xuất viện"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Sheet XV ({dischargeHistory.length})</span>
          </button>
        </div>
      </div>

      {/* 2. COMMAND BAR & QUICK TEST BUTTONS */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 space-y-3">
        {/* Natural Language Command Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={commandInputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Nhập lệnh điều phối (VD: Cấp giường H003 cho BN NGUYỄN VĂN A, Xuất viện BN H001, Mở khóa giường H002)..."
              className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs font-sans"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Thực Hiện</span>
          </button>
        </form>

        {/* 4 Rules Quick Test Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Thử nhanh 4 quy tắc:
          </span>
          <button
            type="button"
            onClick={() => handleQuickCommand('Cấp giường H002 cho BN NGUYỄN VĂN A')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Thử quy tắc 1: Khóa giường xuất viện trong ngày (H002 đã có BN xuất viện hôm nay)"
          >
            🚫 1. Khóa Giường XV (H002)
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Cấp giường H001 cho BN TRẦN THỊ MAI')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Thử quy tắc 2: Lỗi trùng giường (H001 đang có BN)"
          >
            🚫 2. Trùng Giường (H001)
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Cấp giường H004 cho BN TRẦN VĂN AN')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Thử quy tắc 3: Cảnh báo bệnh nhân từng xuất viện (TRẦN VĂN AN trong lịch sử xuất viện)"
          >
            ⚠️ 3. Tái Nhập Viện (TRẦN VĂN AN)
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Cấp giường H004 cho BN PHẠM THỊ HAI')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Thử quy tắc 4: Cảnh báo chuyển giường (PHẠM THỊ HAI đang nằm H003)"
          >
            ⚠️ 4. Chuyển Giường (PHẠM THỊ HAI)
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Xuất viện BN H001')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Thử lệnh xuất viện và xuất JSON DISCHARGE"
          >
            📤 Xuất Viện (H001)
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Bắt buộc cấp cưỡng bức giường H002 cho BN HOÀNG VĂN LONG')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-900 border border-rose-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Thử lệnh cấp cưỡng bức vượt qua khóa khử khuẩn"
          >
            ⚡ Cấp Cưỡng Bức (H002)
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Mở khóa giường H002')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Mở khóa giường H002 sau khi hoàn tất khử khuẩn"
          >
            🔓 Mở Khóa H002
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Xóa TRẦN VĂN AN khỏi lịch sử xuất viện')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium transition-colors shadow-2xs text-[11px]"
            title="Thử xóa khỏi lịch sử xuất viện và xuất JSON DELETE_DISCHARGE_HISTORY"
          >
            🗑️ Xóa LSXV (TRẦN VĂN AN)
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('Tải danh sách bệnh nhân')}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold transition-colors shadow-2xs text-[11px] flex items-center gap-1"
            title="Thực hiện lệnh: Tải danh sách bệnh nhân theo giường"
          >
            <Download className="w-3 h-3 text-emerald-700" />
            <span>📥 Tải DS Bệnh Nhân</span>
          </button>
        </div>

        {/* 3. NOTIFICATION & FEEDBACK BANNER (Latest Action Result & Confirmation) */}
        {latestFeedback && (
          <div
            className={`rounded-xl p-3 border text-xs transition-all ${
              latestFeedback.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : latestFeedback.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : latestFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                {latestFeedback.type === 'error' && (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                {latestFeedback.type === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                {latestFeedback.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {latestFeedback.type === 'info' && (
                  <Terminal className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold leading-relaxed whitespace-pre-line">
                    {latestFeedback.message}
                  </div>

                  {/* Confirmation Actions if pending */}
                  {pendingAction && (
                    <div className="mt-2.5 pt-2 border-t border-amber-200 flex flex-wrap items-center gap-2">
                      {pendingAction.actionType === 'RE_ADMIT' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmReAdmit(pendingAction)}
                          className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                        >
                          Xác Nhận Cho Nhập Viện Lại
                        </button>
                      )}
                      {pendingAction.actionType === 'TRANSFER_BED' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmTransfer(pendingAction)}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                        >
                          Xác Nhận Chuyển Sang Giường {pendingAction.targetBedId}
                        </button>
                      )}
                      {pendingAction.actionType === 'FORCE_ASSIGN' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmForceAssign(pendingAction)}
                          className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                        >
                          Xác Nhận Cấp Cưỡng Bức
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction(null);
                          setLatestFeedback({
                            type: 'info',
                            message: 'Đã hủy bỏ thao tác điều phối.',
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs"
                      >
                        Hủy Bỏ
                      </button>
                      <span className="text-[11px] text-slate-500 italic">
                        (Hoặc gõ "Xác nhận" / "Hủy bỏ" trên thanh lệnh)
                      </span>
                    </div>
                  )}

                  {/* Google Sheets JSON Sync Payload block */}
                  {latestFeedback.syncPayload && (
                    <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 overflow-hidden text-[11px] shadow-xs">
                      <div className="px-3 py-1 bg-slate-800 flex items-center justify-between">
                        <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          GOOGLE SHEET PAYLOAD ĐỒNG BỘ:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(JSON.stringify(latestFeedback.syncPayload, null, 2))
                          }
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1 transition-colors"
                        >
                          {copiedPayload ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Đã chép!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                        {JSON.stringify(latestFeedback.syncPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLatestFeedback(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. SƠ ĐỒ TRỰC QUAN 93 GIƯỜNG (Main Body Canvas) */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Filter Controls Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Zone Selector Tabs */}
            <div className="inline-flex rounded-lg bg-slate-200/70 p-1 border border-slate-300">
              <button
                type="button"
                onClick={() => setSelectedZone('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedZone === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Toàn Viện ({countTotal})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedZone('KHU NỘI NHI')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedZone === 'KHU NỘI NHI'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>Khu Nội Nhi (50)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedZone('KHU LÂY')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedZone === 'KHU LÂY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>Khu Lây (43)</span>
              </button>
            </div>

            {/* Quick Search & Download Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã giường, tên BN, tên phòng..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8.5 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Download Button */}
              <button
                type="button"
                onClick={() => exportOccupiedPatientsCSV(beds)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors shadow-2xs"
                title="Tải ngay danh sách bệnh nhân đang nằm (File Excel .CSV UTF-8)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Tải DS BN (.CSV)</span>
                <span className="sm:hidden">Tải CSV</span>
              </button>

              {onOpenDownloadModal && (
                <button
                  type="button"
                  onClick={onOpenDownloadModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition-colors shadow-2xs"
                  title="Mở bảng xem trước và tùy chọn tải về"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden md:inline">Tùy Chọn Tải...</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
              Trạng thái:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Tất cả ({beds.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-300 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Trống khả dụng ({countAvailable})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OCCUPIED')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'OCCUPIED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-slate-300 text-rose-800 hover:bg-rose-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
              <span>Đang nằm ({countOccupied})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('LOCKED')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'LOCKED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-300 text-amber-900 hover:bg-amber-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              <span>Khóa XV hôm nay ({countLocked})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('TEMP')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'TEMP'
                  ? 'bg-amber-700 text-white'
                  : 'bg-white border border-slate-300 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
              <span>Nằm tạm ({countTemp})</span>
            </button>
          </div>
        </div>

        {/* View Mode A: Interactive Grid of 93 Beds grouped by Room */}
        {viewMode === 'GRID' && (
          <div className="space-y-6">
            {roomGroups.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                <p className="text-sm font-semibold">Không tìm thấy giường bệnh nào khớp với bộ lọc.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedZone('ALL');
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs text-emerald-700 hover:underline font-semibold"
                >
                  Xóa toàn bộ bộ lọc
                </button>
              </div>
            ) : (
              roomGroups.map(room => (
                <div
                  key={room.phongCode}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  {/* Room Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                        <span className="text-emerald-700">🏥</span> {room.tenPhong}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                        {room.khuVuc}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span>Tổng: <strong className="text-slate-800">{room.totalBeds}</strong> giường</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">
                        {room.availableBeds} trống khả dụng
                      </span>
                      {room.lockedBeds > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-800 font-semibold">
                            {room.lockedBeds} khóa XV
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-rose-700 font-semibold">
                        {room.occupiedBeds} đang nằm
                      </span>
                    </div>
                  </div>

                  {/* Bed Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
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
              ))
            )}
          </div>
        )}

        {/* View Mode B: Standard ASCII / Text Visual Map Format */}
        {viewMode === 'TEXT_MAP' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 text-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-800/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                <FileText className="w-4 h-4" />
                <span>SƠ ĐỒ TRỰC QUAN KHỐI PHÒNG (CHUẨN BÁO CÁO VĂN BẢN)</span>
              </div>
              <button
                type="button"
                onClick={() => copyTextMap(textMapContent)}
                className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copiedTextMap ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Đã Sao Chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao Chép Sơ Đồ</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
              <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre font-normal">
                {textMapContent}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
