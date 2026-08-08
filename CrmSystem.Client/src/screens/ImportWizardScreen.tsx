import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import {
    FileSpreadsheet, UploadCloud, ArrowRight, ArrowLeft, CheckCircle2,
    AlertCircle, Database, Layers, Check, RefreshCw, Users, UserPlus, Package
} from 'lucide-react';
import './screens.css';

interface HeaderParseResponse {
    headers: string[];
    previewRows: Record<string, string>[];
    totalRows: number;
}

interface ImportResult {
    totalRecordsProcessed: number;
    successCount: number;
    failureCount: number;
    errorMessages: string[];
}

type EntityType = 'lead' | 'customer' | 'product';

interface FieldOption {
    key: string;
    label: string;
    required?: boolean;
}

const ENTITY_FIELDS: Record<EntityType, FieldOption[]> = {
    lead: [
        { key: 'firstName', label: 'First Name', required: true },
        { key: 'lastName', label: 'Last Name', required: true },
        { key: 'email', label: 'Email Address' },
        { key: 'phone', label: 'Phone Number' },
        { key: 'companyName', label: 'Company Name' },
        { key: 'jobTitle', label: 'Job Title' },
        { key: 'priority', label: 'Priority (Low/Medium/High)' },
        { key: 'notes', label: 'Notes / Details' },
    ],
    customer: [
        { key: 'firstName', label: 'First Name', required: true },
        { key: 'lastName', label: 'Last Name', required: true },
        { key: 'email', label: 'Email Address', required: true },
        { key: 'phone', label: 'Phone Number' },
        { key: 'jobTitle', label: 'Job Title' },
        { key: 'companyName', label: 'Company Name' },
    ],
    product: [
        { key: 'name', label: 'Product Name', required: true },
        { key: 'sku', label: 'SKU / Code' },
        { key: 'price', label: 'Unit Price ($)' },
        { key: 'description', label: 'Description' },
    ]
};

