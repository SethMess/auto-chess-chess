import React, { useState, useEffect } from "react";
import "./styles.css";

const initialBoard = () => {
    let board = Array(8).fill(null).map(() => Array(8).fill(null));
    let pieces = [
        { type: "pawn", color: "white", position: { x: 3, y: 6 }, health: 2 },
        { type: "pawn", color: "black", position: { x: 3, y: 1 }, health: 2 },
        { type: "pawn", color: "white", position: { x: 4, y: 6 }, health: 2 },
        { type: "pawn", color: "black", position: { x: 4, y: 1 }, health: 2 },
        { type: "knight", color: "white", position: { x: 1, y: 7 }, health: 4 },
        { type: "knight", color: "black", position: { x: 1, y: 0 }, health: 4 },
        { type: "rook", color: "white", position: { x: 0, y: 7 }, health: 6 },
        { type: "rook", color: "black", position: { x: 0, y: 0 }, health: 6 },
        { type: "rook", color: "white", position: { x: 7, y: 7 }, health: 6 },
        { type: "rook", color: "black", position: { x: 7, y: 0 }, health: 6 }
    ];
    pieces.forEach(piece => {
        board[piece.position.y][piece.position.x] = piece;
    });
    return { board, pieces, turn: "white" };
};

const pieceSymbols = {
    pawn: { white: "♙", black: "♟" },
    knight: { white: "♘", black: "♞" },
    rook: { white: "♖", black: "♜" }
};

const isAdjacent = (pos1, pos2) => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return (dx <= 1 && dy <= 1) || (dx === 2 && dy === 1) || (dx === 1 && dy === 2); // Adjacent or knight's move
};

const getValidMoves = (piece, board) => {
    let moves = [];
    const { x, y } = piece.position;
    if (piece.type === "pawn") {
        let direction = piece.color === "white" ? -1 : 1;
        if (y + direction >= 0 && y + direction < 8) {
            if (!board[y + direction][x]) moves.push({ x, y: y + direction });
            if (x > 0 && board[y + direction][x - 1] && board[y + direction][x - 1].color !== piece.color)
                moves.push({ x: x - 1, y: y + direction });
            if (x < 7 && board[y + direction][x + 1] && board[y + direction][x + 1].color !== piece.color)
                moves.push({ x: x + 1, y: y + direction });
        }
    } else if (piece.type === "knight") {
        const knightMoves = [
            { dx: -2, dy: -1 }, { dx: -2, dy: 1 }, { dx: -1, dy: -2 }, { dx: -1, dy: 2 },
            { dx: 1, dy: -2 }, { dx: 1, dy: 2 }, { dx: 2, dy: -1 }, { dx: 2, dy: 1 }
        ];
        knightMoves.forEach(({ dx, dy }) => {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && (!board[ny][nx] || board[ny][nx].color !== piece.color))
                moves.push({ x: nx, y: ny });
        });
    } else if (piece.type === "rook") {
        const directions = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];
        directions.forEach(({ dx, dy }) => {
            let nx = x, ny = y;
            while (true) {
                nx += dx;
                ny += dy;
                if (nx < 0 || nx >= 8 || ny < 0 || ny >= 8) break;
                if (!board[ny][nx]) {
                    moves.push({ x: nx, y: ny });
                } else {
                    if (board[ny][nx].color !== piece.color) moves.push({ x: nx, y: ny });
                    break;
                }
            }
        });
    }
    return moves;
};

