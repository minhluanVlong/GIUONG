import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bed, DischargeRecord, OccupancyType, CheckResult, SyncPayloadLog } from './types';
import { INITIAL_BEDS, INITIAL_DISCHARGE_HISTORY } from './data/initialBeds';
import { Header } from './components/Header';
import { AssistantConsole } from './components/AssistantConsole';
import { AssignModal } from './components/AssignModal';
import { BedDetailModal } from './components/BedDetailModal';
import { DischargeHistoryModal } from './components/DischargeHistoryModal';
import { VisualMapModal } from './components/VisualMapModal';
import { AlertModal } from './components/AlertModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { DownloadPatientListModal } from './components/DownloadPatientListModal';
import { normalizeName } from './utils/bedManagement';

const BEDS_STORAGE_KEY = 'smart_bed_management_beds_v3';
const HISTORY_STORAGE_KEY = 'smart_bed_management_history_v3';
const SYNC_LOGS_STORAGE_KEY = 'smart_bed_management_sync_logs_v2';
const BROADCAST_CHANNEL_NAME = 'smart_bed_channel_v1';

export default function App() {
  // Synchronous initial fallback from localStorage
  const [beds, setBeds] = useState<Bed[]>(() => {
    try {
      const saved = localStorage.getItem(BEDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback to initial
    }
    return INITIAL_BEDS;
  });

  const [dischargeHistory, setDischargeHistory] = useState<DischargeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_DISCHARGE_HISTORY;
  });

  const [syncLogs, setSyncLogs] = useState<SyncPayloadLog[]>(() => {
    try {
      const saved = localStorage.getItem(SYNC_LOGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'sync-init-1',
        timestamp: '07:30',
        action: 'DISCHARGE',
        payload: {
          action: 'DISCHARGE',
          bedId: 'H002',
          note: 'Xuất viện (Khóa giường trong ngày)',
        },
        summary: 'Xuất viện BN LÊ VĂN TÁM khỏi H002',
      },
    ];
  });

  // Server synchronization state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local' | 'error'>('syncing');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const isInitialLoadDoneRef = useRef(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Fetch persistent data from server on initial mount
  const fetchFromServer = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.beds) && data.beds.length > 0) {
        setBeds(data.beds);
        if (Array.isArray(data.dischargeHistory)) {
          setDischargeHistory(data.dischargeHistory);
        }
        if (Array.isArray(data.syncLogs)) {
          setSyncLogs(data.syncLogs);
        }
        // Also save to localStorage as offline cache
        try {
          localStorage.setItem(BEDS_STORAGE_KEY, JSON.stringify(data.beds));
          if (data.dischargeHistory) {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(data.dischargeHistory));
          }
          if (data.syncLogs) {
            localStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(data.syncLogs));
          }
        } catch (e) {
          console.warn('localStorage cache update failed', e);
        }

        const timeStr = new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedTime(timeStr);
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('Server fetch error, running with local storage cache:', err);
      setSyncStatus('local');
    } finally {
      isInitialLoadDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    fetchFromServer();

    // Setup cross-tab BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_DATA') {
            if (Array.isArray(event.data.beds)) setBeds(event.data.beds);
            if (Array.isArray(event.data.dischargeHistory)) setDischargeHistory(event.data.dischargeHistory);
            if (Array.isArray(event.data.syncLogs)) setSyncLogs(event.data.syncLogs);
            setSyncStatus('synced');
            setLastSavedTime(
              new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            );
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported or denied', e);
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [fetchFromServer]);

  // 2. Persist to localStorage and Server whenever beds/history/logs change
  useEffect(() => {
    // Crucial: Skip initial render before server data has been loaded!
    if (!isInitialLoadDoneRef.current) {
      return;
    }

    // A. LocalStorage cache immediate write
    try {
      localStorage.setItem(BEDS_STORAGE_KEY, JSON.stringify(beds));
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(dischargeHistory));
      localStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(syncLogs));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }

    // B. Broadcast to other open tabs
    try {
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_DATA',
        beds,
        dischargeHistory,
        syncLogs,
      });
    } catch (e) {
      // ignore
    }

    // C. Debounced save to Server API
    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ beds, dischargeHistory, syncLogs }),
        });
        if (res.ok) {
          const timeStr = new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastSavedTime(timeStr);
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      } catch (e) {
        console.warn('Failed to sync to server, data remains in localStorage:', e);
        setSyncStatus('local');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [beds, dischargeHistory, syncLogs]);

  // Modals state
  const [selectedBedForDetail, setSelectedBedForDetail] = useState<Bed | null>(null);
  const [selectedBedForAssign, setSelectedBedForAssign] = useState<Bed | null>(null);
  const [initialPatientForAssign, setInitialPatientForAssign] = useState<string>('');

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isVisualMapOpen, setIsVisualMapOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [visualMapZone, setVisualMapZone] = useState<'ALL' | 'KHU NỘI NHI' | 'KHU LÂY'>('ALL');

  const handleRecordSyncLog = (log: SyncPayloadLog) => {
    setSyncLogs(prev => [log, ...prev].slice(0, 50));
  };

  // 4-step check alert modal state
  const [alertData, setAlertData] = useState<{
    result: CheckResult;
    targetBedId: string;
    patientName: string;
    occupancyType: OccupancyType;
    nextBedId?: string;
  } | null>(null);

  // Business Action: Assign Bed (Standard)
  const handleAssignBed = (
    bedId: string,
    patientName: string,
    occupancyType: OccupancyType = 'Chính thức',
    nextBedId?: string
  ) => {
    const norm = normalizeName(patientName);
    setBeds(prev =>
      prev.map(bed => {
        if (bed.maGiuong.toUpperCase() === bedId.toUpperCase()) {
          return {
            ...bed,
            hoTenBn: norm,
            trangThai: 'Có người',
            loaiNam: occupancyType,
            giuongHomSau: occupancyType === 'Nằm tạm' ? nextBedId : undefined,
            ngayVao: new Date().toISOString(),
            khoaXuatVienHomNay: false,
            benhNhanVuaXuatVien: undefined,
            thoiGianXuatVienHomNay: undefined,
          };
        }
        return bed;
      })
    );
  };

  // Business Action: Force Assign Bed (Overrides same-day discharge lock)
  const handleForceAssignBed = (
    bedId: string,
    patientName: string,
    occupancyType: OccupancyType = 'Chính thức',
    nextBedId?: string
  ) => {
    const norm = normalizeName(patientName);
    setBeds(prev =>
      prev.map(bed => {
        if (bed.maGiuong.toUpperCase() === bedId.toUpperCase()) {
          return {
            ...bed,
            hoTenBn: norm,
            trangThai: 'Có người',
            loaiNam: occupancyType,
            giuongHomSau: occupancyType === 'Nằm tạm' ? nextBedId : undefined,
            ngayVao: new Date().toISOString(),
            khoaXuatVienHomNay: false,
            benhNhanVuaXuatVien: undefined,
            thoiGianXuatVienHomNay: undefined,
          };
        }
        return bed;
      })
    );
  };

  // Business Action: Transfer Bed
  const handleTransferBed = (oldBedId: string, targetBedId: string, patientName: string) => {
    const norm = normalizeName(patientName);
    setBeds(prev =>
      prev.map(bed => {
        // Free the old bed
        if (bed.maGiuong.toUpperCase() === oldBedId.toUpperCase()) {
          return {
            ...bed,
            hoTenBn: '',
            trangThai: 'Trống',
            loaiNam: 'Chính thức',
            giuongHomSau: undefined,
            khoaXuatVienHomNay: false,
            benhNhanVuaXuatVien: undefined,
            thoiGianXuatVienHomNay: undefined,
          };
        }
        // Assign the new bed
        if (bed.maGiuong.toUpperCase() === targetBedId.toUpperCase()) {
          return {
            ...bed,
            hoTenBn: norm,
            trangThai: 'Có người',
            loaiNam: 'Chính thức',
            giuongHomSau: undefined,
            ngayVao: new Date().toISOString(),
            khoaXuatVienHomNay: false,
            benhNhanVuaXuatVien: undefined,
            thoiGianXuatVienHomNay: undefined,
          };
        }
        return bed;
      })
    );
  };

  // Business Action: Discharge Bed (Locks bed for same-day assignment)
  const handleDischargeBed = (bedId: string, note = 'Xuất viện hoàn thành điều trị') => {
    const target = beds.find(b => b.maGiuong.toUpperCase() === bedId.toUpperCase());
    if (!target || target.trangThai === 'Trống' || !target.hoTenBn.trim()) {
      return;
    }

    const patientName = target.hoTenBn;
    const timeString = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // 1. Update Bed to Trống AND lock for today
    setBeds(prev =>
      prev.map(bed => {
        if (bed.maGiuong.toUpperCase() === bedId.toUpperCase()) {
          return {
            ...bed,
            hoTenBn: '',
            trangThai: 'Trống',
            loaiNam: 'Chính thức',
            giuongHomSau: undefined,
            khoaXuatVienHomNay: true,
            benhNhanVuaXuatVien: patientName,
            thoiGianXuatVienHomNay: timeString,
          };
        }
        return bed;
      })
    );

    // 2. Automatically save to "Lịch sử xuất viện"
    const newRecord: DischargeRecord = {
      id: `dc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      hoTenBn: patientName,
      giuongCu: target.maGiuong,
      thoiGian: new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      ghiChu: note,
    };

    setDischargeHistory(prev => [newRecord, ...prev]);
  };

  // Business Action: Unlock Bed manually
  const handleUnlockBed = (bedId: string) => {
    setBeds(prev =>
      prev.map(bed => {
        if (bed.maGiuong.toUpperCase() === bedId.toUpperCase()) {
          return {
            ...bed,
            khoaXuatVienHomNay: false,
            benhNhanVuaXuatVien: undefined,
            thoiGianXuatVienHomNay: undefined,
          };
        }
        return bed;
      })
    );
  };

  // Business Action: Delete from discharge history
  const handleDeleteDischargeHistory = (patientName: string): boolean => {
    const norm = normalizeName(patientName);
    const exists = dischargeHistory.some(d => normalizeName(d.hoTenBn) === norm);
    if (!exists) return false;
    setDischargeHistory(prev => prev.filter(d => normalizeName(d.hoTenBn) !== norm));
    return true;
  };

  const handleDeleteSingleRecord = (recordId: string) => {
    setDischargeHistory(prev => prev.filter(d => d.id !== recordId));
  };

  // Reset to initial data provided in prompt
  const handleResetData = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục lại dữ liệu ban đầu theo file danh sách 93 giường bệnh?')) {
      setBeds(INITIAL_BEDS);
      setDischargeHistory(INITIAL_DISCHARGE_HISTORY);
      try {
        localStorage.removeItem(BEDS_STORAGE_KEY);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        localStorage.removeItem(SYNC_LOGS_STORAGE_KEY);
        await fetch('/api/reset', { method: 'POST' });
        setSyncStatus('synced');
        setLastSavedTime(
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (e) {
        console.warn('Reset server failed, reset locally', e);
      }
    }
  };

  // Force sync immediately to server
  const handleForceSyncToServer = async () => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beds, dischargeHistory, syncLogs }),
      });
      if (res.ok) {
        setSyncStatus('synced');
        setLastSavedTime(
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('local');
    }
  };

  const handleOpenAssignForBed = (bed: Bed, patientName = '') => {
    setSelectedBedForAssign(bed);
    setInitialPatientForAssign(patientName);
  };

  const handleQuickAssign = (bed: Bed) => {
    handleOpenAssignForBed(bed);
  };

  const handleQuickDischarge = (bed: Bed) => {
    if (window.confirm(`Xác nhận làm thủ tục xuất viện cho bệnh nhân [${bed.hoTenBn}] tại giường [${bed.maGiuong}]?`)) {
      handleDischargeBed(bed.maGiuong, 'Xuất viện nhanh từ sơ đồ giường');
    }
  };

  const handleSelectBedForDetail = (bed: Bed) => {
    setSelectedBedForDetail(bed);
  };

  const handleSelectForReAdmit = (patientName: string) => {
    // Find first available bed (prefer non-locked first)
    const firstEmpty = beds.find(b => b.trangThai === 'Trống' && !b.khoaXuatVienHomNay) ||
      beds.find(b => b.trangThai === 'Trống');
    if (firstEmpty) {
      handleOpenAssignForBed(firstEmpty, patientName);
    } else {
      window.alert('Hiện tại toàn viện không còn giường trống nào!');
    }
  };

  const handleOpenVisualMapModal = (zone: 'ALL' | 'KHU NỘI NHI' | 'KHU LÂY' = 'ALL') => {
    setVisualMapZone(zone);
    setIsVisualMapOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <Header
        beds={beds}
        dischargeHistory={dischargeHistory}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenVisualMap={() => handleOpenVisualMapModal('ALL')}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onResetData={handleResetData}
        syncStatus={syncStatus}
        lastSavedTime={lastSavedTime}
        onRefreshFromServer={fetchFromServer}
        onForceSyncToServer={handleForceSyncToServer}
      />

      {/* Main Content Area: Unified Bàn Lệnh Điều Phối & Sơ Đồ Trực Quan 93 Giường */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <section aria-label="Bàn Lệnh Điều Phối Và Sơ Đồ Trực Quan 93 Giường">
          <AssistantConsole
            beds={beds}
            dischargeHistory={dischargeHistory}
            onAssignBed={handleAssignBed}
            onForceAssignBed={handleForceAssignBed}
            onTransferBed={handleTransferBed}
            onDischargeBed={handleDischargeBed}
            onDeleteDischargeHistory={handleDeleteDischargeHistory}
            onUnlockBed={handleUnlockBed}
            onOpenVisualMapModal={handleOpenVisualMapModal}
            onOpenDischargeHistoryModal={() => setIsHistoryOpen(true)}
            onOpenGoogleSheetsModal={() => setIsGoogleSheetsOpen(true)}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            onRecordSyncLog={handleRecordSyncLog}
            onSelectBed={handleSelectBedForDetail}
            onQuickDischarge={handleQuickDischarge}
            onQuickAssign={handleQuickAssign}
          />
        </section>
      </main>

      {/* Modals & Drawers */}
      {selectedBedForAssign && (
        <AssignModal
          bed={selectedBedForAssign}
          allBeds={beds}
          dischargeHistory={dischargeHistory}
          initialPatientName={initialPatientForAssign}
          onClose={() => {
            setSelectedBedForAssign(null);
            setInitialPatientForAssign('');
          }}
          onAssign={handleAssignBed}
          onTriggerAlert={(result, targetBedId, patientName, occupancyType, nextBedId) => {
            setSelectedBedForAssign(null);
            setAlertData({
              result,
              targetBedId,
              patientName,
              occupancyType,
              nextBedId,
            });
          }}
        />
      )}

      {selectedBedForDetail && (
        <BedDetailModal
          bed={selectedBedForDetail}
          allBeds={beds}
          onClose={() => setSelectedBedForDetail(null)}
          onOpenAssign={bed => handleOpenAssignForBed(bed)}
          onDischarge={handleDischargeBed}
          onTransfer={handleTransferBed}
          onUnlockBed={handleUnlockBed}
        />
      )}

      {isHistoryOpen && (
        <DischargeHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          dischargeHistory={dischargeHistory}
          onSelectForReAdmit={handleSelectForReAdmit}
          onDeleteRecord={handleDeleteSingleRecord}
        />
      )}

      {isVisualMapOpen && (
        <VisualMapModal
          isOpen={isVisualMapOpen}
          onClose={() => setIsVisualMapOpen(false)}
          beds={beds}
          initialZone={visualMapZone}
        />
      )}

      {/* 4-Step Verification Warning / Error Modal */}
      {alertData && (
        <AlertModal
          alertData={alertData}
          onClose={() => setAlertData(null)}
          onConfirmReAdmit={() => {
            if (alertData) {
              handleAssignBed(
                alertData.targetBedId,
                alertData.patientName,
                alertData.occupancyType,
                alertData.nextBedId
              );
              setAlertData(null);
            }
          }}
          onConfirmTransfer={(oldBedId, targetBedId, patientName) => {
            handleTransferBed(oldBedId, targetBedId, patientName);
            setAlertData(null);
          }}
          onForceAssign={(targetBedId, patientName, occupancyType, nextBedId) => {
            handleForceAssignBed(targetBedId, patientName, occupancyType, nextBedId);
            setAlertData(null);
          }}
        />
      )}

      {/* Google Sheets Sync & 2-Sheet Live View Modal */}
      {isGoogleSheetsOpen && (
        <GoogleSheetsModal
          isOpen={isGoogleSheetsOpen}
          onClose={() => setIsGoogleSheetsOpen(false)}
          beds={beds}
          dischargeHistory={dischargeHistory}
          syncLogs={syncLogs}
        />
      )}

      {/* Download Patient List by Bed Modal */}
      {isDownloadModalOpen && (
        <DownloadPatientListModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          beds={beds}
          dischargeHistory={dischargeHistory}
        />
      )}
    </div>
  );
}
