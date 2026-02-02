import React, { useState, useRef } from 'react';
import { FiX } from 'react-icons/fi';

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

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
    const canvasRef = useRef(null);
    const [scale, setScale] = useState(1.0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleWheel = (e) => {
        e.preventDefault();
        const newScale = Math.min(Math.max(0.1, scale - e.deltaY * 0.001), 3);
        setScale(newScale);
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSave = () => {
        // In a real app, you would render the cropped area to a canvas and return that.
        // For now, we return the original data URL as mock crop.
        onCropComplete(imageSrc);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Adjust Profile Picture</h3>
                        <p className="text-sm text-slate-500 font-medium">Drag and zoom to position your photo</p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <FiX size={24} />
                    </button>
                </div>
                <div
                    className="h-80 bg-slate-50 dark:bg-slate-950 overflow-hidden relative flex items-center justify-center cursor-move select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <img
                        src={imageSrc}
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.1s'
                        }}
                        className="max-w-none"
                        draggable="false"
                        alt="Crop Preview"
                    />
                    {/* Overlay Circle */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-56 h-56 rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.6)]"></div>
                        <div className="absolute w-56 h-56 rounded-full border border-white/20"></div>
                    </div>
                </div>
                <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Zoom</span>
                        <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.01"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-tighter hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-tighter hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            Set Profile Picture
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
