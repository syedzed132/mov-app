// activities.js — Comprehensive catalogue of sports, active games, and recovery activities for MOV
// Includes science-backed MET (Metabolic Equivalent of Task) values for accurate calorie calculations,
// default durations, and RPG attribute bindings (Agility, Endurance, Vitality, Strength, Discipline).

export const ACTIVITY_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'racquet', name: 'Racquet', icon: 'tennis' },
  { id: 'ball', name: 'Team & Ball', icon: 'trophy' },
  { id: 'water', name: 'Water', icon: 'swim' },
  { id: 'endurance', name: 'Cardio', icon: 'figureRun' },
  { id: 'combat', name: 'Combat', icon: 'boxing' },
  { id: 'recovery', name: 'Recovery', icon: 'flame' },
  { id: 'mind_body', name: 'Mind & Body', icon: 'stretch' },
  { id: 'outdoor', name: 'Outdoor', icon: 'rocket' }
]

export const ACTIVITIES = [
  // --- RACQUET SPORTS (High Agility & Footwork) ---
  {
    id: 'padel',
    name: 'Padel',
    category: 'racquet',
    met: 7.5,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'tennis',
    emoji: '🎾',
    defaultDur: 60,
    color: '#FF6A13',
    desc: 'High-speed wall rebounds, reflex volleys, and explosive court sprints'
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    category: 'racquet',
    met: 6.5,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'tennis',
    emoji: '🏓',
    defaultDur: 45,
    color: '#FFB347',
    desc: 'Quick kitchen dinks, rapid hand speed, lateral shuffles, and rallies'
  },
  {
    id: 'tennis',
    name: 'Tennis',
    category: 'racquet',
    met: 7.3,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'tennis',
    emoji: '🎾',
    defaultDur: 60,
    color: '#4ECDC4',
    desc: 'Baseline groundstrokes, explosive serve acceleration, and court coverage'
  },
  {
    id: 'squash',
    name: 'Squash',
    category: 'racquet',
    met: 10.0,
    stat: 'endurance',
    secondaryStat: 'agility',
    icon: 'tennis',
    emoji: '🏸',
    defaultDur: 45,
    color: '#FF4136',
    desc: 'Maximum lung capacity, relentless lunges, and rapid directional change'
  },
  {
    id: 'badminton',
    name: 'Badminton',
    category: 'racquet',
    met: 6.0,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'tennis',
    emoji: '🏸',
    defaultDur: 45,
    color: '#39CCCC',
    desc: 'Vertical jump smashes, split-second deception, and court perimeter recovery'
  },
  {
    id: 'table_tennis',
    name: 'Table Tennis / Ping Pong',
    category: 'racquet',
    met: 4.0,
    stat: 'agility',
    secondaryStat: 'discipline',
    icon: 'tennis',
    emoji: '🏓',
    defaultDur: 30,
    color: '#FF851B',
    desc: 'Micro-second eye-hand coordination, topspin loops, and reactive footwork'
  },

  // --- BALL & TEAM SPORTS (Agility & Team Synergy) ---
  {
    id: 'cricket',
    name: 'Cricket',
    category: 'ball',
    met: 5.5,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'cricket',
    emoji: '🏏',
    defaultDur: 90,
    color: '#2ECC40',
    desc: 'Explosive crease sprints, bowling action torque, and sharp fielding reflexes'
  },
  {
    id: 'soccer',
    name: 'Soccer / Football',
    category: 'ball',
    met: 9.0,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'trophy',
    emoji: '⚽',
    defaultDur: 60,
    color: '#2ECC40',
    desc: 'Aerobic distance accumulation, acceleration bursts, and multi-directional cutting'
  },
  {
    id: 'basketball',
    name: 'Basketball',
    category: 'ball',
    met: 8.0,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'trophy',
    emoji: '🏀',
    defaultDur: 60,
    color: '#FF851B',
    desc: 'Vertical leap power, defensive side-sliding, fast-break sprints, and perimeter play'
  },
  {
    id: 'volleyball',
    name: 'Volleyball (Indoor / Court)',
    category: 'ball',
    met: 4.5,
    stat: 'agility',
    secondaryStat: 'strength',
    icon: 'trophy',
    emoji: '🏐',
    defaultDur: 60,
    color: '#FFDC00',
    desc: 'Repeated jump block mechanics, dive saves, and explosive approach spikes'
  },
  {
    id: 'beach_volleyball',
    name: 'Beach Volleyball (Sand)',
    category: 'ball',
    met: 8.0,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'trophy',
    emoji: '🏖️',
    defaultDur: 60,
    color: '#F012BE',
    desc: 'Deep sand ground friction resistance, extreme calf loading, and intense jumping'
  },
  {
    id: 'rugby_american_football',
    name: 'Rugby / American Football',
    category: 'ball',
    met: 9.5,
    stat: 'strength',
    secondaryStat: 'agility',
    icon: 'trophy',
    emoji: '🏉',
    defaultDur: 60,
    color: '#85144b',
    desc: 'Collision resilience, maximum power drives, and breakaway sprint capability'
  },
  {
    id: 'baseball_softball',
    name: 'Baseball / Softball',
    category: 'ball',
    met: 5.0,
    stat: 'agility',
    secondaryStat: 'strength',
    icon: 'cricket',
    emoji: '⚾',
    defaultDur: 75,
    color: '#FF4136',
    desc: 'Rotational batting velocity, base-stealing acceleration, and throwing power'
  },
  {
    id: 'hockey',
    name: 'Ice / Field Hockey',
    category: 'ball',
    met: 8.5,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'trophy',
    emoji: '🏒',
    defaultDur: 60,
    color: '#5EA8FF',
    desc: 'High-tempo shift sprints, low-stance hip drive, and stickhandling agility'
  },
  {
    id: 'handball',
    name: 'Handball',
    category: 'ball',
    met: 8.5,
    stat: 'agility',
    secondaryStat: 'strength',
    icon: 'trophy',
    emoji: '🤾',
    defaultDur: 50,
    color: '#B10DC9',
    desc: 'High-speed line cutting, single-leg jump shooting, and physical contact defense'
  },

  // --- WATER SPORTS (Endurance & Full Body) ---
  {
    id: 'swimming_laps',
    name: 'Swimming (Freestyle Laps)',
    category: 'water',
    met: 8.0,
    stat: 'endurance',
    secondaryStat: 'strength',
    icon: 'swim',
    emoji: '🏊',
    defaultDur: 45,
    color: '#5EA8FF',
    desc: 'Non-impact aerobic propulsion, lat engagement, and rhythmic lung efficiency'
  },
  {
    id: 'swimming_breaststroke',
    name: 'Swimming (Breaststroke / Backstroke)',
    category: 'water',
    met: 6.5,
    stat: 'endurance',
    secondaryStat: 'agility',
    icon: 'swim',
    emoji: '🏊‍♂️',
    defaultDur: 40,
    color: '#0074D9',
    desc: 'Frog kick hip mobility, sustained upper back extension, and steady stroke tempo'
  },
  {
    id: 'water_polo',
    name: 'Water Polo',
    category: 'water',
    met: 10.0,
    stat: 'strength',
    secondaryStat: 'endurance',
    icon: 'swim',
    emoji: '🤽',
    defaultDur: 45,
    color: '#7FDBFF',
    desc: 'Eggbeater treading power, overhead passing torso torque, and physical duels'
  },
  {
    id: 'surfing',
    name: 'Surfing',
    category: 'water',
    met: 5.5,
    stat: 'agility',
    secondaryStat: 'strength',
    icon: 'swim',
    emoji: '🏄',
    defaultDur: 60,
    color: '#39CCCC',
    desc: 'Pop-up speed, wave face balance dynamics, and explosive paddle endurance'
  },
  {
    id: 'rowing_kayaking',
    name: 'Rowing / Kayaking (Water)',
    category: 'water',
    met: 7.0,
    stat: 'endurance',
    secondaryStat: 'strength',
    icon: 'swim',
    emoji: '🚣',
    defaultDur: 50,
    color: '#01FF70',
    desc: 'Posterior chain drive, rotary core power, and steady stroke cadence'
  },
  {
    id: 'sup_paddleboarding',
    name: 'Paddleboarding (SUP)',
    category: 'water',
    met: 4.5,
    stat: 'vitality',
    secondaryStat: 'agility',
    icon: 'drop',
    emoji: '🏄‍♂️',
    defaultDur: 60,
    color: '#2ECC40',
    desc: 'Isometric ankle stabilizer recruitment, balance proprioception, and steady core burn'
  },

  // --- RECOVERY & THERMAL (Vitality & Restoration) ---
  {
    id: 'sauna_traditional',
    name: 'Sauna (Traditional Finnish 80-95°C)',
    category: 'recovery',
    met: 2.0,
    stat: 'vitality',
    secondaryStat: 'discipline',
    icon: 'flame',
    emoji: '🧖',
    defaultDur: 20,
    color: '#FF6A13',
    desc: 'Heat shock protein synthesis, elevated cardiac stroke volume, and cellular repair'
  },
  {
    id: 'sauna_infrared',
    name: 'Infrared Sauna (50-65°C)',
    category: 'recovery',
    met: 1.8,
    stat: 'vitality',
    secondaryStat: 'discipline',
    icon: 'flame',
    emoji: '🧖‍♂️',
    defaultDur: 30,
    color: '#FF4136',
    desc: 'Deep radiant tissue penetration, nitric oxide release, and systemic recovery'
  },
  {
    id: 'cold_plunge',
    name: 'Cold Plunge / Ice Bath (3-10°C)',
    category: 'recovery',
    met: 2.5,
    stat: 'vitality',
    secondaryStat: 'discipline',
    icon: 'drop',
    emoji: '🧊',
    defaultDur: 5,
    color: '#5EA8FF',
    desc: 'Norepinephrine flood, powerful anti-inflammatory response, and mental fortitude'
  },
  {
    id: 'steam_room',
    name: 'Steam Room / Turkish Bath',
    category: 'recovery',
    met: 1.7,
    stat: 'vitality',
    secondaryStat: 'discipline',
    icon: 'flame',
    emoji: '💨',
    defaultDur: 15,
    color: '#AAAAAA',
    desc: 'Respiratory airway clearance, skin hydration, and parasympathetic relaxation'
  },
  {
    id: 'hot_tub_jacuzzi',
    name: 'Hot Tub / Hydrotherapy',
    category: 'recovery',
    met: 1.5,
    stat: 'vitality',
    secondaryStat: 'discipline',
    icon: 'drop',
    emoji: '🛁',
    defaultDur: 20,
    color: '#39CCCC',
    desc: 'Hydrostatic muscle unwinding, tendon decompression, and vascular soothing'
  },

  // --- CARDIO & ENDURANCE ---
  {
    id: 'running_outdoor',
    name: 'Outdoor Running',
    category: 'endurance',
    met: 9.8,
    stat: 'endurance',
    secondaryStat: 'agility',
    icon: 'figureRun',
    emoji: '🏃',
    defaultDur: 30,
    color: '#FF6A13',
    desc: 'Ground strike shock absorption, aerobic threshold pacing, and VO2 max stimulus'
  },
  {
    id: 'cycling_road',
    name: 'Outdoor Cycling / Road Bike',
    category: 'endurance',
    met: 8.0,
    stat: 'endurance',
    secondaryStat: 'strength',
    icon: 'bike',
    emoji: '🚴',
    defaultDur: 60,
    color: '#01FF70',
    desc: 'Continuous quad cadence, hill-climb torque, and sustained aerobic output'
  },
  {
    id: 'crossfit_hyrox',
    name: 'CrossFit / HYROX / Metcon',
    category: 'endurance',
    met: 10.5,
    stat: 'endurance',
    secondaryStat: 'strength',
    icon: 'kettlebell',
    emoji: '🏋️',
    defaultDur: 45,
    color: '#FF6A13',
    desc: 'High-output functional intervals, sled pushes, wall balls, and engine conditioning'
  },
  {
    id: 'jump_rope',
    name: 'Jump Rope / Skipping',
    category: 'endurance',
    met: 11.0,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'figureRun',
    emoji: '🪢',
    defaultDur: 20,
    color: '#FFDC00',
    desc: 'Extreme Achilles tendon elasticity, wrist rhythm, and explosive calf endurance'
  },
  {
    id: 'hiking',
    name: 'Hiking / Mountain Trekking',
    category: 'endurance',
    met: 6.0,
    stat: 'endurance',
    secondaryStat: 'vitality',
    icon: 'figureWalk',
    emoji: '🥾',
    defaultDur: 90,
    color: '#2ECC40',
    desc: 'Gradual elevation resistance, stabilizer adaptation, and nature stress reduction'
  },
  {
    id: 'stair_climbing',
    name: 'Stairmaster / Stair Climbing',
    category: 'endurance',
    met: 9.0,
    stat: 'endurance',
    secondaryStat: 'strength',
    icon: 'steps',
    emoji: '🪜',
    defaultDur: 25,
    color: '#FF851B',
    desc: 'Uncompromising glute and calf pump, high heart rate zone, and steep climb power'
  },
  {
    id: 'walking_rucking',
    name: 'Rucking (Weighted Backpack Walk)',
    category: 'endurance',
    met: 7.0,
    stat: 'strength',
    secondaryStat: 'endurance',
    icon: 'figureWalk',
    emoji: '🎒',
    defaultDur: 45,
    color: '#85144b',
    desc: 'Trapezius and core posture bracing, zero-impact high calorie burn, and grit'
  },

  // --- COMBAT & MARTIAL ARTS ---
  {
    id: 'boxing',
    name: 'Boxing (Sparring / Heavy Bag)',
    category: 'combat',
    met: 8.5,
    stat: 'agility',
    secondaryStat: 'strength',
    icon: 'boxing',
    emoji: '🥊',
    defaultDur: 45,
    color: '#FF4136',
    desc: 'Kinetic rotational punching power, slip-and-counter head movement, and rounds'
  },
  {
    id: 'muay_thai',
    name: 'Muay Thai / Kickboxing',
    category: 'combat',
    met: 10.0,
    stat: 'strength',
    secondaryStat: 'agility',
    icon: 'boxing',
    emoji: '🥋',
    defaultDur: 60,
    color: '#B10DC9',
    desc: 'The art of eight limbs: shin roundhouse conditioning, clinch knees, and speed'
  },
  {
    id: 'bjj_wrestling',
    name: 'Brazilian Jiu-Jitsu / Wrestling',
    category: 'combat',
    met: 10.0,
    stat: 'agility',
    secondaryStat: 'strength',
    icon: 'shield',
    emoji: '🥋',
    defaultDur: 60,
    color: '#0074D9',
    desc: 'Isometric grip endurance, hip escapes, full body leverage, and intense live rolls'
  },

  // --- MIND & BODY ---
  {
    id: 'yoga_vinyasa',
    name: 'Yoga (Vinyasa / Power Flow)',
    category: 'mind_body',
    met: 4.0,
    stat: 'vitality',
    secondaryStat: 'agility',
    icon: 'stretch',
    emoji: '🧘',
    defaultDur: 45,
    color: '#B10DC9',
    desc: 'Breath-linked movement flows, arm balances, core stabilization, and flexibility'
  },
  {
    id: 'pilates_reformer',
    name: 'Pilates (Mat / Reformer)',
    category: 'mind_body',
    met: 4.0,
    stat: 'vitality',
    secondaryStat: 'strength',
    icon: 'stretch',
    emoji: '🤸',
    defaultDur: 45,
    color: '#F012BE',
    desc: 'Deep transverse abdominal activation, pelvic alignment, and postural length'
  },
  {
    id: 'mobility_stretching',
    name: 'Mobility Routine & Foam Rolling',
    category: 'mind_body',
    met: 2.5,
    stat: 'vitality',
    secondaryStat: 'discipline',
    icon: 'stretch',
    emoji: '🧘‍♂️',
    defaultDur: 20,
    color: '#01FF70',
    desc: 'Joint capsule flossing, tissue sheath release, and structural balance restoration'
  },

  // --- OUTDOOR & ACTION SPORTS ---
  {
    id: 'rock_climbing',
    name: 'Rock Climbing / Bouldering',
    category: 'outdoor',
    met: 7.5,
    stat: 'strength',
    secondaryStat: 'agility',
    icon: 'pullup',
    emoji: '🧗',
    defaultDur: 60,
    color: '#FF6A13',
    desc: 'Pinch and crimp forearm strength, core tension, problem solving, and beta execution'
  },
  {
    id: 'skiing_snowboarding',
    name: 'Skiing / Snowboarding',
    category: 'outdoor',
    met: 7.0,
    stat: 'agility',
    secondaryStat: 'endurance',
    icon: 'rocket',
    emoji: '⛷️',
    defaultDur: 90,
    color: '#7FDBFF',
    desc: 'Isometric quad edge control, carving dynamics, shock absorption on moguls'
  },
  {
    id: 'golf',
    name: 'Golf (Walking with Bag)',
    category: 'outdoor',
    met: 4.5,
    stat: 'vitality',
    secondaryStat: 'discipline',
    icon: 'target',
    emoji: '⛳',
    defaultDur: 120,
    color: '#2ECC40',
    desc: 'Rotary spinal kinetic chain, walking mileage, mental focus, and tempo control'
  }
]

