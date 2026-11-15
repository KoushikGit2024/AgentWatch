import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';

/**
 * Pre-scale high-resolution mobile photos on the client before network upload.
 * Constrains max dimensions to 2048px while maintaining aspect ratio and visual fidelity.
 */
async function prescaleImageIfOversized(file, maxDimension = 2048) {
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return file;
  }
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
          } else {
            const scaled = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(scaled);
          }
        },
        'image/jpeg',
        0.88
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function useComposerAttachments(activeConversationId = null) {
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleUploadFiles = useCallback(
    async fileList => {
      if (!fileList || fileList.length === 0) return;
      const rawFilesArray = Array.from(fileList);
      if (attachments.length + rawFilesArray.length > 8) {
        toast.warning('Maximum 8 attachments allowed per prompt', 'Upload Limit');
        return;
      }

      // Pre-scale large camera images in parallel on client
      const filesArray = await Promise.all(rawFilesArray.map(f => prescaleImageIfOversized(f)));

      const optimisticItems = filesArray.map((f, i) => {
        const isImg = f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|gif|svg)$/i);
        return {
          id: `opt_${Date.now()}_${i}`,
          original_name: f.name,
          filename: f.name,
          size: f.size,
          is_image: isImg,
          previewUrl: isImg ? URL.createObjectURL(f) : null,
          isPending: true,
        };
      });

      setAttachments(prev => [...prev, ...optimisticItems]);
      setIsUploading(true);

      try {
        const res = await api.uploadAttachments(filesArray, activeConversationId);
        if (res && res.attachments) {
          const uploaded = res.attachments;
          setAttachments(prev => {
            const nonPending = prev.filter(p => !optimisticItems.some(o => o.id === p.id));
            return [...nonPending, ...uploaded];
          });
          toast.success(
            `Attached ${uploaded.length} file${uploaded.length > 1 ? 's' : ''}`,
            'Attachment Uploaded'
          );
        }
      } catch (err) {
        setAttachments(prev => prev.filter(p => !optimisticItems.some(o => o.id === p.id)));
        toast.error(err.message || 'Failed to upload attachments', 'Upload Error');
      } finally {
        setIsUploading(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [attachments.length, activeConversationId]
  );

  const handlePaste = useCallback(
    e => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const filesToUpload = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            let fileName = file.name;
            if (!fileName || fileName === 'image.png' || fileName === 'blob') {
              const now = new Date();
              const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
              fileName = `Pasted_Image_${timeStr}.png`;
            }
            filesToUpload.push(new File([file], fileName, { type: file.type || 'image/png' }));
          }
        }
      }
      if (filesToUpload.length > 0) {
        e.preventDefault();
        handleUploadFiles(filesToUpload);
      }
    },
    [handleUploadFiles]
  );

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer?.files?.length > 0) {
        handleUploadFiles(e.dataTransfer.files);
      }
    },
    [handleUploadFiles]
  );

  return {
    attachments,
    setAttachments,
    isUploading,
    isDragging,
    previewItem,
    setPreviewItem,
    imageInputRef,
    fileInputRef,
    handleUploadFiles,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
