import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = await request.json()
    
    console.log('Translation request:', { text, targetLanguage, sourceLanguage })
    
    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and target language are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log('Making request to DeepSeek API...')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${getLanguageName(targetLanguage)}. Only return the translation, no explanations or additional text. If the source language is the same as target language, return the original text. Be precise and maintain the original meaning.`
          },
          {
            role: 'user',
            content: text
          }
        ]
      })
    })

    console.log('DeepSeek API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', errorText)
      
      // Try fallback translation service
      console.log('Trying fallback translation...')
      return await fallbackTranslation(text, targetLanguage)
    }

    const data = await response.json()
    console.log('DeepSeek API response:', data)
    
    const translation = data.choices?.[0]?.message?.content?.trim()

    if (!translation) {
      console.error('No translation received from DeepSeek API')
      // Try fallback translation service
      return await fallbackTranslation(text, targetLanguage)
    }

    console.log('Translation successful:', translation)

    return NextResponse.json({
      translation,
      sourceLanguage,
      targetLanguage,
      service: 'deepseek'
    })

  } catch (error) {
    console.error('Translation error:', error)
    
    // Try fallback translation service
    try {
      const { text, targetLanguage } = await request.json()
      return await fallbackTranslation(text, targetLanguage)
    } catch (fallbackError) {
      console.error('Fallback translation also failed:', fallbackError)
      return NextResponse.json(
        { error: 'Translation service temporarily unavailable' },
        { status: 500 }
      )
    }
  }
}

// Fallback translation using a free service
async function fallbackTranslation(text, targetLanguage) {
  try {
    console.log('Using MyMemory fallback translation service')
    
    const encodedText = encodeURIComponent(text)
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=auto|${targetLanguage}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Translator/1.0)'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`MyMemory API failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('MyMemory API response:', data)

    if (data.responseStatus === 200 && data.translatedText) {
      return NextResponse.json({
        translation: data.translatedText,
        sourceLanguage: 'auto',
        targetLanguage,
        service: 'mymemory'
      })
    } else {
      throw new Error('MyMemory translation failed')
    }

  } catch (error) {
    console.error('Fallback translation error:', error)
    
    // Last resort: Simple word-by-word translation for basic phrases
    const simpleTranslation = getSimpleTranslation(text, targetLanguage)
    if (simpleTranslation) {
      return NextResponse.json({
        translation: simpleTranslation,
        sourceLanguage: 'auto',
        targetLanguage,
        service: 'simple'
      })
    }
    
    throw new Error('All translation services failed')
  }
}

// Simple translation for basic phrases
function getSimpleTranslation(text, targetLanguage) {
  const basicTranslations = {
    'en': {
      'hello': { es: 'hola', fr: 'bonjour', de: 'hallo', it: 'ciao', pt: 'olá', ru: 'привет', ja: 'こんにちは', ko: '안녕하세요', zh: '你好', ar: 'مرحبا', hi: 'नमस्ते' },
      'goodbye': { es: 'adiós', fr: 'au revoir', de: 'auf wiedersehen', it: 'ciao', pt: 'tchau', ru: 'до свидания', ja: 'さようなら', ko: '안녕히 가세요', zh: '再见', ar: 'وداعا', hi: 'अलविदा' },
      'thank you': { es: 'gracias', fr: 'merci', de: 'danke', it: 'grazie', pt: 'obrigado', ru: 'спасибо', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢', ar: 'شكرا', hi: 'धन्यवाद' },
      'please': { es: 'por favor', fr: 's\'il vous plaît', de: 'bitte', it: 'per favore', pt: 'por favor', ru: 'пожалуйста', ja: 'お願いします', ko: '부탁합니다', zh: '请', ar: 'من فضلك', hi: 'कृपया' },
      'yes': { es: 'sí', fr: 'oui', de: 'ja', it: 'sì', pt: 'sim', ru: 'да', ja: 'はい', ko: '예', zh: '是', ar: 'نعم', hi: 'हाँ' },
      'no': { es: 'no', fr: 'non', de: 'nein', it: 'no', pt: 'não', ru: 'нет', ja: 'いいえ', ko: '아니요', zh: '不', ar: 'لا', hi: 'नहीं' }
    }
  }

  const lowerText = text.toLowerCase().trim()
  const translations = basicTranslations['en']
  
  if (translations[lowerText] && translations[lowerText][targetLanguage]) {
    return translations[lowerText][targetLanguage]
  }
  
  return null
}

function getLanguageName(code) {
  const languages = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese (Simplified)',
    'ar': 'Arabic',
    'hi': 'Hindi'
  }
  return languages[code] || 'Unknown Language'
}
