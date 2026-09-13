/**
 * LESOFEN AJANDA - Predefined Exercise Library
 * Inspired by Kinetika biomechanics & standard gym movement patterns.
 */

export const DEFAULT_EXERCISES = [
  // Göğüs & İtiş (Push / Chest)
  { name: "Bench Press (Barbell)", category: "Göğüs & İtiş", splits: ["PUSH", "UPPER", "FULL BODY", "ANTERIOR"] },
  { name: "Incline Dumbbell Press", category: "Göğüs & İtiş", splits: ["PUSH", "UPPER", "FULL BODY", "ANTERIOR"] },
  { name: "Dips", category: "Göğüs & İtiş", splits: ["PUSH", "UPPER", "FULL BODY", "ANTERIOR"] },
  { name: "Cable Fly / Crossover", category: "Göğüs & İtiş", splits: ["PUSH", "UPPER", "ANTERIOR"] },
  { name: "Dumbbell Bench Press", category: "Göğüs & İtiş", splits: ["PUSH", "UPPER", "ANTERIOR"] },
  { name: "Push-Up (Şınav)", category: "Göğüs & İtiş", splits: ["PUSH", "UPPER", "FULL BODY", "ANTERIOR"] },

  // Omuz (Shoulders / Overhead)
  { name: "Overhead Press (OHP)", category: "Omuz & İtiş", splits: ["PUSH", "UPPER", "FULL BODY", "ANTERIOR"] },
  { name: "Dumbbell Lateral Raise", category: "Omuz & İzolasyon", splits: ["PUSH", "UPPER", "FULL BODY", "ANTERIOR"] },
  { name: "Cable Lateral Raise", category: "Omuz & İzolasyon", splits: ["PUSH", "UPPER", "ANTERIOR"] },
  { name: "Face Pull", category: "Omuz & Çekiş", splits: ["PULL", "UPPER", "POSTERIOR"] },
  { name: "Rear Delt Fly", category: "Omuz & Çekiş", splits: ["PULL", "UPPER", "POSTERIOR"] },

  // Sırt & Çekiş (Pull / Back)
  { name: "Lat Pulldown", category: "Sırt & Çekiş", splits: ["PULL", "UPPER", "FULL BODY", "POSTERIOR"] },
  { name: "Barbell Bent-Over Row", category: "Sırt & Çekiş", splits: ["PULL", "UPPER", "FULL BODY", "POSTERIOR"] },
  { name: "Pull-Up (Barfiks)", category: "Sırt & Çekiş", splits: ["PULL", "UPPER", "FULL BODY", "POSTERIOR"] },
  { name: "Seated Cable Row", category: "Sırt & Çekiş", splits: ["PULL", "UPPER", "POSTERIOR"] },
  { name: "T-Bar Row", category: "Sırt & Çekiş", splits: ["PULL", "UPPER", "POSTERIOR"] },
  { name: "Dumbbell Row", category: "Sırt & Çekiş", splits: ["PULL", "UPPER", "POSTERIOR"] },

  // Bacak (Legs / Quads / Hamstrings / Glutes)
  { name: "Barbell Back Squat", category: "Bacak & Kuadriseps", splits: ["LEGS", "LOWER", "FULL BODY", "ANTERIOR"] },
  { name: "Romanian Deadlift (RDL)", category: "Bacak & Hamstring", splits: ["LEGS", "LOWER", "FULL BODY", "POSTERIOR"] },
  { name: "Leg Press", category: "Bacak & Kuadriseps", splits: ["LEGS", "LOWER", "ANTERIOR"] },
  { name: "Bulgarian Split Squat", category: "Bacak & Kalça", splits: ["LEGS", "LOWER", "ANTERIOR", "POSTERIOR"] },
  { name: "Leg Curl (Hamstring)", category: "Bacak & Hamstring", splits: ["LEGS", "LOWER", "POSTERIOR"] },
  { name: "Leg Extension (Kuadriseps)", category: "Bacak & Kuadriseps", splits: ["LEGS", "LOWER", "ANTERIOR"] },
  { name: "Barbell Hip Thrust", category: "Bacak & Kalça", splits: ["LEGS", "LOWER", "POSTERIOR"] },
  { name: "Standing Calf Raise", category: "Kalf", splits: ["LEGS", "LOWER", "POSTERIOR"] },
  { name: "Walking Lunge", category: "Bacak", splits: ["LEGS", "LOWER", "ANTERIOR"] },

  // Kol (Arms - Biceps & Triceps)
  { name: "Triceps Pushdown", category: "Kol & Triceps", splits: ["PUSH", "UPPER", "ANTERIOR"] },
  { name: "Barbell Biceps Curl", category: "Kol & Biceps", splits: ["PULL", "UPPER", "ANTERIOR"] },
  { name: "Dumbbell Hammer Curl", category: "Kol & Biceps", splits: ["PULL", "UPPER", "ANTERIOR"] },
  { name: "Skull Crusher", category: "Kol & Triceps", splits: ["PUSH", "UPPER", "POSTERIOR"] },
  { name: "Incline Dumbbell Curl", category: "Kol & Biceps", splits: ["PULL", "UPPER", "ANTERIOR"] },

  // Güç & Core
  { name: "Conventional Deadlift", category: "Posterior Zincir", splits: ["PULL", "LEGS", "LOWER", "FULL BODY", "POSTERIOR"] },
  { name: "Plank", category: "Karın & Core", splits: ["FULL BODY", "ANTERIOR"] },
  { name: "Hanging Leg Raise", category: "Karın & Core", splits: ["FULL BODY", "ANTERIOR"] },
  { name: "Cable Crunch", category: "Karın & Core", splits: ["ANTERIOR"] }
];
