import { jenisArusKasLabel } from '@/lib/domain-labels';
import type { JenisArusKas } from '@/types';

interface ArusKasBadgeProps {
    jenis: JenisArusKas;
}

const badgeClassName: Record<JenisArusKas, string> = {
    pemasukan:
        'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400',
    pengeluaran:
        'inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400',
};

export function ArusKasBadge({ jenis }: ArusKasBadgeProps) {
    return (
        <span className={badgeClassName[jenis]}>
            {jenisArusKasLabel(jenis)}
        </span>
    );
}
