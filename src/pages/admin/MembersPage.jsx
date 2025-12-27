import { useState } from 'react'
import { Search, Filter, MoreHorizontal, UserCheck, UserX, UserPlus } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

// Mock Members Data
const MEMBERS = [
    { id: 'AWS/001', name: 'Dr. Sarah Johnson', email: 'sarah.j@uni.edu.ng', department: 'Computer Science', status: 'active', joined: 'Jan 2021' },
    { id: 'AWS/002', name: 'Prof. Michael Okon', email: 'm.okon@uni.edu.ng', department: 'Mathematics', status: 'active', joined: 'Feb 2021' },
    { id: 'AWS/003', name: 'Mrs. Grace Adebayo', email: 'g.adebayo@uni.edu.ng', department: 'Registry', status: 'inactive', joined: 'Mar 2021' },
    { id: 'AWS/004', name: 'Mr. David Lee', email: 'd.lee@uni.edu.ng', department: 'Physics', status: 'active', joined: 'Apr 2021' },
    { id: 'AWS/005', name: 'Engr. John Doe', email: 'j.doe@uni.edu.ng', department: 'Works', status: 'active', joined: 'May 2021' },
]

export default function MembersPage() {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredMembers = MEMBERS.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Members Directory</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage all cooperative members
                    </p>
                </div>
                <Button>
                    <UserPlus size={20} />
                    Add New Member
                </Button>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="w-full sm:w-80">
                        <Input
                            placeholder="Search by name, ID or email..."
                            icon={Search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline">
                        <Filter size={18} />
                        Filter
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Member ID</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Join Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                                        {member.id}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                                            <p className="text-xs text-slate-500">{member.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {member.department}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {member.joined}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${member.status === 'active'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {member.status === 'active' ? <UserCheck size={12} /> : <UserX size={12} />}
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
