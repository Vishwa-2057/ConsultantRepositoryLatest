import React, { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Environment } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, Dumbbell, Loader2 } from 'lucide-react';
import * as THREE from 'three';

// Exercise data with GLB file paths
const exercises = [
  {
    id: 1,
    name: 'Neck Stretching',
    model: '/src/assets/glb/NeckStretching.glb',
    duration: '2-3 minutes',
    difficulty: 'Easy',
    description: 'Gentle neck stretches to relieve tension and improve flexibility.',
    benefits: ['Reduces neck pain', 'Improves range of motion', 'Relieves tension']
  },
  {
    id: 2,
    name: 'Arm Stretching',
    model: '/src/assets/glb/ArmStretching.glb',
    duration: '3-5 minutes',
    difficulty: 'Easy',
    description: 'Upper body stretches focusing on arms and shoulders.',
    benefits: ['Improves flexibility', 'Reduces muscle tension', 'Enhances mobility']
  },
  {
    id: 3,
    name: 'Sit-ups',
    model: '/src/assets/glb/Situps.glb',
    duration: '5-10 minutes',
    difficulty: 'Medium',
    description: 'Core strengthening exercise for abdominal muscles.',
    benefits: ['Strengthens core', 'Improves posture', 'Builds endurance']
  }
];

// Placeholder component for missing models
function ModelPlaceholder() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 2, 0.5]} />
        <meshStandardMaterial color="#6366f1" />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#818cf8" />
      </mesh>
    </group>
  );
}

// 3D Model Component with error handling
function Model({ modelPath, isPlaying, onError }) {
  const group = useRef();
  const mixer = useRef();
  
  // useGLTF will throw if the model doesn't exist
  // The Suspense boundary will catch it
  const { scene, animations } = useGLTF(modelPath, true, true, (loader) => {
    loader.manager.onError = (url) => {
      console.warn('Failed to load 3D model:', url);
      if (onError) onError();
    };
  });
  
  useEffect(() => {
    if (animations && animations.length > 0 && scene) {
      mixer.current = new THREE.AnimationMixer(scene);
      const action = mixer.current.clipAction(animations[0]);
      
      if (isPlaying) {
        action.play();
      } else {
        action.stop();
      }
      
      return () => {
        mixer.current?.stopAllAction();
      };
    }
  }, [animations, scene, isPlaying]);
  
  useFrame((state, delta) => {
    if (mixer.current && isPlaying) {
      mixer.current.update(delta);
    }
  });
  
  return (
    <primitive 
      ref={group}
      object={scene} 
      scale={1.5} 
      position={[0, -1, 0]}
    />
  );
}

// Loading component for 3D viewer
function Loader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" wireframe />
    </mesh>
  );
}

// Error Boundary Component for 3D models
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('3D Model loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ModelPlaceholder />;
    }
    return this.props.children;
  }
}

// 3D Viewer Component
function ExerciseViewer({ selectedExercise, isPlaying }) {
  const [modelError, setModelError] = useState(false);
  
  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden border border-border relative">
      <Canvas shadows camera={{ position: [0, 1, 5], fov: 50 }} onError={() => setModelError(true)}>
        <PerspectiveCamera makeDefault position={[0, 1, 5]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <spotLight position={[0, 5, 0]} angle={0.3} penumbra={1} intensity={0.5} />
        
        {/* Model with error boundary */}
        <Suspense fallback={<Loader />}>
          <ModelErrorBoundary>
            {selectedExercise && !modelError && (
              <Model 
                modelPath={selectedExercise.model} 
                isPlaying={isPlaying}
                onError={() => setModelError(true)}
              />
            )}
            {modelError && <ModelPlaceholder />}
          </ModelErrorBoundary>
        </Suspense>
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          minDistance={2}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2}
        />
        
        {/* Ground */}
        <gridHelper args={[10, 10, 0x888888, 0x444444]} position={[0, -1, 0]} />
        
        {/* Environment for better lighting */}
        <Environment preset="studio" />
      </Canvas>
      
      {/* Loading overlay */}
      {!selectedExercise && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Select an exercise to view</p>
          </div>
        </div>
      )}
    </div>
  );
}

const Exercises = () => {
  const [selectedExercise, setSelectedExercise] = useState(exercises[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleExerciseClick = (exercise) => {
    setSelectedExercise(exercise);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Easy': 'bg-green-500',
      'Medium': 'bg-yellow-500',
      'Hard': 'bg-red-500'
    };
    return colors[difficulty] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-foreground">Exercise Library</h1>
        </div>
        <p className="text-muted-foreground">
          Interactive 3D exercise demonstrations to guide your workout routine
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exercise List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Exercises</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleExerciseClick(exercise)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedExercise?.id === exercise.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-base">{exercise.name}</h3>
                    <Badge className={`${getDifficultyColor(exercise.difficulty)} text-white text-xs`}>
                      {exercise.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {exercise.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Duration: {exercise.duration}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 3D Viewer and Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* 3D Viewer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedExercise?.name || 'Select an Exercise'}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ExerciseViewer selectedExercise={selectedExercise} isPlaying={isPlaying} />
            </CardContent>
          </Card>

          {/* Exercise Details */}
          {selectedExercise && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Exercise Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedExercise.description}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Benefits</h4>
                  <ul className="space-y-1">
                    {selectedExercise.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Duration</h4>
                    <p className="text-muted-foreground">{selectedExercise.duration}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Difficulty</h4>
                    <Badge className={`${getDifficultyColor(selectedExercise.difficulty)} text-white`}>
                      {selectedExercise.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Exercises;
