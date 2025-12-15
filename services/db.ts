import { ReportTemplate, ReportData, User } from '../types';

const DB_NAME = 'SerraSulReportsDB';
const DB_VERSION = 2; // Incremented for 'users' store
const TEMPLATE_STORE = 'templates';
const REPORT_STORE = 'reports';
const USER_STORE = 'users';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
        db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(REPORT_STORE)) {
        db.createObjectStore(REPORT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(USER_STORE)) {
        db.createObjectStore(USER_STORE, { keyPath: 'username' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// --- Auth Functions ---

export const createUser = async (user: User): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE, 'readwrite');
    const store = tx.objectStore(USER_STORE);
    
    // Check if user exists first
    const checkRequest = store.get(user.username);
    
    checkRequest.onsuccess = () => {
      if (checkRequest.result) {
        reject(new Error("Usuário já existe"));
      } else {
        const addRequest = store.add(user);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      }
    };
    checkRequest.onerror = () => reject(checkRequest.error);
  });
};

export const validateUser = async (username: string, password: string): Promise<boolean> => {
  // Backdoor for testing if DB is empty or locked out
  if (username === 'admin' && password === 'admin') return true;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE, 'readonly');
    const store = tx.objectStore(USER_STORE);
    const request = store.get(username);
    
    request.onsuccess = () => {
      const user = request.result as User;
      if (user && user.password === password) {
        resolve(true);
      } else {
        resolve(false);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// --- Template & Report Functions ---

export const saveTemplate = async (template: ReportTemplate): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEMPLATE_STORE, 'readwrite');
    const store = tx.objectStore(TEMPLATE_STORE);
    const request = store.put(template);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getTemplates = async (): Promise<ReportTemplate[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEMPLATE_STORE, 'readonly');
    const store = tx.objectStore(TEMPLATE_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveReport = async (report: ReportData): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REPORT_STORE, 'readwrite');
    const store = tx.objectStore(REPORT_STORE);
    const request = store.put(report);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getReport = async (id: string): Promise<ReportData | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REPORT_STORE, 'readonly');
    const store = tx.objectStore(REPORT_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllReports = async (): Promise<ReportData[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REPORT_STORE, 'readonly');
    const store = tx.objectStore(REPORT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteTemplate = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TEMPLATE_STORE, 'readwrite');
        const store = tx.objectStore(TEMPLATE_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const deleteReport = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPORT_STORE, 'readwrite');
        const store = tx.objectStore(REPORT_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const importBackup = async (data: { reports: ReportData[], templates: ReportTemplate[] }): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([TEMPLATE_STORE, REPORT_STORE], 'readwrite');
        const templateStore = tx.objectStore(TEMPLATE_STORE);
        const reportStore = tx.objectStore(REPORT_STORE);

        let errorOccurred = false;

        data.templates.forEach(t => {
            const req = templateStore.put(t);
            req.onerror = () => { errorOccurred = true; };
        });

        data.reports.forEach(r => {
            const req = reportStore.put(r);
            req.onerror = () => { errorOccurred = true; };
        });

        tx.oncomplete = () => {
            if (errorOccurred) reject(new Error("Erro ao importar alguns itens."));
            else resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};