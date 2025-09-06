import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import { s3Client } from '@/lib/spaces'
import { PutObjectCommand } from '@aws-sdk/client-s3'

// Configure FAL client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  })
}

const SPACES_BUCKET_EDITS = 'banana-edit'
const SPACES_ENDPOINT = 'https://sfo3.digitaloceanspaces.com'

async function uploadToSpaces(buffer: Buffer, fileName: string, contentType: string = 'image/jpeg') {
  const command = new PutObjectCommand({
    Bucket: SPACES_BUCKET_EDITS,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  })

  await s3Client.send(command)
  return `${SPACES_ENDPOINT}/${SPACES_BUCKET_EDITS}/${fileName}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, prompt, outputFileName, numImages = 3 } = body

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
    }

    // Use provided prompt or default Naruto transformation
    const transformPrompt = prompt || "Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Realistic 3D graphics rendered in Unreal Engine."

    console.log('Starting transformation with prompt:', transformPrompt)

    // Transform image using FAL AI
    const result = await fal.subscribe('fal-ai/nano-banana/edit', {
      input: {
        prompt: transformPrompt,
        image_urls: [imageUrl],
        num_images: numImages,
        output_format: 'jpeg'
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('Processing image...', update.logs?.map((log: any) => log.message))
        }
      },
    })

    // Save transformed images to banana-edit space
    const savedImages = []
    
    if (result.data?.images) {
      for (let i = 0; i < result.data.images.length; i++) {
        const image = result.data.images[i]
        
        // Download image from FAL
        const response = await fetch(image.url)
        const buffer = Buffer.from(await response.arrayBuffer())
        
        // Generate filename
        const timestamp = Date.now()
        const fileName = `${outputFileName || 'transformed'}-${i}-${timestamp}.jpg`
        
        // Upload to banana-edit space
        const publicUrl = await uploadToSpaces(buffer, fileName)
        
        savedImages.push(publicUrl)
      }
    }

    return NextResponse.json({
      success: true,
      imageUrls: savedImages,
      prompt: transformPrompt
    })
  } catch (error) {
    console.error('Transform error:', error)
    return NextResponse.json(
      { error: 'Failed to transform image' },
      { status: 500 }
    )
  }
}
