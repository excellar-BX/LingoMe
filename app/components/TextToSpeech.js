'use client'

import { useState, useCallback, useEffect } from 'react'
import { FaVolumeUp, FaStop, FaSpinner } from 'react-icons/fa'
import { motion } from 'framer-motion'

export default function TextToSpeech({ text, language }) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false)
      return
    }

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices()
      setVoices(availableVoices)
      
      // Find best voice for the language
      const languageVoice = availableVoices.find(voice => 
        voice.lang.startsWith(language) || voice.lang.includes(language)
      )
      setSelectedVoice(languageVoice || availableVoices[0])
    }

    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      speechSynthesis.cancel()
    }
  }, [language])

  const speak = useCallback(() => {
    if (!text || !isSupported) return

    // Cancel any ongoing speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }
    
    utterance.rate = 0.8
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    speechSynthesis.speak(utterance)
  }, [text, selectedVoice, isSupported])

  const stop = useCallback(() => {
    speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  if (!isSupported || !text) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isSpeaking ? stop : speak}
        className={`p-3 rounded-full transition-all duration-300 ${
          isSpeaking 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
      >
        {isSpeaking ? <FaStop /> : <FaVolumeUp />}
      </motion.button>
      
      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-white/80 text-sm"
        >
          Playing...
        </motion.div>
      )}
    </div>
  )
}