const ChessBoard = () => {
    const [state, setState] = useState(initialBoard());
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [moveIndicators, setMoveIndicators] = useState([]);

    const [animations, setAnimations] = useState({
        attacking: {},
        hit: {},
        moving: {},
        moveFrom: {}
    });

    const availablePieces = [
        { type: "pawn", color: "white", health: 2 },
        { type: "pawn", color: "black", health: 2 },
        { type: "knight", color: "white", health: 4 },
        { type: "knight", color: "black", health: 4 },
        { type: "rook", color: "white", health: 6 },
        { type: "rook", color: "black", health: 6 }
    ];

    const handleDragStart = (piece, fromBank = false) => {
        if (!isGameStarted) {
            if (fromBank) {
                setDraggedPiece({ ...piece, fromBank });
            } else {
                // For board pieces, save the original position for identification
                setDraggedPiece({
                    ...piece,
                    originalPosition: { ...piece.position }  // Store original position for identification
                });
            }
        }
    };

    const handleDrop = (x, y) => {
        if (!isGameStarted && draggedPiece) {
            setState(prevState => {
                let newPieces = [...prevState.pieces];
                let newBoard = [...prevState.board.map(row => [...row])];

                // Clear destination if occupied
                if (newBoard[y][x]) {
                    newPieces = newPieces.filter(p =>
                        p.position.x !== x || p.position.y !== y
                    );
                }

                if (draggedPiece.fromBank) {
                    // Create a new piece from bank
                    const newPiece = {
                        ...draggedPiece,
                        position: { x, y },
                        fromBank: undefined
                    };
                    newPieces.push(newPiece);
                } else {
                    // Move existing piece using its original position to identify it
                    const originalPos = draggedPiece.originalPosition;
                    newPieces = newPieces.map(p => {
                        if (p.position.x === originalPos.x &&
                            p.position.y === originalPos.y &&
                            p.type === draggedPiece.type &&
                            p.color === draggedPiece.color) {
                            return { ...p, position: { x, y } };
                        }
                        return p;
                    });
                }

                // Rebuild board
                newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
                newPieces.forEach(piece => {
                    newBoard[piece.position.y][piece.position.x] = piece;
                });

                return { ...prevState, board: newBoard, pieces: newPieces };
            });
            setDraggedPiece(null);
        }
    };

    const handleTrashDrop = () => {
        if (!isGameStarted && draggedPiece && !draggedPiece.fromBank) {
            setState(prevState => {
                // Remove the piece
                const newPieces = prevState.pieces.filter(p => p !== draggedPiece);

                // Rebuild board
                const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
                newPieces.forEach(piece => {
                    newBoard[piece.position.y][piece.position.x] = piece;
                });

                return { ...prevState, board: newBoard, pieces: newPieces };
            });
            setDraggedPiece(null);
        }
    };

    useEffect(() => {
        if (!isGameStarted || gameOver) return;

        const interval = setInterval(() => {
            setState(prevState => {
                let newBoard = [...prevState.board.map(row => [...row])];
                let newPieces = [...prevState.pieces];

                // Check if game is over
                const whitePieces = newPieces.filter(p => p.color === "white");
                const blackPieces = newPieces.filter(p => p.color === "black");

                if (whitePieces.length === 0) {
                    setGameOver(true);
                    setWinner("black");
                    return prevState; // Don't update state if game is over
                }

                if (blackPieces.length === 0) {
                    setGameOver(true);
                    setWinner("white");
                    return prevState; // Don't update state if game is over
                }

                // Get pieces of current turn
                const activePieces = newPieces.filter(piece => piece.color === prevState.turn);

                // Move each active piece
                for (let piece of activePieces) {
                    // Skip if piece is no longer on the board (sanity check)
                    if (!newBoard[piece.position.y][piece.position.x] ||
                        newBoard[piece.position.y][piece.position.x] !== piece) {
                        continue;
                    }
                    const oldPos = { ...piece.position };
                    const cellSize = 60; // Size of your chess cells in pixels

                    // Get valid moves for this piece
                    const validMoves = getValidMoves(piece, newBoard);

                    // Then modify your move handling logic
                    if (validMoves.length > 0) {
                        // First, check if we're already adjacent to an enemy
                        const adjacentEnemies = validMoves.filter(move =>
                            newBoard[move.y][move.x] &&
                            newBoard[move.y][move.x].color !== piece.color &&
                            isAdjacent(piece.position, move)
                        );

                        // Prioritize attacking adjacent enemies
                        if (adjacentEnemies.length > 0) {
                            const target = adjacentEnemies[Math.floor(Math.random() * adjacentEnemies.length)];
                            const targetPiece = newBoard[target.y][target.x];

                            // Set animation states
                            setAnimations(prev => ({
                                ...prev,
                                attacking: {
                                    ...prev.attacking,
                                    [`${piece.position.y}-${piece.position.x}`]: true
                                },
                                hit: {
                                    ...prev.hit,
                                    [`${target.y}-${target.x}`]: true
                                }
                            }));

                            // Clear animations after delay
                            setTimeout(() => {
                                setAnimations(prev => ({
                                    ...prev,
                                    attacking: {
                                        ...prev.attacking,
                                        [`${piece.position.y}-${piece.position.x}`]: false
                                    },
                                    hit: {
                                        ...prev.hit,
                                        [`${target.y}-${target.x}`]: false
                                    }
                                }));
                            }, 300);

                            // Process the actual attack
                            targetPiece.health -= 1;

                            if (targetPiece.health <= 0) {
                                // Remove defeated piece
                                newPieces = newPieces.filter(p => p !== targetPiece);

                                // Clear positions
                                newBoard[piece.position.y][piece.position.x] = null;
                                newBoard[target.y][target.x] = null;

                                // Move to target position
                                piece.position = { ...target };
                                newBoard[target.y][target.x] = piece;
                            }
                            // If target survives, attacker stays in place
                        } else {
                            // If no adjacent enemies, prioritize moving toward enemies
                            const moveTowardEnemy = validMoves.filter(move => {
                                // Check if this move gets us closer to an enemy
                                for (const p of newPieces) {
                                    if (p.color !== piece.color) {
                                        const currentDist = Math.abs(piece.position.x - p.position.x) +
                                            Math.abs(piece.position.y - p.position.y);
                                        const newDist = Math.abs(move.x - p.position.x) +
                                            Math.abs(move.y - p.position.y);
                                        if (newDist < currentDist) return true;
                                    }
                                }
                                return false;
                            });

                            // Choose a move (prefer moving toward enemies)
                            const chosenMove = moveTowardEnemy.length > 0
                                ? moveTowardEnemy[Math.floor(Math.random() * moveTowardEnemy.length)]
                                : validMoves[Math.floor(Math.random() * validMoves.length)];

                            setAnimations(prev => ({
                                ...prev,
                                moving: {
                                    ...prev.moving,
                                    [`${chosenMove.y}-${chosenMove.x}`]: true
                                },
                                moveFrom: {
                                    ...prev.moveFrom,
                                    [`${chosenMove.y}-${chosenMove.x}`]: {
                                        fromX: oldPos.x,
                                        fromY: oldPos.y,
                                        toX: chosenMove.x,
                                        toY: chosenMove.y
                                    }
                                }
                            }));

                            // Add move indicator
                            const moveId = Date.now();
                            setMoveIndicators(prev => [
                                ...prev,
                                {
                                    from: oldPos,
                                    to: chosenMove,
                                    color: piece.color,
                                    id: moveId
                                }
                            ]);

                            // Clear move indicator after animation completes
                            setTimeout(() => {
                                setMoveIndicators(prev => prev.filter(m => m.id !== moveId));
                            }, 500);

                            // Wait for animation before updating the actual game state
                            setTimeout(() => {
                                setState(prevState => {
                                    // Your existing code to update the board
                                    let newBoard = [...prevState.board.map(row => [...row])];
                                    let newPieces = [...prevState.pieces];

                                    // Find the piece in the new state
                                    const pieceToMove = newPieces.find(p =>
                                        p.position.y === oldPos.y && p.position.x === oldPos.x && p.color === piece.color && p.type === piece.type
                                    );

                                    if (pieceToMove) {
                                        newBoard[pieceToMove.position.y][pieceToMove.position.x] = null;
                                        pieceToMove.position = { ...chosenMove };
                                        newBoard[chosenMove.y][chosenMove.x] = pieceToMove;
                                    }

                                    return {
                                        ...prevState,
                                        board: newBoard,
                                        pieces: newPieces
                                    };
                                });

                                // Clear the animation
                                setAnimations(prev => ({
                                    ...prev,
                                    moving: {
                                        ...prev.moving,
                                        [`${chosenMove.y}-${chosenMove.x}`]: false
                                    }
                                }));
                            }, 500); // Match this to your CSS transition time

                            // Move piece
                            newBoard[piece.position.y][piece.position.x] = null;
                            piece.position = { ...chosenMove };
                            newBoard[chosenMove.y][chosenMove.x] = piece;
                        }
                    }
                }

                // Ensure board and pieces are in sync
                let rebuiltBoard = Array(8).fill(null).map(() => Array(8).fill(null));
                newPieces.forEach(piece => {
                    rebuiltBoard[piece.position.y][piece.position.x] = piece;
                });

                return {
                    board: rebuiltBoard, // Use rebuilt board to ensure consistency
                    pieces: newPieces,
                    turn: prevState.turn === "white" ? "black" : "white"
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isGameStarted, gameOver]);

    return (
        <div className="game-container">
            {!isGameStarted && (
                <div className="setup-controls">
                    <div className="piece-bank">
                        <h3>Piece Bank</h3>
                        <div className="bank-pieces">
                            {availablePieces.map((piece, index) => (
                                <div
                                    key={index}
                                    className="bank-piece"
                                    draggable={!isGameStarted}
                                    onDragStart={() => handleDragStart(piece, true)}
                                >
                                    <span style={{
                                        color: piece.color === "white" ? "white" : "black",
                                        fontSize: "24px",
                                        textShadow: "0 0 3px gray"
                                    }}>
                                        {pieceSymbols[piece.type][piece.color]}
                                        <span style={{ fontSize: "12px" }}>({piece.health})</span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div
                            className="trash-can"
                            onDrop={handleTrashDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <span role="img" aria-label="trash">🗑️</span>
                            <p>Drop pieces here to remove</p>
                        </div>

                        <button onClick={() => setIsGameStarted(true)}>Start Game</button>
                    </div>
                </div>
            )}

            {gameOver && <div className="game-over">Game Over! {winner} wins!</div>}

            <div className="chessboard-wrapper" style={{ position: 'relative' }}>
                <div className="chessboard">
                    {state.board.map((row, y) => (
                        <div key={y} className="row">
                            {row.map((cell, x) => (
                                <div
                                    key={x}
                                    className="cell"
                                    onDrop={() => handleDrop(x, y)}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    {cell ? (
                                        <span
                                            className={`piece 
                                                ${animations.attacking[`${y}-${x}`] ? 'attacking' : ''}
                                                ${animations.hit[`${y}-${x}`] ? 'hit' : ''}
                                            `}
                                            style={{
                                                color: cell.color === "white" ? "white" : "black",
                                                fontSize: "24px"
                                            }}
                                            draggable={!isGameStarted}
                                            onDragStart={() => handleDragStart(cell)}
                                        >
                                            {pieceSymbols[cell.type][cell.color]} <span style={{ fontSize: "12px" }}>({cell.health})</span>
                                        </span>
                                    ) : ""}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Render move arrows as absolutely positioned elements */}
                {moveIndicators.map(indicator => (
                    <div
                        key={indicator.id}
                        className={`move-arrow ${indicator.color}`}
                        style={{
                            position: 'absolute',
                            left: `${indicator.from.x * 60 + 30}px`,
                            top: `${indicator.from.y * 60 + 30}px`,
                            width: `${Math.hypot(
                                (indicator.to.x - indicator.from.x) * 60,
                                (indicator.to.y - indicator.from.y) * 60
                            )}px`,
                            transform: `rotate(${Math.atan2(
                                (indicator.to.y - indicator.from.y),
                                (indicator.to.x - indicator.from.x)
                            )}rad)`,
                            transformOrigin: 'left center'
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default ChessBoard;
