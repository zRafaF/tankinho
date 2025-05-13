import game_pb2 as _game_pb2
import match_pb2 as _match_pb2
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Mapping as _Mapping, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ClientMessage(_message.Message):
    __slots__ = ("game_update", "create_match", "join_match")
    GAME_UPDATE_FIELD_NUMBER: _ClassVar[int]
    CREATE_MATCH_FIELD_NUMBER: _ClassVar[int]
    JOIN_MATCH_FIELD_NUMBER: _ClassVar[int]
    game_update: _game_pb2.GameUpdate
    create_match: _match_pb2.CreateMatch
    join_match: _match_pb2.JoinMatch
    def __init__(self, game_update: _Optional[_Union[_game_pb2.GameUpdate, _Mapping]] = ..., create_match: _Optional[_Union[_match_pb2.CreateMatch, _Mapping]] = ..., join_match: _Optional[_Union[_match_pb2.JoinMatch, _Mapping]] = ...) -> None: ...

class ServerMessage(_message.Message):
    __slots__ = ("game_update", "error", "success")
    GAME_UPDATE_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    game_update: _game_pb2.GameUpdate
    error: Error
    success: bool
    def __init__(self, game_update: _Optional[_Union[_game_pb2.GameUpdate, _Mapping]] = ..., error: _Optional[_Union[Error, _Mapping]] = ..., success: bool = ...) -> None: ...

class Error(_message.Message):
    __slots__ = ("message", "type")
    class Type(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        ERROR_NONE: _ClassVar[Error.Type]
        ERROR_MATCH_NOT_FOUND: _ClassVar[Error.Type]
        ERROR_MATCH_FULL: _ClassVar[Error.Type]
        ERROR_UNKNOWN: _ClassVar[Error.Type]
    ERROR_NONE: Error.Type
    ERROR_MATCH_NOT_FOUND: Error.Type
    ERROR_MATCH_FULL: Error.Type
    ERROR_UNKNOWN: Error.Type
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    message: str
    type: Error.Type
    def __init__(self, message: _Optional[str] = ..., type: _Optional[_Union[Error.Type, str]] = ...) -> None: ...
