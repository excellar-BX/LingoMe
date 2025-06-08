'use client'

import { useState, useEffect } from 'react'
import { FaHistory, FaTrash, FaCopy, FaCheck } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import TextToSpeech from './TextToSpeech'

export default function TranslationHistory() {
  const [history, setHistory] = useState([])
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    // Load history from memory (since we can't use localStorage)
    const savedHistory = window.translationHistory || []
    setHistory(savedHistory)
  }, [])

  const clearHistory = () => {
    setHistory([])
    window.translationHistory = []
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

  const deleteItem = (id) => {
    const newHistory = history.filter(item => item.id !== id)
    setHistory(newHistory)
    window.translationHistory = newHistory
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <FaHistory className="text-6xl text-white/30 mx-auto mb-4" />
        <p className="text-white/60 text-lg">No translation history yet</p>
        <p className="text-white/40 text-sm mt-2">Your translations will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <FaHistory />
          <span>Translation History</span>
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearHistory}
          className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          <FaTrash className="inline mr-2" />
          Clear All
        </motion.button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
        <AnimatePresence>
          {history.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-xl p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <div className="text-white/80 text-sm">
                    <span className="font-medium">Original:</span>
                    <p className="mt-1 text-white">{item.original}</p>
                  </div>
                  
                  <div className="text-white/80 text-sm">
                    <span className="font-medium">Translation:</span>
                    <p className="mt-1 text-white">{item.translation}</p>
                  </div>
                  
                  <div className="text-white/60 text-xs">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <TextToSpeech text={item.translation} language={item.targetLanguage} />
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(item.translation, item.id)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  >
                    {copiedId === item.id ? <FaCheck /> : <FaCopy />}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => deleteItem(item.id)}
                    className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                  >
                    <FaTrash />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
