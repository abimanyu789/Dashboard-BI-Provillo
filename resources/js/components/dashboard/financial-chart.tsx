import { useEffect, useState } from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { FinancialChartData } from '@/types';

interface FinancialChartProps {
    data: FinancialChartData[];
}

function useDarkMode() {
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains('dark'),
    );
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

export function FinancialChart({ data }: FinancialChartProps) {
    const isDark = useDarkMode();

    const colors = {
        grid:        isDark ? 'hsl(215 28% 22%)' : 'hsl(220 13% 88%)',
        tickText:    isDark ? 'hsl(215 20% 60%)' : 'hsl(215 16% 47%)',
        tooltipBg:   isDark ? 'hsl(224 71% 6%)'  : 'hsl(0 0% 100%)',
        tooltipBorder: isDark ? 'hsl(215 28% 22%)' : 'hsl(220 13% 88%)',
        tooltipText: isDark ? 'hsl(210 40% 90%)' : 'hsl(222 47% 11%)',
        pemasukan:   isDark ? 'hsl(142 71% 48%)' : 'hsl(142 76% 36%)',
        pengeluaran: isDark ? 'hsl(0 84% 65%)'   : 'hsl(0 84% 55%)',
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);

    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
            <h3 className="mb-4 text-lg font-semibold">Financial Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                        dataKey="bulan"
                        tick={{ fill: colors.tickText, fontSize: 12 }}
                        axisLine={{ stroke: colors.grid }}
                        tickLine={{ stroke: colors.grid }}
                    />
                    <YAxis
                        tick={{ fill: colors.tickText, fontSize: 12 }}
                        axisLine={{ stroke: colors.grid }}
                        tickLine={{ stroke: colors.grid }}
                        tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}Jt`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                            return value.toString();
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: colors.tooltipBg,
                            border: `1px solid ${colors.tooltipBorder}`,
                            borderRadius: '0.5rem',
                            color: colors.tooltipText,
                        }}
                        labelStyle={{ color: colors.tooltipText, fontWeight: 500 }}
                        itemStyle={{ color: colors.tooltipText }}
                        formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend
                        wrapperStyle={{ color: colors.tickText, fontSize: 12 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="pemasukan"
                        stroke={colors.pemasukan}
                        strokeWidth={2}
                        name="Pemasukan"
                        dot={{ fill: colors.pemasukan, r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="pengeluaran"
                        stroke={colors.pengeluaran}
                        strokeWidth={2}
                        name="Pengeluaran"
                        dot={{ fill: colors.pengeluaran, r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
