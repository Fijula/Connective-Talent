import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  type: 'image' | 'document' | 'csv';
  multiple?: boolean;
}

const FileUpload = ({ onFileSelect, accept, maxSize = 10 * 1024 * 1024, type, multiple = false }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndUpload(file);
    }
  };

  const validateAndUpload = (file: File) => {
    if (file.size > maxSize) {
      alert(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setUploadedFiles(prev => multiple ? [...prev, file] : [file]);
    onFileSelect(file);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const getIcon = () => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-primary" />;
      case 'document':
        return <FileText className="w-8 h-8 text-primary" />;
      case 'csv':
        return <FileText className="w-8 h-8 text-primary" />;
      default:
        return <Upload className="w-8 h-8 text-primary" />;
    }
  };

  const getUploadText = () => {
    switch (type) {
      case 'image':
        return 'Click to upload or drag and drop your profile photo';
      case 'document':
        return 'Click to upload or drag and drop your resume (PDF, DOC, DOCX)';
      case 'csv':
        return 'Click to upload or drag and drop CSV file with talent data';
      default:
        return 'Click to upload or drag and drop files';
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`transition-all duration-300 ${dragActive ? 'border-primary shadow-lg' : 'border-dashed border-border'}`}>
        <CardContent className="p-6">
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-primary/5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleChange}
              className="hidden"
            />
            
            <div className="space-y-4">
              {getIcon()}
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {getUploadText()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {accept} • Max {maxSize / 1024 / 1024}MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onButtonClick}
                className="mt-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">Uploaded Files</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;