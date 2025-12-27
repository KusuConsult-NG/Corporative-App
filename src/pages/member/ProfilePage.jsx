import { useState } from 'react'
import { User, Mail, Building, Phone, BadgeCheck, Lock } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function ProfilePage() {
    const { user } = useAuthStore()
    const [isEditing, setIsEditing] = useState(false)

    // Mock extra user details
    const userDetails = {
        ...user,
        phone: '08012345678',
        department: 'Computer Science',
        joinDate: 'Jan 15, 2021',
        nextOfKin: 'Jane Doe',
        nextOfKinPhone: '08098765432'
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto flex flex-col gap-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="md:col-span-1 flex flex-col items-center p-6 text-center">
                    <div className="size-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-500 dark:text-slate-400 mb-4">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{user?.role === 'admin' ? 'Administrator' : 'Cooperative Member'}</p>

                    <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium">
                        <BadgeCheck size={16} />
                        Active Member
                    </div>

                    <div className="w-full mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-500">Member ID</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{user?.memberId || 'AWS/2021/001'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Joined</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{userDetails.joinDate}</span>
                        </div>
                    </div>
                </Card>

                {/* Details Form */}
                <Card className="md:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h3>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? 'Cancel' : 'Edit Details'}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Values</label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <User size={18} className="text-slate-400" />
                                    <span className="text-slate-900 dark:text-white">{userDetails.name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <Mail size={18} className="text-slate-400" />
                                    <span className="text-slate-900 dark:text-white">{userDetails.email}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <Phone size={18} className="text-slate-400" />
                                    <span className="text-slate-900 dark:text-white">{userDetails.phone}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Department</label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <Building size={18} className="text-slate-400" />
                                    <span className="text-slate-900 dark:text-white">{userDetails.department}</span>
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="flex justify-end mt-4">
                                <Button>Save Changes</Button>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Security</h3>
                        <form className="space-y-4 max-w-sm">
                            <Input label="Current Password" type="password" icon={Lock} placeholder="Enter current password" />
                            <Input label="New Password" type="password" icon={Lock} placeholder="Enter new password" />
                            <Button variant="secondary">Update Password</Button>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    )
}
