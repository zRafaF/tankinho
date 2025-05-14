import game_pb2 as _game_pb2
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Mapping as _Mapping, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ClientMessage(_message.Message):
    __slots__ = ("game_update", "create_match", "join_match", "client_flags")
    class ClientFlags(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        CLIENT_DISCONNECT_FROM_MATCH: _ClassVar[ClientMessage.ClientFlags]
    CLIENT_DISCONNECT_FROM_MATCH: ClientMessage.ClientFlags
    GAME_UPDATE_FIELD_NUMBER: _ClassVar[int]
    CREATE_MATCH_FIELD_NUMBER: _ClassVar[int]
    JOIN_MATCH_FIELD_NUMBER: _ClassVar[int]
    CLIENT_FLAGS_FIELD_NUMBER: _ClassVar[int]
    game_update: _game_pb2.GameUpdate
    create_match: bool
    join_match: str
    client_flags: ClientMessage.ClientFlags
    def __init__(self, game_update: _Optional[_Union[_game_pb2.GameUpdate, _Mapping]] = ..., create_match: bool = ..., join_match: _Optional[str] = ..., client_flags: _Optional[_Union[ClientMessage.ClientFlags, str]] = ...) -> None: ...

class ServerMessage(_message.Message):
    __slots__ = ("game_update", "error", "success", "match_created", "match_joined", "server_flags")
    class ServerFlags(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        SERVER_START_MATCH: _ClassVar[ServerMessage.ServerFlags]
    SERVER_START_MATCH: ServerMessage.ServerFlags
    class MatchCreationOrJoin(_message.Message):
        __slots__ = ("match_id", "player_id")
        MATCH_ID_FIELD_NUMBER: _ClassVar[int]
        PLAYER_ID_FIELD_NUMBER: _ClassVar[int]
        match_id: str
        player_id: int
        def __init__(self, match_id: _Optional[str] = ..., player_id: _Optional[int] = ...) -> None: ...
    GAME_UPDATE_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MATCH_CREATED_FIELD_NUMBER: _ClassVar[int]
    MATCH_JOINED_FIELD_NUMBER: _ClassVar[int]
    SERVER_FLAGS_FIELD_NUMBER: _ClassVar[int]
    game_update: _game_pb2.GameUpdate
    error: Error
    success: bool
    match_created: ServerMessage.MatchCreationOrJoin
    match_joined: ServerMessage.MatchCreationOrJoin
    server_flags: ServerMessage.ServerFlags
    def __init__(self, game_update: _Optional[_Union[_game_pb2.GameUpdate, _Mapping]] = ..., error: _Optional[_Union[Error, _Mapping]] = ..., success: bool = ..., match_created: _Optional[_Union[ServerMessage.MatchCreationOrJoin, _Mapping]] = ..., match_joined: _Optional[_Union[ServerMessage.MatchCreationOrJoin, _Mapping]] = ..., server_flags: _Optional[_Union[ServerMessage.ServerFlags, str]] = ...) -> None: ...

class Error(_message.Message):
    __slots__ = ("message", "type")
    class Type(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        ERROR_NONE: _ClassVar[Error.Type]
        ERROR_MATCH_NOT_FOUND: _ClassVar[Error.Type]
        ERROR_MATCH_FULL: _ClassVar[Error.Type]
        ERROR_UNKNOWN: _ClassVar[Error.Type]
        ERROR_HOST_DISCONNECTED: _ClassVar[Error.Type]
        ERROR_GUEST_DISCONNECTED: _ClassVar[Error.Type]
    ERROR_NONE: Error.Type
    ERROR_MATCH_NOT_FOUND: Error.Type
    ERROR_MATCH_FULL: Error.Type
    ERROR_UNKNOWN: Error.Type
    ERROR_HOST_DISCONNECTED: Error.Type
    ERROR_GUEST_DISCONNECTED: Error.Type
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    message: str
    type: Error.Type
    def __init__(self, message: _Optional[str] = ..., type: _Optional[_Union[Error.Type, str]] = ...) -> None: ...
