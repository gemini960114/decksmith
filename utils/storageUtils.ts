import { ProjectJob, PdfPage, PdfPageMetadata } from '../types';
import { STORAGE_CONFIG } from '../constants';

const STORAGE_KEY_API = STORAGE_CONFIG.API_KEY;
const STORAGE_PREFIX_JOBS = STORAGE_CONFIG.JOBS_PREFIX;

// 1. API Key Management (Simple Obfuscation)
export const saveApiKey = (apiKey: string) => {
    localStorage.setItem(STORAGE_KEY_API, btoa(apiKey));
};

export const loadApiKey = (): string | null => {
    const stored = localStorage.getItem(STORAGE_KEY_API);
    if (!stored) return null;
    try {
        return atob(stored);
    } catch {
        return null;
    }
};

export const clearApiKey = () => {
    localStorage.removeItem(STORAGE_KEY_API);
};

// 2. Data Isolation (Hash generation)
const generateKeyHash = async (apiKey: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

// 3. Jobs Management
export const saveJobsToStorage = async (apiKey: string, jobs: ProjectJob[]) => {
    const hash = await generateKeyHash(apiKey);
    localStorage.setItem(`${STORAGE_PREFIX_JOBS}${hash}`, JSON.stringify(jobs));
};

export const loadJobsFromStorage = async (apiKey: string): Promise<ProjectJob[]> => {
    const hash = await generateKeyHash(apiKey);
    const stored = localStorage.getItem(`${STORAGE_PREFIX_JOBS}${hash}`);
    return stored ? JSON.parse(stored) : [];
};

// Helper: Convert Full Page to Metadata (Strip Images)
export const stripImagesFromPage = (page: PdfPage): PdfPageMetadata => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { originalDataUrl, cleanedDataUrl, ...metadata } = page;
    return metadata;
};
