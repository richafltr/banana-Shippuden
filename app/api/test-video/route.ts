import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

// Configure FAL client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  })
}

export async function POST(req: NextRequest) {
  console.log('\n========================================')
  console.log('📹 TEST VIDEO GENERATION - Using Subscribe Method')
  console.log('========================================\n')
  
  try {
    const body = await req.json()
    const { imageUrl, prompt } = body
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL required' }, { status: 400 })
    }
    
    const testPrompt = prompt || "The warriors charge at each other with incredible speed, energy crackling. Epic battle scene."
    
    console.log('🎬 Starting test video generation')
    console.log(`   Image URL: ${imageUrl}`)
    console.log(`   Prompt: ${testPrompt}`)
    
    // Use the subscribe method which handles everything automatically
    console.log('\n📤 Calling fal.subscribe...')
    const result = await fal.subscribe('fal-ai/veo3/fast/image-to-video', {
      input: {
        prompt: testPrompt,
        image_url: imageUrl,
        duration: "8s",
        generate_audio: true,
        resolution: "720p"
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`   Status: ${update.status}`)
        if (update.status === 'IN_PROGRESS' && update.logs) {
          const lastLog = update.logs[update.logs.length - 1]
          if (lastLog) {
            console.log(`   Progress: ${lastLog.message}`)
          }
        }
      }
    })
    
    console.log('\n✅ Subscribe completed!')
    console.log('Result type:', typeof result)
    console.log('Result keys:', Object.keys(result))
    
    // Log the structure to understand it better
    if (result.data) {
      console.log('result.data exists, keys:', Object.keys(result.data))
      if (result.data.video) {
        console.log('result.data.video exists:', result.data.video)
      }
    }
    if ((result as any).video) {
      console.log('result.video exists:', (result as any).video)
    }
    
    console.log('Full result structure:', JSON.stringify(result, null, 2))
    
    // Cast to any to handle varying result structures
    const resultAny = result as any
    
    // According to FAL docs, with subscribe the result is in result.data
    const videoUrl = result.data?.video?.url || 
                    resultAny.video?.url || 
                    resultAny.output?.video?.url ||
                    resultAny.url
    
    if (videoUrl) {
      console.log(`\n🎥 Video URL found: ${videoUrl}`)
      return NextResponse.json({
        success: true,
        videoUrl: videoUrl,
        requestId: result.requestId,
        fullResult: result
      })
    } else {
      console.error('❌ No video URL found in result')
      return NextResponse.json({
        success: false,
        error: 'No video URL in result',
        fullResult: result
      })
    }
    
  } catch (error: any) {
    console.error('\n❌ Test video generation failed:', error)
    
    // Log detailed error information
    if (error.status === 422 && error.body?.detail) {
      console.error('422 Error Details:')
      console.error('Full error body:', JSON.stringify(error.body, null, 2))
      if (Array.isArray(error.body.detail)) {
        error.body.detail.forEach((detail: any, index: number) => {
          console.error(`Detail ${index + 1}:`, JSON.stringify(detail, null, 2))
        })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate test video',
      details: error.body || error.toString(),
      status: error.status
    }, { status: 500 })
  }
}
