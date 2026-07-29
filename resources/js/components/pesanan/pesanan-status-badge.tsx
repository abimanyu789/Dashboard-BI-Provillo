import { pesananStatusLabel } from '@/lib/domain-labels';
import type { StatusPesanan } from '@/types';

interface PesananStatusBadgeProps {
    status: StatusPesanan;
}

const badgeClassName: Record<StatusPesanan, string> = {
    pending:
        'inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    proses:
        'inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    selesai:
        'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400',
    dibatalkan:
        'inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400',
};

export function PesananStatusBadge({ status }: PesananStatusBadgeProps) {
    return (
        <span className={badgeClassName[status]}>
            {pesananStatusLabel(status)}
        </span>
    );
}
