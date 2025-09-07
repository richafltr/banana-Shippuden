import { fal } from '@fal-ai/client'

// Configure FAL client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  })
}

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: any) => boolean
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors and certain status codes
    if (!error) return false
    
    // Check if it's a network error
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true
    }
    
    // Check status codes - retry on 422 (Validation), 429 (Rate Limit), 502, 503, 504 (Server errors)
    const status = error.status || error.statusCode
    if (status === 422 || status === 429 || status === 502 || status === 503 || status === 504) {
      return true
    }
    
    // Check for specific FAL errors
    if (error.message?.includes('Unprocessable Entity') || 
        error.message?.includes('rate limit') ||
        error.message?.includes('temporarily unavailable')) {
      return true
    }
    
    return false
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context: string = 'Operation'
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: any
  let delay = opts.initialDelay
  
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      console.log(`🔄 ${context}: Attempt ${attempt}/${opts.maxRetries}`)
      const result = await fn()
      if (attempt > 1) {
        console.log(`✅ ${context}: Succeeded on attempt ${attempt}`)
      }
      return result
    } catch (error) {
      lastError = error
      
      console.error(`❌ ${context}: Attempt ${attempt} failed:`, {
        message: error instanceof Error ? error.message : String(error),
        status: (error as any)?.status,
        code: (error as any)?.code,
        body: (error as any)?.body
      })
      
      // Check if we should retry
      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        console.error(`🛑 ${context}: Max retries reached or error not retryable`)
        throw error
      }
      
      // Calculate next delay with jitter
      const jitter = Math.random() * 0.3 * delay // Add up to 30% jitter
      const actualDelay = Math.min(delay + jitter, opts.maxDelay)
      
      console.log(`⏳ ${context}: Waiting ${Math.round(actualDelay)}ms before retry...`)
      await sleep(actualDelay)
      
      // Increase delay for next attempt
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay)
    }
  }
  
  throw lastError
}

/**
 * Submit a video generation job using the subscribe method for better reliability
 */
export async function generateVideoWithSubscribe(
  prompt: string,
  imageUrl: string,
  options: {
    duration?: "8s"
    generate_audio?: boolean
    resolution?: "720p" | "1080p"
  } = {}
): Promise<{ video_url: string; request_id: string }> {
  return withRetry(
    async () => {
      console.log(`📤 Starting video generation with subscribe...`)
      console.log(`   Prompt: ${prompt.substring(0, 100)}...`)
      console.log(`   Image URL: ${imageUrl}`)
      console.log(`   Options:`, options)
      
      const result = await fal.subscribe('fal-ai/veo3/fast/image-to-video', {
        input: {
          prompt,
          image_url: imageUrl,
          duration: (options.duration || "8s") as "8s",
          generate_audio: options.generate_audio !== false,
          resolution: (options.resolution || "720p") as "720p"
        },
        logs: true,
        onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          const updateAny = update as any
          const logs = updateAny.logs || []
          if (logs.length > 0) {
            const lastLog = logs[logs.length - 1]
            console.log(`   Progress: ${lastLog.message}`)
          }
        }
        }
      })
      
      // Cast to any to handle varying result structures
      const resultAny = result as any
      
      console.log('Subscribe result structure:', {
        hasData: !!result.data,
        hasVideo: !!resultAny.video,
        dataKeys: result.data ? Object.keys(result.data) : [],
        topLevelKeys: Object.keys(result)
      })
      
      // According to FAL docs, with subscribe the result is in result.data
      const videoUrl = result.data?.video?.url || resultAny.video?.url
      if (!videoUrl) {
        console.error('Full result structure:', JSON.stringify(result, null, 2))
        throw new Error('No video URL in result')
      }
      
      console.log(`✅ Video generated successfully`)
      console.log(`   Video URL: ${videoUrl}`)
      console.log(`   Request ID: ${result.requestId}`)
      
      return {
        video_url: videoUrl,
        request_id: result.requestId
      }
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      shouldRetry: (error) => {
        // Always retry submission errors unless it's a bad request
        const status = error?.status || error?.statusCode
        return status !== 400 && status !== 401 && status !== 403
      }
    },
    'Generate Video with Subscribe'
  )
}

/**
 * Submit a video generation job with retry logic (queue-based approach)
 * Note: Using the subscribe method above is recommended for better reliability
 */
export async function submitVideoGeneration(
  prompt: string,
  imageUrl: string,
  options: {
    duration?: "8s"
    generate_audio?: boolean
    resolution?: "720p" | "1080p"
  } = {}
): Promise<{ request_id: string }> {
  return withRetry(
    async () => {
      console.log(`📤 Submitting video generation job...`)
      console.log(`   Prompt: ${prompt.substring(0, 100)}...`)
      console.log(`   Image URL: ${imageUrl}`)
      console.log(`   Options:`, options)
      
      const result = await fal.queue.submit('fal-ai/veo3/fast/image-to-video', {
        input: {
          prompt,
          image_url: imageUrl,
          duration: (options.duration || "8s") as "8s",
          generate_audio: options.generate_audio !== false,
          resolution: (options.resolution || "720p") as "720p"
        }
      })
      
      if (!result.request_id) {
        throw new Error('No request_id returned from FAL submission')
      }
      
      console.log(`✅ Job submitted successfully: ${result.request_id}`)
      return result
    },
    {
      maxRetries: 5,
      initialDelay: 2000,
      shouldRetry: (error) => {
        // Always retry submission errors unless it's a bad request
        const status = error?.status || error?.statusCode
        return status !== 400 && status !== 401 && status !== 403
      }
    },
    'Submit Video Generation'
  )
}

