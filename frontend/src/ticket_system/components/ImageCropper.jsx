import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FiX, FiCheck } from 'react-icons/fi';

/**
 * Utility to convert dataURL to Blob for upload
 */
export const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * Utility to create the cropped image
 */
const getCroppedImg = (imageSrc, pixelCrop) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            resolve(canvas.toDataURL('image/jpeg'));
        };
        image.onerror = (error) => reject(error);
    });
};

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropChange = (crop) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
            <div className="relative flex-1 bg-slate-950">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={onCropChange}
                    onZoomChange={onZoomChange}
                    onCropComplete={onCropCompleteInternal}
                    cropShape="round"
                    showGrid={false}
                />
            </div>
            <div className="p-8 bg-slate-900 space-y-6">
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Zoom Level</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(e) => setZoom(e.target.value)}
                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onCancel}
                        className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-750 transition-all flex items-center justify-center gap-2"
                    >
                        <FiX size={16} /> CANCEL
                    </button>
                    <button
                        onClick={handleSave}
                        className="py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <FiCheck size={16} /> APPLY CHANGES
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
