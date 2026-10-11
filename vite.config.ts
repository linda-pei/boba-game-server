import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const feedbackQueuePath = resolve(process.cwd(), '.codex', 'dev-feedback.json')
const resolvedFeedbackPath = resolve(process.cwd(), '.codex', 'dev-feedback-resolved.json')
const feedbackImagesPath = resolve(process.cwd(), '.codex', 'dev-feedback-images')
const feedbackContextPath = resolve(process.cwd(), '.codex', 'dev-feedback-context')
const maxContextBytes = 1024 * 1024
const maxFeedbackQueueSize = 50
const maxFeedbackBodyBytes = 7 * 1024 * 1024
const maxImageBytes = 2 * 1024 * 1024
const maxImageUploads = 3

interface QueuedFeedback {
  id: string
  createdAt: string
  instruction: string
  target: {
    selector: string
    tagName: string
    role: string | null
    label: string | null
    text: string | null
    path: string
  }
  images?: Array<{
    name: string
    mimeType: string
    path: string
  }>
  contextPath?: string
}

interface ImageUpload {
  name: string
  mimeType: string
  dataUrl: string
}

interface SubmittedFeedback extends Omit<QueuedFeedback, 'images' | 'contextPath'> {
  imageUploads?: ImageUpload[]
  context?: unknown
}

function sortFeedbackOldestFirst(queue: QueuedFeedback[]): QueuedFeedback[] {
  return [...queue].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt)
    const rightTime = Date.parse(right.createdAt)

    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0
    return leftTime - rightTime
  })
}

async function readFeedbackQueue(): Promise<QueuedFeedback[]> {
  try {
    const content = await readFile(feedbackQueuePath, 'utf8')
    const parsed: unknown = JSON.parse(content)
    return Array.isArray(parsed) ? sortFeedbackOldestFirst(parsed as QueuedFeedback[]) : []
  } catch {
    return []
  }
}

async function readResolvedFeedbackIds(): Promise<string[]> {
  try {
    const content = await readFile(resolvedFeedbackPath, 'utf8')
    const parsed: unknown = JSON.parse(content)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function devFeedbackQueue(): Plugin {
  return {
    name: 'dev-feedback-queue',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev-feedback', async (request, response, next) => {
        if (request.method === 'GET') {
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({
            pending: await readFeedbackQueue(),
            resolvedIds: await readResolvedFeedbackIds(),
          }))
          return
        }

        if (request.method === 'DELETE') {
          try {
            const feedbackId = new URL(request.url ?? '', 'http://localhost').searchParams.get('id')
            if (!feedbackId) {
              response.statusCode = 400
              response.end('Feedback id is required')
              return
            }

            const queue = await readFeedbackQueue()
            const removedFeedback = queue.find((item) => item.id === feedbackId)
            if (removedFeedback) {
              const nextQueue = queue.filter((item) => item.id !== feedbackId)
              await writeFile(feedbackQueuePath, JSON.stringify(nextQueue, null, 2))
              await removeFeedbackImages(removedFeedback.images)
              if (removedFeedback.contextPath?.startsWith(`${feedbackContextPath}/`)) {
                await unlink(removedFeedback.contextPath).catch(() => undefined)
              }
            }
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ ok: true }))
          } catch (error) {
            next(error)
          }
          return
        }

        if (request.method !== 'POST') {
          response.statusCode = 405
          response.setHeader('Allow', 'GET, POST, DELETE')
          response.end('Method not allowed')
          return
        }

        const chunks: Buffer[] = []
        let bodySize = 0
        request.on('data', (chunk: Buffer) => {
          bodySize += chunk.length
          if (bodySize <= maxFeedbackBodyBytes) chunks.push(chunk)
        })
        request.on('error', next)
        request.on('end', async () => {
          if (bodySize > maxFeedbackBodyBytes) {
            response.statusCode = 413
            response.end('Feedback is too large')
            return
          }

          try {
            const submittedFeedback: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (!isValidFeedback(submittedFeedback)) {
              response.statusCode = 400
              response.end('Invalid feedback payload')
              return
            }

            const queue = await readFeedbackQueue()
            if (queue.some((item) => item.id === submittedFeedback.id)) {
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify({ ok: true }))
              return
            }

            const { imageUploads = [], context, ...feedback } = submittedFeedback
            const images = await saveFeedbackImages(feedback.id, imageUploads)
            const contextPath = await saveFeedbackContext(feedback.id, context)
            const queuedFeedback: QueuedFeedback = {
              ...feedback,
              ...(images.length > 0 ? { images } : {}),
              ...(contextPath ? { contextPath } : {}),
            }
            const nextQueue = [...queue, queuedFeedback].slice(0, maxFeedbackQueueSize)
            await mkdir(resolve(feedbackQueuePath, '..'), { recursive: true })
            await writeFile(feedbackQueuePath, JSON.stringify(nextQueue, null, 2))
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ ok: true }))
          } catch (error) {
            next(error)
          }
        })
      })
    },
  }
}

