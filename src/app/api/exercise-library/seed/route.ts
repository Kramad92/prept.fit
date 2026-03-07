import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const DEFAULT_EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", nameBs: "Potisak sa šipkom na ravnoj klupi", category: "Chest", muscleGroup: "Pectorals", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=tuwHzzPdaGc" },
  { name: "Incline Barbell Bench Press", nameBs: "Potisak sa šipkom na kosoj klupi", category: "Chest", muscleGroup: "Upper Pectorals", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=uIzbJX5EVIY" },
  { name: "Decline Barbell Bench Press", nameBs: "Potisak sa šipkom na negativnoj klupi", category: "Chest", muscleGroup: "Lower Pectorals", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=oIgci8aNsG0" },
  { name: "Dumbbell Bench Press", nameBs: "Potisak sa bučicama na ravnoj klupi", category: "Chest", muscleGroup: "Pectorals", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=dGqI0Z5ul4k" },
  { name: "Incline Dumbbell Press", nameBs: "Potisak sa bučicama na kosoj klupi", category: "Chest", muscleGroup: "Upper Pectorals", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=8nNi8jbbUPE" },
  { name: "Dumbbell Flyes", nameBs: "Otvaranje sa bučicama", category: "Chest", muscleGroup: "Pectorals", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=-lcbvOddoi8" },
  { name: "Cable Flyes", nameBs: "Otvaranje na sajlama", category: "Chest", muscleGroup: "Pectorals", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=OPYrUGZL8nU" },
  { name: "Push-Ups", nameBs: "Sklekovi", category: "Chest", muscleGroup: "Pectorals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=KEFQyLkDYtI" },
  { name: "Chest Dips", nameBs: "Propadanja za prsa", category: "Chest", muscleGroup: "Pectorals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=FG1ENBFsdHU" },
  { name: "Machine Chest Press", nameBs: "Potisak na spravi za prsa", category: "Chest", muscleGroup: "Pectorals", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=dMQdd40Y3FQ" },

  // Back
  { name: "Deadlift", nameBs: "Mrtvo dizanje", category: "Back", muscleGroup: "Erector Spinae", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=wjsu6ceEkAQ" },
  { name: "Barbell Row", nameBs: "Veslanje sa šipkom", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=paCfxhgW6bI" },
  { name: "Pull-Ups", nameBs: "Zgibovi", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=poyr8KenUfc" },
  { name: "Chin-Ups", nameBs: "Zgibovi potkhvatom", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=1EJ3A3rEtlo" },
  { name: "Lat Pulldown", nameBs: "Povlačenje na lat spravi", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=iKrKgWR9wbY" },
  { name: "Seated Cable Row", nameBs: "Veslanje na sajli sjedeći", category: "Back", muscleGroup: "Rhomboids", equipment: "Cable", videoUrl: null },
  { name: "Dumbbell Row", nameBs: "Veslanje sa bučicom", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=YZgVEy6cmaY" },
  { name: "T-Bar Row", nameBs: "Veslanje na T-šipci", category: "Back", muscleGroup: "Middle Back", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=kHW23afzaUs" },
  { name: "Face Pulls", nameBs: "Povlačenje prema licu", category: "Back", muscleGroup: "Rear Deltoids", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=7ZvpXA_mFpQ" },
  { name: "Rack Pulls", nameBs: "Mrtvo dizanje sa stalka", category: "Back", muscleGroup: "Erector Spinae", equipment: "Barbell", videoUrl: null },

  // Legs
  { name: "Barbell Squat", nameBs: "Čučanj sa šipkom", category: "Legs", muscleGroup: "Quadriceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=R2dMsNhN3DE" },
  { name: "Front Squat", nameBs: "Prednji čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=9xAkoz95IFE" },
  { name: "Goblet Squat", nameBs: "Goblet čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=5Y3KW5rWMh4" },
  { name: "Leg Press", nameBs: "Potisak nogama", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=sEM_zo9w2ss" },
  { name: "Romanian Deadlift", nameBs: "Rumunsko mrtvo dizanje", category: "Legs", muscleGroup: "Hamstrings", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=-m45n1_x32E" },
  { name: "Bulgarian Split Squat", nameBs: "Bugarski split čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=uqI3GVwfToU" },
  { name: "Lunges", nameBs: "Iskoraci", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: null },
  { name: "Walking Lunges", nameBs: "Iskoraci u hodu", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=uRSsOoZG9z8" },
  { name: "Leg Extension", nameBs: "Ekstenzija nogu", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=0fl1RRgJ83I" },
  { name: "Leg Curl", nameBs: "Pregib nogu", category: "Legs", muscleGroup: "Hamstrings", equipment: "Machine", videoUrl: null },
  { name: "Hip Thrust", nameBs: "Potisak kukovima", category: "Legs", muscleGroup: "Glutes", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=lAnqN0J_p5A" },
  { name: "Calf Raises", nameBs: "Podizanje na prste", category: "Legs", muscleGroup: "Calves", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=RBslMmWqzzE" },
  { name: "Sumo Deadlift", nameBs: "Sumo mrtvo dizanje", category: "Legs", muscleGroup: "Glutes", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=o4gIucBC4ls" },
  { name: "Hack Squat", nameBs: "Hack čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=63tboDKQksc" },
  { name: "Glute Bridge", nameBs: "Most za gluteuse", category: "Legs", muscleGroup: "Glutes", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=mm4wbmtDrUc" },

  // Shoulders
  { name: "Overhead Press", nameBs: "Vojnički potisak", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=j7ULT6dznNc" },
  { name: "Dumbbell Shoulder Press", nameBs: "Potisak sa bučicama iznad glave", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=FRxZ6wr5bpA" },
  { name: "Arnold Press", nameBs: "Arnold potisak", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=hmnZKRpYaV8" },
  { name: "Lateral Raises", nameBs: "Lateralna odručenja", category: "Shoulders", muscleGroup: "Lateral Deltoid", equipment: "Dumbbell", videoUrl: null },
  { name: "Front Raises", nameBs: "Prednja odručenja", category: "Shoulders", muscleGroup: "Anterior Deltoid", equipment: "Dumbbell", videoUrl: null },
  { name: "Reverse Flyes", nameBs: "Obrnuta otvaranja", category: "Shoulders", muscleGroup: "Rear Deltoid", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=Fgz_FdzDukE" },
  { name: "Upright Row", nameBs: "Uspravno veslanje", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Barbell", videoUrl: null },
  { name: "Cable Lateral Raises", nameBs: "Lateralna odručenja na sajli", category: "Shoulders", muscleGroup: "Lateral Deltoid", equipment: "Cable", videoUrl: null },
  { name: "Shrugs", nameBs: "Slijeganje ramenima", category: "Shoulders", muscleGroup: "Trapezius", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=dj2Gm628kas" },

  // Arms
  { name: "Barbell Curl", nameBs: "Pregib sa šipkom", category: "Arms", muscleGroup: "Biceps", equipment: "Barbell", videoUrl: null },
  { name: "Dumbbell Curl", nameBs: "Pregib sa bučicama", category: "Arms", muscleGroup: "Biceps", equipment: "Dumbbell", videoUrl: null },
  { name: "Hammer Curls", nameBs: "Čekić pregib", category: "Arms", muscleGroup: "Brachialis", equipment: "Dumbbell", videoUrl: null },
  { name: "Preacher Curl", nameBs: "Pregib na Scott klupi", category: "Arms", muscleGroup: "Biceps", equipment: "Barbell", videoUrl: null },
  { name: "Concentration Curl", nameBs: "Koncentracijski pregib", category: "Arms", muscleGroup: "Biceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=LHDwya1KY8M" },
  { name: "Cable Curl", nameBs: "Pregib na sajli", category: "Arms", muscleGroup: "Biceps", equipment: "Cable", videoUrl: null },
  { name: "Tricep Pushdown", nameBs: "Potisak za triceps na sajli", category: "Arms", muscleGroup: "Triceps", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=mpZ9VRisAyw" },
  { name: "Overhead Tricep Extension", nameBs: "Ekstenzija tricepsa iznad glave", category: "Arms", muscleGroup: "Triceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=LlCFtWCQc5s" },
  { name: "Skull Crushers", nameBs: "Francuska presa", category: "Arms", muscleGroup: "Triceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=K6MSN4hCDM4" },
  { name: "Close-Grip Bench Press", nameBs: "Potisak uskim hvatom", category: "Arms", muscleGroup: "Triceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=j-NhORwJDb4" },
  { name: "Diamond Push-Ups", nameBs: "Dijamantni sklekovi", category: "Arms", muscleGroup: "Triceps", equipment: "Bodyweight", videoUrl: null },
  { name: "Tricep Dips", nameBs: "Propadanja za triceps", category: "Arms", muscleGroup: "Triceps", equipment: "Bodyweight", videoUrl: null },
  { name: "Wrist Curls", nameBs: "Pregib ručnog zgloba", category: "Arms", muscleGroup: "Forearms", equipment: "Dumbbell", videoUrl: null },

  // Core
  { name: "Plank", nameBs: "Plank", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: null },
  { name: "Side Plank", nameBs: "Bočni plank", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight", videoUrl: null },
  { name: "Crunches", nameBs: "Trbušnjaci", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=Plh1CyiPE_Y" },
  { name: "Russian Twists", nameBs: "Ruske rotacije", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight", videoUrl: null },
  { name: "Hanging Leg Raise", nameBs: "Podizanje nogu u visu", category: "Core", muscleGroup: "Lower Abdominals", equipment: "Bodyweight", videoUrl: null },
  { name: "Ab Wheel Rollout", nameBs: "Valjanje na ab točku", category: "Core", muscleGroup: "Abdominals", equipment: "Ab Wheel", videoUrl: null },
  { name: "Cable Woodchops", nameBs: "Sječenje drva na sajli", category: "Core", muscleGroup: "Obliques", equipment: "Cable", videoUrl: null },
  { name: "Dead Bug", nameBs: "Mrtva buba", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=eEhoSeBFoBk" },
  { name: "Mountain Climbers", nameBs: "Penjači", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=5ZL0gFRjCTw" },
  { name: "Bicycle Crunches", nameBs: "Bicikl trbušnjaci", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=vV_sKNCpiVM" },

  // Cardio
  { name: "Treadmill Run", nameBs: "Trčanje na traci", category: "Cardio", muscleGroup: "Full Body", equipment: "Treadmill", videoUrl: null },
  { name: "Rowing Machine", nameBs: "Veslačka sprava", category: "Cardio", muscleGroup: "Full Body", equipment: "Rower", videoUrl: null },
  { name: "Cycling", nameBs: "Biciklizam", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Bike", videoUrl: null },
  { name: "Jump Rope", nameBs: "Preskakanje vijače", category: "Cardio", muscleGroup: "Full Body", equipment: "Jump Rope", videoUrl: "https://www.youtube.com/watch?v=XSqj0O6ARMs" },
  { name: "Burpees", nameBs: "Burpees", category: "Cardio", muscleGroup: "Full Body", equipment: "Bodyweight", videoUrl: null },
  { name: "Box Jumps", nameBs: "Skokovi na kutiju", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Plyo Box", videoUrl: "https://www.youtube.com/watch?v=MX-NHcqEqQk" },
  { name: "Battle Ropes", nameBs: "Borbena užad", category: "Cardio", muscleGroup: "Full Body", equipment: "Battle Ropes", videoUrl: "https://www.youtube.com/watch?v=3vQMDpPCxEI" },
  { name: "Stairmaster", nameBs: "Stepenice sprava", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: null },
  { name: "Kettlebell Swing", nameBs: "Zamah girjom", category: "Cardio", muscleGroup: "Posterior Chain", equipment: "Kettlebell", videoUrl: "https://www.youtube.com/watch?v=wMBWFIn4ddg" },
  { name: "Sled Push", nameBs: "Guranje saonica", category: "Cardio", muscleGroup: "Full Body", equipment: "Sled", videoUrl: null },
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  // Check existing exercises
  const existing = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: { id: true, name: true, nameBs: true },
  });
  const existingMap = new Map(existing.map((e) => [e.name.toLowerCase(), e]));

  // Backfill Bosnian translations for existing exercises missing them
  const defaultMap = new Map(DEFAULT_EXERCISES.map((e) => [e.name.toLowerCase(), e]));
  let updated = 0;
  for (const ex of existing) {
    if (!ex.nameBs) {
      const def = defaultMap.get(ex.name.toLowerCase());
      if (def?.nameBs) {
        await prisma.exerciseLibrary.update({
          where: { id: ex.id },
          data: { nameBs: def.nameBs },
        });
        updated++;
      }
    }
  }

  const toCreate = DEFAULT_EXERCISES.filter(
    (ex) => !existingMap.has(ex.name.toLowerCase())
  );

  if (toCreate.length === 0 && updated === 0) {
    return NextResponse.json({ message: "Library already seeded", added: 0, updated: 0 });
  }

  if (toCreate.length > 0) {
    await prisma.exerciseLibrary.createMany({
      data: toCreate.map((ex) => ({
        name: ex.name,
        nameBs: ex.nameBs,
        category: ex.category,
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment,
        videoUrl: ex.videoUrl,
        tenantId,
      })),
    });
  }

  // Auto-create missing categories & equipment types from seeded exercises
  const allExercises = toCreate.length > 0 ? DEFAULT_EXERCISES : [];
  const newCategories = Array.from(new Set(allExercises.map((e) => e.category)));
  const newEquipment = Array.from(new Set(allExercises.map((e) => e.equipment)));

  if (newCategories.length > 0) {
    const existingCats = await prisma.exerciseCategory.findMany({
      where: { tenantId },
      select: { name: true },
    });
    const existingCatNames = new Set(existingCats.map((c) => c.name));
    const catsToCreate = newCategories.filter((c) => !existingCatNames.has(c));
    if (catsToCreate.length > 0) {
      await prisma.exerciseCategory.createMany({
        data: catsToCreate.map((name) => ({ name, tenantId })),
      });
    }
  }

  if (newEquipment.length > 0) {
    const existingEq = await prisma.equipmentType.findMany({
      where: { tenantId },
      select: { name: true },
    });
    const existingEqNames = new Set(existingEq.map((e) => e.name));
    const eqToCreate = newEquipment.filter((e) => !existingEqNames.has(e));
    if (eqToCreate.length > 0) {
      await prisma.equipmentType.createMany({
        data: eqToCreate.map((name) => ({ name, tenantId })),
      });
    }
  }

  return NextResponse.json({ message: "Library seeded", added: toCreate.length, updated });
}
