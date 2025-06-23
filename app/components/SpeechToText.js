'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FaMicrophone, FaStop, FaSpinner, FaGlobe } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

export default function SpeechToText({ onSpeechToText }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [suggestedLanguages, setSuggestedLanguages] = useState(['en-US'])
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)

  // Country to language mapping for African countries
  const countryLanguages = {
    'NG': [
      { code: 'en-US', name: 'English', flag: '🇺🇸' },
      { code: 'yo-NG', name: 'Yoruba', flag: '🇳🇬' },
      { code: 'ha-NG', name: 'Hausa', flag: '🇳🇬' }
    ],
    'KE': [
      { code: 'sw-KE', name: 'Swahili', flag: '🇰🇪' },
      { code: 'en-US', name: 'English', flag: '🇺🇸' }
    ],
    'TZ': [
      { code: 'sw-TZ', name: 'Swahili', flag: '🇹🇿' },
      { code: 'en-US', name: 'English', flag: '🇺🇸' }
    ],
    'ZA': [
      { code: 'en-US', name: 'English', flag: '🇺🇸' },
      { code: 'af-ZA', name: 'Afrikaans', flag: '🇿🇦' },
      { code: 'zu-ZA', name: 'Zulu', flag: '🇿🇦' }
    ],
    'ET': [
      { code: 'am-ET', name: 'Amharic', flag: '🇪🇹' },
      { code: 'en-US', name: 'English', flag: '🇺🇸' }
    ],
    'GH': [
      { code: 'en-US', name: 'English', flag: '🇺🇸' },
      { code: 'tw-GH', name: 'Twi', flag: '🇬🇭' }
    ],
    // Default fallback
    'DEFAULT': [
      { code: 'en-US', name: 'English', flag: '🇺🇸' },
      { code: 'sw-KE', name: 'Swahili', flag: '🇰🇪' },
      { code: 'af-ZA', name: 'Afrikaans', flag: '🇿🇦' }
    ]
  }

  // Get country from coordinates using reverse geocoding
  const getCountryFromCoords = async (lat, lon) => {
    try {
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
      const data = await response.json()
      return data.countryCode
    } catch (error) {
      console.error('Failed to get country:', error)
      return null
    }
  }

  // Detect user location and suggest languages
  const detectLocationAndLanguages = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          const countryCode = await getCountryFromCoords(latitude, longitude)
          
          if (countryCode && countryLanguages[countryCode]) {
            const languages = countryLanguages[countryCode]
            setSuggestedLanguages(languages)
            setSelectedLanguage(languages[0].code) // Set first language as default
          } else {
            // Fallback to default languages
            setSuggestedLanguages(countryLanguages.DEFAULT)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
          // Fallback to browser language or default
          const browserLang = navigator.language || 'en-US'
          setSuggestedLanguages(countryLanguages.DEFAULT)
          setSelectedLanguage(browserLang)
        },
        { timeout: 5000, enableHighAccuracy: false }
      )
    } else {
      // No geolocation support, use browser language
      const browserLang = navigator.language || 'en-US'
      setSuggestedLanguages(countryLanguages.DEFAULT)
      setSelectedLanguage(browserLang)
    }
  }, [])

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false)
    } else {
      // Detect location and suggest languages
      detectLocationAndLanguages()
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [detectLocationAndLanguages])

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
    recognitionRef.current.lang = selectedLanguage // Use selected language instead of 'auto'
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
  }, [isSupported, onSpeechToText, selectedLanguage])

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
      {/* Language Selector */}
      <div className="text-center">
        <button
          onClick={() => setShowLanguageSelector(!showLanguageSelector)}
          className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2 text-white transition-all duration-200"
        >
          <FaGlobe className="text-sm" />
          <span className="text-sm">
            {suggestedLanguages.find(lang => lang.code === selectedLanguage)?.name || 'English'}
          </span>
          <span className="text-lg">
            {suggestedLanguages.find(lang => lang.code === selectedLanguage)?.flag || '🇺🇸'}
          </span>
        </button>

        <AnimatePresence>
          {showLanguageSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 bg-white/10 backdrop-blur-sm rounded-lg p-3 space-y-2"
            >
              {suggestedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    setSelectedLanguage(language.code)
                    setShowLanguageSelector(false)
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-200 ${
                    selectedLanguage === language.code
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              <span className="font-medium">
                Listening in {suggestedLanguages.find(lang => lang.code === selectedLanguage)?.name}...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}