import { uploadToSpaces } from './spaces'
import fs from 'fs'
import path from 'path'

// Session storage directory for development
const SESSIONS_DIR = path.join(process.cwd(), '.sessions')

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

export interface VideoSegment {
  index: number
  prompt: string
  requestId?: string
  videoUrl?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface VideoSession {
  id: string
  segments: VideoSegment[]
  currentSegmentIndex: number
  finalVideoUrl?: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: number
  error?: string
}

// Define your battle sequence prompts with epic Naruto-style music progression
export const BATTLE_PROMPTS = [
  "The Ninja trash talk each other. The FIGHT text on top disappears.Then, they meet head with incredible speed, energy crackling. Health meters showing. Lots of acrobatic ninjutsu spells. Epic Naruto-style music begins with traditional Japanese instruments, building tension with taiko drums and shamisen.",
  "Rasengan and chidori meet with explosive energy. The music intensifies with faster tempo, adding electric guitar riffs and orchestral strings, matching the combat rhythm. Player on the left says their catchphrase and performs a Jutsu",
  "The earth shakes and trembles. Music reaches a dramatic crescendo with full orchestra, choir vocals, and intense percussion. Player on the right says their catchphrase and performs a Jutsu",
  "They meet head to head in a huge powerful fist bump! the whole screen to completely white out. The music peaks with an explosive climax then suddenly cuts to silence as the screen flashes white, creating maximum dramatic impact. The players return to their original positions.",
  "One player lies down on the ground and takes a nap. Big Arcade style text appears on the screen saying PLAYER WINS! The other player stands tall and walks towards the cameara and makes a victory pose with dramatic lighting. The camera zooms in and they say their victory catchphrase. The crowd roars. Triumphant yet emotional Naruto-style ending music plays, mixing victory theme with melancholic undertones, traditional flute solo fading out."
]

// Helper function to get session file path
function getSessionFilePath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.json`)
}

// Helper function to save session to disk
function saveSession(session: VideoSession): void {
  try {
    const filePath = getSessionFilePath(session.id)
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2))
  } catch (error) {
    console.error('Failed to save session:', error)
  }
}

// Helper function to load session from disk
function loadSession(sessionId: string): VideoSession | undefined {
  try {
    const filePath = getSessionFilePath(sessionId)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data) as VideoSession
    }
  } catch (error) {
    console.error('Failed to load session:', error)
  }
  return undefined
}

export function createSession(seedImageUrl: string): VideoSession {
  const sessionId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const session: VideoSession = {
    id: sessionId,
    segments: BATTLE_PROMPTS.map((prompt, index) => ({
      index,
      prompt,
      status: 'pending'
    })),
    currentSegmentIndex: 0,
    status: 'processing',
    createdAt: Date.now()
  }
  
  // Save to disk
  saveSession(session)
  console.log(`📁 Session created and saved: ${sessionId}`)
  return session
}

export function getSession(sessionId: string): VideoSession | undefined {
  const session = loadSession(sessionId)
  if (session) {
    console.log(`📁 Session loaded from disk: ${sessionId}`)
    
    // Log session stats
    const completedSegments = session.segments.filter(s => s.status === 'completed').length
    const failedSegments = session.segments.filter(s => s.status === 'failed').length
    console.log(`   Status: ${session.status}`)
    console.log(`   Progress: ${completedSegments}/${session.segments.length} segments completed`)
    if (failedSegments > 0) {
      console.log(`   ⚠️ Failed segments: ${failedSegments}`)
    }
  } else {
    console.log(`⚠️ Session not found: ${sessionId}`)
  }
  return session
}

export function updateSession(sessionId: string, updates: Partial<VideoSession>) {
  const session = loadSession(sessionId)
  if (session) {
    Object.assign(session, updates)
    saveSession(session)
    console.log(`📁 Session updated: ${sessionId}`)
    if (updates.status) {
      console.log(`   New status: ${updates.status}`)
    }
    if (updates.error) {
      console.log(`   Error: ${updates.error}`)
    }
    if (updates.finalVideoUrl) {
      console.log(`   Final video: ${updates.finalVideoUrl}`)
    }
  } else {
    console.error(`❌ Cannot update non-existent session: ${sessionId}`)
  }
  return session
}

export function updateSegment(sessionId: string, segmentIndex: number, updates: Partial<VideoSegment>) {
  const session = loadSession(sessionId)
  if (session && session.segments[segmentIndex]) {
    Object.assign(session.segments[segmentIndex], updates)
    saveSession(session)
    console.log(`📁 Segment ${segmentIndex + 1} updated for session: ${sessionId}`)
    if (updates.status) {
      console.log(`   New status: ${updates.status}`)
    }
    if (updates.requestId) {
      console.log(`   Request ID: ${updates.requestId}`)
    }
    if (updates.videoUrl) {
      console.log(`   Video URL: ${updates.videoUrl}`)
    }
  } else {
    console.error(`❌ Cannot update segment ${segmentIndex} for session: ${sessionId}`)
  }
  return session
}

// Clean up old sessions (run periodically)
export function cleanupOldSessions(maxAgeMs: number = 60 * 60 * 1000) {
  try {
    const cutoffTime = Date.now() - maxAgeMs
    const files = fs.readdirSync(SESSIONS_DIR)
    let cleanedCount = 0
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(SESSIONS_DIR, file)
        const session = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as VideoSession
        
        // Don't delete sessions that are still processing
        if (session.status === 'processing') {
          continue
        }
        
        if (session.createdAt < cutoffTime) {
          fs.unlinkSync(filePath)
          cleanedCount++
          console.log(`🗑️ Cleaned up old session: ${session.id} (age: ${Math.round((Date.now() - session.createdAt) / 1000 / 60)} minutes)`)
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🗑️ Total sessions cleaned: ${cleanedCount}`)
    }
  } catch (error) {
    console.error('Failed to cleanup sessions:', error)
  }
}

// Get all active sessions
export function getActiveSessions(): VideoSession[] {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
    const sessions: VideoSession[] = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(SESSIONS_DIR, file)
        const session = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as VideoSession
        if (session.status === 'processing') {
          sessions.push(session)
        }
      }
    }
    
    return sessions
  } catch (error) {
    console.error('Failed to get active sessions:', error)
    return []
  }
}
