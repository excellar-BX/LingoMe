'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FaCamera, FaUpload, FaImage, FaTimes, FaSpinner, FaCameraRetro } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

export default function ImageUpload({ onTextExtracted }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      setError(null)
      setIsProcessing(true)

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser')
      }

      console.log('Requesting camera access...')

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      console.log('Camera access granted')

      setStream(mediaStream)
      setIsCameraOpen(true)

      // Wait a bit for the video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(console.error)
        }
      }, 100)

    } catch (error) {
      console.error('Camera error:', error)
      let errorMessage = 'Failed to access camera'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permission and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.'
      }
      
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
    setCapturedImage(null)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and process
    canvas.toBlob(async (blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob)
        setCapturedImage(imageUrl)
        await processImage(blob)
      }
    }, 'image/jpeg', 0.8)
  }

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file)
      setCapturedImage(imageUrl)
      processImage(file)
    }
  }

  const processImage = async (imageFile) => {
    setIsProcessing(true)
    setError(null)
    setExtractedText('')

    try {
      console.log('Processing image for OCR...')

      // Create FormData for the image
      const formData = new FormData()
      formData.append('image', imageFile)

      // Call OCR API
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`OCR failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('OCR result:', data)

      if (data.text && data.text.trim()) {
        setExtractedText(data.text.trim())
        onTextExtracted(data.text.trim())
      } else {
        throw new Error('No text found in the image')
      }

    } catch (error) {
      console.error('OCR Error:', error)
      setError(error.message || 'Failed to extract text from image')
    } finally {
      setIsProcessing(false)
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setExtractedText('')
    setError(null)
  }

  if (isCameraOpen && !capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 md:h-80 object-cover"
          />
          
          {/* Camera overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Viewfinder */}
            <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
            </div>
            
            {/* Instructions */}
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                Position text within the frame
              </p>
            </div>
          </div>

          {/* Camera controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={capturePhoto}
              className="bg-white text-black p-4 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <FaCamera className="text-xl" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopCamera}
              className="bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-600 transition-colors"
            >
              <FaTimes className="text-xl" />
            </motion.button>
          </div>
        </div>

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Options */}
      {!capturedImage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Camera Option */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startCamera}
            disabled={isProcessing}
            className="relative bg-gradient-to-br from-blue-500 to-purple-600 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            <div className="text-center space-y-3">
              <FaCameraRetro className="text-4xl mx-auto" />
              <h3 className="text-xl font-semibold">Take Photo</h3>
              <p className="text-blue-100 text-sm">
                Use your camera to capture text
              </p>
            </div>
          </motion.button>

          {/* File Upload Option */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="relative bg-gradient-to-br from-green-500 to-teal-600 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            <div className="text-center space-y-3">
              <FaUpload className="text-4xl mx-auto" />
              <h3 className="text-xl font-semibold">Upload Image</h3>
              <p className="text-green-100 text-sm">
                Select an image from your device
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </motion.button>
        </div>
      )}

      {/* Captured Image */}
      <AnimatePresence>
        {capturedImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-64 md:h-80 object-cover rounded-xl"
              />
              
              {!isProcessing && (
                <div className="absolute top-4 right-4 flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={retakePhoto}
                    className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <FaTimes />
                  </motion.button>
                </div>
              )}
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="text-center py-4">
                <FaSpinner className="text-3xl text-white animate-spin mx-auto mb-2" />
                <p className="text-white/80">Extracting text from image...</p>
              </div>
            )}

            {/* Extracted Text Preview */}
            {extractedText && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center">
                  <FaImage className="mr-2" />
                  Extracted Text:
                </h4>
                <p className="text-white/90 text-sm leading-relaxed">
                  {extractedText}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-200"
          >
            <p className="font-medium mb-1">Error</p>
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}