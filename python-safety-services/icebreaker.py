import random

ICEBREAKERS = {
    'Movies': [
        "What's the last movie that genuinely made you emotional?",
        "If your life was a movie, what genre would it be?",
        "Which movie character do you relate to the most and why?",
        "What's a movie everyone loves but you secretly dislike?",
    ],
    'Cricket': [
        "Who's your all-time favourite cricketer and why?",
        "IPL or Test cricket — which do you prefer?",
        "If you could play for any IPL team, which would it be?",
        "What's the most memorable cricket match you've watched?",
    ],
    'Food': [
        "What's your go-to comfort food after a bad day?",
        "If you could only eat one cuisine for the rest of your life, what would it be?",
        "What's the most adventurous food you've ever tried?",
        "Best street food spot in Bhubaneswar — what's your pick?",
    ],
    'Music': [
        "What song is currently on repeat for you?",
        "Which artist would you love to see live in concert?",
        "What's a song that takes you back to a specific memory?",
        "Describe your music taste in 3 words.",
    ],
    'Travel': [
        "What's the most beautiful place you've visited in India?",
        "Beach, mountains or city — which is your ideal travel destination?",
        "What's one place on your bucket list you haven't visited yet?",
        "What's the most spontaneous trip you've ever taken?",
    ],
    'Gaming': [
        "What's your all-time favourite video game?",
        "PC, console or mobile — what's your gaming platform?",
        "What game are you currently hooked on?",
        "If you could live inside any game world, which would you choose?",
    ],
    'Books': [
        "What's the last book that completely changed your perspective?",
        "Fiction or non-fiction — what's your preference?",
        "Which book character would you want as your best friend?",
        "What book would you recommend to everyone?",
    ],
    'Adventure': [
        "What's the most adventurous thing you've ever done?",
        "Trekking or skydiving — which would you try first?",
        "What's your dream adventure destination?",
        "Have you ever done anything that scared you but you're glad you did?",
    ],
    'Coffee': [
        "Black coffee or latte — what's your order?",
        "What's your favourite cafe in the city?",
        "Are you a morning coffee person or an anytime coffee person?",
        "Coffee or chai — which side are you on?",
    ],
    'Art': [
        "What's your favourite art form — painting, music, dance or writing?",
        "If you could own any painting in the world, which would it be?",
        "Do you have a creative hobby? What is it?",
        "What's the most beautiful piece of art you've ever seen?",
    ],
    'Dancing': [
        "What's your favourite dance style?",
        "What song always gets you on the dance floor?",
        "Have you ever performed on stage? How was it?",
        "Which dance form would you love to learn?",
    ],
    'Fitness': [
        "What's your favourite workout routine?",
        "Morning workout or evening workout — which do you prefer?",
        "What's your fitness goal right now?",
        "What sport or physical activity do you enjoy the most?",
    ],
}

GENERIC = [
    "If you could have dinner with any person (alive or dead), who would it be?",
    "What's something most people don't know about you?",
    "What's your most unpopular opinion?",
    "If you had one superpower, what would it be and why?",
    "What's the best piece of advice you've ever received?",
    "What does your perfect weekend look like?",
    "What's something you're really proud of but rarely talk about?",
]

def generate_icebreaker(interests_a: list, interests_b: list):
    a = set(i.replace('🎬 ', '').replace('🏏 ', '').replace('⚽ ', '').replace('🍕 ', '')
             .replace('🎵 ', '').replace('📚 ', '').replace('🎮 ', '').replace('🧗 ', '')
             .replace('☕ ', '').replace('🏖️ ', '').replace('💃 ', '').replace('🖼️ ', '')
             for i in interests_a)
    b = set(i.replace('🎬 ', '').replace('🏏 ', '').replace('⚽ ', '').replace('🍕 ', '')
             .replace('🎵 ', '').replace('📚 ', '').replace('🎮 ', '').replace('🧗 ', '')
             .replace('☕ ', '').replace('🏖️ ', '').replace('💃 ', '').replace('🖼️ ', '')
             for i in interests_b)

    shared = list(a & b)
    questions = []

    # Add questions from shared interests
    for interest in shared:
        if interest in ICEBREAKERS:
            questions.extend(ICEBREAKERS[interest])

    # Add generic questions
    questions.extend(GENERIC)

    # Pick 3 unique questions
    selected = random.sample(questions, min(3, len(questions)))

    return {
        "icebreakers": selected,
        "sharedInterests": shared,
        "tip": f"You both love {', '.join(shared[:2])}! Start with that." if shared else "Find common ground by asking about their interests!"
    }
