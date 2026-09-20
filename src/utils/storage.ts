import { Bed, DischargeRecord, SyncPayloadLog } from '../types';
import { INITIAL_BEDS, INITIAL_DISCHARGE_HISTORY } from '../data/initialBeds';

export const STORAGE_KEYS = {
  BEDS: 'smart_bed_management_beds',
  HISTORY: 'smart_bed_management_history',
  SYNC_LOGS: 'smart_bed_management_sync_logs',
  LAST_MODIFIED: 'smart_bed_management_last_modified',
  LEGACY_BED_KEYS: [
    'smart_bed_management_beds_v3',
    'smart_bed_management_beds_v2',
    'smart_bed_management_beds_v1',
    'smart_bed_management_beds',
  ],
  LEGACY_HISTORY_KEYS: [
    'smart_bed_management_history_v3',
    'smart_bed_management_history_v2',
    'smart_bed_management_history_v1',
    'smart_bed_management_history',
  ],
  LEGACY_LOGS_KEYS: [
    'smart_bed_management_sync_logs_v2',
    'smart_bed_management_sync_logs_v1',
    'smart_bed_management_sync_logs',
  ],
};

export interface StoredHospitalData {
  beds: Bed[];
  dischargeHistory: DischargeRecord[];
  syncLogs: SyncPayloadLog[];
  lastModified: number; // epoch ms
}

/**
 * Loads the current hospital data with full backward compatibility
 * checking legacy keys so no user data is ever lost.
 */
export function loadHospitalData(): StoredHospitalData {
  let beds: Bed[] | null = null;
  let history: DischargeRecord[] | null = null;
  let logs: SyncPayloadLog[] | null = null;
  let lastModified = 0;

  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      beds: INITIAL_BEDS,
      dischargeHistory: INITIAL_DISCHARGE_HISTORY,
      syncLogs: [],
      lastModified: Date.now(),
    };
  }

  // 1. Try to load beds from all known keys
  for (const key of STORAGE_KEYS.LEGACY_BED_KEYS) {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) {
          beds = parsed;
          break;
        }
      }
    } catch (e) {
      console.warn(`Failed reading beds from ${key}`, e);
    }
  }

  // 2. Try to load history
  for (const key of STORAGE_KEYS.LEGACY_HISTORY_KEYS) {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          history = parsed;
          break;
        }
      }
    } catch (e) {
      console.warn(`Failed reading history from ${key}`, e);
    }
  }

  // 3. Try to load sync logs
  for (const key of STORAGE_KEYS.LEGACY_LOGS_KEYS) {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          logs = parsed;
          break;
        }
      }
    } catch (e) {
      console.warn(`Failed reading sync logs from ${key}`, e);
    }
  }

  // 4. Last modified timestamp
  try {
    const rawLm = localStorage.getItem(STORAGE_KEYS.LAST_MODIFIED);
    if (rawLm) {
      lastModified = parseInt(rawLm, 10) || 0;
    }
  } catch {
    lastModified = 0;
  }

  // Fallback if none found
  const resolvedBeds = beds && beds.length > 0 ? beds : INITIAL_BEDS;
  const resolvedHistory = history !== null ? history : INITIAL_DISCHARGE_HISTORY;
  const resolvedLogs = logs !== null ? logs : [];

  return {
    beds: resolvedBeds,
    dischargeHistory: resolvedHistory,
    syncLogs: resolvedLogs,
    lastModified: lastModified || Date.now(),
  };
}

/**
 * Saves hospital data synchronously and immediately to localStorage.
 * Updates the canonical key and all backward-compatible keys.
 */
export function saveHospitalDataImmediately(
  beds: Bed[],
  dischargeHistory: DischargeRecord[],
  syncLogs: SyncPayloadLog[]
): number {
  if (typeof window === 'undefined' || !window.localStorage) return Date.now();

  const timestamp = Date.now();
  try {
    const bedsJson = JSON.stringify(beds);
    const historyJson = JSON.stringify(dischargeHistory);
    const logsJson = JSON.stringify(syncLogs.slice(0, 100));

    // Save canonical keys
    localStorage.setItem(STORAGE_KEYS.BEDS, bedsJson);
    localStorage.setItem(STORAGE_KEYS.HISTORY, historyJson);
    localStorage.setItem(STORAGE_KEYS.SYNC_LOGS, logsJson);
    localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, timestamp.toString());

    // Also update v3 key for compatibility
    localStorage.setItem('smart_bed_management_beds_v3', bedsJson);
    localStorage.setItem('smart_bed_management_history_v3', historyJson);
    localStorage.setItem('smart_bed_management_sync_logs_v2', logsJson);
  } catch (err) {
    console.error('Critical error saving to localStorage:', err);
  }

  return timestamp;
}

/**
 * Download complete backup file (JSON)
 */
export function exportHospitalBackupJSON(
  beds: Bed[],
  dischargeHistory: DischargeRecord[],
  syncLogs: SyncPayloadLog[]
) {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    totalBeds: beds.length,
    occupiedBeds: beds.filter(b => b.trangThai === 'Có người').length,
    beds,
    dischargeHistory,
    syncLogs,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sao_luu_giuong_benh_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports and validates a hospital backup JSON file
 */
export async function importHospitalBackupJSON(file: File): Promise<{
  success: boolean;
  beds?: Bed[];
  dischargeHistory?: DischargeRecord[];
  syncLogs?: SyncPayloadLog[];
  message: string;
}> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!parsed || !Array.isArray(parsed.beds) || parsed.beds.length === 0) {
      return {
        success: false,
        message: 'File sao lưu không hợp lệ: Không tìm thấy danh sách giường bệnh hợp lệ.',
      };
    }

    const beds: Bed[] = parsed.beds;
    const dischargeHistory: DischargeRecord[] = Array.isArray(parsed.dischargeHistory)
      ? parsed.dischargeHistory
      : [];
    const syncLogs: SyncPayloadLog[] = Array.isArray(parsed.syncLogs) ? parsed.syncLogs : [];

    // Immediately persist
    saveHospitalDataImmediately(beds, dischargeHistory, syncLogs);

    return {
      success: true,
      beds,
      dischargeHistory,
      syncLogs,
      message: `Đã khôi phục thành công ${beds.length} giường bệnh (${
        beds.filter(b => b.trangThai === 'Có người').length
      } bệnh nhân đang nằm).`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi đọc file sao lưu JSON: ${err?.message || 'Định dạng file không đúng'}`,
    };
  }
}
