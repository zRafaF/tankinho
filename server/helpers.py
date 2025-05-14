import random

LAST_PLAYER_ID: int = 0


def get_random_match_id():
    """Generate a random match ID with 4 digits letters and numbers."""
    return "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=4))


def get_player_id() -> int:
    """Generate a random player ID with 4 digits letters and numbers."""
    global LAST_PLAYER_ID
    LAST_PLAYER_ID += 1
    if LAST_PLAYER_ID > 65536:
        LAST_PLAYER_ID = 0
    return LAST_PLAYER_ID
