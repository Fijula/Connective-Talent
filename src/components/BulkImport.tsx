import { useState } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUpload from './FileUpload';
import * as XLSX from 'xlsx';

interface BulkImportProps {
  onImport: (data: any[]) => Promise<void>;
  templateFields: string[];
  entityName: string;
  requiredFields?: string[];
  optionalFields?: string[];
  conditionalNotes?: string[]; // textual rules
}

interface ImportResult {
  success: number;
  errors: { row: number; message: string; data: any }[];
  total: number;
}

const BulkImport = ({ onImport, templateFields, entityName, requiredFields, optionalFields, conditionalNotes }: BulkImportProps) => {
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  // Header-only templates (no dummy rows)
  const buildSampleRows = () => [] as any[];

  const downloadCSVTemplate = () => {
    const headers = templateFields.join(',');
    const csvContent = `${headers}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityName}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadXlsxTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([templateFields]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${entityName}`);
    const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityName}_template.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const rows = csv.split('\n').filter(row => row.trim());
          const headers = rows[0].split(',').map(h => h.trim());
          const data = rows.slice(1).map((row, index) => {
            const values = row.split(',').map(v => v.trim());
            const obj: any = { _row: index + 2 };
            headers.forEach((header, i) => { obj[header] = values[i] || ''; });
            return obj;
          }).filter(obj => Object.values(obj).some(val => val !== ''));
          setImportData(data);
        } catch {
          alert('Error parsing CSV file. Please check the format.');
        }
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        const parsed = json.map((row, idx) => ({ _row: idx + 2, ...row }));
        setImportData(parsed);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload CSV or XLSX.');
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) return;

    setImporting(true);
    setProgress(0);
    
    const results: ImportResult = {
      success: 0,
      errors: [],
      total: importData.length
    };

    for (let i = 0; i < importData.length; i++) {
      const item = importData[i];
      setProgress(((i + 1) / importData.length) * 100);

      try {
        await onImport([item]);
        results.success++;
      } catch (error: any) {
        results.errors.push({
          row: item._row,
          message: error.message || 'Unknown error',
          data: item
        });
      }

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setImportResult(results);
    setImporting(false);
    setProgress(100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-primary" />
            <span>Bulk Import {entityName}</span>
          </CardTitle>
          <CardDescription>
            Import multiple {entityName.toLowerCase()} records from a CSV file. Download our template to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={downloadCSVTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" onClick={downloadXlsxTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Spreadsheet
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              <span className="font-medium">Required fields:</span> {(requiredFields && requiredFields.length > 0 ? requiredFields : templateFields).join(', ')}
            </div>
            {optionalFields && optionalFields.length > 0 && (
              <div>
                <span className="font-medium">Optional fields:</span> {optionalFields.join(', ')}
              </div>
            )}
            {conditionalNotes && conditionalNotes.length > 0 && (
              <div>
                <span className="font-medium">Conditional fields:</span> {conditionalNotes.join(' • ')}
              </div>
            )}
          </div>

          <FileUpload
            onFileSelect={handleFileSelect}
            accept=".csv,.xlsx,.xls"
            maxSize={10 * 1024 * 1024}
            type="csv"
          />

          {importData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview Data</CardTitle>
                <CardDescription>
                  {importData.length} records found. Review before importing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                    {importData.slice(0, 5).map((item, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-1">
                          {Object.entries(item)
                            .filter(([key]) => key !== '_row')
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="font-medium">{key}:</span>
                                <span className="text-muted-foreground truncate ml-2">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {importData.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      And {importData.length - 5} more records...
                    </p>
                  )}

                  <div className="flex justify-center">
                    <Button 
                      onClick={handleImport} 
                      disabled={importing}
                      className="w-full md:w-auto"
                    >
                      {importing ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import {importData.length} Records
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {importing && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Import Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Import Complete</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.success}
                    </div>
                    <div className="text-sm text-green-600">Successful</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.errors.length}
                    </div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-600">
                      {importResult.total}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-medium">Import Errors:</div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {importResult.errors.slice(0, 10).map((error, index) => (
                            <div key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                              <span className="font-medium">Row {error.row}:</span> {error.message}
                            </div>
                          ))}
                          {importResult.errors.length > 10 && (
                            <div className="text-sm text-muted-foreground">
                              And {importResult.errors.length - 10} more errors...
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkImport;