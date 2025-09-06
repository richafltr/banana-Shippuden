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
    const { player1Image, player2Image, action } = body

    if (!player1Image || !player2Image) {
      return NextResponse.json({ error: 'Both player images required' }, { status: 400 })
    }

    if (action === 'prepare-battle-sequence') {
      const startTime = Date.now()
      console.log('🚀 Starting FULLY CONCURRENT battle sequence preparation...')
      console.log('📸 Using ORIGINAL uploaded images:')
      console.log('  Player 1:', player1Image)
      console.log('  Player 2:', player2Image)
      console.log('🥷 Transforming to NARUTO SHINOBI CHARACTERS with:')
      console.log('  - Weapons, ninja accessories, outfits, and headbands')
      console.log('  - Realistic 3D graphics rendered in Unreal Engine')
      console.log('⚡ Processing 4 operations simultaneously: Naruto Stances (x2), VS Screen, Battle Arena')
      console.log('  - All 4 operations transform to Naruto characters AND perform their specific action')
      
      // Process ALL operations concurrently for maximum speed
      const results = await Promise.allSettled([
        // Player 1 Battle Stance - Transform to Naruto character AND position
        fal.subscribe('fal-ai/nano-banana/edit', {
          input: {
            prompt: 'Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Remove the background, turn right, facing right, fighting pose. Realistic 3D graphics rendered in Unreal Engine.',
            image_urls: [player1Image], // Original uploaded image
            num_images: 1,
            output_format: 'jpeg'
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              console.log('P1 Naruto Stance:', update.logs?.map((log: any) => log.message).join(' '))
            }
          },
        }),
        
        // Player 2 Battle Stance - Transform to Naruto character AND position
        fal.subscribe('fal-ai/nano-banana/edit', {
          input: {
            prompt: 'Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Remove the background, turn left, facing left, fighting pose. Realistic 3D graphics rendered in Unreal Engine.',
            image_urls: [player2Image], // Original uploaded image
            num_images: 1,
            output_format: 'jpeg'
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              console.log('P2 Naruto Stance:', update.logs?.map((log: any) => log.message).join(' '))
            }
          },
        }),
        
        // Versus Screen - Transform BOTH to Naruto characters with VS setup
        fal.subscribe('fal-ai/nano-banana/edit', {
          input: {
            prompt: 'Reimagine both persons as Naruto shinobi characters with weapons, ninja accessories, outfits, and headbands. Show the characters posing with a lightning bolt splitting the screen in 2 saying VS, as they prepare to fight. Realistic 3D graphics rendered in Unreal Engine.',
            image_urls: [player1Image, player2Image], // Using original uploaded images
            num_images: 1,
            output_format: 'jpeg'
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              console.log('VS Screen Naruto:', update.logs?.map((log: any) => log.message).join(' '))
            }
          },
        }),
        
        // Battle Arena - Transform to Naruto characters AND position in arena
        fal.subscribe('fal-ai/nano-banana/edit', {
          input: {
            prompt: 'Reimagine both persons as Naruto shinobi characters with weapons, ninja accessories, outfits, and headbands. Move the characters to far end opposite sides of the arena preparing to fight each other. FIGHT in the middle on top of screen. Realistic 3D graphics rendered in Unreal Engine.',
            image_urls: [player1Image, player2Image], // Using original uploaded images
            num_images: 1,
            output_format: 'jpeg'
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              console.log('Arena Naruto:', update.logs?.map((log: any) => log.message).join(' '))
            }
          },
        })
      ])

      console.log('All operations complete, processing results...')

      // Process results
      const savedStances = []
      let player1StanceUrl = null
      let player2StanceUrl = null
      let versusUrl = null
      let arenaUrl = null

      // Process Player 1 Stance
      if (results[0].status === 'fulfilled' && results[0].value?.data?.images?.[0]) {
        try {
          const response = await fetch(results[0].value.data.images[0].url)
          const buffer = Buffer.from(await response.arrayBuffer())
          const fileName = `player1-battle-stance-${Date.now()}.jpg`
          player1StanceUrl = await uploadToSpaces(buffer, fileName)
          savedStances.push({ player: 'player1', url: player1StanceUrl, type: 'stance' })
        } catch (error) {
          console.error('Failed to save player 1 stance:', error)
        }
      }

      // Process Player 2 Stance
      if (results[1].status === 'fulfilled' && results[1].value?.data?.images?.[0]) {
        try {
          const response = await fetch(results[1].value.data.images[0].url)
          const buffer = Buffer.from(await response.arrayBuffer())
          const fileName = `player2-battle-stance-${Date.now()}.jpg`
          player2StanceUrl = await uploadToSpaces(buffer, fileName)
          savedStances.push({ player: 'player2', url: player2StanceUrl, type: 'stance' })
        } catch (error) {
          console.error('Failed to save player 2 stance:', error)
        }
      }

      // Process Versus Screen
      if (results[2].status === 'fulfilled' && results[2].value?.data?.images?.[0]) {
        try {
          const response = await fetch(results[2].value.data.images[0].url)
          const buffer = Buffer.from(await response.arrayBuffer())
          const fileName = `versus-screen-${Date.now()}.jpg`
          versusUrl = await uploadToSpaces(buffer, fileName)
        } catch (error) {
          console.error('Failed to save versus screen:', error)
        }
      }

      // Process Battle Arena
      if (results[3].status === 'fulfilled' && results[3].value?.data?.images?.[0]) {
        try {
          const response = await fetch(results[3].value.data.images[0].url)
          const buffer = Buffer.from(await response.arrayBuffer())
          const fileName = `battle-arena-${Date.now()}.jpg`
          arenaUrl = await uploadToSpaces(buffer, fileName)
        } catch (error) {
          console.error('Failed to save battle arena:', error)
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`✅ Battle sequence complete in ${(totalTime / 1000).toFixed(1)} seconds!`)
      console.log('📊 Results:', {
        stances: savedStances.length,
        versusScreen: !!versusUrl,
        battleArena: !!arenaUrl
      })

      return NextResponse.json({
        success: true,
        stances: savedStances,
        versusScreen: versusUrl,
        battleArena: arenaUrl,
        processingTime: totalTime
      })

    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Battle processing error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process battle sequence'
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    )
  }
}
