'use client'

import React, { useMemo, useState, useReducer, useEffect } from 'react'
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import Image from 'next/image'

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
  ball?: Color
}

type GameAction =
  | { type: 'POT_RED' }
  | { type: 'POT_COLOR'; color: Color }
  | { type: 'FOUL'; points: number }
  | { type: 'SWITCH_PLAYER'; player: Player }
  | { type: 'UNDO' }
  | { type: 'RESET_FRAME' }
  | { type: 'RESPOT_BLACK' }

type GameState = {
  scores: { A: number; B: number }
  currentPlayer: Player
  redsRemaining: number
  phase: 'reds' | 'colors'
  expectedNext: 'red' | 'color'
  nextColorIndex: number
  history: Action[]
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
const initialState: GameState = {
  scores: { A: 0, B: 0 },
  currentPlayer: 'A',
  redsRemaining: 15,
  phase: 'reds',
  expectedNext: 'red',
  nextColorIndex: 0,
  history: [],
}

//const BALL_EMOJI: Record<Color, string> & { red: string } = {
const BALL_EMOJI: Record<Color, string> = {  
  red: '🔴',
  yellow: '🟡',
  green: '🟢',
  brown: '🟤',
  blue: '🔵',
  pink: '🟣',
  black: '⚫',
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

const reducer: React.Reducer<GameState, GameAction> = (state, action) => {
   switch (action.type) {
  
     case 'POT_RED': {
       if (state.phase !== 'reds' || state.expectedNext !== 'red' || state.redsRemaining <= 0) return state
 
       const newReds = state.redsRemaining - 1

        return {
          ...state,
          scores: {
            ...state.scores,
            [state.currentPlayer]: state.scores[state.currentPlayer] + 1
          },
          redsRemaining: newReds,
          expectedNext: 'color',
        
          // IMPORTANT: do NOT switch phase yet
          phase: 'reds',
        
          history: [
            ...state.history,
            {
              player: state.currentPlayer,
              points: 1,
              label: 'Red',
              redsRemaining: newReds,
              phase: state.phase,
              expectedNext: 'color',
              nextColorIndex: state.nextColorIndex,
              ball: 'red'
            }
          ]
        }
     }

    case 'POT_COLOR': {
      const color = action.color
      const pts = COLOR_POINTS[color]
      const isFinalRedColorPhase = state.phase === 'reds' && state.redsRemaining === 0
    
      // =========================
      // 1. REDS PHASE (including last-red transition)
      // =========================
      if (state.phase === 'reds') {
        if (state.expectedNext !== 'color') return state
    
        const newReds = state.redsRemaining
        const isLastRedJustPotted = state.redsRemaining === 0
    
        const nextState: GameState = {
          ...state,
          scores: {
            ...state.scores,
            [state.currentPlayer]: state.scores[state.currentPlayer] + pts
          },
          expectedNext: 'red',
          history: [
            ...state.history,
            {
              player: state.currentPlayer,
              points: pts,
              label: color,
              redsRemaining: newReds,
              phase: state.phase,
              expectedNext: state.expectedNext,
              nextColorIndex: state.nextColorIndex,
              ball: color
            }
          ]
        }
    
        // ONLY AFTER the final color after last red
        if (isLastRedJustPotted) {
          nextState.phase = 'colors'
          nextState.nextColorIndex = 0
        }
    
        return nextState
      }
    
      // =========================
      // 2. COLORS PHASE
      // =========================
      if (state.phase !== 'colors') return state
    
      const expectedColor = COLOR_ORDER[state.nextColorIndex]
      if (!expectedColor) return state
    
      if (color !== expectedColor) return state
    
      return {
        ...state,
        scores: {
          ...state.scores,
          [state.currentPlayer]: state.scores[state.currentPlayer] + pts
        },
        nextColorIndex: state.nextColorIndex + 1,
        history: [
          ...state.history,
          {
            player: state.currentPlayer,
            points: pts,
            label: color,
            redsRemaining: state.redsRemaining,
            phase: state.phase,
            expectedNext: state.expectedNext,
            nextColorIndex: state.nextColorIndex,
            ball: color
          }
        ]
      }
    }
       
     case 'FOUL': {
       const other = state.currentPlayer === 'A' ? 'B' : 'A'
  
       return {
         ...state,
         scores: {
           ...state.scores,
           [other]: state.scores[other] + action.points
         },
         currentPlayer: other,
         history: [
           ...state.history,
           {
             player: state.currentPlayer,
             points: 0,
             label: 'Break End',
             redsRemaining: state.redsRemaining,
             phase: state.phase,
             expectedNext: state.expectedNext,
             nextColorIndex: state.nextColorIndex,
             breakEnd: true
           },
           {
             player: other,
             points: action.points,
             label: `Foul ${action.points}`,
             redsRemaining: state.redsRemaining,
             phase: state.phase,
             expectedNext: state.expectedNext,
             nextColorIndex: state.nextColorIndex
           }
         ]
       }
     }
  
    case 'SWITCH_PLAYER': {
      if (state.currentPlayer === action.player) return state

      // Potted last red, then switched turn
      const isLastRedJustPotted = state.redsRemaining === 0
      if (isLastRedJustPotted) {
          nextState.phase = 'colors'
          nextState.nextColorIndex = 0
      }
      
      return {
        ...state,
        currentPlayer: action.player,
        expectedNext: state.redsRemaining > 0 ? 'red' : state.expectedNext, 
        history: [
          ...state.history,
          {
            player: state.currentPlayer,
            points: 0,
            label: 'Break End',
            redsRemaining: state.redsRemaining,
            phase: state.phase,
            expectedNext: state.expectedNext,
            nextColorIndex: state.nextColorIndex,
            breakEnd: true
          }
        ]
      }
    }
 
     case 'UNDO': {
       const last = state.history[state.history.length - 1]
       if (!last) return state
 
       return {
         ...state,
         scores: {
           ...state.scores,
           [last.player]: state.scores[last.player] - last.points
         },
         history: state.history.slice(0, -1),
         redsRemaining: last.redsRemaining,
         phase: last.phase,
         expectedNext: last.expectedNext,
         nextColorIndex: last.nextColorIndex
       }
     }
  
     case 'RESET_FRAME':
       return initialState

      case 'RESPOT_BLACK':
        return {
          ...state,
          nextColorIndex: 5 // black index
      }
 
     default:
       return state
   }
 }

export default function SnookerScoreboardApp() {
  const [frameHistory, setFrameHistory] = useState<{ A: number; B: number; highBreakA: number; highBreakB: number }[]>([])
  const [playerNames, setPlayerNames] = useState({ A: 'PA', B: 'PB' })
  const [renameTarget, setRenameTarget] = useState<Player | null>(null)
  const [tempName, setTempName] = useState('')
  const [frames, setFrames] = useState({ A: 0, B: 0 })
  const [bestOf] = useState(5)

  const [state, dispatch] = useReducer(reducer, initialState)
  const {
    scores,
    currentPlayer,
    redsRemaining,
    phase,
    expectedNext,
    nextColorIndex,
    history
  } = state

  const isFrameComplete =
  phase === 'colors' && nextColorIndex === COLOR_ORDER.length
  
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
  }, [history, currentPlayer])

  const remainingPoints = useMemo(() => {
    if (phase === 'reds') {
      return redsRemaining * 8 + 27
    }
    return COLOR_ORDER.slice(nextColorIndex).reduce((a, c) => a + COLOR_POINTS[c], 0)
  }, [redsRemaining, phase, nextColorIndex])
  
  const playerPots = useMemo(() => {
    const result: Record<Player, Action[]> = { A: [], B: [] }
  
    for (const h of history) {
      // ignore break markers and fouls
      if (h.breakEnd) continue
      if (h.points === 0) continue
      if (h.label.startsWith('Foul')) continue
  
      result[h.player].push(h)
    }
  
    return result
  }, [history])

  useEffect(() => {
    if (isFrameComplete) {
      endFrame()
    }
  }, [isFrameComplete, endFrame])
  
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

function endFrame(finalScores = scores) {
  //Last black was potted; but re-spot needed
  if (phase === 'colors' && nextColorIndex === COLOR_ORDER.length - 1 && finalScores.A === finalScores.B) {
    alert(`Please re-spot the black! :)`)
    dispatch({ type: 'RESPOT_BLACK' })
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

  dispatch({ type: 'RESET_FRAME' })
}

  const potRed = () => dispatch({ type: 'POT_RED' })

  const potColor = (c: Color) =>
    dispatch({ type: 'POT_COLOR', color: c })
  
  const foul = (p: number) =>
    dispatch({ type: 'FOUL', points: p })
  
  const switchTurn = (p: Player) =>
    dispatch({ type: 'SWITCH_PLAYER', player: p })
  
  const undo = () => dispatch({ type: 'UNDO' })

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
                style={{flex: 1, backgroundColor: currentPlayer === p ? "green" : "white", color: currentPlayer === p ? "white" : "black", border: "4px solid black", borderRadius: "24px", padding: "12px"}}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <h1 onDoubleClick={() => openRenameModal(p)} style={{fontSize: "46px", fontWeight: "bold", margin: 0, cursor: "pointer", userSelect: "none"}}>{playerNames[p]}</h1>
                  <h1 className="score-font" style={{ fontSize: "230px", fontWeight: "bold", margin: "0px 0px 35px 0px", lineHeight: 0.9, textAlign: "center" }}>{scores[p]}</h1>
                </div>  
                <div>Won: {frames[p]} frame(s) </div>
              </div>
              <div style={{marginTop: "1px", display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "left", backgroundColor: "#f6f8fc", borderRadius: "8px"}}>
                  {playerPots[p].map((shot, i) => (
                    <span key={i} style={{ fontSize: "18px", lineHeight: 1 }}>{shot.ball ? BALL_EMOJI[shot.ball] : ''}</span>
                  ))}
              </div>
            ))}
          </CardContent>
        </Card>
        <div style={{ height: "8px" }} />
        <Card className="rounded-3xl shadow">
          <CardContent style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "12px",
              backgroundColor: "#f6f8fc", 
              borderRadius: "8px"
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

