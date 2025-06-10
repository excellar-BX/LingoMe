'use client'

import { useState } from 'react'
import { FaCopy, FaCheck, FaLanguage } from 'react-icons/fa'
import { motion } from 'framer-motion'
import TextToSpeech from './TextToSpeech'

export default function TranslationResult({ original, translation, targetLanguage, onRetranslate }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(translation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  if (!translation) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Original Text */}
      <div className="glass-effect rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <FaLanguage className="text-white/60" />
          <span className="text-white/60 text-sm font-medium">Original</span>
        </div>
        <p className="text-white text-lg leading-relaxed">{original}</p>
      </div>

      {/* Translation */}
      <div className="glass-effect rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FaLanguage className="text-white/60" />
            <span className="text-white/60 text-sm font-medium">Translation</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <TextToSpeech text={translation} language={targetLanguage} />
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyToClipboard}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              {copied ? <FaCheck /> : <FaCopy />}
            </motion.button>
          </div>
        </div>
        
        <p className="text-white text-lg leading-relaxed">{translation}</p>
        
        {onRetranslate && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetranslate}
            className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Retranslate
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}