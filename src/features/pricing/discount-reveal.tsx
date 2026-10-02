import { useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"
import {
  campaignValue,
  scheduleLabels,
  statusLabels,
} from "@/features/pricing/model"
import type { CreatedCampaign } from "@/features/pricing/model"

const CONFETTI_COLORS = [
  "#d6f07a",
  "#2f6a4a",
  "#f2c14e",
  "#fff7e8",
  "#e07a5f",
  "#8fd18a",
]

export function DiscountReveal({ campaign }: { campaign: CreatedCampaign }) {
  const secret = campaign.code ?? campaignValue(campaign)
  const secretKind = campaign.code ? "code" : "amount"
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="-mx-4 -my-6 bg-secondary px-4 py-8 sm:-mx-5">
      <ConfettiBurst />
      <Ticket
        campaign={campaign}
        secret={secret}
        secretKind={secretKind}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
      />
      <p className="mt-4 text-center text-xs text-secondary-foreground/80">
        {revealed
          ? secretKind === "code"
            ? "Code revealed. Activate the draft when the till should accept it."
            : "Amount revealed. Activate the draft when the till should accept it."
          : secretKind === "code"
            ? "Scratch the foil to reveal the code."
            : "Scratch the foil to reveal the amount."}
      </p>
      <div className="mt-3 flex justify-center gap-2">
        {!revealed && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRevealed(true)}
          >
            Reveal {secretKind}
          </Button>
        )}
        {revealed && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(secret).then(
                () => toast({ title: "Copied", status: "success" }),
                () =>
                  toast({
                    title: "Could not copy",
                    status: "error",
                  })
              )
            }}
          >
            Copy {secretKind}
          </Button>
        )}
      </div>
    </div>
  )
}

function Ticket({
  campaign,
  secret,
  secretKind,
  revealed,
  onReveal,
}: {
  campaign: CreatedCampaign
  secret: string
  secretKind: "code" | "amount"
  revealed: boolean
  onReveal: () => void
}) {
  const visibleValue = campaign.code ? campaignValue(campaign) : null

  return (
    <article
      className="relative mx-auto w-full max-w-[19rem] text-[#1c1914]"
      style={{
        background: `
          radial-gradient(circle at 0 7.35rem, transparent 0.72rem, #f6f0e4 0.78rem) left / 51% 100% no-repeat,
          radial-gradient(circle at 100% 7.35rem, transparent 0.72rem, #f6f0e4 0.78rem) right / 51% 100% no-repeat
        `,
        filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.32))",
      }}
    >
      <div className="flex h-[7.35rem] flex-col justify-between px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#1c1914]/60 uppercase">
            Ovaal discount
          </p>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">
            {statusLabels[campaign.status]}
          </p>
        </div>
        <div>
          <h3 className="text-lg leading-tight font-semibold tracking-[-0.03em]">
            {campaign.name}
          </h3>
          <p className="mt-1 text-xs text-[#1c1914]/70">
            {scheduleLabels[campaign.scheduleType]}
            {visibleValue ? ` · ${visibleValue} off` : ""}
          </p>
        </div>
      </div>
      <div className="mx-5 border-t border-dashed border-[#1c1914]/30" />
      <div className="px-5 pt-4 pb-5">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#1c1914]/55 uppercase">
          {secretKind === "code" ? "Discount code" : "Discount amount"}
        </p>
        <ScratchToReveal
          secret={secret}
          revealed={revealed}
          onReveal={onReveal}
          emphasize={secretKind}
        />
        <div
          aria-hidden="true"
          className="mt-4 h-7 w-full opacity-80"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #1c1914 0 1px, transparent 1px 3px, #1c1914 3px 5px, transparent 5px 7px, #1c1914 7px 8px, transparent 8px 12px)",
          }}
        />
        <p className="mt-2 text-center font-mono text-[10px] tracking-[0.22em] text-[#1c1914]/55 uppercase">
          {campaign.id.slice(0, 8)}
        </p>
      </div>
    </article>
  )
}

