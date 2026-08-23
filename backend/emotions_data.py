"""Curated emotion map covering strategic points across the pleasant-energy grid.
X axis: -8 (unpleasant) to +7 (pleasant)
Y axis: -8 (low energy) to +7 (high energy)
Keys are "x,y" strings.
"""

CURATED_EMOTIONS = {
    # --- Extreme corners ---
    "7,7": {"name": "Ecstatic", "description": "Overflowing joy that lights up every nerve — you could burst into song or laughter without warning."},
    "-8,7": {"name": "Enraged", "description": "White-hot fury: pulse pounding, jaw clenched, ready to erupt at whatever crossed the line."},
    "-8,-8": {"name": "Despairing", "description": "A leaden hollowness where hope used to live. Nothing feels reachable, not even the desire to move."},
    "7,-8": {"name": "Serene", "description": "Deep stillness with a soft smile. Everything is enough; you have nowhere to be."},

    # --- Axes (neutral energy or pleasantness) ---
    "0,7": {"name": "Alert", "description": "Awake and wired — attention sharpened, senses tuned to every flicker around you."},
    "0,-8": {"name": "Depleted", "description": "The tank is empty. Even choosing what to think about feels like too much."},
    "-8,0": {"name": "Distressed", "description": "Something is wrong and it won't let you settle — a persistent hum of unease."},
    "7,0": {"name": "Content", "description": "Balanced and pleasantly unbothered. Not thrilled, not lacking, just okay in a good way."},
    "0,0": {"name": "Neutral", "description": "The quiet middle — neither drawn toward nor away from anything in particular."},

    # --- Q1: Pleasant + High Energy ---
    "3,6": {"name": "Excited", "description": "A bright buzz in the chest — something good is coming and you can barely sit still."},
    "5,5": {"name": "Elated", "description": "Lifted, glowing, half-floating. The world momentarily feels like it's on your side."},
    "2,4": {"name": "Playful", "description": "A mischievous lightness — you want to poke, tease, and make everyone laugh with you."},
    "6,3": {"name": "Joyful", "description": "Warm, uncomplicated happiness spreading outward from somewhere behind your sternum."},
    "4,2": {"name": "Enthusiastic", "description": "You're all-in. Ideas flow, energy pours forward, and doing feels effortless."},
    "1,5": {"name": "Amused", "description": "A crinkle at the corner of the eye — something delightful just tickled you sideways."},
    "3,3": {"name": "Cheerful", "description": "A steady sunny mood you carry into rooms without meaning to."},
    "5,1": {"name": "Optimistic", "description": "You can see the shape of a good outcome, and you trust it enough to keep going."},
    "6,6": {"name": "Exhilarated", "description": "Wind-in-hair, heart-hammering aliveness — you feel powerfully awake and free."},
    "1,1": {"name": "Pleased", "description": "A small quiet yes. Something worked out and you noticed it."},

    # --- Q2: Unpleasant + High Energy ---
    "-3,6": {"name": "Anxious", "description": "A restless drum in the chest — thoughts sprint ahead to every possible way it could go wrong."},
    "-5,5": {"name": "Panicked", "description": "The world narrows to a bright pinpoint. Breath shortens, and every option feels like danger."},
    "-2,4": {"name": "Frustrated", "description": "The thing keeps not working and something inside you is starting to push back hard."},
    "-6,3": {"name": "Angry", "description": "Heat behind the eyes, teeth set. A line has been crossed and you feel it in your body."},
    "-4,2": {"name": "Irritated", "description": "A grain of sand under the eyelid of the day — small, but you can't stop noticing it."},
    "-1,5": {"name": "Nervous", "description": "A fluttery undercurrent. You're preparing for something that hasn't happened yet."},
    "-3,3": {"name": "Tense", "description": "Shoulders up, jaw tight, watching for the next thing that might go wrong."},
    "-5,1": {"name": "Resentful", "description": "A slow burn about something unfair — you keep replaying it and it keeps stinging."},
    "-7,4": {"name": "Furious", "description": "Righteous, roaring anger. You want to be heard and you want it now."},
    "-2,7": {"name": "Alarmed", "description": "A sudden jolt — something's wrong and your whole system just came online to face it."},
    "-6,6": {"name": "Outraged", "description": "This should not be happening. Your whole body agrees, loudly."},

    # --- Q3: Unpleasant + Low Energy ---
    "-3,-6": {"name": "Sad", "description": "A heavy softness that pulls the edges of everything downward. Tears live close to the surface."},
    "-5,-5": {"name": "Miserable", "description": "Wrapped in gray. It's hard to remember what feeling okay was like."},
    "-2,-4": {"name": "Disappointed", "description": "You wanted it to be different, and now you're sitting with the difference."},
    "-6,-3": {"name": "Lonely", "description": "A room-shaped ache. Even in company, you feel like you're behind a pane of glass."},
    "-4,-2": {"name": "Discouraged", "description": "The path forward looks longer than your legs feel. You keep sighing without noticing."},
    "-1,-5": {"name": "Gloomy", "description": "A low overcast mood — nothing terrible, just no sun coming through anywhere."},
    "-3,-3": {"name": "Down", "description": "Lower than baseline, lightly weighted. You'd rather stay small today."},
    "-5,-1": {"name": "Hurt", "description": "Something soft in you was bruised, and it's still tender to touch."},
    "-7,-4": {"name": "Hopeless", "description": "You can't picture it getting better, and you've stopped reaching for the picture."},
    "-2,-7": {"name": "Numb", "description": "The volume of feeling has been turned nearly to zero. You're here, but muted."},
    "-6,-6": {"name": "Grief-stricken", "description": "A great weight has settled where a great presence used to be."},
    "-4,-7": {"name": "Empty", "description": "A quiet, echoing absence — as if someone unplugged the meaning cable."},

    # --- Q4: Pleasant + Low Energy ---
    "3,-6": {"name": "Peaceful", "description": "A slow, unhurried okay-ness. Nothing tugs at you and you're grateful for it."},
    "5,-5": {"name": "Tranquil", "description": "Still water. Your thoughts drift past without wanting anything from you."},
    "2,-4": {"name": "Relaxed", "description": "Shoulders down, breath long. You have permission to just exist right now."},
    "6,-3": {"name": "Calm", "description": "Even-keeled and settled. Whatever happens, you can meet it."},
    "4,-2": {"name": "Comfortable", "description": "Snug in your own life for a moment. Everything fits where it is."},
    "1,-5": {"name": "Drowsy", "description": "A pleasant, warm heaviness pulling gently toward sleep."},
    "3,-3": {"name": "Mellow", "description": "Softened around the edges. Whatever song is playing feels like the right one."},
    "5,-1": {"name": "Satisfied", "description": "That warm nod inside — a thing you cared about is finally, quietly done."},
    "7,-4": {"name": "Blissful", "description": "A hushed radiance. You have arrived somewhere kind and would like to stay."},
    "2,-7": {"name": "Sleepy", "description": "Eyelids heavy, mind slowing to a gentle drift. Bed is calling."},
    "6,-6": {"name": "Restful", "description": "Deeply at ease — the kind of rest that repairs quiet damage you didn't know was there."},
    "4,-7": {"name": "Sedate", "description": "A slow, unhurried steadiness. Your body has settled into itself."},

    # --- Mid ranges & interesting inner points ---
    "0,3": {"name": "Attentive", "description": "You are here, watching, listening — the world has your full presence."},
    "0,-4": {"name": "Bored", "description": "Nothing is pulling at you and nothing has decided to be interesting yet."},
    "3,0": {"name": "Okay", "description": "A stable, unremarkable good — the kind you don't notice unless someone asks."},
    "-3,0": {"name": "Uneasy", "description": "Something is off. You can't name it, but you can feel it in your posture."},
    "1,-2": {"name": "At Ease", "description": "Comfortable in your own skin, breathing on its own accord."},
    "-1,-2": {"name": "Meh", "description": "A soft, indifferent shrug. Nothing calls, nothing complains."},
    "4,4": {"name": "Inspired", "description": "A quick current of aliveness — you want to make something before the feeling fades."},
    "-4,4": {"name": "Overwhelmed", "description": "Too much, too fast. Your mind is trying to hold ten glasses of water at once."},
    "2,2": {"name": "Interested", "description": "Leaning in — this has your curiosity and it's building."},
    "-2,2": {"name": "Worried", "description": "A quiet loop in the background asking what if, what if, what if."},
    "5,3": {"name": "Delighted", "description": "That small surprised laugh you make when the world does something charming."},
    "-5,3": {"name": "Agitated", "description": "You can't sit still and you don't quite know why — everything grates."},
    "-3,-1": {"name": "Melancholy", "description": "A soft-blue mood — not painful, but ache-adjacent and hard to shake."},
    "2,-1": {"name": "Grateful", "description": "A warm noticing of what is good. You don't want to move past it too quickly."},
    "6,1": {"name": "Confident", "description": "Squared shoulders and a quiet certainty. You know what you can do."},
    "-6,0": {"name": "Bitter", "description": "A metallic aftertaste from something that didn't heal cleanly."},
    "-1,7": {"name": "Startled", "description": "Everything in you just snapped to attention. What was that?"},
    "1,7": {"name": "Surprised", "description": "The world did something you didn't expect and your face knows it first."},
    "4,6": {"name": "Energized", "description": "A humming readiness — you want to move, do, build, go."},
    "-4,-4": {"name": "Weary", "description": "Not just tired — worn. Something has been carried for too long."},
    "0,5": {"name": "Aroused", "description": "Sharply awake — your nervous system is pointing at something intently."},
    "0,-6": {"name": "Fatigued", "description": "The body is asking, then telling, then insisting on rest."},
    "-7,2": {"name": "Hostile", "description": "You're not looking for peace right now. You're looking for the exit or the fight."},
    "7,4": {"name": "Radiant", "description": "You're lit up from within, and other people can feel it in the room."},
    "-3,7": {"name": "Terrified", "description": "Every animal instinct is screaming. The exits are being counted."},
    "3,-1": {"name": "Warm", "description": "A soft affection toward the moment and whoever is in it with you."},
    "-2,-6": {"name": "Sullen", "description": "Turned inward, low-simmering. You'd rather not be talked to right now."},
    "5,-3": {"name": "Loved", "description": "Held. Somewhere in the world, you matter to someone, and you can feel it."},
    "-5,-3": {"name": "Rejected", "description": "A door closed you were standing at. You keep looking at the door."},
}
