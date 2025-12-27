import { useState, useEffect, useRef } from 'react'
import { Search, User, Check, X } from 'lucide-react'
import { membersAPI } from '../services/api'
import { cn } from '../utils/formatters'

export default function GuarantorSelector({ onSelect, excludeId, error }) {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const data = await membersAPI.getAll()
                // Filter out current user and ensure member has necessary data
                const filtered = data.filter(m => m.memberId !== excludeId && m.status === 'active')
                setMembers(filtered)
            } catch (err) {
                console.error('Error fetching members:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchMembers()
    }, [excludeId])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredMembers = members.filter(m => {
        const fullSearch = `${m.firstName || ''} ${m.lastName || ''} ${m.memberId || ''}`.toLowerCase()
        return fullSearch.includes(searchTerm.toLowerCase())
    })

    const handleSelect = (member) => {
        onSelect({
            id: member.id, // Firestore ID
            memberId: member.memberId, // Staff/Member ID
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            fileNumber: member.memberId
        })
        setSearchTerm('')
        setIsOpen(false)
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="flex flex-col gap-2">
                <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                    Search & Select Guarantor
                </label>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        className={cn(
                            "w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all",
                            error ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20",
                            isOpen && "rounded-b-none"
                        )}
                        placeholder={loading ? "Loading members..." : "Search by name or member ID..."}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setIsOpen(true)
                        }}
                        onFocus={() => setIsOpen(true)}
                        disabled={loading}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border-x border-b border-slate-200 dark:border-slate-700 rounded-b-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredMembers.length > 0 ? (
                        <div className="py-2">
                            {filteredMembers.map((member) => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => handleSelect(member)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
                                >
                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <User size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {member.firstName} {member.lastName}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            ID: {member.memberId} • {member.department}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Check size={16} className="text-primary" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-sm text-slate-500">No members found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}
            {error && <p className="text-red-500 text-xs mt-1 px-1">{error}</p>}
        </div>
    )
}
