'use client'

import { useState, useRef, useCallback } from 'react'
import { FaCamera, FaUpload, FaSpinner, FaTimes } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import Tesseract from 'tesseract.js'

export default function ImageUpload({ onTextExtracted }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      setError('Camera access is required to capture images. Please enable camera permissions.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      setIsCameraActive(false)
    }
  }, [])

  const capturePhoto = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const context = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      if (blob) {
        processImage(blob)
        const url = URL.createObjectURL(blob)
        setPreview(url)
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }, [stopCamera])

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size too large. Please select an image under 10MB.')
        return
      }
      
      const url = URL.createObjectURL(file)
      setPreview(url)
      processImage(file)
    }
  }, [])

  const processImage = useCallback(async (file) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)
    
    try {
      const result = await Tesseract.recognize(
        file, 
        'eng+spa+fra+deu+ita+por+rus+ara+chi_sim+jpn+kor',
        {
          logger: ({ progress }) => {
            setProgress(Math.round(progress * 100))
          }
        }
      )
      
      const extractedText = result.data.text.trim()
      if (extractedText) {
        onTextExtracted(extractedText)
      } else {
        setError('No text found in the image. Please try a clearer image.')
      }
    } catch (error) {
      console.error('OCR Error:', error)
      setError('Failed to extract text from image. Please try again.')
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }, [onTextExtracted])

  const clearPreview = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview)
      setPreview(null)
    }
    setError(null)
  }, [preview])

  return (
    <div className="space-y-4">
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-200"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Feed */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-xl overflow-hidden"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="w-full rounded-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <button
              onClick={capturePhoto}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-purple-600 p-4 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
            >
              <FaCamera className="text-2xl" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-xl overflow-hidden"
          >
            <img src={preview} alt="Preview" className="w-full rounded-xl" />
            
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <FaTimes />
            </button>

            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl">
                <div className="text-white text-center space-y-4">
                  <FaSpinner className="animate-spin text-4xl mx-auto" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Extracting text...</p>
                    <div className="w-48 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/80">{progress}% complete</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex space-x-4">
        {!isCameraActive ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startCamera}
            className="flex-1 bg-white text-purple-600 py-3 px-6 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2 shadow-lg"
          >
            <FaCamera />
            <span>Open Camera</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={stopCamera}
            className="flex-1 bg-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-lg"
          >
            Stop Camera
          </motion.button>
        )}
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 shadow-lg"
        >
          <FaUpload />
          <span>Upload Image</span>
        </motion.button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}
