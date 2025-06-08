'use client'

import { useState, useCallback, useEffect } from 'react'
import { FaLanguage, FaImage, FaMicrophone, FaHistory, FaRocket } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import ImageUpload from './components/ImageUpload'
import SpeechToText from './components/SpeechToText'
import LanguageSelector from './components/LanguageSelector'
import TranslationResult from './components/TranslationResult'
import TranslationHistory from './components/TranslationHistory'

export default function Home() {
  const [activeTab, setActiveTab] = useState('image')
  const [targetLanguage, setTargetLanguage] = useState('es')
  const [currentText, setCurrentText] = useState('')
  const [translation, setTranslation] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState(null)

  // Initialize translation history in memory
  useEffect(() => {
    if (!window.translationHistory) {
      window.translationHistory = []
    }
  }, [])

  const translateText = useCallback(async (text) => {
    if (!text.trim()) return

    setIsTranslating(true)
    setError(null)

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          targetLanguage,
        }),
      })

      if (!response.ok) {
        throw new Error('Translation failed')
      }

      const data = await response.json()
      setTranslation(data.translation)

      // Save to memory-based history
      const historyItem = {
        id: Date.now().toString(),
        original: text.trim(),
        translation: data.translation,
        targetLanguage,
        timestamp: new Date().toISOString(),
      }

      window.translationHistory = [historyItem, ...(window.translationHistory || [])].slice(0, 50)

    } catch (error) {
      console.error('Translation error:', error)
      setError('Failed to translate text. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }, [targetLanguage])

  const handleTextExtracted = useCallback((text) => {
    setCurrentText(text)
    translateText(text)
  }, [translateText])

  const handleSpeechToText = useCallback((text) => {
    setCurrentText(text)
    translateText(text)
  }, [translateText])

  const handleRetranslate = useCallback(() => {
    if (currentText) {
      translateText(currentText)
    }
  }, [currentText, translateText])

  const tabs = [
    { id: 'image', label: 'Image OCR', icon: FaImage },
    { id: 'speech', label: 'Speech', icon: FaMicrophone },
    { id: 'history', label: 'History', icon: FaHistory },
  ]

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <FaRocket className="text-4xl text-white animate-float" />
            <h1 className="text-4xl md:text-6xl font-bold text-white text-shadow-lg">
              AI Translator
            </h1>
          </div>
          <p className="text-xl text-white/80 font-medium">
            Break language barriers with AI-powered translation
          </p>
          <p className="text-white/60 mt-2">
            Perfect for travelers, immigrants, and global communication
          </p>
        </motion.div>

        {/* Language Selector */}
        <div className="mb-8">
          <LanguageSelector
            selectedLanguage={targetLanguage}
            onLanguageChange={setTargetLanguage}
          />
        </div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex space-x-1 mb-8 bg-white/10 backdrop-blur-lg rounded-xl p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <tab.icon />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-200 mb-6"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <AnimatePresence mode="wait">
            {activeTab === 'image' && (
              <motion.div
                key="image"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <ImageUpload onTextExtracted={handleTextExtracted} />
              </motion.div>
            )}

            {activeTab === 'speech' && (
              <motion.div
                key="speech"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <SpeechToText onSpeechToText={handleSpeechToText} />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <TranslationHistory />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Translation Result */}
        <AnimatePresence>
          {(translation || isTranslating) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {isTranslating ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                  >
                    <FaLanguage className="text-4xl text-white mb-4" />
                  </motion.div>
                  <p className="text-white text-lg font-medium">Translating...</p>
                </div>
              ) : (
                <TranslationResult
                  original={currentText}
                  translation={translation}
                  targetLanguage={targetLanguage}
                  onRetranslate={handleRetranslate}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 text-white/60"
        >
          <p className="text-sm">
            Powered by AI • Built for global communication
          </p>
        </motion.footer>
      </div>
    </div>
  )
}