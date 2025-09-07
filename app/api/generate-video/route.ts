import { NextRequest, NextResponse } from 'next/server'
import { uploadToSpaces, SPACES_BUCKET_EDITS } from '@/lib/spaces'
import { 
  createSession, 
  getSession, 
  updateSession, 
  updateSegment,
  VideoSession 
} from '@/lib/video-sessions'
import {
  submitVideoGeneration,
  checkVideoStatus,
  getVideoResult,
  withRetry
} from '@/lib/fal-retry'

// Force Node.js runtime for better compatibility
export const runtime = 'nodejs'

// Import video utilities directly since ffmpeg is now available
import { extractLastFrame, stitchVideos } from '@/lib/video-utils'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log('\n=========================================')
  console.log(`📹 Video Generation Request - ${new Date().toISOString()}`)
  
  try {
    const body = await req.json()
    const { action } = body
    console.log(`   Action: ${action}`)
    console.log(`   Request body:`, JSON.stringify(body, null, 2))

    let response: NextResponse
    
    switch (action) {
      case 'start':
        response = await handleStart(body)
        break
      case 'status':
        response = await handleStatus(body)
        break
      default:
        console.error(`❌ Invalid action: ${action}`)
        response = NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    const duration = Date.now() - startTime
    console.log(`✅ Request completed in ${duration}ms`)
    console.log('=========================================\n')
    return response
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Video generation error after', duration, 'ms:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    console.log('=========================================\n')
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

// Start a new multi-segment video generation
async function handleStart(body: any) {
  const { battleArenaUrl } = body
  
  if (!battleArenaUrl) {
    console.error('❌ Missing battleArenaUrl in request')
    return NextResponse.json({ error: 'Battle arena URL required' }, { status: 400 })
  }

  console.log('🎬 Starting multi-segment video generation')
  console.log(`   Battle Arena URL: ${battleArenaUrl}`)
  console.log(`   Total segments planned: 5`)
  
  try {
    // Create a new session for multi-segment
    const session = createSession(battleArenaUrl)
    console.log(`📁 Created session: ${session.id}`)
    
    // Start generating the first segment with retry (using queue approach for non-blocking)
    const firstSegment = session.segments[0]
    console.log(`🎯 Starting first segment generation`)
    console.log(`   Prompt: ${firstSegment.prompt.substring(0, 100)}...`)
    
    const submission = await submitVideoGeneration(
      firstSegment.prompt,
      battleArenaUrl,
      {
        duration: "8s",
        generate_audio: true,
        resolution: "720p"
      }
    )
    
    // Update segment with request ID
    const updatedSession = updateSegment(session.id, 0, {
      requestId: submission.request_id,
      status: 'processing'
    })
    
    console.log(`✅ Segment 1/${session.segments.length} successfully queued`)
    console.log(`   Request ID: ${submission.request_id}`)
    
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      totalSegments: session.segments.length,
      currentSegment: 1,
      status: 'processing',
      message: 'Video generation started successfully'
    })
  } catch (error) {
    console.error('❌ Failed to start video generation:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start video generation',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

// Check status and handle segment completion
async function handleStatus(body: any) {
  const { sessionId, requestId } = body
  
  // Support both sessionId (new) and requestId (backward compatibility)
  const id = sessionId || requestId
  
  if (!id) {
    console.error('❌ No session ID or request ID provided')
    return NextResponse.json({ error: 'Session ID or Request ID required' }, { status: 400 })
  }
  
  console.log(`🔍 Checking status for: ${id}`)
  
  // Check if it's a session ID
  let session = getSession(id)
  
  // If no session found, it might be an old single-segment request
  if (!session) {
    console.log('⚠️ No session found, treating as legacy single-segment request')
    return handleLegacyStatus(id)
  }
  
  console.log(`📁 Session found:`, {
    id: session.id,
    status: session.status,
    currentSegment: session.currentSegmentIndex + 1,
    totalSegments: session.segments.length,
    hasError: !!session.error
  })
  
  // If already completed, return the final video
  if (session.status === 'completed' && session.finalVideoUrl) {
    console.log('✅ Session already completed, returning final video')
    return NextResponse.json({
      success: true,
      status: 'completed',
      videoUrl: session.finalVideoUrl,
      totalSegments: session.segments.length,
      message: 'Video generation completed'
    })
  }
  
  // If failed, check if we can recover
  if (session.status === 'failed') {
    console.log('⚠️ Session marked as failed, attempting recovery...')
    
    // Check if we can retry the failed segment
    const failedSegment = session.segments[session.currentSegmentIndex]
    if (failedSegment && failedSegment.status !== 'completed') {
      console.log(`🔄 Attempting to retry segment ${session.currentSegmentIndex + 1}`)
      // Reset session status to allow retry
      const updatedSession = updateSession(session.id, { status: 'processing' })
      if (updatedSession) {
        // Use the updated session for the rest of the function
        Object.assign(session, updatedSession)
      }
      // Continue to process the segment below
    } else {
      console.error('❌ Unable to recover failed session')
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: session.error || 'Video generation failed',
        details: 'Unable to recover from failure'
      })
    }
  }
  
  // Check current segment status
  const currentSegment = session.segments[session.currentSegmentIndex]
  
  // Validate segment
  if (!currentSegment) {
    console.error(`❌ Invalid segment index: ${session.currentSegmentIndex}`)
    updateSession(session.id, {
      status: 'failed',
      error: 'Invalid segment index'
    })
    return NextResponse.json({
      success: false,
      status: 'failed',
      error: 'Invalid segment index'
    }, { status: 500 })
  }
  
  // If no request ID, we need to start this segment
  if (!currentSegment.requestId) {
    console.log(`⚠️ Segment ${session.currentSegmentIndex + 1} has no request ID, needs to be started`)
    
    try {
      // Determine the image URL for this segment
      let imageUrl = body.battleArenaUrl // Default to original arena
      
      if (session.currentSegmentIndex > 0) {
        // Try to use the last frame from previous segment
        const prevSegment = session.segments[session.currentSegmentIndex - 1]
        if (prevSegment.videoUrl) {
          console.log('🎥 Extracting last frame from previous segment...')
          const lastFrameDataUrl = await extractLastFrame(prevSegment.videoUrl)
          const base64Data = lastFrameDataUrl.split(',')[1]
          const frameBuffer = Buffer.from(base64Data, 'base64')
          const frameFileName = `frames/${session.id}_segment${session.currentSegmentIndex - 1}_lastframe.jpg`
          imageUrl = await uploadToSpaces(
            frameBuffer,
            frameFileName,
            SPACES_BUCKET_EDITS,
            'image/jpeg'
          )
          console.log('✅ Frame extracted and uploaded')
        }
      }
      
      // Start the segment
      const submission = await submitVideoGeneration(
        currentSegment.prompt,
        imageUrl,
        {
          duration: "8s",
          generate_audio: true,
          resolution: "720p"
        }
      )
      
      const updatedSession = updateSegment(session.id, session.currentSegmentIndex, {
        requestId: submission.request_id,
        status: 'processing'
      })
      if (updatedSession) {
        Object.assign(session, updatedSession)
      }
      
      console.log(`✅ Segment ${session.currentSegmentIndex + 1} started with request ID: ${submission.request_id}`)
      
      return NextResponse.json({
        success: true,
        status: 'processing',
        currentSegment: session.currentSegmentIndex + 1,
        totalSegments: session.segments.length,
        message: `Started segment ${session.currentSegmentIndex + 1}`
      })
    } catch (error) {
      console.error('❌ Failed to start segment:', error)
      updateSession(session.id, {
        status: 'failed',
        error: 'Failed to start segment'
      })
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: 'Failed to start segment',
        details: error instanceof Error ? error.message : undefined
      }, { status: 500 })
    }
  }
  
  console.log(`🔍 Checking segment ${session.currentSegmentIndex + 1}/${session.segments.length}`)
  console.log(`   Request ID: ${currentSegment.requestId}`)
  
  try {
    const status = await checkVideoStatus(currentSegment.requestId)
    
    if (status.status === 'COMPLETED') {
      console.log(`✅ Segment ${session.currentSegmentIndex + 1} generation completed`)
      
      // Check if the result is already in the status response
      let videoUrl = status.result?.video?.url || 
                     status.result?.data?.video?.url ||
                     status.output?.video?.url ||
                     status.data?.video?.url ||
                     status.video?.url
      
      if (!videoUrl) {
        console.log('Result not in status response, will fetch separately')
        console.log('Status structure:', JSON.stringify({
          hasResult: !!status.result,
          hasData: !!status.data,
          hasOutput: !!status.output,
          hasVideo: !!status.video,
          statusKeys: Object.keys(status)
        }, null, 2))
        
        try {
          // Get the video result with retry
          const result = await getVideoResult(currentSegment.requestId)
          
          // Try multiple paths
          videoUrl = result.data?.video?.url || result.video?.url
          if (!videoUrl) {
            console.error('❌ No video URL in result:', result)
            throw new Error('No video URL in result')
          }
        } catch (error: any) {
          console.error('❌ Failed to get video result')
          if (error.status === 422) {
            // For 422 errors, the video might still be processing even though status shows COMPLETED
            // Mark this segment as needing retry
            const updatedSess = updateSegment(session.id, session.currentSegmentIndex, {
              status: 'processing'
            })
            if (updatedSess) {
              Object.assign(session, updatedSess)
            }
            
            return NextResponse.json({
              success: true,
              status: 'processing',
              currentSegment: session.currentSegmentIndex + 1,
              totalSegments: session.segments.length,
              progress: 'Video still processing, please check again...',
              message: 'Video generation in progress (finalizing)'
            })
          }
          throw error
        }
      } else {
        console.log('Video URL found in status response')
      }
      
      console.log(`🎬 Video URL: ${videoUrl}`)
      
      // Update segment as completed
      const updatedSession = updateSegment(session.id, session.currentSegmentIndex, {
        videoUrl,
        status: 'completed'
      })
      if (updatedSession) {
        // CRITICAL: Use the updated session that has the new videoUrl
        session = updatedSession
      }
      console.log(`💾 Segment ${session.currentSegmentIndex + 1} saved to session`)
      
      // Check if this was the last segment
      if (session.currentSegmentIndex === session.segments.length - 1) {
        // All segments done - stitch them together
        console.log('🎞️ All segments complete, stitching videos...')
        
        try {
          const videoUrls = session.segments.map(s => s.videoUrl!).filter(Boolean)
          console.log(`   Total segments to stitch: ${videoUrls.length}`)
          
          if (videoUrls.length !== session.segments.length) {
            console.warn(`⚠️ Warning: Only ${videoUrls.length} of ${session.segments.length} segments have videos`)
          }
          
          // Stitch videos together with retry
          console.log('🔧 Starting video stitching process...')
          const finalVideo = await withRetry(
            () => stitchVideos(videoUrls),
            { maxRetries: 3, initialDelay: 2000 },
            'Video Stitching'
          )
          
          console.log('🔆 Uploading final video to storage...')
          // Upload final video
          const finalFileName = `battles/${session.id}_complete.mp4`
          const finalUrl = await withRetry(
            () => uploadToSpaces(
              finalVideo,
              finalFileName,
              SPACES_BUCKET_EDITS,
              'video/mp4'
            ),
            { maxRetries: 3, initialDelay: 1000 },
            'Upload Final Video'
          )
          
          updateSession(session.id, {
            status: 'completed',
            finalVideoUrl: finalUrl
          })
          
          console.log('🎉 Battle video complete!')
          console.log(`   Final URL: ${finalUrl}`)
          console.log(`   Total processing time: ${Date.now() - session.createdAt}ms`)
          
          return NextResponse.json({
            success: true,
            status: 'completed',
            videoUrl: finalUrl,
            totalSegments: session.segments.length,
            message: 'Battle video generation completed successfully'
          })
        } catch (error) {
          console.error('❌ Failed to stitch videos:', error)
          updateSession(session.id, {
            status: 'failed',
            error: 'Failed to stitch video segments'
          })
          return NextResponse.json({
            success: false,
            status: 'failed',
            error: 'Failed to stitch video segments',
            details: error instanceof Error ? error.message : undefined
          }, { status: 500 })
        }
      } else {
        // Process next segment
        const nextIndex = session.currentSegmentIndex + 1
        console.log(`📤 Processing next segment ${nextIndex + 1}/${session.segments.length}`)
        
        try {
          // Extract last frame from current video with retry
          console.log('🎥 Extracting last frame from current segment...')
          const lastFrameDataUrl = await withRetry(
            () => extractLastFrame(videoUrl),
            { maxRetries: 3, initialDelay: 1000 },
            'Extract Last Frame'
          )
          
          // Convert data URL to buffer and upload to Spaces
          const base64Data = lastFrameDataUrl.split(',')[1]
          const frameBuffer = Buffer.from(base64Data, 'base64')
          const frameFileName = `frames/${session.id}_segment${session.currentSegmentIndex}_lastframe.jpg`
          
          console.log('🔆 Uploading extracted frame...')
          const frameUrl = await withRetry(
            () => uploadToSpaces(
              frameBuffer,
              frameFileName,
              SPACES_BUCKET_EDITS,
              'image/jpeg'
            ),
            { maxRetries: 3, initialDelay: 1000 },
            'Upload Frame'
          )
          console.log(`✅ Frame uploaded: ${frameUrl}`)
          
          // Start next segment
          const nextSegment = session.segments[nextIndex]
          console.log(`🎯 Starting segment ${nextIndex + 1}`)
          console.log(`   Prompt: ${nextSegment.prompt.substring(0, 100)}...`)
          
          const submission = await submitVideoGeneration(
            nextSegment.prompt,
            frameUrl,
            {
              duration: "8s",
              generate_audio: true,
              resolution: "720p"
            }
          )
          
          // Update session and segment
          let updatedSess = updateSegment(session.id, nextIndex, {
            requestId: submission.request_id,
            status: 'processing'
          })
          if (updatedSess) {
            session = updatedSess
          }
          updatedSess = updateSession(session.id, {
            currentSegmentIndex: nextIndex
          })
          if (updatedSess) {
            session = updatedSess
          }
          
          console.log(`✅ Segment ${nextIndex + 1}/${session.segments.length} queued`)
          console.log(`   Request ID: ${submission.request_id}`)
          
          return NextResponse.json({
            success: true,
            status: 'processing',
            currentSegment: nextIndex + 1,
            totalSegments: session.segments.length,
            progress: `Segment ${session.currentSegmentIndex + 1} complete, processing ${nextIndex + 1}...`,
            message: `Processing segment ${nextIndex + 1} of ${session.segments.length}`
          })
        } catch (error) {
          console.error('❌ Failed to process next segment:', error)
          
          // Try to recover by marking current segment as completed and moving on
          updateSession(session.id, {
            currentSegmentIndex: nextIndex,
            error: `Failed to start segment ${nextIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
          
          return NextResponse.json({
            success: false,
            status: 'error',
            error: 'Failed to process next segment',
            details: error instanceof Error ? error.message : undefined,
            recoverable: true,
            message: 'Try calling status again to retry'
          }, { status: 500 })
        }
      }
    } else if (status.status === 'FAILED') {
      console.error(`❌ Segment ${session.currentSegmentIndex + 1} generation failed`)
      
      // Mark segment as failed
      const failedSegmentSession = updateSegment(session.id, session.currentSegmentIndex, {
        status: 'failed'
      })
      if (failedSegmentSession) {
        session = failedSegmentSession
      }
      
      // Try to continue with next segment if possible
      if (session.currentSegmentIndex < session.segments.length - 1) {
        console.log('🔄 Attempting to skip failed segment and continue...')
        
        const nextIndex = session.currentSegmentIndex + 1
        updateSession(session.id, {
          currentSegmentIndex: nextIndex,
          error: `Segment ${session.currentSegmentIndex + 1} failed, continuing with next`
        })
        
        return NextResponse.json({
          success: true,
          status: 'processing',
          currentSegment: nextIndex + 1,
          totalSegments: session.segments.length,
          warning: `Segment ${session.currentSegmentIndex + 1} failed, continuing with segment ${nextIndex + 1}`,
          message: 'Attempting to recover by processing next segment'
        })
      } else {
        // This was the last segment, mark session as failed
        updateSession(session.id, {
          status: 'failed',
          error: 'Last segment generation failed'
        })
        return NextResponse.json({
          success: false,
          status: 'failed',
          error: 'Video generation failed on final segment'
        })
      }
    }
    
    // Still processing current segment
    const lastLog = status.logs?.[status.logs.length - 1]?.message || 'Processing...'
    console.log(`⏳ Segment ${session.currentSegmentIndex + 1} still processing`)
    console.log(`   Status: ${status.status}`)
    console.log(`   Progress: ${lastLog}`)
    
    return NextResponse.json({
      success: true,
      status: 'processing',
      currentSegment: session.currentSegmentIndex + 1,
      totalSegments: session.segments.length,
      progress: lastLog,
      message: `Processing segment ${session.currentSegmentIndex + 1} of ${session.segments.length}`
    })
  } catch (error) {
    console.error('❌ Error checking status:', error)
    
    // Don't immediately fail the session, allow for retry
    const errorMessage = error instanceof Error ? error.message : 'Failed to check video status'
    
    // If it's a temporary error, don't mark as failed
    const isTemporary = errorMessage.includes('rate limit') || 
                       errorMessage.includes('temporarily') ||
                       (error as any)?.status === 429 ||
                       (error as any)?.status === 503
    
    if (!isTemporary) {
      updateSession(session.id, {
        error: errorMessage
      })
    }
    
    return NextResponse.json({
      success: false,
      status: isTemporary ? 'processing' : 'error',
      error: errorMessage,
      recoverable: true,
      message: isTemporary ? 'Temporary error, please retry' : 'Error occurred, but can be retried',
      currentSegment: session.currentSegmentIndex + 1,
      totalSegments: session.segments.length
    }, { status: isTemporary ? 503 : 500 })
  }
}

// Handle legacy single-segment status checks for backward compatibility
async function handleLegacyStatus(requestId: string) {
  console.log('🔍 Checking single-segment video status')
  console.log(`   Request ID: ${requestId}`)
  
  try {
    const status = await checkVideoStatus(requestId)
    
    console.log(`📊 Status: ${status.status}`)
    
    if (status.status === 'COMPLETED') {
      console.log('✅ Video generation completed, fetching result...')
      
      // Check if result is in status response first
      let videoUrl = status.result?.video?.url || 
                     status.result?.data?.video?.url ||
                     status.output?.video?.url ||
                     status.data?.video?.url ||
                     status.video?.url
      let audioUrl = null
      
      if (!videoUrl) {
        console.log('Result not in status, fetching separately...')
        try {
          const result = await getVideoResult(requestId)
          
          // Try multiple paths
          videoUrl = result.data?.video?.url || result.video?.url
          audioUrl = result.data?.audio?.url || result.audio?.url || null
        } catch (error: any) {
          if (error.status === 422) {
            // Video might still be processing
            return NextResponse.json({
              success: true,
              status: 'processing',
              progress: 'Video still processing, please check again...',
              message: 'Video generation in progress (finalizing)'
            })
          }
          throw error
        }
      } else {
        console.log('Video URL found in status response')
        audioUrl = status.result?.audio?.url || 
                  status.result?.data?.audio?.url || 
                  status.data?.audio?.url || 
                  status.audio?.url || null
      }
      
      if (videoUrl) {
        console.log('🎥 Video ready')
        console.log(`   Video URL: ${videoUrl}`)
        if (audioUrl) {
          console.log(`   Audio URL: ${audioUrl}`)
        }
        
        return NextResponse.json({
          success: true,
          status: 'completed',
          videoUrl: videoUrl,
          audioUrl: audioUrl,
          message: 'Video generation completed'
        })
      } else {
        console.error('❌ No video URL found in status or result')
        return NextResponse.json({
          success: false,
          status: 'error',
          error: 'No video URL returned',
          details: 'Result received but missing video URL'
        })
      }
    }
    
    if (status.status === 'FAILED') {
      console.error('❌ Video generation failed')
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: 'Video generation failed',
        details: status.error || 'Unknown error'
      })
    }
    
    // Still processing
    const lastLog = status.logs?.[status.logs.length - 1]?.message || 'Processing...'
    console.log(`⏳ Still processing: ${lastLog}`)
    
    return NextResponse.json({
      success: true,
      status: status.status.toLowerCase(),
      progress: lastLog,
      logs: process.env.NODE_ENV === 'development' ? status.logs : undefined,
      message: 'Video generation in progress'
    })
  } catch (error) {
    console.error('❌ Error checking status:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to check video status'
    const isTemporary = errorMessage.includes('rate limit') || 
                       errorMessage.includes('temporarily') ||
                       (error as any)?.status === 429 ||
                       (error as any)?.status === 503
    
    return NextResponse.json({
      success: false,
      status: isTemporary ? 'processing' : 'error',
      error: errorMessage,
      recoverable: true,
      message: isTemporary ? 'Temporary error, please retry' : 'Error occurred, but can be retried'
    }, { status: isTemporary ? 503 : 500 })
  }
}