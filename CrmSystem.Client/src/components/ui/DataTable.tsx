import React from 'react';
import './ui.css';

interface Column<T> {
    key: string;
    title: string;
    render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    onRowClick?: (item: T) => void;
}

export function DataTable<T>({ columns, data, onRowClick }: DataTableProps<T>) {
    return (
        <table className="data-table">
            <thead>
                <tr>{columns.map(col => <th key={col.key}>{col.title}</th>)}</tr>
            </thead>
            <tbody>
                {data.map(item => (
                    <tr key={(item as any)[columns[0].key]} onClick={() => onRowClick?.(item)}>
                        {columns.map(col => <td key={col.key}>{col.render ? col.render(item) : (item as any)[col.key]}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