export const INTENSITY_LEVELS = [
  { id: 'light', label: 'Light', factor: 0.85, desc: 'Casual pace' },
  { id: 'moderate', label: 'Moderate', factor: 1.0, desc: 'Solid session' },
  { id: 'high', label: 'High', factor: 1.2, desc: 'Competitive' },
  { id: 'intense', label: 'Max', factor: 1.35, desc: 'All-out effort' }
]

/**
 * Merges user-created custom activities with the default catalogue.
 */
export function getAllActivities(customActivities = []) {
  const custom = Array.isArray(customActivities) ? customActivities : []
  const seen = new Set(custom.map(a => a.id))
  return [...custom, ...ACTIVITIES.filter(a => !seen.has(a.id))]
}

/**
 * Calculates estimated burned calories using standard MET formula:
 * Calories = MET * Weight(kg) * (Duration(min) / 60) * IntensityFactor
 */
export function calculateActivityCalories(activity, durationMin = 30, weightKg = 75, intensity = 'moderate') {
  if (!activity) return 0
  const met = activity.met || 6.0
  const dur = Math.max(1, Number(durationMin) || 30)
  const wt = Math.max(35, Math.min(250, Number(weightKg) || 75))
  const level = INTENSITY_LEVELS.find(i => i.id === intensity) || INTENSITY_LEVELS[1]
  const factor = level.factor

  const kcal = met * wt * (dur / 60) * factor
  return Math.round(kcal)
}

/**
 * Calculates XP earned for completing an activity.
 * Base: 1.6 XP per minute, scaled by intensity.
 */
export function calculateActivityXp(activity, durationMin = 30, intensity = 'moderate') {
  const dur = Math.max(1, Number(durationMin) || 30)
  const level = INTENSITY_LEVELS.find(i => i.id === intensity) || INTENSITY_LEVELS[1]
  const xp = Math.round(dur * 1.6 * level.factor)
  return Math.max(10, xp)
}
