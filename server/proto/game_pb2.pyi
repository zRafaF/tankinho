from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Iterable as _Iterable, Mapping as _Mapping, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Turn(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    TURN_HOST: _ClassVar[Turn]
    TURN_GUEST: _ClassVar[Turn]
TURN_HOST: Turn
TURN_GUEST: Turn

class Vec2(_message.Message):
    __slots__ = ("x", "y")
    X_FIELD_NUMBER: _ClassVar[int]
    Y_FIELD_NUMBER: _ClassVar[int]
    x: float
    y: float
    def __init__(self, x: _Optional[float] = ..., y: _Optional[float] = ...) -> None: ...

class Bullet(_message.Message):
    __slots__ = ("position", "velocity")
    POSITION_FIELD_NUMBER: _ClassVar[int]
    VELOCITY_FIELD_NUMBER: _ClassVar[int]
    position: Vec2
    velocity: Vec2
    def __init__(self, position: _Optional[_Union[Vec2, _Mapping]] = ..., velocity: _Optional[_Union[Vec2, _Mapping]] = ...) -> None: ...

class Player(_message.Message):
    __slots__ = ("position", "velocity", "aim_angle", "health", "time_left")
    POSITION_FIELD_NUMBER: _ClassVar[int]
    VELOCITY_FIELD_NUMBER: _ClassVar[int]
    AIM_ANGLE_FIELD_NUMBER: _ClassVar[int]
    HEALTH_FIELD_NUMBER: _ClassVar[int]
    TIME_LEFT_FIELD_NUMBER: _ClassVar[int]
    position: Vec2
    velocity: Vec2
    aim_angle: float
    health: int
    time_left: int
    def __init__(self, position: _Optional[_Union[Vec2, _Mapping]] = ..., velocity: _Optional[_Union[Vec2, _Mapping]] = ..., aim_angle: _Optional[float] = ..., health: _Optional[int] = ..., time_left: _Optional[int] = ...) -> None: ...

class DynamicUpdate(_message.Message):
    __slots__ = ("host_player", "guest_player", "bullets", "turn")
    HOST_PLAYER_FIELD_NUMBER: _ClassVar[int]
    GUEST_PLAYER_FIELD_NUMBER: _ClassVar[int]
    BULLETS_FIELD_NUMBER: _ClassVar[int]
    TURN_FIELD_NUMBER: _ClassVar[int]
    host_player: Player
    guest_player: Player
    bullets: _containers.RepeatedCompositeFieldContainer[Bullet]
    turn: Turn
    def __init__(self, host_player: _Optional[_Union[Player, _Mapping]] = ..., guest_player: _Optional[_Union[Player, _Mapping]] = ..., bullets: _Optional[_Iterable[_Union[Bullet, _Mapping]]] = ..., turn: _Optional[_Union[Turn, str]] = ...) -> None: ...

class TurnUpdate(_message.Message):
    __slots__ = ("bit_mask", "turn")
    BIT_MASK_FIELD_NUMBER: _ClassVar[int]
    TURN_FIELD_NUMBER: _ClassVar[int]
    bit_mask: bytes
    turn: Turn
    def __init__(self, bit_mask: _Optional[bytes] = ..., turn: _Optional[_Union[Turn, str]] = ...) -> None: ...

class GameUpdate(_message.Message):
    __slots__ = ("match_id", "dynamic_update", "turn_update")
    MATCH_ID_FIELD_NUMBER: _ClassVar[int]
    DYNAMIC_UPDATE_FIELD_NUMBER: _ClassVar[int]
    TURN_UPDATE_FIELD_NUMBER: _ClassVar[int]
    match_id: str
    dynamic_update: DynamicUpdate
    turn_update: TurnUpdate
    def __init__(self, match_id: _Optional[str] = ..., dynamic_update: _Optional[_Union[DynamicUpdate, _Mapping]] = ..., turn_update: _Optional[_Union[TurnUpdate, _Mapping]] = ...) -> None: ...
