import { Dumbbell } from 'lucide-react';

const ExercisesSimple = () => {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Dumbbell className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Exercise Library</h1>
        </div>
        <p className="text-muted-foreground">
          Interactive 3D exercise demonstrations to guide your workout routine
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <p className="text-lg">Exercises page is loading correctly!</p>
        <p className="mt-4 text-muted-foreground">3D viewer will be added here.</p>
      </div>
    </div>
  );
};

export default ExercisesSimple;
