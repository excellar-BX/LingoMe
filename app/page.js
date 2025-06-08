//app/page.js
"use client"
import { useState, useCallback, useEffect } from 'react'
import { FaLanguage, FaImage, FaMicrophone, FaHistory, FaRocket, FaExclamationTriangle, FaFile, FaDownload, FaTrash, FaCopy, FaCheck } from 'react-icons/fa'
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
  const [debugInfo, setDebugInfo] = useState(null)
  
  // OCR History Management
  const [extractedTexts, setExtractedTexts] = useState([])
  const [copiedId, setCopiedId] = useState(null)

  // Initialize translation history in memory
  useEffect(() => {
    if (!window.translationHistory) {
      window.translationHistory = []
    }
    // Initialize OCR history
    if (!window.ocrHistory) {
      window.ocrHistory = []
      setExtractedTexts([])
    } else {
      setExtractedTexts(window.ocrHistory)
    }
  }, [])

  const translateText = useCallback(async (text) => {
    if (!text.trim()) {
      setError('Please provide text to translate')
      return
    }

    setIsTranslating(true)
    setError(null)
    setDebugInfo(null)

    try {
      console.log('Starting translation request...')
      
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

      console.log('Translation API response status:', response.status)

      const data = await response.json()
      console.log('Translation API response data:', data)

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Translation request failed`)
      }

      if (!data.translation) {
        throw new Error('No translation received from server')
      }

      setTranslation(data.translation)
      setDebugInfo({
        service: data.service || 'unknown',
        sourceLanguage: data.sourceLanguage || 'auto',
        targetLanguage: data.targetLanguage || targetLanguage
      })

      // Save to memory-based history
      const historyItem = {
        id: Date.now().toString(),
        original: text.trim(),
        translation: data.translation,
        targetLanguage,
        timestamp: new Date().toISOString(),
      }

      window.translationHistory = [historyItem, ...(window.translationHistory || [])].slice(0, 50)
      
      console.log('Translation successful:', data.translation)

    } catch (error) {
      console.error('Translation error:', error)
      setError(error.message || 'Failed to translate text. Please try again.')
      setDebugInfo({ error: error.message, timestamp: new Date().toISOString() })
    } finally {
      setIsTranslating(false)
    }
  }, [targetLanguage])

  const handleTextExtracted = useCallback((text, metadata = {}) => {
    console.log('Text extracted from image:', text)
    setCurrentText(text)
    
    // Add to OCR history with enhanced metadata
    const newEntry = {
      id: Date.now(),
      text: text.trim(),
      timestamp: new Date().toLocaleString(),
      confidence: metadata.confidence || 0,
      method: metadata.method || 'unknown',
      wordCount: text.trim().split(/\s+/).filter(word => word.length > 0).length,
      charCount: text.trim().length
    }
    
    const updatedHistory = [newEntry, ...extractedTexts].slice(0, 20) // Keep last 20 entries
    setExtractedTexts(updatedHistory)
    window.ocrHistory = updatedHistory
    
    // Auto-translate if text is extracted
    translateText(text)
  }, [translateText, extractedTexts])

  const handleSpeechToText = useCallback((text) => {
    console.log('Speech to text result:', text)
    setCurrentText(text)
    translateText(text)
  }, [translateText])

  const handleRetranslate = useCallback(() => {
    if (currentText) {
      console.log('Retranslating text:', currentText)
      translateText(currentText)
    }
  }, [currentText, translateText])

  const clearError = () => {
    setError(null)
    setDebugInfo(null)
  }

  // OCR History Management Functions
  const clearOCRHistory = () => {
    setExtractedTexts([])
    window.ocrHistory = []
  }

  const downloadAsText = () => {
    const allTexts = extractedTexts.map(entry => 
      `[${entry.timestamp}] (Confidence: ${entry.confidence}% | Method: ${entry.method})\n${entry.text}\n\n`
    ).join('')
    
    const blob = new Blob([allTexts], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `extracted-texts-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const useTextForTranslation = (text) => {
    setCurrentText(text)
    setActiveTab('image') // Switch back to main view
    translateText(text)
  }

  const tabs = [
    { id: 'image', label: 'Image OCR', icon: <FaImage/> },
    { id: 'speech', label: 'Speech', icon: <FaMicrophone/> },
    { id: 'history', label: 'History', icon: <FaHistory/> },
    { id: 'ocr-history', label: 'OCR History', icon: <FaFile/> },
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
              Lingo Me AI Translator
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
              {tab.icon}
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
              className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start space-x-3">
                <FaExclamationTriangle className="text-red-400 text-xl flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-red-200 font-semibold mb-1">Translation Error</h3>
                  <p className="text-red-300 text-sm">{error}</p>
                  {debugInfo && (
                    <details className="mt-2">
                      <summary className="text-red-400 text-xs cursor-pointer hover:text-red-300">
                        Debug Information
                      </summary>
                      <pre className="text-red-400 text-xs mt-1 bg-red-900/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(debugInfo, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  ✕
                </button>
              </div>
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

            {activeTab === 'ocr-history' && (
              <motion.div
                key="ocr-history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* OCR History Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <FaFile className="text-2xl text-white" />
                    <h2 className="text-2xl font-bold text-white">OCR History</h2>
                    <span className="bg-white/20 text-white text-sm px-2 py-1 rounded-full">
                      {extractedTexts.length} items
                    </span>
                  </div>
                  
                  {extractedTexts.length > 0 && (
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={downloadAsText}
                        className="bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors flex items-center space-x-2"
                      >
                        <FaDownload />
                        <span>Export</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearOCRHistory}
                        className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors flex items-center space-x-2"
                      >
                        <FaTrash />
                        <span>Clear</span>
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* OCR History List */}
                {extractedTexts.length === 0 ? (
                  <div className="text-center py-12">
                    <FaFile className="text-4xl text-white/30 mx-auto mb-4" />
                    <p className="text-white/60 text-lg">No OCR history yet</p>
                    <p className="text-white/40 text-sm">Extract text from images to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {extractedTexts.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-white/60 text-sm">{entry.timestamp}</span>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                entry.confidence >= 80 ? 'bg-green-500/20 text-green-300' :
                                entry.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {entry.confidence}% confidence
                              </span>
                              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                                {entry.method}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => copyToClipboard(entry.text, entry.id)}
                              className="text-white/60 hover:text-white p-1"
                            >
                              {copiedId === entry.id ? <FaCheck className="text-green-400" /> : <FaCopy />}
                            </motion.button>
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => useTextForTranslation(entry.text)}
                              className="text-blue-400 hover:text-blue-300 p-1"
                            >
                              <FaLanguage />
                            </motion.button>
                          </div>
                        </div>
                        
                        <p className="text-white text-sm leading-relaxed line-clamp-3">
                          {entry.text}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                          <span>{entry.wordCount} words • {entry.charCount} characters</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
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
                  <p className="text-white/60 text-sm mt-2">Processing your text...</p>
                </div>
              ) : (
                <div>
                  <TranslationResult
                    original={currentText}
                    translation={translation}
                    targetLanguage={targetLanguage}
                    onRetranslate={handleRetranslate}
                  />
                  {debugInfo && debugInfo.service && (
                    <div className="mt-4 text-center">
                      <span className="text-white/60 text-xs">
                        Translated using: {debugInfo.service}
                      </span>
                    </div>
                  )}
                </div>
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
            Powered by Lingo Me AI Translator • Built for global communication
          </p>
        </motion.footer>
      </div>
    </div>
  )
}