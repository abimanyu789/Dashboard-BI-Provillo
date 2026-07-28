import { produksiStatusLabel } from '@/lib/domain-labels';
import type { StatusProduksi } from '@/types';

interface ProduksiStatusBadgeProps {
    status: StatusProduksi;
}

const badgeConfig: Record<StatusProduksi, string> = {
    draft: 'inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    proses:
        'inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    selesai:
        'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400',
    dibatalkan:
        'inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400',
};

export function ProduksiStatusBadge({ status }: ProduksiStatusBadgeProps) {
    return (
        <span className={badgeConfig[status]}>
            {produksiStatusLabel(status)}
        </span>
    );
}
