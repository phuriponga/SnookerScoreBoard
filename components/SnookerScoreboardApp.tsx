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

export default function SnookerScoreboardApp() {
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

  function foul(points = 4) {
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
          <CardContent className="p-6 grid grid-cols-2 gap-6">
            {(['A', 'B'] as Player[]).map(p => (
              <div key={p} className={`rounded-3xl p-6 text-center ${currentPlayer === p ? 'bg-slate-900 text-red' : 'bg-white'}`}>
                <div className="text-xl">Player {p}</div>
                <div className="text-6xl font-bold mt-4">{scores[p]}</div>
                <div className="mt-2">Frames: {frames[p]} / {framesToWin}</div>
              </div><br><br>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          <Button className="h-20 text-xl rounded-2xl" onClick={potRed}>Red</Button>
          {COLOR_ORDER.map(c => (
            <Button key={c} className="h-20 text-xl rounded-2xl" onClick={() => potColor(c)}>
              {c} (+{COLOR_POINTS[c]})
            </Button>
          ))}
          <Button className="h-20 text-xl rounded-2xl" onClick={() => foul(4)}>Foul +4</Button>
        </div>

        <Card className="rounded-3xl shadow">
          <CardContent className="p-6 grid grid-cols-4 gap-4 text-lg">
            <div>Reds: {redsRemaining}</div>
            <div>Break: {currentBreak}</div>
            <div>Remaining: {remainingPoints}</div>
            <div>Snookers needed: {snookersRequired}</div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Button className="h-16 rounded-2xl" onClick={undo}>Undo</Button>
          <Button className="h-16 rounded-2xl" onClick={switchTurn}>Switch Player</Button>
          <Button className="h-16 rounded-2xl" onClick={endFrame}>End Frame</Button>
        </div>
      </div>
    </div>
  )
}
