'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"

type Player = 'A' | 'B'
type Color = 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black'

type Action = {
  player: Player
  points: number
  label: string
  redsRemaining: number
  phase: 'reds' | 'colors'
}

const COLOR_POINTS: Record<Color, number> = {
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7,
}

const COLOR_ORDER: Color[] = ['yellow', 'green', 'brown', 'blue', 'pink', 'black']

const BALL_IMAGES: Record<Color | 'red', string> = {
  red: '/balls/red.png',
  yellow: '/balls/yellow.png',
  green: '/balls/green.png',
  brown: '/balls/brown.png',
  blue: '/balls/blue.png',
  pink: '/balls/pink.png',
  black: '/balls/black.png',
}

import Image from 'next/image'

export default function SnookerScoreboardApp() {
  const [playerNames, setPlayerNames] = useState({ A: 'Player A', B: 'Player B' })
  const [scores, setScores] = useState({ A: 0, B: 0 })
  const [frames, setFrames] = useState({ A: 0, B: 0 })
  const [currentPlayer, setCurrentPlayer] = useState<Player>('A')
  const [redsRemaining, setRedsRemaining] = useState(15)
  const [phase, setPhase] = useState<'reds' | 'colors'>('reds')
  const [expectedNext, setExpectedNext] = useState<'red' | 'color'>('red')
  const [nextColorIndex, setNextColorIndex] = useState(0)
  const [history, setHistory] = useState<Action[]>([])
  const [bestOf] = useState(5)

  const currentBreak = useMemo(() => {
    let total = 0
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i]
      if (h.player !== currentPlayer) break
      total += h.points
    }
    return total
  }, [history, currentPlayer])

  const remainingPoints = useMemo(() => {
    if (phase === 'reds') {
      return redsRemaining * 8 + 27
    }
    return COLOR_ORDER.slice(nextColorIndex).reduce((a, c) => a + COLOR_POINTS[c], 0)
  }, [redsRemaining, phase, nextColorIndex])

  function addScore(points: number, label: string) {
    setScores(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] + points }))
    setHistory(prev => [...prev, { player: currentPlayer, points, label, redsRemaining, phase }])
  }

  function potRed() {
    if (phase !== 'reds' || expectedNext !== 'red' || redsRemaining <= 0) return
    addScore(1, 'Red')
    setRedsRemaining(r => r - 1)
    setExpectedNext('color')
    if (redsRemaining - 1 === 0) {
      // last red potted, still needs one color before colors clearance
    }
  }

  function potColor(color: Color) {
    const pts = COLOR_POINTS[color]

    if (phase === 'reds') {
      if (expectedNext !== 'color') return
      addScore(pts, color)

      if (redsRemaining === 0) {
        setPhase('colors')
        setNextColorIndex(0)
      }
      setExpectedNext('red')
      return
    }

    const expectedColor = COLOR_ORDER[nextColorIndex]
    if (color !== expectedColor) return

    addScore(pts, color)

    if (nextColorIndex < COLOR_ORDER.length - 1) {
      setNextColorIndex(i => i + 1)
    } else {
      endFrame()
    }
  }

  function foul(points: number) {
    const other = currentPlayer === 'A' ? 'B' : 'A'
    setScores(prev => ({ ...prev, [other]: prev[other] + points }))
    setCurrentPlayer(other)
    setHistory(prev => [...prev, { player: other, points, label: `Foul ${points}`, redsRemaining, phase }])
  }

  function switchTurn() {
    setCurrentPlayer(p => (p === 'A' ? 'B' : 'A'))
  }

  function undo() {
    const last = history[history.length - 1]
    if (!last) return
    setScores(prev => ({ ...prev, [last.player]: prev[last.player] - last.points }))
    setHistory(prev => prev.slice(0, -1))
    setRedsRemaining(last.redsRemaining)
    setPhase(last.phase)
  }

  function endFrame() {
    const winner = scores.A >= scores.B ? 'A' : 'B'
    setFrames(prev => ({ ...prev, [winner]: prev[winner] + 1 }))

    setScores({ A: 0, B: 0 })
    setCurrentPlayer('A')
    setRedsRemaining(15)
    setPhase('reds')
    setExpectedNext('red')
    setNextColorIndex(0)
    setHistory([])
  }

  const framesToWin = Math.ceil(bestOf / 2)
  const snookersRequired = Math.max(0, Math.ceil((Math.abs(scores.A - scores.B) - remainingPoints) / 4))

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto grid gap-6">
        <Card className="rounded-3xl shadow">
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            {(['A', 'B'] as Player[]).map(p => (
              <input
                key={p}
                value={playerNames[p]}
                onChange={(e) => setPlayerNames(prev => ({ ...prev, [p]: e.target.value }))}
                className="rounded-2xl border p-4 text-2xl font-semibold"
                placeholder={`Player ${p}`}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow">
          <CardContent className="p-6 grid grid-cols-2 gap-6">
          {(['A', 'B'] as Player[]).map(p => (
            <div
              key={p}
              style={{
                backgroundColor: currentPlayer === p ? "red" : "white",
                color: currentPlayer === p ? "white" : "black",
                border: "4px solid black",
                borderRadius: "24px",
                padding: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
                <h1>{playerNames[p]}</h1>
                <h1>{scores[p]}</h1>
                <br />frames: {frames[p]}
              </div>
            ))}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-3 gap-4">
          <Button className="h-36 rounded-2xl" onClick={switchTurn}>Switch Player</Button>
          <Button className="h-36 rounded-2xl" onClick={undo}>Undo</Button>          
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <Button className="h-24 text-xl rounded-2xl flex flex-col gap-2" onClick={potRed}>
            <Image src={BALL_IMAGES.red} alt="Red ball" width={88} height={88} />
            Red (+1)
          </Button>
          {COLOR_ORDER.map(c => (
            <Button key={c} className="h-24 text-xl rounded-2xl flex flex-col gap-2" onClick={() => potColor(c)}>
              <Image src={BALL_IMAGES[c]} alt={`${c} ball`} width={88} height={88} />
              {c} (+{COLOR_POINTS[c]})
            </Button>
          ))}
          <br />
          <Button className="h-24 text-xl rounded-2xl" onClick={() => foul(4)}>Foul +4</Button>
          <Button className="h-24 text-xl rounded-2xl" onClick={() => foul(5)}>Foul +5</Button>
          <Button className="h-24 text-xl rounded-2xl" onClick={() => foul(6)}>Foul +6</Button>
          <Button className="h-24 text-xl rounded-2xl" onClick={() => foul(7)}>Foul +7</Button>
        </div>

        <Card className="rounded-3xl shadow">
          <CardContent className="p-6 grid grid-cols-4 gap-4 text-lg">
            <div>Reds: {redsRemaining}</div>
            <div>Break: {currentBreak}</div>
            <div>Remaining: {remainingPoints}</div>
            <div>Snookers needed: {snookersRequired}</div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Button className="h-16 rounded-2xl" onClick={endFrame}>End Frame</Button>
        </div>
      </div>
    </div>
  )
}

