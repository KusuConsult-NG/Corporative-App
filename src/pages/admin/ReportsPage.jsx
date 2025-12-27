import { FileText, Download } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function ReportsPage() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System Reports</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Financial Statement', 'Member Loan History', 'Savings Growth Analysis', 'Defaulters List', 'Commodity Sales Report'].map((report, i) => (
                    <Card key={i} className="p-6 flex flex-col justify-between h-40 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between">
                            <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                <FileText size={20} />
                            </div>
                            <span className="text-xs font-semibold text-slate-400">PDF</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-1">{report}</h3>
                            <Button size="sm" variant="ghost" className="px-0 text-primary hover:bg-transparent hover:underline justify-start h-auto p-0">
                                <Download size={14} className="mr-1" /> Download Report
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