function ScratchToReveal({
  secret,
  revealed,
  onReveal,
  emphasize,
}: {
  secret: string
  revealed: boolean
  onReveal: () => void
  emphasize: "code" | "amount"
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const moves = useRef(0)

  useEffect(() => {
    if (revealed) return
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    let painted = false

    function paint() {
      if (!canvas || !parent || painted) return
      const rect = parent.getBoundingClientRect()
      if (rect.width < 8 || rect.height < 8) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      paintFoil(ctx, canvas.width, canvas.height, dpr)
      painted = true
    }

    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [revealed])

  function erase(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (revealed) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const dpr = canvas.width / rect.width
    ctx.globalCompositeOperation = "destination-out"
    ctx.strokeStyle = "#000"
    ctx.fillStyle = "#000"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 34 * dpr
    const previous = lastPoint.current
    if (previous) {
      ctx.beginPath()
      ctx.moveTo(previous.x * dpr, previous.y * dpr)
      ctx.lineTo(x * dpr, y * dpr)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(x * dpr, y * dpr, 16 * dpr, 0, Math.PI * 2)
    ctx.fill()
    lastPoint.current = { x, y }
    moves.current += 1
    if (moves.current % 5 === 0 && scratchedEnough(ctx, canvas)) onReveal()
  }

  return (
    <div className="relative mt-2 h-16 overflow-hidden rounded-lg bg-[#efe6d4]">
      <p
        aria-hidden={!revealed}
        className={`flex h-full items-center justify-center px-2 text-center font-semibold tracking-[0.18em] text-[#24543c] uppercase ${emphasize === "amount" ? "text-2xl" : "text-xl"}`}
      >
        {secret}
      </p>
      <p className="sr-only" aria-live="polite">
        {revealed
          ? `${emphasize === "code" ? "Discount code" : "Discount amount"} ${secret}`
          : "Scratch the ticket to reveal"}
      </p>
      {!revealed && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 size-full cursor-crosshair touch-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            erase(event)
          }}
          onPointerMove={(event) => {
            if (
              event.buttons === 0 &&
              !event.currentTarget.hasPointerCapture(event.pointerId)
            ) {
              return
            }
            erase(event)
          }}
          onPointerUp={() => {
            lastPoint.current = null
          }}
          onPointerCancel={() => {
            lastPoint.current = null
          }}
        />
      )}
    </div>
  )
}

function paintFoil(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, "#cfc6b6")
  gradient.addColorStop(0.42, "#f7f1e6")
  gradient.addColorStop(1, "#b7ae9e")
  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = "rgba(255,255,255,0.45)"
  ctx.lineWidth = 8 * dpr
  for (let x = -height; x < width; x += 18 * dpr) {
    ctx.beginPath()
    ctx.moveTo(x, height)
    ctx.lineTo(x + height, 0)
    ctx.stroke()
  }
  ctx.fillStyle = "rgba(60, 52, 40, 0.16)"
  for (let i = 0; i < 180; i += 1) {
    ctx.fillRect(Math.random() * width, Math.random() * height, 2 * dpr, dpr)
  }
  ctx.fillStyle = "#3c362e"
  ctx.font = `600 ${12 * dpr}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Scratch to reveal", width / 2, height / 2)
}

function scratchedEnough(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) {
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let clear = 0
  let samples = 0
  for (let i = 3; i < data.length; i += 64) {
    samples += 1
    if (data[i] < 24) clear += 1
  }
  return samples > 0 && clear / samples > 0.42
}

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.scale(dpr, dpr)
    const originX = width / 2
    const originY = height * 0.38
    const pieces = Array.from({ length: 96 }, () => ({
      x: originX,
      y: originY,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: 5 + Math.random() * 7,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ??
        CONFETTI_COLORS[0],
      spin: (Math.random() - 0.5) * 0.35,
      rotation: Math.random() * Math.PI,
      life: 1,
    }))
    let frame = 0
    let raf = 0
    function tick() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      for (const piece of pieces) {
        piece.x += piece.vx
        piece.y += piece.vy
        piece.vy += 0.28
        piece.vx *= 0.99
        piece.rotation += piece.spin
        piece.life -= 0.008
        ctx.save()
        ctx.translate(piece.x, piece.y)
        ctx.rotate(piece.rotation)
        ctx.globalAlpha = Math.max(0, piece.life)
        ctx.fillStyle = piece.color
        ctx.fillRect(
          -piece.size / 2,
          -piece.size / 5,
          piece.size,
          piece.size / 2.4
        )
        ctx.restore()
      }
      frame += 1
      if (frame < 140) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, width, height)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (typeof document === "undefined") return null
  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80] h-full w-full"
    />,
    document.body
  )
}
