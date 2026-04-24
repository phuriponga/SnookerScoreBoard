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
  expectedNext: 'red' | 'color'
  nextColorIndex: number
  breakEnd?: boolean
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
  const [frameHistory, setFrameHistory] = useState<{ A: number; B: number; highBreakA: number; highBreakB: number }[]>([])
  const [playerNames, setPlayerNames] = useState({ A: 'PlayerA', B: 'PlayerB' })
  const [renameTarget, setRenameTarget] = useState<Player | null>(null)
  const [tempName, setTempName] = useState('')
  
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
      if (h.breakEnd) break //STOP if break ended
      if (h.player !== currentPlayer) break
      total += h.points
    }
    return total
  }, [history, currentPlayer])

  const highBreak = useMemo(() => {
    const result: Record<Player, number> = { A: 0, B: 0 }
    let temp: Record<Player, number> = { A: 0, B: 0 }
  
    for (const h of history) {
      if (h.breakEnd) {
        temp[h.player] = 0
        continue
      }
  
      temp[h.player] += h.points
      result[h.player] = Math.max(result[h.player], temp[h.player])
    }
  
    return result
  }, [history])

  const remainingPoints = useMemo(() => {
    if (phase === 'reds') {
      return redsRemaining * 8 + 27
    }
    return COLOR_ORDER.slice(nextColorIndex).reduce((a, c) => a + COLOR_POINTS[c], 0)
  }, [redsRemaining, phase, nextColorIndex])

  function addScore(points: number, label: string) {
    const newScore = scores[currentPlayer] + points
  
    setScores(prev => ({ ...prev, [currentPlayer]: newScore }))
  
    const newHistory = [
      ...history,
      { player: currentPlayer, points, label, redsRemaining, phase, expectedNext, nextColorIndex }
    ]
  
    setHistory(newHistory)
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
      // last black: delay endFrame so score updates first
      const finalScores = {
        ...scores,
        [currentPlayer]: scores[currentPlayer] + pts
      }
      
      setTimeout(() => endFrame(finalScores), 100)
    }
  }

  function foul(points: number) {
    const other = currentPlayer === 'A' ? 'B' : 'A'

    setHistory(prev => [
      ...prev,
      {
        player: currentPlayer,
        points: 0,
        label: 'Break End',
        redsRemaining,
        phase,
        expectedNext,
        nextColorIndex,
        breakEnd: true
      },
      {
        player: other,
        points,
        label: `Foul ${points}`,
        redsRemaining,
        phase,
        expectedNext,
        nextColorIndex
      }
    ])
    
    setScores(prev => ({ ...prev, [other]: prev[other] + points }))
    setCurrentPlayer(other)
  }

  function switchTurn(player: Player) {
    if (currentPlayer !== player) {

      //Mark end of break for current player
      setHistory(prev => [
        ...prev,
        {
          player: currentPlayer,
          points: 0,
          label: 'Break End',
          redsRemaining,
          phase,
          expectedNext,
          nextColorIndex,
          breakEnd: true
        }
      ])
      
      setCurrentPlayer(player)
    }
    if (redsRemaining <= 0) {
        //Potted the last red then switch turn, we shall go to colour mode
        if (phase === 'reds') {
          setPhase('colors')
          setNextColorIndex(0)
        }
    } else {
      setExpectedNext('red')
    }
  }

  function openRenameModal(player: Player) {
    setRenameTarget(player)
    setTempName(playerNames[player])
  }
  
  function savePlayerName() {
    if (!renameTarget || !tempName.trim()) return
  
    setPlayerNames(prev => ({
      ...prev,
      [renameTarget]: tempName.trim()
    }))
  
    setRenameTarget(null)
    setTempName('')
  }
  
  function closeRenameModal() {
    setRenameTarget(null)
    setTempName('')
  }
  
  function undo() {
    const last = history[history.length - 1]
    if (!last) return
    setScores(prev => ({ ...prev, [last.player]: prev[last.player] - last.points }))
    setHistory(prev => prev.slice(0, -1))
    setRedsRemaining(last.redsRemaining)
    setPhase(last.phase)
    setExpectedNext(last.expectedNext)
    setNextColorIndex(last.nextColorIndex)
  }

