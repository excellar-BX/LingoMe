//app/api/ocr/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image')

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please provide an image file.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    console.log('Processing OCR for image:', imageFile.name, imageFile.size)

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Try multiple OCR approaches
    let extractedText = ''
    let ocrMethod = ''
    let confidence = 0

    // Method 1: Try OCR.space API (free tier)
    try {
      console.log('Trying OCR.space API...')
      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': process.env.OCR_SPACE_API_KEY || 'helloworld', // Free tier key
        },
        body: (() => {
          const formData = new FormData()
          formData.append('base64Image', `data:${imageFile.type};base64,${base64Image}`)
          formData.append('language', 'eng')
          formData.append('isOverlayRequired', 'false')
          formData.append('detectOrientation', 'true')
          formData.append('scale', 'true')
          formData.append('OCREngine', '2') // Use OCR Engine 2 for better accuracy
          return formData
        })(),
      })

      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json()
        console.log('OCR.space response:', ocrData)
        
        if (ocrData.ParsedResults && ocrData.ParsedResults[0]) {
          const result = ocrData.ParsedResults[0]
          if (result.ParsedText && result.ParsedText.trim()) {
            extractedText = result.ParsedText
            ocrMethod = 'ocr.space'
            // OCR.space doesn't provide confidence, so we estimate based on text length and quality
            confidence = estimateConfidence(extractedText)
          }
        }

        // Check for errors in the response
        if (ocrData.IsErroredOnProcessing) {
          console.error('OCR.space processing error:', ocrData.ErrorMessage)
        }
      } else {
        console.error('OCR.space API request failed:', ocrResponse.status, ocrResponse.statusText)
      }
    } catch (error) {
      console.error('OCR.space API error:', error)
    }

    // Method 2: Try Google Vision API if available
    if (!extractedText.trim() && process.env.GOOGLE_VISION_API_KEY) {
      try {
        console.log('Trying Google Vision API...')
        const visionResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  image: {
                    content: base64Image,
                  },
                  features: [
                    {
                      type: 'TEXT_DETECTION',
                      maxResults: 1,
                    },
                  ],
                },
              ],
            }),
          }
        )

        if (visionResponse.ok) {
          const visionData = await visionResponse.json()
          console.log('Google Vision response:', visionData)

          if (visionData.responses && visionData.responses[0] && visionData.responses[0].textAnnotations) {
            const textAnnotation = visionData.responses[0].textAnnotations[0]
            if (textAnnotation && textAnnotation.description) {
              extractedText = textAnnotation.description
              ocrMethod = 'google-vision'
              confidence = 90 // Google Vision typically has high confidence
            }
          }
        }
      } catch (error) {
        console.error('Google Vision API error:', error)
      }
    }

    // Method 3: Fallback to client-side processing instruction
    if (!extractedText.trim()) {
      console.log('Server OCR failed, suggesting client-side processing...')
      return NextResponse.json({
        text: '',
        fallback: true,
        message: 'Server OCR failed. Falling back to client-side processing.',
        suggestions: [
          'Ensure the image has clear, high-contrast text',
          'Try with better lighting or focus',
          'Use a higher resolution image if possible'
        ]
      })
    }

    // Clean up the extracted text
    extractedText = cleanExtractedText(extractedText)

    console.log('OCR successful, extracted text length:', extractedText.length)
    console.log('OCR method:', ocrMethod)

    return NextResponse.json({
      text: extractedText,
      confidence: confidence > 0 ? confidence : estimateConfidence(extractedText),
      method: ocrMethod,
      length: extractedText.length,
      wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length
    })

  } catch (error) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process image for text extraction',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Helper function to clean extracted text
function cleanExtractedText(text) {
  return text
    .replace(/\r\n/g, '\n')     // Normalize line endings
    .replace(/\n+/g, ' ')       // Replace multiple newlines with single space
    .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
    .replace(/[^\S\n]+/g, ' ')  // Clean up other whitespace
    .trim()                     // Remove leading/trailing whitespace
}

// Helper function to estimate confidence based on text quality
function estimateConfidence(text) {
  if (!text || text.length === 0) return 0
  
  let score = 50 // Base score
  
  // Length bonus (longer text usually means better recognition)
  if (text.length > 10) score += 10
  if (text.length > 50) score += 10
  if (text.length > 100) score += 10
  
  // Word structure bonus
  const words = text.split(/\s+/).filter(word => word.length > 0)
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
  if (avgWordLength > 3 && avgWordLength < 8) score += 10
  
  // Common English words bonus
  const commonWords = ['the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i']
  const foundCommonWords = words.filter(word => 
    commonWords.includes(word.toLowerCase())
  ).length
  
  if (foundCommonWords > 0) score += Math.min(foundCommonWords * 2, 15)
  
  // Penalty for too many special characters or numbers
  const specialCharRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length
  if (specialCharRatio > 0.3) score -= 20
  
  // Penalty for too many single characters
  const singleChars = words.filter(word => word.length === 1).length
  if (singleChars > words.length * 0.3) score -= 15
  
  return Math.max(0, Math.min(100, score))
}

// Configuration for larger file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}