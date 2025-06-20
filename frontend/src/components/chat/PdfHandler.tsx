import React, { useRef, MutableRefObject } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileUpload } from '@fortawesome/free-solid-svg-icons';

interface PdfHandlerProps {
  isDragging: boolean;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => Promise<void>;
  isPdfUploaded: boolean;
}

const PdfHandler: React.FC<PdfHandlerProps> = ({ 
  isDragging, 
  fileInputRef, 
  handleFileSelect, 
  handleDrop, 
  isPdfUploaded 
}) => {
  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        accept="application/pdf"
      />

      {/* PDF drop zone overlay - always active when dragging files */}
      <div 
        className={`absolute inset-0 z-10 pointer-events-none ${isDragging ? 'bg-blue-50 bg-opacity-70' : 'hidden'}`}
      >
        <div className="flex items-center justify-center h-full">
          <div className="bg-white border-2 border-dashed border-blue-400 rounded-xl p-8 shadow-md">
            <div className="text-center">
              <FontAwesomeIcon icon={faFileUpload} className="text-3xl text-blue-500 mb-2" />
              <p className="text-blue-600 font-medium">Drop your PDF file here to automatically switch to PDF mode</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PdfHandler;
