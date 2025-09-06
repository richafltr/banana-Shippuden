import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client for DigitalOcean Spaces
export const s3Client = new S3Client({
  endpoint: 'https://sfo3.digitaloceanspaces.com',
  region: 'sfo3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
})

export const SPACES_BUCKET_PROFILES = 'banana-profiles'
export const SPACES_BUCKET_EDITS = 'banana-edit'

export async function uploadToSpaces(
  file: Buffer,
  fileName: string,
  bucket: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read',
  })

  await s3Client.send(command)
  
  // Return the public URL
  return `https://${bucket}.sfo3.digitaloceanspaces.com/${fileName}`
}

export async function deleteFromSpaces(fileName: string, bucket: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: fileName,
  })

  await s3Client.send(command)
}
