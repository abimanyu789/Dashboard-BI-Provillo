import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { BestSeller } from '@/types';

interface BestSellersChartProps {
    data: BestSeller[];
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

export function BestSellersChart({ data }: BestSellersChartProps) {
    const isDark = useDarkMode();

    const colors = {
        grid:          isDark ? 'hsl(215 28% 22%)' : 'hsl(220 13% 88%)',
        tickText:      isDark ? 'hsl(215 20% 60%)' : 'hsl(215 16% 47%)',
        tooltipBg:     isDark ? 'hsl(224 71% 6%)'  : 'hsl(0 0% 100%)',
        tooltipBorder: isDark ? 'hsl(215 28% 22%)' : 'hsl(220 13% 88%)',
        tooltipText:   isDark ? 'hsl(210 40% 90%)' : 'hsl(222 47% 11%)',
        bar:           isDark ? 'hsl(221 83% 65%)' : 'hsl(221 83% 53%)',
        cursor:        isDark ? 'hsl(215 28% 22%)' : 'hsl(220 13% 91%)',
    };

    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-background p-6 dark:border-sidebar-border">
            <h3 className="mb-4 text-lg font-semibold">Best Sellers</h3>
            {data.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    Belum ada data penjualan
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                        <XAxis
                            dataKey="nama_produk"
                            tick={{ fill: colors.tickText, fontSize: 12 }}
                            axisLine={{ stroke: colors.grid }}
                            tickLine={{ stroke: colors.grid }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis
                            tick={{ fill: colors.tickText, fontSize: 12 }}
                            axisLine={{ stroke: colors.grid }}
                            tickLine={{ stroke: colors.grid }}
                        />
                        <Tooltip
                            cursor={{ fill: colors.cursor, opacity: 0.5 }}
                            contentStyle={{
                                backgroundColor: colors.tooltipBg,
                                border: `1px solid ${colors.tooltipBorder}`,
                                borderRadius: '0.5rem',
                                color: colors.tooltipText,
                            }}
                            labelStyle={{ color: colors.tooltipText, fontWeight: 500 }}
                            itemStyle={{ color: colors.tooltipText }}
                            formatter={(value: number) => [`${value} unit`, 'Terjual']}
                        />
                        <Bar
                            dataKey="total_qty"
                            fill={colors.bar}
                            radius={[8, 8, 0, 0]}
                            name="Jumlah Terjual"
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
