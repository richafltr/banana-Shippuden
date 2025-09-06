import { NextRequest, NextResponse } from 'next/server'
import { transformToNarutoCharacter, prepareBattleStance } from '@/lib/fal'
import { uploadToSpaces, SPACES_BUCKET_EDITS } from '@/lib/spaces'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, action, playerId } = body

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
    }

    let result
    
    if (action === 'naruto-transform') {
      // Transform to Naruto character
      result = await transformToNarutoCharacter(imageUrl)
    } else if (action === 'battle-stance-left' || action === 'battle-stance-right') {
      // Prepare battle stance
      const direction = action === 'battle-stance-left' ? 'left' : 'right'
      result = await prepareBattleStance(imageUrl, direction)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Save transformed images to banana-edit space
    const savedImages = []
    
    for (const image of result.images) {
      // Download image from FAL
      const response = await fetch(image.url)
      const buffer = Buffer.from(await response.arrayBuffer())
      
      // Generate filename
      const timestamp = Date.now()
      const fileName = `${playerId}-${action}-${timestamp}.jpg`
      
      // Upload to banana-edit space
      const publicUrl = await uploadToSpaces(
        buffer,
        fileName,
        SPACES_BUCKET_EDITS,
        image.content_type || 'image/jpeg'
      )
      
      savedImages.push({
        ...image,
        url: publicUrl,
        fileName
      })
    }

    return NextResponse.json({
      success: true,
      images: savedImages,
      prompt: result.prompt,
      seed: result.seed
    })
  } catch (error) {
    console.error('Transform error:', error)
    return NextResponse.json(
      { error: 'Failed to transform image' },
      { status: 500 }
    )
  }
}
