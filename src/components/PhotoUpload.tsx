import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PhotoUploadProps {
  onPhotoSelect: (file: File) => void;
  currentPhoto?: string;
  initials?: string;
  name?: string;
}

const PhotoUpload = ({ onPhotoSelect, currentPhoto, initials, name }: PhotoUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhoto || null);
  const [dragActive, setDragActive] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update preview URL when currentPhoto prop changes
  useEffect(() => {
    console.log('PhotoUpload: currentPhoto prop changed:', currentPhoto);
    if (currentPhoto) {
      setPreviewUrl(currentPhoto);
    }
  }, [currentPhoto]);

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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCrop = () => {
    if (!selectedFile) return;
    
    console.log('PhotoUpload: Calling onPhotoSelect with file:', selectedFile.name, selectedFile.size);
    // For now, we'll skip the actual cropping implementation and just use the selected file
    onPhotoSelect(selectedFile);
    setShowCropDialog(false);
  };

  const removePhoto = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-border">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} alt={name} className="object-cover" />
                ) : (
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {initials || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {previewUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                  onClick={removePhoto}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-medium mb-2">Profile Photo</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Upload a professional photo. JPG, PNG or GIF. Max 5MB.
              </p>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={triggerFileInput}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {previewUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />

          {/* Drop zone */}
          <div
            className={`mt-4 border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-primary/5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Or drag and drop your photo here
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Your Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex justify-center">
                <div className="relative w-48 h-48 border-2 border-dashed border-primary rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCropDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCrop}>
                <Crop className="w-4 h-4 mr-2" />
                Apply Crop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoUpload;