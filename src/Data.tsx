interface AttendanceRecord {
  month: string;
  workingDays: string[];
  holidays: string[];
  attendancePercentage: number;
}

class AttendanceDB {
  private dbName = 'AttendanceTracker';
  private dbVersion = 1;
  private storeName = 'attendance';

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'month' });
        }
      };
    });
  }

  async saveMonthlyRecord(record: AttendanceRecord): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const monthDate = new Date(record.month + '-01');
      const filteredRecord = {
        ...record,
        workingDays: record.workingDays.filter(date => {
          const d = new Date(date);
          return d.getMonth() === monthDate.getMonth() && 
                 d.getFullYear() === monthDate.getFullYear();
        }),
        holidays: record.holidays.filter(date => {
          const d = new Date(date);
          return d.getMonth() === monthDate.getMonth() && 
                 d.getFullYear() === monthDate.getFullYear();
        })
      };

      const request = store.put(filteredRecord);

      request.onerror = () => {
        console.error('Error saving record:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('Successfully saved record:', filteredRecord);
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  async deleteMonthlyRecord(month: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const request = store.delete(month);

      request.onerror = () => {
        console.error('Error deleting record:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('Successfully deleted record for month:', month);
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  async getMonthlyRecord(month: string): Promise<AttendanceRecord | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.get(month);

      request.onerror = () => {
        console.error('Error getting record:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const record = request.result;
        console.log('Retrieved record for month:', month, record);
        resolve(record || null);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  async getAllRecords(): Promise<AttendanceRecord[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Error getting all records:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const records = request.result;
        console.log('Retrieved all records:', records);
        resolve(records || []);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
}

export const attendanceDB = new AttendanceDB();