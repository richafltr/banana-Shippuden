import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

// Configure FAL client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  })
}

export async function POST(req: NextRequest) {
  try {
    const { action, battleArenaUrl, requestId } = await req.json()

    // Start video generation
    if (action === 'start') {
      if (!battleArenaUrl) {
        return NextResponse.json({ error: 'Battle arena URL required' }, { status: 400 })
      }

      console.log('🎬 Starting Veo3 video generation for battle arena:', battleArenaUrl)

      // Submit to queue for video generation
      const submission = await fal.queue.submit('fal-ai/veo3/fast/image-to-video', {
        input: {
          prompt: "The warriors charge at each other with incredible speed, energy crackling Health meters showing. Lots of acrobatic ninjutsu spells. Remove \"Fight\" from the top.",
          image_url: battleArenaUrl,
          duration: "8s",
          generate_audio: true,
          resolution: "720p"
        }
      })

      console.log('📹 Video generation queued with ID:', submission.request_id)

      return NextResponse.json({
        success: true,
        requestId: submission.request_id,
        status: 'queued'
      })
    }

    // Check status of existing request
    if (action === 'status') {
      if (!requestId) {
        return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
      }

      console.log('🔍 Checking video generation status for:', requestId)

      const status = await fal.queue.status('fal-ai/veo3/fast/image-to-video', {
        requestId: requestId,
        logs: true
      }) as any

      console.log('📊 Current status:', status.status)

      // If completed, fetch the result
      if (status.status === 'COMPLETED') {
        console.log('✅ Video generation completed, fetching result...')
        
        const result = await fal.queue.result('fal-ai/veo3/fast/image-to-video', {
          requestId: requestId
        }) as any

        if (result.data?.video?.url || result.video?.url) {
          const videoUrl = result.data?.video?.url || result.video?.url
          console.log('🎥 Video ready at:', videoUrl)
          
          return NextResponse.json({
            success: true,
            status: 'completed',
            videoUrl: videoUrl,
            audioUrl: result.data?.audio?.url || result.audio?.url || null
          })
        } else {
          console.error('No video URL in result:', result)
          return NextResponse.json({
            success: false,
            status: 'error',
            error: 'No video URL returned'
          })
        }
      }

      // Return current status with logs
      const lastLog = status.logs?.[status.logs.length - 1]?.message || 'Processing...'
      
      return NextResponse.json({
        success: true,
        status: status.status.toLowerCase(),
        progress: lastLog,
        logs: status.logs
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process video generation'
    }, { status: 500 })
  }
}
