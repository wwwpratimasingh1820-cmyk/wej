import * as nsfwjs from 'nsfwjs'

let model: nsfwjs.NSFWJS | null = null

export const loadNSFWModel = async () => {
  if (!model) {
    model = await nsfwjs.load()
  }
  return model
}

export const checkNSFW = async (imageElement: HTMLImageElement): Promise<boolean> => {
  const m = await loadNSFWModel()
  const predictions = await m.classify(imageElement)
  
  for (const p of predictions) {
    if ((p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.7) {
      return true
    }
  }
  return false
}

export const processImage = async (file: File): Promise<{ original: File, blurred: File }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = async () => {
      try {
        // 1. Check NSFW
        const isNSFW = await checkNSFW(img)
        if (isNSFW) {
          URL.revokeObjectURL(url)
          return reject(new Error('NSFW_DETECTED'))
        }

        // 2. Process Blurred Image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) return reject(new Error('Canvas not supported'))

        // Draw original and blur
        ctx.filter = 'blur(40px)' // Stronger blur
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.filter = 'none'

        // Overlay Watermark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.font = `bold ${canvas.width * 0.25}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('W', canvas.width / 2, canvas.height / 2)

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (!blob) return reject(new Error('Blob conversion failed'))
          const blurredFile = new File([blob], `blurred-${file.name}`, { type: 'image/webp' })
          resolve({ original: file, blurred: blurredFile })
        }, 'image/webp', 0.6)
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image loading failed'))
    }

    img.src = url
  })
}

// Simple prompt filter
const BANNED_KEYWORDS = ['illegal', 'gore', 'cp', 'violence']

export const filterPrompt = (prompt: string): boolean => {
  const lowerPrompt = prompt.toLowerCase()
  return BANNED_KEYWORDS.some(kw => lowerPrompt.includes(kw))
}