export const ImportWizardScreen: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<number>(1);
    const [entityType, setEntityType] = useState<EntityType>('lead');
    const [file, setFile] = useState<File | null>(null);
    const [fileText, setFileText] = useState<string>('');
    const [parsing, setParsing] = useState<boolean>(false);
    const [parseData, setParseData] = useState<HeaderParseResponse | null>(null);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState<boolean>(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // Step 1: Handle File Upload & Parse
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const isCsv = selectedFile.name.endsWith('.csv');
        const isPdf = selectedFile.name.endsWith('.pdf');

        if (!isCsv && !isPdf) {
            showToast('Please select a valid CSV or PDF file', 'error');
            return;
        }

        setFile(selectedFile);

        if (isCsv) {
            const text = await selectedFile.text();
            setFileText(text);
        } else {
            // For PDF files, we send the file stream directly to backend parser
            setFileText('');
        }
    };

    const handleParseCsv = async () => {
        if (!file) {
            showToast('Please select a CSV or PDF file to parse', 'error');
            return;
        }

        setParsing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.upload<HeaderParseResponse>('/api/import/parse', formData);
            setParseData(res);

            // Auto-detect mappings based on header similarity
            const autoMap: Record<string, string> = {};
            const availableFields = ENTITY_FIELDS[entityType];

            res.headers.forEach(header => {
                const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
                const match = availableFields.find(f => {
                    const cleanField = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanKey = f.key.toLowerCase();
                    return cleanHeader.includes(cleanKey) || cleanHeader.includes(cleanField);
                });

                if (match) {
                    autoMap[header] = match.key;
                }
            });

            setMappings(autoMap);
            setStep(2);
            showToast('CSV headers parsed successfully', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to parse CSV file', 'error');
        } finally {
            setParsing(false);
        }
    };

    // Step 2: Mapping Change
    const handleMappingChange = (header: string, fieldKey: string) => {
        setMappings(prev => ({
            ...prev,
            [header]: fieldKey
        }));
    };

    // Step 3: Execute Import
    const handleExecuteImport = async () => {
        setImporting(true);
        try {
            let contentToSend = fileText;
            if (!contentToSend && parseData) {
                const csvHeaders = parseData.headers.join(',');
                const csvRows = parseData.previewRows.map(row =>
                    parseData.headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(',')
                );
                contentToSend = [csvHeaders, ...csvRows].join('\n');
            }

            const payload = {
                entityType,
                columnMappings: mappings,
                fileContent: contentToSend
            };

            const result = await api.post<ImportResult>('/api/import/execute', payload);
            setImportResult(result);
            setStep(4);
            if (result.successCount > 0) {
                showToast(`Successfully imported ${result.successCount} records!`, 'success');
            } else {
                showToast('Import completed with errors', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to execute import', 'error');
        } finally {
            setImporting(false);
        }
    };

    const targetFields = ENTITY_FIELDS[entityType];

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                <div className="dashboard-title">
                    <h1>Data Import Wizard</h1>
                    <p>Bulk import Leads, Customers, or Products into CRM from CSV files</p>
                </div>
            </div>

            {/* Stepper Header */}
            <div className="glass-panel" style={{ padding: '1.25rem 2rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                    {[
                        { num: 1, title: 'Upload & Select', icon: UploadCloud },
                        { num: 2, title: 'Map Columns', icon: Layers },
                        { num: 3, title: 'Preview Data', icon: FileSpreadsheet },
                        { num: 4, title: 'Import Summary', icon: CheckCircle2 }
                    ].map((st, idx) => {
                        const Icon = st.icon;
                        const isActive = step === st.num;
                        const isDone = step > st.num;

                        return (
                            <div key={st.num} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 2 }}>
                                <div style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    background: isDone ? 'var(--success-color, #10b981)' : isActive ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                    color: isDone || isActive ? '#ffffff' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {isDone ? <Check size={18} /> : st.num}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {st.title}
                                    </div>
                                </div>
                                {idx < 3 && (
                                    <div style={{ width: 60, height: 2, background: isDone ? 'var(--success-color, #10b981)' : 'var(--border-color)', margin: '0 1rem' }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* STEP 1: Upload & Select Entity */}
            {step === 1 && (
                <Card className="glass-panel animate-fade-in">
                    <Card.Content style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                            Step 1: Select Entity & Upload CSV File
                        </h2>

                        <div style={{ marginBottom: '1.75rem' }}>
                            <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                                Target CRM Entity Type
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {[
                                    { type: 'lead' as EntityType, label: 'Leads', desc: 'Prospects & sales leads', icon: UserPlus },
                                    { type: 'customer' as EntityType, label: 'Customers', desc: 'Active customer accounts', icon: Users },
                                    { type: 'product' as EntityType, label: 'Products', desc: 'Catalog items & pricing', icon: Package }
                                ].map(item => {
                                    const Icon = item.icon;
                                    const selected = entityType === item.type;
                                    return (
                                        <div
                                            key={item.type}
                                            onClick={() => setEntityType(item.type)}
                                            style={{
                                                padding: '1.25rem',
                                                borderRadius: '0.75rem',
                                                border: selected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                                background: selected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                                <Icon size={20} color={selected ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                                                <span style={{ fontWeight: 700, fontSize: '1rem', color: selected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* File Dropzone */}
                        <div style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '1rem',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            background: file ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}
                            onClick={() => document.getElementById('import-file-input')?.click()}
                        >
                            <input
                                id="import-file-input"
                                type="file"
                                accept=".csv, .pdf"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <UploadCloud size={48} style={{ color: file ? 'var(--success-color, #10b981)' : 'var(--accent-primary)', marginBottom: '1rem' }} />

                            {file ? (
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {file.name}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {(file.size / 1024).toFixed(1)} KB · {file.name.endsWith('.pdf') ? 'PDF Document' : 'CSV Spreadsheet'} Ready to parse
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Click or drag a .CSV or .PDF file here to upload
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Supports CSV spreadsheets and PDF tabular/lead lists
                                    </p>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                disabled={!file || parsing}
                                onClick={handleParseCsv}
                                variant="primary"
                            >
                                {parsing ? 'Parsing Document…' : <>Continue to Mapping <ArrowRight size={16} style={{ marginLeft: 6 }} /></>}
                            </Button>
                        </div>
                    </Card.Content>
                </Card>
            )}

            {/* STEP 2: Map Columns */}
            {step === 2 && parseData && (
                <Card className="glass-panel animate-fade-in">
                    <Card.Content style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                    Step 2: Map CSV Columns to CRM Fields
                                </h2>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Match headers found in your CSV file ({parseData.totalRows} records) with {entityType.toUpperCase()} database fields.
                                </p>
                            </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.85rem 1rem' }}>CSV Header</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Sample Data (Row 1)</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Target CRM Field</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parseData.headers.map((header, idx) => {
                                        const sampleVal = parseData.previewRows[0]?.[header] || '—';
                                        const mappedField = mappings[header] || '';

                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {header}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {sampleVal}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <select
                                                        className="filter-select"
                                                        style={{ width: '100%', padding: '0.4rem 0.75rem' }}
                                                        value={mappedField}
                                                        onChange={e => handleMappingChange(header, e.target.value)}
                                                    >
                                                        <option value="">-- Ignore Column --</option>
                                                        {targetFields.map(f => (
                                                            <option key={f.key} value={f.key}>
                                                                {f.label} {f.required ? '*' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button variant="ghost" onClick={() => setStep(1)}>
                                <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back to File Upload
                            </Button>
                            <Button onClick={() => setStep(3)} variant="primary">
                                Preview Mapped Records <ArrowRight size={16} style={{ marginLeft: 6 }} />
                            </Button>
                        </div>
                    </Card.Content>
                </Card>
            )}

            {/* STEP 3: Preview Data & Confirm */}
            {step === 3 && parseData && (
                <Card className="glass-panel animate-fade-in">
                    <Card.Content style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            Step 3: Preview Data & Confirm Import
                        </h2>
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Review sample parsed rows mapped for target entity <strong>{entityType.toUpperCase()}</strong> before submitting {parseData.totalRows} records.
                        </p>

                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflowX: 'auto', marginBottom: '1.5rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>#</th>
                                        {targetFields.map(f => (
                                            <th key={f.key} style={{ padding: '0.75rem 1rem' }}>
                                                {f.label} {f.required ? '*' : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parseData.previewRows.map((row, rIdx) => {
                                        return (
                                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{rIdx + 1}</td>
                                                {targetFields.map(f => {
                                                    // Find CSV header mapped to this field
                                                    const headerKey = Object.keys(mappings).find(h => mappings[h] === f.key);
                                                    const val = headerKey ? row[headerKey] : '—';

                                                    return (
                                                        <td key={f.key} style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                                                            {val || '—'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button variant="ghost" onClick={() => setStep(2)}>
                                <ArrowLeft size={16} style={{ marginRight: 6 }} /> Adjust Mapping
                            </Button>
                            <Button
                                disabled={importing}
                                onClick={handleExecuteImport}
                                variant="primary"
                            >
                                {importing ? 'Importing Data…' : <>Execute Import ({parseData.totalRows} records) <Database size={16} style={{ marginLeft: 6 }} /></>}
                            </Button>
                        </div>
                    </Card.Content>
                </Card>
            )}

            {/* STEP 4: Import Summary */}
            {step === 4 && importResult && (
                <Card className="glass-panel animate-fade-in">
                    <Card.Content style={{ padding: '2.5rem', textAlign: 'center' }}>
                        <div style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: importResult.failureCount === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            {importResult.failureCount === 0 ? (
                                <CheckCircle2 size={40} color="#10b981" />
                            ) : (
                                <AlertCircle size={40} color="#ef4444" />
                            )}
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            Import Process Complete
                        </h2>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            Processed {importResult.totalRecordsProcessed} records for <strong>{entityType.toUpperCase()}</strong>.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', maxWidth: 600, margin: '0 auto 2rem auto' }}>
                            <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>{importResult.successCount}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Successfully Created</div>
                            </div>

                            <div style={{ padding: '1.25rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: importResult.failureCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>{importResult.failureCount}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Failed / Skipped</div>
                            </div>
                        </div>

                        {importResult.errorMessages.length > 0 && (
                            <div style={{ textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '2rem', maxHeight: 200, overflowY: 'auto' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#dc2626', fontSize: '0.9rem', fontWeight: 700 }}>Import Errors</h4>
                                {importResult.errorMessages.map((msg, i) => (
                                    <div key={i} style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '0.25rem' }}>• {msg}</div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Button variant="secondary" onClick={() => {
                                setStep(1);
                                setFile(null);
                                setParseData(null);
                                setImportResult(null);
                            }}>
                                <RefreshCw size={16} style={{ marginRight: 6 }} /> Import Another CSV
                            </Button>
                            <Button variant="primary" onClick={() => navigate(`/${entityType}s`)}>
                                View Mapped {entityType.toUpperCase()} Records <ArrowRight size={16} style={{ marginLeft: 6 }} />
                            </Button>
                        </div>
                    </Card.Content>
                </Card>
            )}
        </Layout>
    );
};
