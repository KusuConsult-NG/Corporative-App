// Export utilities for reports
export const exportToExcel = (data, filename = 'report.xlsx') => {
    // In a production environment, you would use a library like xlsx or exceljs
    // For now, we'll create a CSV which Excel can open

    if (!data || data.length === 0) {
        alert('No data to export')
        return
    }

    // Get headers from first object
    const headers = Object.keys(data[0])

    // Create CSV content
    let csvContent = headers.join(',') + '\n'

    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header]
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`
            }
            return value
        })
        csvContent += values.join(',') + '\n'
    })

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename.replace('.xlsx', '.csv'))
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export const exportToPDF = (reportData, filename = 'report.pdf') => {
    // In production, use jsPDF or similar library
    // For now, we'll create a printable HTML version

    const printWindow = window.open('', '_blank')

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${reportData.type}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1 {
                    color: #1e293b;
                    border-bottom: 3px solid #3b82f6;
                    padding-bottom: 10px;
                }
                .meta {
                    color: #64748b;
                    margin-bottom: 30px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e2e8f0;
                }
                th {
                    background-color: #f1f5f9;
                    font-weight: bold;
                    color: #1e293b;
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #3b82f6;
                }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <h1>${reportData.type}</h1>
            <p class="meta">Period: ${reportData.period} | Generated: ${new Date().toLocaleString()}</p>
            
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(reportData.metrics).map(([key, value]) => `
                        <tr>
                            <td>${key}</td>
                            <td class="metric-value">${typeof value === 'number' ? value.toLocaleString() : value}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <script>
                window.onload = () => {
                    window.print()
                }
            </script>
        </body>
        </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
}

// =============================================================================
// Cloud Function-based exports (Production-ready)
// =============================================================================

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../lib/firebase'

const functions = getFunctions(app)

/**
 * Download a base64 file
 */
function downloadBase64File(base64Data, filename, mimeType) {
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()

    link.parentNode.removeChild(link)
    window.URL.revokeObjectURL(url)
}

/**
 * Export loans to PDF using Cloud Function
 */
export async function exportLoansToPDF(userId = null, filters = {}) {
    try {
        const exportLoansPDF = httpsCallable(functions, 'exportLoansPDF')
        const result = await exportLoansPDF({ userId, filters })

        if (result.data.success) {
            downloadBase64File(
                result.data.data,
                result.data.filename,
                result.data.mimeType
            )
            return { success: true }
        } else {
            throw new Error('Export failed')
        }
    } catch (error) {
        console.error('Error exporting loans to PDF:', error)
        throw error
    }
}

/**
 * Export loans to Excel using Cloud Function
 */
export async function exportLoansToExcel(userId = null, filters = {}) {
    try {
        const exportLoansExcel = httpsCallable(functions, 'exportLoansExcel')
        const result = await exportLoansExcel({ userId, filters })

        if (result.data.success) {
            downloadBase64File(
                result.data.data,
                result.data.filename,
                result.data.mimeType
            )
            return { success: true }
        } else {
            throw new Error('Export failed')
        }
    } catch (error) {
        console.error('Error exporting loans to Excel:', error)
        throw error
    }
}

/**
 * Export members to Excel (Admin only)
 */
export async function exportMembersToExcel() {
    try {
        const exportMembersExcel = httpsCallable(functions, 'exportMembersExcel')
        const result = await exportMembersExcel({})

        if (result.data.success) {
            downloadBase64File(
                result.data.data,
                result.data.filename,
                result.data.mimeType
            )
            return { success: true }
        } else {
            throw new Error('Export failed')
        }
    } catch (error) {
        console.error('Error exporting members to Excel:', error)
        throw error
    }
}

/**
 * Export savings statement to PDF
 */
export async function exportSavingsToPDF(userId) {
    try {
        const exportSavingsPDF = httpsCallable(functions, 'exportSavingsPDF')
        const result = await exportSavingsPDF({ userId })

        if (result.data.success) {
            downloadBase64File(
                result.data.data,
                result.data.filename,
                result.data.mimeType
            )
            return { success: true }
        } else {
            throw new Error('Export failed')
        }
    } catch (error) {
        console.error('Error exporting savings to PDF:', error)
        throw error
    }
}
