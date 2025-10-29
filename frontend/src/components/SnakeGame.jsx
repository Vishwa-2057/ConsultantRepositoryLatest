import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy } from 'lucide-react';

const GRID_SIZE = 15;
const CELL_SIZE = 18;
const INITIAL_SNAKE = [{ x: 7, y: 7 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const GAME_SPEED = 150;

const SnakeGame = ({ isOpen, onClose }) => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snakeHighScore') || '0');
  });
  const [isPaused, setIsPaused] = useState(false);
  const gameLoopRef = useRef(null);
  const directionRef = useRef(INITIAL_DIRECTION);

  // Generate random food position
  const generateFood = useCallback((currentSnake) => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
  }, [generateFood]);

  // Handle keyboard input
  const handleKeyPress = useCallback((e) => {
    if (gameOver) return;

    const key = e.key.toLowerCase();
    const currentDir = directionRef.current;

    if (key === ' ') {
      e.preventDefault();
      setIsPaused(prev => !prev);
      return;
    }

    let newDirection = { ...currentDir };

    switch (key) {
      case 'arrowup':
      case 'w':
        if (currentDir.y === 0) newDirection = { x: 0, y: -1 };
        break;
      case 'arrowdown':
      case 's':
        if (currentDir.y === 0) newDirection = { x: 0, y: 1 };
        break;
      case 'arrowleft':
      case 'a':
        if (currentDir.x === 0) newDirection = { x: -1, y: 0 };
        break;
      case 'arrowright':
      case 'd':
        if (currentDir.x === 0) newDirection = { x: 1, y: 0 };
        break;
      default:
        return;
    }

    e.preventDefault();
    setDirection(newDirection);
    directionRef.current = newDirection;
  }, [gameOver]);

  // Game loop
  useEffect(() => {
    if (!isOpen || gameOver || isPaused) return;

    gameLoopRef.current = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = {
          x: (head.x + directionRef.current.x + GRID_SIZE) % GRID_SIZE,
          y: (head.y + directionRef.current.y + GRID_SIZE) % GRID_SIZE
        };

        // Check collision with self
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check if food is eaten
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(prev => {
            const newScore = prev + 10;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('snakeHighScore', newScore.toString());
            }
            return newScore;
          });
          setFood(generateFood(newSnake));
          return newSnake;
        }

        // Remove tail if no food eaten
        newSnake.pop();
        return newSnake;
      });
    }, GAME_SPEED);

    return () => clearInterval(gameLoopRef.current);
  }, [isOpen, gameOver, isPaused, food, generateFood, highScore]);

  // Keyboard event listener
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, handleKeyPress]);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetGame();
    }
  }, [isOpen, resetGame]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              🐍 Snake Game
          </DialogTitle>
        </DialogHeader>
        <div style={{textAlign: "center"}}>
             Congrats! You found the easter egg!
        </div>

        <div className="space-y-4">
          {/* Score Display */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                Score: {score}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <Badge variant="outline" className="text-sm">
                Best: {highScore}
              </Badge>
            </div>
          </div>

          {/* Game Board */}
          <div className="relative border-4 border-gray-800 rounded-lg overflow-hidden bg-gray-100">
            <div
              style={{
                width: GRID_SIZE * CELL_SIZE,
                height: GRID_SIZE * CELL_SIZE,
                position: 'relative'
              }}
            >
              {/* Snake */}
              {snake.map((segment, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: index === 0 ? '#22c55e' : '#4ade80',
                    border: '1px solid #16a34a',
                    borderRadius: '2px'
                  }}
                />
              ))}

              {/* Food */}
              <div
                style={{
                  position: 'absolute',
                  left: food.x * CELL_SIZE,
                  top: food.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite'
                }}
              />

              {/* Game Over Overlay */}
              {gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                  <div className="text-center text-white space-y-4">
                    <h3 className="text-2xl font-bold">Game Over!</h3>
                    <p className="text-lg">Final Score: {score}</p>
                    {score === highScore && score > 0 && (
                      <p className="text-yellow-400 flex items-center justify-center gap-2">
                        <Trophy className="w-5 h-5" />
                        New High Score!
                      </p>
                    )}
                    <Button onClick={resetGame} className="mt-4">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Paused Overlay */}
              {isPaused && !gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold">PAUSED</h3>
                    <p className="text-sm mt-2">Press SPACE to continue</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground text-center">
              <p className="font-medium">Controls:</p>
              <p>Arrow Keys or WASD • SPACE to pause</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={resetGame} variant="outline" size="sm" className="flex-1">
                <RotateCcw className="w-3 h-3 mr-1" />
                Restart
              </Button>
              <Button onClick={() => setIsPaused(!isPaused)} variant="outline" size="sm" className="flex-1">
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default SnakeGame;
