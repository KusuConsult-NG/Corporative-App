import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

/**
 * Line Chart Component for trend analysis
 */
export function TrendLineChart({ data, dataKey, xAxisKey = 'month', title, color = '#3b82f6' }) {
    return (
        <div className="w-full h-full">
            {title && (
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey={xAxisKey}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={3}
                        dot={{ fill: color, r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

/**
 * Area Chart Component for cumulative trends
 */
export function TrendAreaChart({ data, dataKey, xAxisKey = 'month', title, color = '#3b82f6' }) {
    return (
        <div className="w-full h-full">
            {title && (
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                        <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey={xAxisKey}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${dataKey})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

/**
 * Bar Chart Component for comparisons
 */
export function ComparisonBarChart({ data, dataKey, xAxisKey = 'name', title, color = '#3b82f6' }) {
    return (
        <div className="w-full h-full">
            {title && (
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey={xAxisKey}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                    />
                    <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

/**
 * Pie Chart Component for distribution analysis
 */
export function DistributionPieChart({ data, title }) {
    return (
        <div className="w-full h-full">
            {title && (
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 text-center">
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

/**
 * Multi-line Chart for comparing multiple series
 */
export function MultiLineChart({ data, lines, xAxisKey = 'month', title }) {
    return (
        <div className="w-full h-full">
            {title && (
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey={xAxisKey}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                    />
                    <Legend />
                    {lines.map((line, index) => (
                        <Line
                            key={line.dataKey}
                            type="monotone"
                            dataKey={line.dataKey}
                            stroke={line.color || COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            name={line.name}
                            dot={{ r: 3 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