function endFrame(finalScores = scores) {
  //Last black was potted; but re-spot needed
  if (phase === 'colors' && nextColorIndex === COLOR_ORDER.length - 1 && finalScores.A === finalScores.B) {
    alert(`Please re-spot the black! :)`)
    setNextColorIndex(5)
    return
  }

  //Ending frame
  const winner = finalScores.A >= finalScores.B ? 'A' : 'B'

  setFrameHistory(prev => [
    ...prev,
    {
      A: finalScores.A,
      B: finalScores.B,
      highBreakA: highBreak.A,
      highBreakB: highBreak.B
    }
  ])

  setFrames(prev => ({
    ...prev,
    [winner]: prev[winner] + 1
  }))

  alert(`${playerNames[winner]} wins the frame!`)

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
          <CardContent
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px"
            }}
          >
            {(['A', 'B'] as Player[]).map(p => (
              <div
                onClick={() => switchTurn(p)}
                key={p}
                style={{
                  flex: 1,
                  backgroundColor: currentPlayer === p ? "green" : "white",
                  color: currentPlayer === p ? "white" : "black",
                  border: "4px solid black",
                  borderRadius: "24px",
                  padding: "12px"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <h1 onDoubleClick={() => openRenameModal(p)} style={{fontSize: "46px", fontWeight: "bold", margin: 0, cursor: "pointer", userSelect: "none"}}>{playerNames[p]}</h1>
                  <h1 className="score-font" style={{ fontSize: "230px", fontWeight: "bold", margin: 0, lineHeight: 0.9, textAlign: "center" }}>{scores[p]}</h1>
                </div>  
                <div>Won: {frames[p]} frame(s) </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div style={{ height: "8px" }} />
        <Card className="rounded-3xl shadow">
          <CardContent style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "12px"
            }}>
            <h3>Remaining Reds: {redsRemaining}</h3>
            <h3>Current Break: {currentBreak}</h3>
            <h3>Remaining Points: {remainingPoints}</h3>
            <h3>Snookers Needed: {snookersRequired}</h3>
          </CardContent>
        </Card>
        <div style={{ height: "8px" }} />
        <div className="grid grid-cols-4 gap-4">
          <Button className="h-24 text-xl rounded-2xl flex flex-col gap-2" onClick={potRed}>
            <Image src={BALL_IMAGES.red} alt="Red ball" width={88} height={88} />
          </Button>
          {COLOR_ORDER.map(c => (
            <Button key={c} className="h-24 text-xl rounded-2xl flex flex-col gap-2" onClick={() => potColor(c)}>
              <Image src={BALL_IMAGES[c]} alt={`${c} ball`} width={88} height={88} />
            </Button>
          ))}
          <div style={{ height: "8px" }} />     
          <Button className="h-32 w-full rounded-3xl" style={{ fontSize: "18px", fontWeight: "bold" }} onClick={() => foul(4)}>Foul +4</Button>
          <Button className="h-32 w-full rounded-3xl" style={{ fontSize: "18px", fontWeight: "bold" }} onClick={() => foul(5)}>Foul +5</Button>
          <Button className="h-32 w-full rounded-3xl" style={{ fontSize: "18px", fontWeight: "bold" }} onClick={() => foul(6)}>Foul +6</Button>
          <Button className="h-32 w-full rounded-3xl" style={{ fontSize: "18px", fontWeight: "bold" }} onClick={() => foul(7)}>Foul +7</Button>
          <Button className="h-32 w-full rounded-3xl" style={{ fontSize: "18px", fontWeight: "bold" }} onClick={undo}>Undo</Button>
          <Button className="h-32 w-full rounded-3xl" style={{ fontSize: "18px", fontWeight: "bold" }} onClick={() => endFrame()}>End Frame</Button>
          <div style={{ height: "24px" }} />

          <Card className="rounded-3xl shadow">
            <CardContent className="p-6">
              <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "6px" }}>Frame History</h2>
              {frameHistory.map((frame, index) => (
                <div key={index} style={{fontSize: "16px", padding: "6px 0", borderBottom: "1px solid #ccc"}}>
                  F.{index + 1} : {playerNames.A} (
                  <span style={{fontWeight: frame.A > frame.B ? "bold" : "normal", color: frame.A > frame.B ? "green" : "inherit"}}>
                    {frame.A}
                  </span>
                  {" - "}
                  <span style={{fontWeight: frame.B > frame.A ? "bold" : "normal", color: frame.B > frame.A ? "green" : "inherit"}}>
                    {frame.B}
                  </span>
                  ) {playerNames.B} = [HB: {frame.highBreakA} - {frame.highBreakB}]
                </div>
              ))}
            </CardContent>
          </Card>
          <div style={{ height: "24px" }} />
          <span className="text-lg text-gray-400 text-center block">[&copy; Phuripong - Stockholm: April 2026]</span>
        </div>
      </div>

      {renameTarget && (
        <div
          onClick={closeRenameModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "24px",
              width: "90%",
              maxWidth: "420px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
            }}
          >
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>
              Rename Player:
            </h2>
      
            <input
              autoFocus
              value={tempName}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && savePlayerName()}
              style={{
                width: "90%",
                padding: "14px",
                fontSize: "20px",
                borderRadius: "16px",
                border: "1px solid #ccc",
                marginBottom: "20px"
              }}
            />
      
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <Button onClick={closeRenameModal} style={{backgroundColor: "#e5e7eb", color: "#111827"}}>
                Cancel
              </Button>
              <Button onClick={savePlayerName} style={{backgroundColor: "#e5e7eb", color: "#111827"}}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}

