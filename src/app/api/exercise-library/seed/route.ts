import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const DEFAULT_EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", i18n: "Potisak sa šipkom na ravnoj klupi", category: "Chest", muscleGroup: "Pectorals", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=tuwHzzPdaGc" },
  { name: "Incline Barbell Bench Press", i18n: "Potisak sa šipkom na kosoj klupi", category: "Chest", muscleGroup: "Upper Pectorals", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=uIzbJX5EVIY" },
  { name: "Decline Barbell Bench Press", i18n: "Potisak sa šipkom na negativnoj klupi", category: "Chest", muscleGroup: "Lower Pectorals", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=oIgci8aNsG0" },
  { name: "Dumbbell Bench Press", i18n: "Potisak sa bučicama na ravnoj klupi", category: "Chest", muscleGroup: "Pectorals", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=dGqI0Z5ul4k" },
  { name: "Incline Dumbbell Press", i18n: "Potisak sa bučicama na kosoj klupi", category: "Chest", muscleGroup: "Upper Pectorals", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=8nNi8jbbUPE" },
  { name: "Dumbbell Flyes", i18n: "Otvaranje sa bučicama", category: "Chest", muscleGroup: "Pectorals", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=-lcbvOddoi8" },
  { name: "Cable Flyes", i18n: "Otvaranje na sajlama", category: "Chest", muscleGroup: "Pectorals", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=OPYrUGZL8nU" },
  { name: "Push-Ups", i18n: "Sklekovi", category: "Chest", muscleGroup: "Pectorals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=KEFQyLkDYtI" },
  { name: "Chest Dips", i18n: "Propadanja za prsa", category: "Chest", muscleGroup: "Pectorals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=FG1ENBFsdHU" },
  { name: "Machine Chest Press", i18n: "Potisak na spravi za prsa", category: "Chest", muscleGroup: "Pectorals", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=dMQdd40Y3FQ" },

  // Back
  { name: "Deadlift", i18n: "Mrtvo dizanje", category: "Back", muscleGroup: "Erector Spinae", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=wjsu6ceEkAQ" },
  { name: "Barbell Row", i18n: "Veslanje sa šipkom", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=paCfxhgW6bI" },
  { name: "Pull-Ups", i18n: "Zgibovi", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=poyr8KenUfc" },
  { name: "Chin-Ups", i18n: "Zgibovi potkhvatom", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=1EJ3A3rEtlo" },
  { name: "Lat Pulldown", i18n: "Povlačenje na lat spravi", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=iKrKgWR9wbY" },
  { name: "Seated Cable Row", i18n: "Veslanje na sajli sjedeći", category: "Back", muscleGroup: "Rhomboids", equipment: "Cable", videoUrl: null },
  { name: "Dumbbell Row", i18n: "Veslanje sa bučicom", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=YZgVEy6cmaY" },
  { name: "T-Bar Row", i18n: "Veslanje na T-šipci", category: "Back", muscleGroup: "Middle Back", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=kHW23afzaUs" },
  { name: "Face Pulls", i18n: "Povlačenje prema licu", category: "Back", muscleGroup: "Rear Deltoids", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=7ZvpXA_mFpQ" },
  { name: "Rack Pulls", i18n: "Mrtvo dizanje sa stalka", category: "Back", muscleGroup: "Erector Spinae", equipment: "Barbell", videoUrl: null },

  // Legs
  { name: "Barbell Squat", i18n: "Čučanj sa šipkom", category: "Legs", muscleGroup: "Quadriceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=R2dMsNhN3DE" },
  { name: "Front Squat", i18n: "Prednji čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=9xAkoz95IFE" },
  { name: "Goblet Squat", i18n: "Goblet čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=5Y3KW5rWMh4" },
  { name: "Leg Press", i18n: "Potisak nogama", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=sEM_zo9w2ss" },
  { name: "Romanian Deadlift", i18n: "Rumunsko mrtvo dizanje", category: "Legs", muscleGroup: "Hamstrings", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=-m45n1_x32E" },
  { name: "Bulgarian Split Squat", i18n: "Bugarski split čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=uqI3GVwfToU" },
  { name: "Lunges", i18n: "Iskoraci", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: null },
  { name: "Walking Lunges", i18n: "Iskoraci u hodu", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=uRSsOoZG9z8" },
  { name: "Leg Extension", i18n: "Ekstenzija nogu", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=0fl1RRgJ83I" },
  { name: "Leg Curl", i18n: "Pregib nogu", category: "Legs", muscleGroup: "Hamstrings", equipment: "Machine", videoUrl: null },
  { name: "Hip Thrust", i18n: "Potisak kukovima", category: "Legs", muscleGroup: "Glutes", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=lAnqN0J_p5A" },
  { name: "Calf Raises", i18n: "Podizanje na prste", category: "Legs", muscleGroup: "Calves", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=RBslMmWqzzE" },
  { name: "Sumo Deadlift", i18n: "Sumo mrtvo dizanje", category: "Legs", muscleGroup: "Glutes", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=o4gIucBC4ls" },
  { name: "Hack Squat", i18n: "Hack čučanj", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: "https://www.youtube.com/watch?v=63tboDKQksc" },
  { name: "Glute Bridge", i18n: "Most za gluteuse", category: "Legs", muscleGroup: "Glutes", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=mm4wbmtDrUc" },

  // Shoulders
  { name: "Overhead Press", i18n: "Vojnički potisak", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=j7ULT6dznNc" },
  { name: "Dumbbell Shoulder Press", i18n: "Potisak sa bučicama iznad glave", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=FRxZ6wr5bpA" },
  { name: "Arnold Press", i18n: "Arnold potisak", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=hmnZKRpYaV8" },
  { name: "Lateral Raises", i18n: "Lateralna odručenja", category: "Shoulders", muscleGroup: "Lateral Deltoid", equipment: "Dumbbell", videoUrl: null },
  { name: "Front Raises", i18n: "Prednja odručenja", category: "Shoulders", muscleGroup: "Anterior Deltoid", equipment: "Dumbbell", videoUrl: null },
  { name: "Reverse Flyes", i18n: "Obrnuta otvaranja", category: "Shoulders", muscleGroup: "Rear Deltoid", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=Fgz_FdzDukE" },
  { name: "Upright Row", i18n: "Uspravno veslanje", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Barbell", videoUrl: null },
  { name: "Cable Lateral Raises", i18n: "Lateralna odručenja na sajli", category: "Shoulders", muscleGroup: "Lateral Deltoid", equipment: "Cable", videoUrl: null },
  { name: "Shrugs", i18n: "Slijeganje ramenima", category: "Shoulders", muscleGroup: "Trapezius", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=dj2Gm628kas" },

  // Arms
  { name: "Barbell Curl", i18n: "Pregib sa šipkom", category: "Arms", muscleGroup: "Biceps", equipment: "Barbell", videoUrl: null },
  { name: "Dumbbell Curl", i18n: "Pregib sa bučicama", category: "Arms", muscleGroup: "Biceps", equipment: "Dumbbell", videoUrl: null },
  { name: "Hammer Curls", i18n: "Čekić pregib", category: "Arms", muscleGroup: "Brachialis", equipment: "Dumbbell", videoUrl: null },
  { name: "Preacher Curl", i18n: "Pregib na Scott klupi", category: "Arms", muscleGroup: "Biceps", equipment: "Barbell", videoUrl: null },
  { name: "Concentration Curl", i18n: "Koncentracijski pregib", category: "Arms", muscleGroup: "Biceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=LHDwya1KY8M" },
  { name: "Cable Curl", i18n: "Pregib na sajli", category: "Arms", muscleGroup: "Biceps", equipment: "Cable", videoUrl: null },
  { name: "Tricep Pushdown", i18n: "Potisak za triceps na sajli", category: "Arms", muscleGroup: "Triceps", equipment: "Cable", videoUrl: "https://www.youtube.com/watch?v=mpZ9VRisAyw" },
  { name: "Overhead Tricep Extension", i18n: "Ekstenzija tricepsa iznad glave", category: "Arms", muscleGroup: "Triceps", equipment: "Dumbbell", videoUrl: "https://www.youtube.com/watch?v=LlCFtWCQc5s" },
  { name: "Skull Crushers", i18n: "Francuska presa", category: "Arms", muscleGroup: "Triceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=K6MSN4hCDM4" },
  { name: "Close-Grip Bench Press", i18n: "Potisak uskim hvatom", category: "Arms", muscleGroup: "Triceps", equipment: "Barbell", videoUrl: "https://www.youtube.com/watch?v=j-NhORwJDb4" },
  { name: "Diamond Push-Ups", i18n: "Dijamantni sklekovi", category: "Arms", muscleGroup: "Triceps", equipment: "Bodyweight", videoUrl: null },
  { name: "Tricep Dips", i18n: "Propadanja za triceps", category: "Arms", muscleGroup: "Triceps", equipment: "Bodyweight", videoUrl: null },
  { name: "Wrist Curls", i18n: "Pregib ručnog zgloba", category: "Arms", muscleGroup: "Forearms", equipment: "Dumbbell", videoUrl: null },

  // Core
  { name: "Plank", i18n: "Plank", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: null },
  { name: "Side Plank", i18n: "Bočni plank", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight", videoUrl: null },
  { name: "Crunches", i18n: "Trbušnjaci", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=Plh1CyiPE_Y" },
  { name: "Russian Twists", i18n: "Ruske rotacije", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight", videoUrl: null },
  { name: "Hanging Leg Raise", i18n: "Podizanje nogu u visu", category: "Core", muscleGroup: "Lower Abdominals", equipment: "Bodyweight", videoUrl: null },
  { name: "Ab Wheel Rollout", i18n: "Valjanje na ab točku", category: "Core", muscleGroup: "Abdominals", equipment: "Ab Wheel", videoUrl: null },
  { name: "Cable Woodchops", i18n: "Sječenje drva na sajli", category: "Core", muscleGroup: "Obliques", equipment: "Cable", videoUrl: null },
  { name: "Dead Bug", i18n: "Mrtva buba", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=eEhoSeBFoBk" },
  { name: "Mountain Climbers", i18n: "Penjači", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=5ZL0gFRjCTw" },
  { name: "Bicycle Crunches", i18n: "Bicikl trbušnjaci", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight", videoUrl: "https://www.youtube.com/watch?v=vV_sKNCpiVM" },

  // Cardio
  { name: "Treadmill Run", i18n: "Trčanje na traci", category: "Cardio", muscleGroup: "Full Body", equipment: "Treadmill", videoUrl: null },
  { name: "Rowing Machine", i18n: "Veslačka sprava", category: "Cardio", muscleGroup: "Full Body", equipment: "Rower", videoUrl: null },
  { name: "Cycling", i18n: "Biciklizam", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Bike", videoUrl: null },
  { name: "Jump Rope", i18n: "Preskakanje vijače", category: "Cardio", muscleGroup: "Full Body", equipment: "Jump Rope", videoUrl: "https://www.youtube.com/watch?v=XSqj0O6ARMs" },
  { name: "Burpees", i18n: "Burpees", category: "Cardio", muscleGroup: "Full Body", equipment: "Bodyweight", videoUrl: null },
  { name: "Box Jumps", i18n: "Skokovi na kutiju", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Plyo Box", videoUrl: "https://www.youtube.com/watch?v=MX-NHcqEqQk" },
  { name: "Battle Ropes", i18n: "Borbena užad", category: "Cardio", muscleGroup: "Full Body", equipment: "Battle Ropes", videoUrl: "https://www.youtube.com/watch?v=3vQMDpPCxEI" },
  { name: "Stairmaster", i18n: "Stepenice sprava", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Machine", videoUrl: null },
  { name: "Kettlebell Swing", i18n: "Zamah girjom", category: "Cardio", muscleGroup: "Posterior Chain", equipment: "Kettlebell", videoUrl: "https://www.youtube.com/watch?v=wMBWFIn4ddg" },
  { name: "Sled Push", i18n: "Guranje saonica", category: "Cardio", muscleGroup: "Full Body", equipment: "Sled", videoUrl: null },
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  // Check existing exercises
  const existing = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: { id: true, name: true, nameI18n: true },
  });
  const existingMap = new Map(existing.map((e) => [e.name.toLowerCase(), e]));

  // Backfill translations for existing exercises missing them
  const defaultMap = new Map(DEFAULT_EXERCISES.map((e) => [e.name.toLowerCase(), e]));
  let updated = 0;
  for (const ex of existing) {
    if (!ex.nameI18n) {
      const def = defaultMap.get(ex.name.toLowerCase());
      if (def?.i18n) {
        await prisma.exerciseLibrary.update({
          where: { id: ex.id },
          data: { nameI18n: { bs: def.i18n, sr: def.i18n, hr: def.i18n } },
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
        nameI18n: { bs: ex.i18n, sr: ex.i18n, hr: ex.i18n },
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
