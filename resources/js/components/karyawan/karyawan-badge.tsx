import { statusKaryawanLabel } from '@/lib/domain-labels';
import type { StatusKaryawan } from '@/types';

interface KaryawanBadgeProps {
    status: StatusKaryawan;
    size?: 'sm' | 'md';
}

const badgeClassName: Record<StatusKaryawan, string> = {
    aktif: 'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400',
    nonaktif:
        'inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function KaryawanBadge({ status }: KaryawanBadgeProps) {
    return (
        <span className={badgeClassName[status]}>
            {statusKaryawanLabel(status)}
        </span>
    );
}
