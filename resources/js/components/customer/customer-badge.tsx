import { jenisCustomerLabel } from '@/lib/domain-labels';
import type { JenisCustomer } from '@/types';

interface CustomerBadgeProps {
    jenis: JenisCustomer;
    size?: 'sm' | 'md';
}

const badgeClassName: Record<JenisCustomer, string> = {
    b2b: 'inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    b2c: 'inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400',
};

export function CustomerBadge({ jenis }: CustomerBadgeProps) {
    return (
        <span className={badgeClassName[jenis]}>
            {jenisCustomerLabel(jenis)}
        </span>
    );
}
