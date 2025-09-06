import { NextRequest, NextResponse } from 'next/server'
import { uploadToSpaces, SPACES_BUCKET_PROFILES } from '@/lib/spaces'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const playerId = formData.get('playerId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${playerId}-${timestamp}.${fileExtension}`

    // Upload to DigitalOcean Spaces
    const publicUrl = await uploadToSpaces(
      buffer,
      fileName,
      SPACES_BUCKET_PROFILES,
      file.type
    )

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      fileName: fileName
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