/**
 * Check video generation status with retry logic
 */
export async function checkVideoStatus(
  requestId: string
): Promise<any> {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error(`Invalid request ID: ${requestId}`)
  }
  
  return withRetry(
    async () => {
      console.log(`📊 Checking status for request: ${requestId}`)
      
      try {
        const status = await fal.queue.status('fal-ai/veo3/fast/image-to-video', {
          requestId: requestId,
          logs: true
        })
        
        console.log(`   Status: ${status.status}`)
        
        // Log the full status response if completed to understand the structure
        if (status.status === 'COMPLETED') {
          console.log('   COMPLETED status response structure:', JSON.stringify(status, null, 2))
        }
        
        const statusAny = status as any
        if (statusAny.logs?.length > 0) {
          const lastLog = statusAny.logs[statusAny.logs.length - 1]
          console.log(`   Last log: ${lastLog.message}`)
        }
        
        return status
      } catch (error: any) {
        // Log full error details for debugging
        if (error.status === 422 && error.body?.detail) {
          console.error('🔴 422 Error in status check:')
          console.error('  Full error body:', JSON.stringify(error.body, null, 2))
        }
        
        // If we get a 404, the job might have been completed and cleaned up
        if (error.status === 404) {
          console.log(`⚠️ Job ${requestId} not found - might be completed or expired`)
          // Try to get the result directly
          try {
            const result = await getVideoResult(requestId)
            if (result) {
              return { status: 'COMPLETED', result }
            }
          } catch (resultError) {
            // If result also fails, throw the original error
          }
        }
        throw error
      }
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        const status = error?.status || error?.statusCode
        // Don't retry on 404 (not found) or auth errors
        return status !== 404 && status !== 401 && status !== 403
      }
    },
    `Check Status ${requestId}`
  )
}

/**
 * Get video generation result with retry logic
 */
export async function getVideoResult(
  requestId: string
): Promise<any> {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error(`Invalid request ID: ${requestId}`)
  }
  
  return withRetry(
    async () => {
      console.log(`📥 Fetching result for request: ${requestId}`)
      
      try {
        const result = await fal.queue.result('fal-ai/veo3/fast/image-to-video', {
          requestId: requestId
        })
        
        console.log('Result received:', JSON.stringify(result, null, 2))
        
        // Cast to any to handle varying result structures
        const resultAny = result as any
        
        // According to FAL docs, the result should have video.url directly
        // but it might be nested under data in some cases
        const videoUrl = resultAny.video?.url || 
                        result.data?.video?.url || 
                        resultAny.output?.video?.url ||
                        resultAny.url
        
        if (!videoUrl) {
          console.error('Result structure:', JSON.stringify(result, null, 2))
          throw new Error('No video URL found in result')
        }
        
        console.log(`✅ Video URL retrieved: ${videoUrl}`)
        
        // Normalize the response to match expected structure
        return {
          data: {
            video: {
              url: videoUrl
            },
            audio: resultAny.audio || resultAny.data?.audio || null
          },
          video: {
            url: videoUrl
          },
          requestId: requestId
        }
      } catch (error: any) {
        // Log full error details for 422 errors
        if (error.status === 422 && error.body?.detail) {
          console.error('🔴 422 Error Details:')
          console.error('  Full error body:', JSON.stringify(error.body, null, 2))
          if (Array.isArray(error.body.detail)) {
            error.body.detail.forEach((detail: any, index: number) => {
              console.error(`  Detail ${index + 1}:`, JSON.stringify(detail, null, 2))
            })
          }
        }
        throw error
      }
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        const status = error?.status || error?.statusCode
        // Don't retry on 422 - it means the request is invalid
        // Only retry on network/server errors
        return status !== 422 && status !== 400 && status !== 401 && status !== 403 && status !== 404
      }
    },
    `Get Result ${requestId}`
  )
}

/**
 * Wait for video completion with timeout
 */
export async function waitForVideoCompletion(
  requestId: string,
  maxWaitTime: number = 5 * 60 * 1000 // 5 minutes default
): Promise<any> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await checkVideoStatus(requestId)
      
      if (status.status === 'COMPLETED') {
        return await getVideoResult(requestId)
      }
      
      if (status.status === 'FAILED') {
        throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`)
      }
      
      // Wait before checking again
      await sleep(5000) // Check every 5 seconds
    } catch (error) {
      console.error(`Error checking status: ${error}`)
      // Continue checking unless it's a permanent error
      if ((error as any)?.status === 404) {
        throw error
      }
    }
  }
  
  throw new Error(`Video generation timeout after ${maxWaitTime}ms`)
}