function isValidFeedback(value: unknown): value is SubmittedFeedback {
  if (!value || typeof value !== 'object') return false
  const feedback = value as Partial<SubmittedFeedback>
  return Boolean(
    typeof feedback.id === 'string'
      && typeof feedback.createdAt === 'string'
      && typeof feedback.instruction === 'string'
      && feedback.instruction.trim()
      && feedback.target
      && typeof feedback.target.selector === 'string'
      && typeof feedback.target.path === 'string',
  ) && (feedback.imageUploads === undefined || (
    Array.isArray(feedback.imageUploads)
    && feedback.imageUploads.length <= maxImageUploads
    && feedback.imageUploads.every(isValidImageUpload)
  ))
}

function isValidImageUpload(value: unknown): value is ImageUpload {
  if (!value || typeof value !== 'object') return false
  const image = value as Partial<ImageUpload>
  return typeof image.name === 'string'
    && image.name.length > 0
    && image.name.length <= 200
    && (image.mimeType === 'image/png' || image.mimeType === 'image/jpeg' || image.mimeType === 'image/webp' || image.mimeType === 'image/gif')
    && typeof image.dataUrl === 'string'
    && new RegExp(`^data:${image.mimeType};base64,[A-Za-z0-9+/]+={0,2}$`).test(image.dataUrl)
}

async function saveFeedbackImages(feedbackId: string, uploads: ImageUpload[]): Promise<NonNullable<QueuedFeedback['images']>> {
  if (uploads.length === 0) return []

  await mkdir(feedbackImagesPath, { recursive: true })
  const safeId = feedbackId.replace(/[^a-zA-Z0-9_-]/g, '')
  return Promise.all(uploads.map(async (upload, index) => {
    const base64 = upload.dataUrl.slice(upload.dataUrl.indexOf(',') + 1)
    const bytes = Buffer.from(base64, 'base64')
    if (bytes.length === 0 || bytes.length > maxImageBytes) throw new Error('Feedback image is too large')

    const extension = upload.mimeType === 'image/jpeg' ? 'jpg' : upload.mimeType.slice('image/'.length)
    const imagePath = resolve(feedbackImagesPath, `${safeId}-${index}.${extension}`)
    await writeFile(imagePath, bytes)
    return { name: upload.name, mimeType: upload.mimeType, path: imagePath }
  }))
}

async function saveFeedbackContext(feedbackId: string, context: unknown): Promise<string | null> {
  if (context === undefined || context === null) return null
  const json = JSON.stringify(context, null, 2)
  if (Buffer.byteLength(json) > maxContextBytes) return null

  await mkdir(feedbackContextPath, { recursive: true })
  const contextFile = resolve(feedbackContextPath, `${feedbackId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`)
  await writeFile(contextFile, json)
  return contextFile
}

async function removeFeedbackImages(images: QueuedFeedback['images']): Promise<void> {
  if (!images) return
  await Promise.all(images.map(async (image) => {
    if (!image.path.startsWith(`${feedbackImagesPath}/`)) return
    await unlink(image.path).catch(() => undefined)
  }))
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devFeedbackQueue()],
})
