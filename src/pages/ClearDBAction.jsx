import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function ClearDBAction() {
    const [status, setStatus] = useState('Starting...')
    const [logs, setLogs] = useState([])

    const addLog = (msg) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
    }

    const collections = [
        'users', 'savings', 'savings_transactions', 'loans',
        'guarantor_approvals', 'commodities', 'commodity_orders',
        'commodityOrders', 'wallets', 'wallet_transactions',
        'reports', 'messages', 'approvalRequests'
    ]

    const clearAll = async () => {
        setStatus('Processing...')
        try {
            for (const colName of collections) {
                addLog(`Clearing collection: ${colName}`)
                const snapshot = await getDocs(collection(db, colName))
                const deletePromises = snapshot.docs.map(async (d) => {
                    // Check for deductions if it's a loan
                    if (colName === 'loans') {
                        const deductionsSnapshot = await getDocs(collection(db, 'loans', d.id, 'deductions'))
                        const subDeletePromises = deductionsSnapshot.docs.map(sd => deleteDoc(sd.ref))
                        await Promise.all(subDeletePromises)
                        addLog(`  Cleared deductions for loan ${d.id}`)
                    }
                    return deleteDoc(d.ref)
                })
                await Promise.all(deletePromises)
                addLog(`Finished clearing: ${colName} (${snapshot.size} docs)`)
            }
            setStatus('Completed Successfully')
        } catch (error) {
            console.error(error)
            addLog(`ERROR: ${error.message}`)
            setStatus('Failed')
        }
    }

    useEffect(() => {
        clearAll()
    }, [])

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Database Clearance Tool</h1>
            <p>Status: <strong>{status}</strong></p>
            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', maxHeight: '400px', overflowY: 'auto' }}>
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>
        </div>
    )
}
