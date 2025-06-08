'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FaMicrophone, FaStop, FaSpinner } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

export default function SpeechToText({ onSpeechToText }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false)
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser')
      return
    }

    setError(null)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'auto'
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      setIsListening(true)
      setTranscript('')
    }

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }
      
      const fullTranscript = (finalTranscript + interimTranscript).trim()
      setTranscript(fullTranscript)
      
      if (finalTranscript) {
        onSpeechToText(finalTranscript)
        
        // Auto-stop after getting final result
        timeoutRef.current = setTimeout(() => {
          stopListening()
        }, 1000)
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setError(`Speech recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      setError('Failed to start speech recognition')
      setIsListening(false)
    }
  }, [isSupported, onSpeechToText])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!isSupported) {
    return (
      <div className="text-center p-8">
        <div className="text-white/60 space-y-4">
          <FaMicrophone className="text-4xl mx-auto" />
          <p className="text-lg">Speech recognition is not supported in this browser.</p>
          <p className="text-sm">Please try using Chrome, Safari, or Edge.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-200 text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Display */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-effect rounded-xl p-4"
          >
            <p className="text-white text-lg leading-relaxed">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Control Button */}
      <div className="flex justify-center">
        {!isListening ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startListening}
            className="bg-white text-purple-600 p-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3"
          >
            <FaMicrophone className="text-2xl" />
            <span className="font-semibold text-lg">Start Speaking</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopListening}
            className="bg-red-500 text-white p-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3"
            animate={{ 
              boxShadow: [
                "0 0 0 0 rgba(239, 68, 68, 0.7)",
                "0 0 0 10px rgba(239, 68, 68, 0)",
                "0 0 0 0 rgba(239, 68, 68, 0)"
              ]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "loop"
            }}
          >
            <FaStop className="text-2xl" />
            <span className="font-semibold text-lg">Stop Recording</span>
          </motion.button>
        )}
      </div>
      
      {/* Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-3 text-white">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce animation-delay-200" />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce animation-delay-400" />
              </div>
              <span className="font-medium">Listening...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
