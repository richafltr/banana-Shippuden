// Alternative implementation without ffmpeg for serverless environments
import { uploadToSpaces, SPACES_BUCKET_EDITS } from './spaces'

/**
 * Extract last frame using a different approach - returns the original image for now
 * In production, you might want to use a service like Cloudinary or a separate microservice
 */
export async function extractLastFrameAlternative(videoUrl: string, fallbackImageUrl?: string): Promise<string> {
  console.warn('Using fallback frame extraction - returning original image or video thumbnail')
  
  // In a real implementation, you could:
  // 1. Use a cloud service API (Cloudinary, AWS MediaConvert, etc.)
  // 2. Call a separate microservice that has ffmpeg installed
  // 3. Use the video's thumbnail if available from FAL
  
  // For now, return the fallback image or a placeholder
  if (fallbackImageUrl) {
    return fallbackImageUrl
  }
  
  // You could also try to get a thumbnail from the video URL if FAL provides one
  // For now, we'll just return the video URL itself and let FAL handle it
  return videoUrl
}

/**
 * Alternative video stitching - returns URLs instead of stitching
 * The frontend can play them sequentially or you can use a cloud service
 */
export async function stitchVideosAlternative(videoUrls: string[]): Promise<{ urls: string[], stitched: false }> {
  console.warn('Video stitching not available in serverless environment - returning individual URLs')
  
  // In production, you could:
  // 1. Use a cloud video processing service (AWS MediaConvert, Cloudinary, etc.)
  // 2. Send to a background job queue for processing
  // 3. Use a separate microservice with ffmpeg installed
  
  return {
    urls: videoUrls,
    stitched: false
  }
}

/**
 * Check if we're in a serverless environment
 */
export function isServerlessEnvironment(): boolean {
  // Check for common serverless environment indicators
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.NOW_REGION
  )
}
