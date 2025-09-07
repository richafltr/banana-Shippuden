import ffmpeg from 'fluent-ffmpeg'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { existsSync } from 'fs'

// Use system ffmpeg instead of npm package to avoid webpack issues
// Try different common ffmpeg locations
const possiblePaths = [
  '/opt/homebrew/bin/ffmpeg',     // Apple Silicon Macs with Homebrew
  '/usr/local/bin/ffmpeg',         // Intel Macs with Homebrew
  '/usr/bin/ffmpeg',              // System installation
  'ffmpeg'                        // Use system PATH
]

const ffmpegPath = possiblePaths.find(p => {
  try {
    if (p === 'ffmpeg') return true // Let fluent-ffmpeg find it in PATH
    return existsSync(p)
  } catch {
    return false
  }
}) || 'ffmpeg'

console.log('Using ffmpeg at:', ffmpegPath)
ffmpeg.setFfmpegPath(ffmpegPath)

/**
 * Extract the last frame from a video URL
 * Returns a base64 data URL that FAL can use
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `frame-${Date.now()}`)
  await fs.mkdir(tempDir, { recursive: true })
  
  try {
    // Download video
    const videoPath = path.join(tempDir, 'video.mp4')
    const response = await fetch(videoUrl)
    const buffer = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(videoPath, buffer)
    
    // Get video duration
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err)
        else resolve(metadata.format.duration || 8)
      })
    })
    
    // Extract frame at duration - 0.1 seconds
    const framePath = path.join(tempDir, 'frame.jpg')
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(Math.max(0, duration - 0.1))
        .frames(1)
        .output(framePath)
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })
    
    // Convert to base64 data URL
    const frameBuffer = await fs.readFile(framePath)
    const base64 = frameBuffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64}`
    
    // Cleanup
    await fs.rm(tempDir, { recursive: true })
    return dataUrl
    
  } catch (error) {
    await fs.rm(tempDir, { recursive: true }).catch(() => {})
    throw error
  }
}

/**
 * Stitch multiple video URLs into a single video
 * Returns the stitched video as a buffer
 */
export async function stitchVideos(videoUrls: string[]): Promise<Buffer> {
  const tempDir = path.join(os.tmpdir(), `stitch-${Date.now()}`)
  await fs.mkdir(tempDir, { recursive: true })
  
  try {
    // Download all videos
    const videoPaths: string[] = []
    for (let i = 0; i < videoUrls.length; i++) {
      const videoPath = path.join(tempDir, `segment_${i.toString().padStart(3, '0')}.mp4`)
      const response = await fetch(videoUrls[i])
      const buffer = Buffer.from(await response.arrayBuffer())
      await fs.writeFile(videoPath, buffer)
      videoPaths.push(videoPath)
    }
    
    // Create concat file
    const concatFile = path.join(tempDir, 'concat.txt')
    const concatContent = videoPaths.map(p => `file '${p}'`).join('\n')
    await fs.writeFile(concatFile, concatContent)
    
    // Stitch videos
    const outputPath = path.join(tempDir, 'final.mp4')
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })
    
    // Read final video
    const finalBuffer = await fs.readFile(outputPath)
    
    // Cleanup
    await fs.rm(tempDir, { recursive: true })
    return finalBuffer
    
  } catch (error) {
    await fs.rm(tempDir, { recursive: true }).catch(() => {})
    throw error
  }
}
