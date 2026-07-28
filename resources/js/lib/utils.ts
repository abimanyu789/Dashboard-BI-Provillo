import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/**
 * SSR-safe UUID v4 for idempotency keys.
 * Avoids browser-only APIs during module init; call at request/dialog time.
 */
export function createIdempotencyKey(): string {
    const webCrypto = globalThis.crypto;

    if (webCrypto && typeof webCrypto.randomUUID === 'function') {
        return webCrypto.randomUUID();
    }

    if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        webCrypto.getRandomValues(bytes);
        // RFC 4122 version 4 + variant 1
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = Array.from(bytes, (byte) =>
            byte.toString(16).padStart(2, '0'),
        ).join('');

        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = (Math.random() * 16) | 0;
        const value = char === 'x' ? random : (random & 0x3) | 0x8;

        return value.toString(16);
    });
}

export type StockLevelStatus = 'habis' | 'kritis' | 'sedang' | 'aman';

/**
 * Status stok otomatis (computed, bukan kolom DB).
 * - habis: stok <= 0
 * - kritis: stok <= minimum_stok (jika minimum diset)
 * - sedang: stok <= 2x minimum_stok
 * - aman: di atas 2x minimum, atau di atas 0 jika minimum tidak diset
 */
export function stockLevelStatus(
    stok: number,
    minimumStok: number | null | undefined,
): StockLevelStatus {
    const stock = Number(stok) || 0;

    if (stock <= 0) {
        return 'habis';
    }

    const minimum = minimumStok == null ? null : Number(minimumStok);

    if (minimum !== null && !Number.isNaN(minimum) && minimum > 0) {
        if (stock <= minimum) {
            return 'kritis';
        }

        if (stock <= minimum * 2) {
            return 'sedang';
        }

        return 'aman';
    }

    return 'aman';
}

export function stockLevelLabel(status: StockLevelStatus): string {
    switch (status) {
        case 'habis':
            return 'Habis';
        case 'kritis':
            return 'Kritis';
        case 'sedang':
            return 'Sedang';
        case 'aman':
            return 'Aman';
    }
}

/**
 * Class badge stok — style disamakan dengan KaryawanBadge / PesananStatusBadge
 * (rounded-md soft background, bukan solid Badge shadcn).
 */
export function stockLevelBadgeClass(status: StockLevelStatus): string {
    switch (status) {
        case 'habis':
            return 'inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400';
        case 'kritis':
            return 'inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';
        case 'sedang':
            return 'inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400';
        case 'aman':
            return 'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400';
    }
}

export const stockLevelFilterOptions: {
    value: StockLevelStatus;
    label: string;
}[] = [
    { value: 'habis', label: 'Habis' },
    { value: 'kritis', label: 'Kritis' },
    { value: 'sedang', label: 'Sedang' },
    { value: 'aman', label: 'Aman' },
];
